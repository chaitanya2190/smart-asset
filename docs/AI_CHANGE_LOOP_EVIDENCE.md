# Stage 3: AI Change Loop Evidence

## 1. Feature Request
**The Prompt given to the AI:**
> "When a user exceeds their quota of 2 active reservations, instead of returning a 400 Bad Request error, create the reservation but set its status to 'PENDING_APPROVAL' for admin review."

## 2. Code Changes Made by AI
The AI modified the quota validation logic in `src/server.js`:

```javascript
// BEFORE (Lines 68-71)
const userReservations = db.getReservationsByUser(userId);
if (userReservations.length >= 2) {
  return res.status(400).json({ error: 'User quota exceeded. Maximum 2 active reservations allowed.' });
}

// AFTER
const userReservations = db.getReservationsByUser(userId);
let finalStatus = 'APPROVED';
if (userReservations.length >= 2) {
  finalStatus = 'PENDING_APPROVAL';
}
// ... [Date validation code omitted] ...
const reservation = db.createReservation({ assetId, userId, startDate, endDate });
reservation.status = finalStatus;
res.status(201).json(reservation);
```

## 3. Detecting What Broke (Red Run)
Upon running the existing test suite (`npm test`), the automated system caught a regression. The test designed to enforce the hard 400 limit failed because it received a 201 Created.

**Failed Test Output Captured:**
```
FAIL tests/api.test.js
  ● Equipment Reservation API › POST /api/reservations - Edge Case: Exceed user quota (max 2)

    Expected: 400
    Received: 201

      81 |     // Third should fail
      82 |     const res = await request(app).post('/api/reservations').send(payload3);
    > 83 |     expect(res.statusCode).toBe(400);
```

## 4. AI Self-Correction & Healing (Green Run)
The AI recognized that the feature change fundamentally altered the expected business rules for quota limits. It corrected the test suite to expect the new behavior.

**The Test Suite Fix:**
```javascript
// BEFORE
// Third should fail
const res = await request(app).post('/api/reservations').send(payload3);
expect(res.statusCode).toBe(400);
expect(res.body.error).toContain('User quota exceeded');

// AFTER
// Third should now go to PENDING_APPROVAL instead of failing
const res = await request(app).post('/api/reservations').send(payload3);
expect(res.statusCode).toBe(201);
expect(res.body.status).toBe('PENDING_APPROVAL');
```

**Final Outcome:**
Running `npm test` after the correction resulted in a completely passing test suite, successfully closing the loop! (See `test-reports/03_healed_pass.log`).
