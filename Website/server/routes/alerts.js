// ================================================
// routes/alerts.js - Alert Logging & Retrieval
// ================================================
// Routes:
//   POST /api/alerts              → save a new alert to DB
//   GET  /api/alerts              → admin: get all alerts
//   GET  /api/alerts/patient/:id  → get alerts for one patient
//   GET  /api/alerts/mine         → nurse: get alerts for my patients
//   DELETE /api/alerts/:id        → admin: delete one alert
// ================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ────────────────────────────────────────────────
// POST /api/alerts
// ────────────────────────────────────────────────
// Save a new alert when frontend detects one.
// Called automatically by the nurse dashboard JS
// when fluid is low, drip stops, or blood detected.
// Body: { patient_id, alert_type, message, fluid_level, drip_rate }
router.post('/', verifyToken, async (req, res) => {
  try {
    const { patient_id, alert_type, message, fluid_level, drip_rate } = req.body;

    if (!patient_id || !alert_type || !message) {
      return res.status(400).json({
        success: false,
        message: 'patient_id, alert_type and message are required.'
      });
    }

    // Valid alert types for your system
    const validTypes = ['bottle_low', 'critically_empty', 'drip_stopped', 'backflow', 'emergency'];
    if (!validTypes.includes(alert_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid alert_type. Use: ${validTypes.join(', ')}`
      });
    }

    const [result] = await db.execute(`
      INSERT INTO alerts_log (patient_id, alert_type, message, fluid_level, drip_rate)
      VALUES (?, ?, ?, ?, ?)
    `, [patient_id, alert_type, message, fluid_level || null, drip_rate || null]);

    res.status(201).json({
      success: true,
      message: 'Alert saved.',
      alert_id: result.insertId
    });

  } catch (err) {
    console.error('Save alert error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/alerts
// ────────────────────────────────────────────────
// Admin: Get ALL alerts with patient info
// Optional query: ?limit=50  (default 100)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const [rows] = await db.execute(`
      SELECT
        a.id, a.alert_type, a.message,
        a.fluid_level, a.drip_rate, a.created_at,
        p.name AS patient_name, p.bed_number
      FROM alerts_log a
      JOIN patients p ON a.patient_id = p.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json({ success: true, alerts: rows });

  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/alerts/mine
// ────────────────────────────────────────────────
// Nurse: Get alerts for patients assigned to ME
router.get('/mine', verifyToken, async (req, res) => {
  try {
    // Get this nurse's ID
    const [nurseRows] = await db.execute(
      'SELECT id FROM nurses WHERE user_id = ?', [req.user.id]
    );
    if (nurseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse profile not found.' });
    }
    const nurseId = nurseRows[0].id;

    const [rows] = await db.execute(`
      SELECT
        a.id, a.alert_type, a.message,
        a.fluid_level, a.drip_rate, a.created_at,
        p.name AS patient_name, p.bed_number
      FROM alerts_log a
      JOIN patients p ON a.patient_id = p.id
      WHERE p.assigned_nurse_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [nurseId]);

    res.json({ success: true, alerts: rows });

  } catch (err) {
    console.error('Get my alerts error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/alerts/patient/:id
// ────────────────────────────────────────────────
// Get all alerts for a specific patient
router.get('/patient/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const limit  = parseInt(req.query.limit) || 30;

    const [rows] = await db.execute(`
      SELECT id, alert_type, message, fluid_level, drip_rate, created_at
      FROM alerts_log
      WHERE patient_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [id, limit]);

    res.json({ success: true, alerts: rows });

  } catch (err) {
    console.error('Get patient alerts error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// DELETE /api/alerts/:id
// ────────────────────────────────────────────────
// Admin: Delete one alert record
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM alerts_log WHERE id = ?', [id]);
    res.json({ success: true, message: 'Alert deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
