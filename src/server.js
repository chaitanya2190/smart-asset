const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiter: Max 50 requests per windowMs for reservation creation
const createReservationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: { error: 'Too many reservation requests from this IP, please try again later.' }
});

// Storage engine status
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'ok',
    storageEngine: db.getEngineType()
  });
});

// List all assets
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await db.getAssets();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Create a new asset
app.post('/api/assets', async (req, res) => {
  const { name, category, maxDuration } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Asset name is required.' });
  }

  const validCategories = ['Computing', 'Photography', 'Displays', 'Misc'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  const durationNum = parseInt(maxDuration, 10);
  if (isNaN(durationNum) || durationNum <= 0 || durationNum > 365) {
    return res.status(400).json({ error: 'Max Duration must be a positive number between 1 and 365.' });
  }

  try {
    const newAsset = await db.addAsset({ name: name.trim(), category, maxDuration: durationNum });
    res.status(201).json({ message: 'Asset created successfully', asset: newAsset });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset.' });
  }
});

// Delete an asset
app.delete('/api/assets/:id', async (req, res) => {
  try {
    const success = await db.removeAsset(req.params.id);
    if (success) {
      res.json({ message: 'Asset removed successfully.' });
    } else {
      res.status(404).json({ error: 'Asset not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset.' });
  }
});

// Toggle asset maintenance status
app.patch('/api/assets/:id/maintenance', async (req, res) => {
  try {
    const asset = await db.toggleMaintenance(req.params.id);
    if (asset) {
      res.json({ message: 'Asset maintenance toggled successfully.', asset });
    } else {
      res.status(404).json({ error: 'Asset not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle maintenance status.' });
  }
});

// Get asset history
app.get('/api/assets/:id/history', async (req, res) => {
  try {
    const asset = await db.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const history = await db.getReservationsByAsset(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset history.' });
  }
});

// List all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await db.getReservations();
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
});

// Create a reservation
app.post('/api/reservations', createReservationLimiter, async (req, res) => {
  let { assetId, userId, startDate, endDate } = req.body;

  if (!assetId || !userId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({ error: 'Reserver name cannot be blank.' });
  }

  userId = userId.trim().toUpperCase();

  // Basic SQL/XSS Injection protection on the normalized name
  const invalidChars = /['"<>;]/;
  if (invalidChars.test(userId)) {
    return res.status(400).json({ error: 'Invalid characters in user ID/Name.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }

  // Validation: End date must be after start date
  if (end <= start) {
    return res.status(400).json({ error: 'End date must be strictly after start date.' });
  }

  // Validation: Prevent booking in the past
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Ignore time for past check
  if (start < now) {
    return res.status(400).json({ error: 'Cannot book in the past.' });
  }

  try {
    const asset = await db.getAssetById(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (asset.status === 'MAINTENANCE') {
      return res.status(400).json({ error: 'Asset is currently in maintenance.' });
    }

    // Validation: Duration caps
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (durationDays > asset.maxDuration) {
      return res.status(400).json({ error: `Exceeds maximum duration of ${asset.maxDuration} days for this asset.` });
    }

    // Validation: User Quota cap (Max 2 active reservations per user)
    const userReservations = await db.getReservationsByUser(userId);
    let finalStatus = 'APPROVED';
    if (userReservations.length >= 2) {
      finalStatus = 'PENDING_APPROVAL';
    }

    // Validation: Date Overlap
    const hasOverlap = await db.hasDateOverlap(assetId, startDate, endDate);
    if (hasOverlap) {
      return res.status(409).json({ error: 'Asset is already reserved for the requested dates.' });
    }

    // All validations passed
    const reservation = await db.createReservation({
      assetId,
      userId,
      startDate,
      endDate,
      status: finalStatus
    });
    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process reservation.' });
  }
});

// Cancel reservation
app.post('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const success = await db.cancelReservation(req.params.id);
    if (success) {
      res.json({ message: 'Reservation cancelled successfully.' });
    } else {
      res.status(404).json({ error: 'Reservation not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
});

// Approve reservation (Admin)
app.post('/api/reservations/:id/approve', async (req, res) => {
  try {
    const reservation = await db.getReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (reservation.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only pending reservations can be approved.' });
    }

    // RE-CHECK: Ensure no one double-booked the dates while this was pending!
    const hasOverlap = await db.hasDateOverlap(reservation.assetId, reservation.startDate, reservation.endDate);
    if (hasOverlap) {
      return res.status(409).json({ error: 'Conflict: Asset is already reserved for the requested dates by another approved ticket.' });
    }

    const updated = await db.updateReservationStatus(req.params.id, 'APPROVED');
    res.json({ message: 'Reservation approved successfully.', reservation: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve reservation.' });
  }
});

// Reject reservation (Admin)
app.post('/api/reservations/:id/reject', async (req, res) => {
  try {
    const reservation = await db.getReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    await db.updateReservationStatus(req.params.id, 'REJECTED');
    res.json({ message: 'Reservation rejected successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject reservation.' });
  }
});

module.exports = app;
