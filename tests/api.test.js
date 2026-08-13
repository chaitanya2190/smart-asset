const request = require('supertest');
const app = require('../src/server');
const db = require('../src/database');

describe('Equipment Reservation API', () => {
  beforeEach(async () => {
    await db.reset();
  });

  const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  test('GET /api/assets - Should return all assets', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /api/assets - Happy Path: Create valid asset', async () => {
    const payload = { name: 'Projector', category: 'Misc', maxDuration: 5 };
    const res = await request(app).post('/api/assets').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.asset.name).toBe('Projector');
    expect(res.body.asset.status).toBe('AVAILABLE');
  });

  test('POST /api/assets - Invalid Input: Max Duration <= 0', async () => {
    const payload = { name: 'Broken Screen', category: 'Displays', maxDuration: 0 };
    const res = await request(app).post('/api/assets').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Max Duration');
  });

  test('POST /api/reservations - Happy Path: Should create a valid reservation', async () => {
    const payload = {
      assetId: 'A1',
      userId: 'test_user',
      startDate: getFutureDate(1),
      endDate: getFutureDate(5)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.id).toBeDefined();
  });

  test('POST /api/reservations - Invalid Input: Start date after End date', async () => {
    const payload = {
      assetId: 'A1',
      userId: 'test_user',
      startDate: getFutureDate(5),
      endDate: getFutureDate(1)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('strictly after start date');
  });

  test('POST /api/reservations - Invalid Input: SQL/XSS payload in userId', async () => {
    const payload = {
      assetId: 'A1',
      userId: '<script>alert(1)</script>',
      startDate: getFutureDate(1),
      endDate: getFutureDate(5)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid characters');
  });

  test('POST /api/reservations - Invalid Input: Blank reserver name', async () => {
    const payload = {
      assetId: 'A1',
      userId: '   ',
      startDate: getFutureDate(1),
      endDate: getFutureDate(5)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('cannot be blank');
  });

  test('POST /api/reservations - Edge Case: Exceed maximum duration cap', async () => {
    // A1 (MacBook) max duration is 14 days
    const payload = {
      assetId: 'A1',
      userId: 'test_user',
      startDate: getFutureDate(1),
      endDate: getFutureDate(20)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Exceeds maximum duration');
  });

  test('POST /api/reservations - Edge Case: Exceed user quota (max 2)', async () => {
    const payload1 = { assetId: 'A1', userId: 'greedy_user', startDate: getFutureDate(1), endDate: getFutureDate(5) };
    const payload2 = { assetId: 'A2', userId: 'greedy_user', startDate: getFutureDate(1), endDate: getFutureDate(5) };
    const payload3 = { assetId: 'A4', userId: 'greedy_user', startDate: getFutureDate(1), endDate: getFutureDate(5) };

    await request(app).post('/api/reservations').send(payload1);
    await request(app).post('/api/reservations').send(payload2);
    
    // Third should now go to PENDING_APPROVAL instead of failing
    const res = await request(app).post('/api/reservations').send(payload3);
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('PENDING_APPROVAL');
  });

  test('POST /api/reservations - Edge Case: Date Overlap on same asset', async () => {
    const payload1 = { assetId: 'A1', userId: 'user1', startDate: getFutureDate(1), endDate: getFutureDate(10) };
    await request(app).post('/api/reservations').send(payload1);

    // Conflict inside the range
    const payload2 = { assetId: 'A1', userId: 'user2', startDate: getFutureDate(5), endDate: getFutureDate(15) };
    const res = await request(app).post('/api/reservations').send(payload2);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('already reserved');
  });

  test('POST /api/reservations - Maintenance Window Lock', async () => {
    // A3 is in maintenance
    const payload = {
      assetId: 'A3',
      userId: 'user1',
      startDate: getFutureDate(1),
      endDate: getFutureDate(5)
    };
    const res = await request(app).post('/api/reservations').send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('maintenance');
  });

  test('GET /api/assets/:id/history - Happy Path: Returns asset history', async () => {
    // Create a reservation
    const payload = { assetId: 'A1', userId: 'history_user', startDate: getFutureDate(1), endDate: getFutureDate(5) };
    await request(app).post('/api/reservations').send(payload);

    const res = await request(app).get('/api/assets/A1/history');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].assetId).toBe('A1');
    expect(res.body[0].userId).toBe('HISTORY_USER');
  });

  test('GET /api/assets/:id/history - Empty Case: Valid asset with no history returns []', async () => {
    const res = await request(app).get('/api/assets/A2/history');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(0);
  });

  test('GET /api/assets/:id/history - Invalid ID: Nonexistent asset returns 404', async () => {
    const res = await request(app).get('/api/assets/nonexistent/history');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain('Asset not found');
  });

  test('POST /api/reservations - Security: Rate Limiting (429 Too Many Requests)', async () => {
    // Limit is 50 per minute. We send 51.
    const payload = { assetId: 'A4', userId: 'spammer', startDate: getFutureDate(1), endDate: getFutureDate(5) };
    let lastRes;
    for (let i = 0; i < 51; i++) {
      lastRes = await request(app).post('/api/reservations').send(payload);
    }
    expect(lastRes.statusCode).toBe(429);
    expect(lastRes.body.error).toContain('Too many reservation requests');
  });
});
