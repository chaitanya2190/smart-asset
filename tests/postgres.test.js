const PostgresDatabase = require('../src/db/postgres');
const request = require('supertest');
const app = require('../src/server');

describe('PostgreSQL Database Engine & Architecture Tests', () => {
  let mockPool;
  let mockClient;
  let db;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue()
    };
    db = new PostgresDatabase({ connectionString: 'postgresql://mock:mock@localhost:5432/mock_db' });
    db.pool = mockPool;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('init() applies schema DDL and aligns sequence counters with existing data', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // schema DDL
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // count query
      .mockResolvedValueOnce({ rows: [] }) // insert A1
      .mockResolvedValueOnce({ rows: [] }) // insert A2
      .mockResolvedValueOnce({ rows: [] }) // insert A3
      .mockResolvedValueOnce({ rows: [] }) // insert A4
      .mockResolvedValueOnce({ rows: [] }); // setval sequences

    await db.init();

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS assets'));
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'));
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("setval('asset_id_seq'"));
    expect(db.initialized).toBe(true);
  });

  test('addAsset() uses sequence nextval for thread-safe atomic ID generation', async () => {
    db.initialized = true;
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'A5', name: '4K Drone', category: 'Photography', status: 'AVAILABLE', maxDuration: 7 }]
    });

    const asset = await db.addAsset({ name: '4K Drone', category: 'Photography', maxDuration: 7 });
    expect(asset.id).toBe('A5');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("VALUES ('A' || nextval('asset_id_seq')"),
      expect.arrayContaining(['4K Drone', 'Photography', 7])
    );
  });

  test('createReservation() executes within an ACID transaction with row-level locks (FOR UPDATE)', async () => {
    db.initialized = true;
    // 1. BEGIN
    // 2. Lock asset FOR UPDATE
    // 3. Check overlap FOR UPDATE
    // 4. INSERT reservation with sequence
    // 5. COMMIT
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'A1', status: 'AVAILABLE' }] }) // SELECT ... FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // overlap check -> none
      .mockResolvedValueOnce({
        rows: [{
          id: 'R10',
          assetId: 'A1',
          userId: 'CONCURRENT_USER',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-09-05T00:00:00.000Z',
          status: 'APPROVED',
          createdAt: '2026-08-30T00:00:00.000Z'
        }]
      }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await db.createReservation({
      assetId: 'A1',
      userId: 'CONCURRENT_USER',
      startDate: '2026-09-01',
      endDate: '2026-09-05'
    });

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM assets WHERE id = $1 FOR UPDATE'), ['A1']);
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("nextval('reservation_id_seq')"), expect.anything());
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(res.id).toBe('R10');
  });

  test('createReservation() rolls back and throws 409 conflict when overlap is detected in transaction', async () => {
    db.initialized = true;
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'A1', status: 'AVAILABLE' }] }) // Lock
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // Overlap found!
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      db.createReservation({
        assetId: 'A1',
        userId: 'COLLIDING_USER',
        startDate: '2026-09-01',
        endDate: '2026-09-05'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('already reserved')
    });

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('createReservation() catches PostgreSQL exclusion violation (code 23P01) and returns 409', async () => {
    db.initialized = true;
    const exclusionErr = new Error('conflicting key value violates exclusion constraint "no_overlapping_reservations"');
    exclusionErr.code = '23P01';

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'A1', status: 'AVAILABLE' }] }) // Lock
      .mockResolvedValueOnce({ rows: [] }) // Overlap check passes race window
      .mockRejectedValueOnce(exclusionErr) // DB exclusion constraint triggers!
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      db.createReservation({
        assetId: 'A1',
        userId: 'RACING_USER',
        startDate: '2026-09-01',
        endDate: '2026-09-05'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('already reserved')
    });

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('cancelReservation() runs update on reservations status', async () => {
    db.initialized = true;
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    const cancelled = await db.cancelReservation('R5');
    expect(cancelled).toBe(true);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE reservations SET status = 'CANCELLED' WHERE id = $1"),
      ['R5']
    );
  });

  test('GET /api/system/status exposes current storage engine mode', async () => {
    const res = await request(app).get('/api/system/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(['CSV', 'POSTGRESQL']).toContain(res.body.storageEngine);
  });
});
