const PostgresDatabase = require('../src/db/postgres');
const request = require('supertest');
const app = require('../src/server');

describe('PostgreSQL Database Engine & Architecture Tests', () => {
  let mockPool;
  let db;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      end: jest.fn().mockResolvedValue()
    };
    db = new PostgresDatabase({ connectionString: 'postgresql://mock:mock@localhost:5432/mock_db' });
    db.pool = mockPool;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('init() applies schema DDL and seeds initial assets when empty', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // schema DDL
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // count query
      .mockResolvedValue({ rows: [] }); // inserts

    await db.init();

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS assets'));
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'));
    expect(db.initialized).toBe(true);
  });

  test('getAssets() retrieves sorted assets mapped with maxDuration', async () => {
    db.initialized = true;
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'A1', name: 'MacBook Pro 16"', category: 'Computing', status: 'AVAILABLE', maxDuration: 14 },
        { id: 'A2', name: 'Dell UltraSharp 27"', category: 'Displays', status: 'AVAILABLE', maxDuration: 30 }
      ]
    });

    const assets = await db.getAssets();
    expect(assets).toHaveLength(2);
    expect(assets[0].id).toBe('A1');
    expect(assets[0].maxDuration).toBe(14);
  });

  test('hasDateOverlap() executes SQL range query and returns true on overlap', async () => {
    db.initialized = true;
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const overlap = await db.hasDateOverlap('A1', '2026-09-01', '2026-09-05');
    expect(overlap).toBe(true);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT 1 FROM reservations'),
      expect.arrayContaining(['A1'])
    );
  });

  test('createReservation() computes incremental ID and returns valid dates', async () => {
    db.initialized = true;
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ next_id: 5 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'R5',
          assetId: 'A1',
          userId: 'DEV_USER',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-09-05T00:00:00.000Z',
          status: 'APPROVED',
          createdAt: '2026-08-30T00:00:00.000Z'
        }]
      });

    const res = await db.createReservation({
      assetId: 'A1',
      userId: 'DEV_USER',
      startDate: '2026-09-01',
      endDate: '2026-09-05'
    });

    expect(res.id).toBe('R5');
    expect(res.status).toBe('APPROVED');
    expect(res.startDate).toBeInstanceOf(Date);
    expect(res.endDate).toBeInstanceOf(Date);
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
