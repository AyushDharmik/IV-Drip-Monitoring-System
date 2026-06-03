// ================================================
// routes/patients.js - Patient Management
// ================================================
// Routes:
//   GET    /api/patients              → admin: all patients
//   GET    /api/patients/mine         → nurse: my assigned patients
//   GET    /api/patients/:id          → get one patient detail
//   POST   /api/patients              → admin: add patient
//   PUT    /api/patients/:id          → admin: edit patient
//   PUT    /api/patients/:id/assign   → admin: assign nurse to patient
//   DELETE /api/patients/:id          → admin: delete patient
// ================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ────────────────────────────────────────────────
// GET /api/patients
// ────────────────────────────────────────────────
// Admin: get ALL patients with their assigned nurse
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        p.id, p.name, p.age, p.bed_number, p.ward, p.diagnosis,
        p.thingspeak_channel_id, p.thingspeak_read_key,
        p.is_active, p.admitted_at,
        n.id        AS nurse_id,
        u.name      AS nurse_name,
        u.email     AS nurse_email,
        n.ward      AS nurse_ward
      FROM patients p
      LEFT JOIN nurses n ON p.assigned_nurse_id = n.id
      LEFT JOIN users  u ON n.user_id = u.id
      ORDER BY p.admitted_at DESC
    `);

    res.json({ success: true, patients: rows });

  } catch (err) {
    console.error('Get patients error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/patients/mine
// ────────────────────────────────────────────────
// Nurse: get ONLY patients assigned to me
router.get('/mine', verifyToken, async (req, res) => {
  try {
    // Get nurse record using logged-in user's ID
    const [nurseRows] = await db.execute(
      'SELECT id FROM nurses WHERE user_id = ?', [req.user.id]
    );

    if (nurseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nurse profile not found. Contact admin.'
      });
    }
    const nurseId = nurseRows[0].id;

    // Get only patients assigned to this nurse
    const [rows] = await db.execute(`
      SELECT
        p.id, p.name, p.age, p.bed_number, p.ward,
        p.diagnosis, p.thingspeak_channel_id,
        p.thingspeak_read_key, p.is_active, p.admitted_at
      FROM patients p
      WHERE p.assigned_nurse_id = ? AND p.is_active = TRUE
      ORDER BY p.bed_number ASC
    `, [nurseId]);

    res.json({ success: true, patients: rows });

  } catch (err) {
    console.error('Get my patients error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/patients/:id
// ────────────────────────────────────────────────
// Get ONE patient's full details (admin or assigned nurse)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(`
      SELECT
        p.*,
        n.id        AS nurse_id,
        u.name      AS nurse_name,
        n.phone     AS nurse_phone,
        n.ward      AS nurse_ward
      FROM patients p
      LEFT JOIN nurses n ON p.assigned_nurse_id = n.id
      LEFT JOIN users  u ON n.user_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // If nurse, check they are assigned to this patient
    if (req.user.role === 'nurse') {
      const [nurseRows] = await db.execute(
        'SELECT id FROM nurses WHERE user_id = ?', [req.user.id]
      );
      const nurseId = nurseRows[0]?.id;
      if (rows[0].assigned_nurse_id !== nurseId) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this patient.'
        });
      }
    }

    res.json({ success: true, patient: rows[0] });

  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// POST /api/patients
// ────────────────────────────────────────────────
// Admin: Add a new patient
// Body: { name, age, bed_number, ward, diagnosis,
//         thingspeak_channel_id, thingspeak_read_key }
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const {
      name, age, bed_number, ward, diagnosis,
      thingspeak_channel_id, thingspeak_read_key
    } = req.body;

    if (!name || !bed_number) {
      return res.status(400).json({
        success: false,
        message: 'Patient name and bed number are required.'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO patients
        (name, age, bed_number, ward, diagnosis,
         thingspeak_channel_id, thingspeak_read_key)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name, age || null, bed_number, ward || null,
      diagnosis || null, thingspeak_channel_id || null,
      thingspeak_read_key || null
    ]);

    res.status(201).json({
      success: true,
      message: `Patient "${name}" added successfully!`,
      patient_id: result.insertId
    });

  } catch (err) {
    console.error('Add patient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// PUT /api/patients/:id
// ────────────────────────────────────────────────
// Admin: Edit patient details
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, age, bed_number, ward, diagnosis,
      thingspeak_channel_id, thingspeak_read_key, is_active
    } = req.body;

    await db.execute(`
      UPDATE patients SET
        name = COALESCE(?, name),
        age  = COALESCE(?, age),
        bed_number = COALESCE(?, bed_number),
        ward = COALESCE(?, ward),
        diagnosis = COALESCE(?, diagnosis),
        thingspeak_channel_id = COALESCE(?, thingspeak_channel_id),
        thingspeak_read_key   = COALESCE(?, thingspeak_read_key),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      name || null, age || null, bed_number || null,
      ward || null, diagnosis || null,
      thingspeak_channel_id || null, thingspeak_read_key || null,
      is_active !== undefined ? is_active : null,
      id
    ]);

    res.json({ success: true, message: 'Patient updated successfully!' });

  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// PUT /api/patients/:id/assign
// ────────────────────────────────────────────────
// Admin: Assign a nurse to a patient
// Body: { nurse_id }  OR  { nurse_id: null } to unassign
router.put('/:id/assign', verifyAdmin, async (req, res) => {
  try {
    const { id }       = req.params;
    const { nurse_id } = req.body;

    // Check patient exists
    const [patRows] = await db.execute('SELECT id,name FROM patients WHERE id = ?', [id]);
    if (patRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // If nurse_id given, check nurse exists
    if (nurse_id) {
      const [nurseRows] = await db.execute('SELECT id FROM nurses WHERE id = ?', [nurse_id]);
      if (nurseRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Nurse not found.' });
      }
    }

    await db.execute(
      'UPDATE patients SET assigned_nurse_id = ? WHERE id = ?',
      [nurse_id || null, id]
    );

    const action = nurse_id ? 'assigned' : 'unassigned';
    res.json({
      success: true,
      message: `Nurse ${action} for patient "${patRows[0].name}" successfully!`
    });

  } catch (err) {
    console.error('Assign nurse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// DELETE /api/patients/:id
// ────────────────────────────────────────────────
// Admin: Delete a patient and all their records
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [patRows] = await db.execute('SELECT name FROM patients WHERE id = ?', [id]);
    if (patRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Delete related records first (foreign key constraint)
    await db.execute('DELETE FROM alerts_log WHERE patient_id = ?', [id]);
    await db.execute('DELETE FROM readings   WHERE patient_id = ?', [id]);
    await db.execute('DELETE FROM patients   WHERE id = ?',         [id]);

    res.json({
      success: true,
      message: `Patient "${patRows[0].name}" deleted successfully.`
    });

  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
