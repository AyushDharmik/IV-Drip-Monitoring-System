// ================================================
// routes/readings.js - Sensor Readings History
// ================================================
// Routes:
//   POST /api/readings              → save a reading from ThingSpeak
//   GET  /api/readings/patient/:id  → get history for graph (last 50)
//   DELETE /api/readings/patient/:id → clear old readings
// ================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ────────────────────────────────────────────────
// POST /api/readings
// ────────────────────────────────────────────────
// Save a sensor reading to history.
// Frontend calls this every time it fetches from ThingSpeak.
// Body: { patient_id, fluid_level, drip_rate, flow_status, blood_detected }
router.post('/', verifyToken, async (req, res) => {
  try {
    const { patient_id, fluid_level, drip_rate, flow_status, blood_detected } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required.' });
    }

    await db.execute(`
      INSERT INTO readings (patient_id, fluid_level, drip_rate, flow_status, blood_detected)
      VALUES (?, ?, ?, ?, ?)
    `, [
      patient_id,
      fluid_level    || 0,
      drip_rate      || 0,
      flow_status    || 'Unknown',
      blood_detected ? 1 : 0
    ]);

    res.status(201).json({ success: true, message: 'Reading saved.' });

  } catch (err) {
    console.error('Save reading error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/readings/patient/:id
// ────────────────────────────────────────────────
// Get last N readings for a patient — used for Chart.js graph
// Optional: ?limit=50 (default 30)
router.get('/patient/:id', verifyToken, async (req, res) => {
  try {
    const { id }  = req.params;
    const limit   = parseInt(req.query.limit) || 30;

    const [rows] = await db.execute(`
      SELECT fluid_level, drip_rate, flow_status, blood_detected, recorded_at
      FROM readings
      WHERE patient_id = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `, [id, limit]);

    // Reverse so oldest is first (for graph left→right)
    rows.reverse();

    res.json({ success: true, readings: rows });

  } catch (err) {
    console.error('Get readings error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// DELETE /api/readings/patient/:id
// ────────────────────────────────────────────────
// Admin: Clear all readings for a patient (to free DB space)
router.delete('/patient/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM readings WHERE patient_id = ?', [id]);
    res.json({ success: true, message: 'Readings cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
