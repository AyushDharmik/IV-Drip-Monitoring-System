// ================================================
// routes/nurses.js - Nurse Management (Admin Only)
// ================================================
// Routes in this file:
//   GET    /api/nurses          → get all nurses
//   GET    /api/nurses/:id      → get one nurse
//   POST   /api/nurses          → add new nurse (creates login too)
//   PUT    /api/nurses/:id      → edit nurse info
//   DELETE /api/nurses/:id      → delete nurse
// ================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes here require admin login
// verifyAdmin runs before every route in this file

// ────────────────────────────────────────────────
// GET /api/nurses
// ────────────────────────────────────────────────
// Get list of ALL nurses with their details
router.get('/', verifyAdmin, async (req, res) => {
  try {
    // JOIN users and nurses tables to get full info
    const [rows] = await db.execute(`
      SELECT
        n.id          AS nurse_id,
        u.id          AS user_id,
        u.name,
        u.email,
        n.employee_id,
        n.phone,
        n.ward,
        u.created_at
      FROM nurses n
      JOIN users u ON n.user_id = u.id
      ORDER BY u.name ASC
    `);

    res.json({ success: true, nurses: rows });

  } catch (err) {
    console.error('Get nurses error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/nurses/:id
// ────────────────────────────────────────────────
// Get ONE nurse by their nurse ID
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(`
      SELECT
        n.id AS nurse_id, u.id AS user_id,
        u.name, u.email, n.employee_id, n.phone, n.ward, u.created_at
      FROM nurses n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found.' });
    }

    res.json({ success: true, nurse: rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// POST /api/nurses
// ────────────────────────────────────────────────
// Add a NEW nurse (admin does this)
// This creates BOTH a login account AND nurse profile
// Body: { name, email, password, employee_id, phone, ward }
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, employee_id, phone, ward } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.'
      });
    }

    // Check if email already used
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered.'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 1: Create user account (this gives login access)
    const [userResult] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'nurse']
    );
    const userId = userResult.insertId; // get the new user's ID

    // Step 2: Create nurse profile linked to user
    const [nurseResult] = await db.execute(
      'INSERT INTO nurses (user_id, employee_id, phone, ward) VALUES (?, ?, ?, ?)',
      [userId, employee_id || null, phone || null, ward || null]
    );

    res.status(201).json({
      success: true,
      message: `Nurse "${name}" added successfully! They can now login.`,
      nurse: {
        nurse_id:    nurseResult.insertId,
        user_id:     userId,
        name, email, employee_id, phone, ward
      }
    });

  } catch (err) {
    console.error('Add nurse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// PUT /api/nurses/:id
// ────────────────────────────────────────────────
// Edit an existing nurse's information
// Body: { name, phone, ward, employee_id, password (optional) }
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, ward, employee_id, password } = req.body;

    // Get the nurse to find their user_id
    const [nurseRows] = await db.execute(
      'SELECT user_id FROM nurses WHERE id = ?', [id]
    );
    if (nurseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found.' });
    }
    const userId = nurseRows[0].user_id;

    // Update user name
    if (name) {
      await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }

    // Update password if provided
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    }

    // Update nurse-specific info
    await db.execute(
      'UPDATE nurses SET employee_id = ?, phone = ?, ward = ? WHERE id = ?',
      [employee_id || null, phone || null, ward || null, id]
    );

    res.json({ success: true, message: 'Nurse updated successfully!' });

  } catch (err) {
    console.error('Update nurse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// DELETE /api/nurses/:id
// ────────────────────────────────────────────────
// Remove a nurse (also removes their login account)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find nurse's user_id first
    const [nurseRows] = await db.execute(
      'SELECT user_id FROM nurses WHERE id = ?', [id]
    );
    if (nurseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found.' });
    }
    const userId = nurseRows[0].user_id;

    // Unassign all patients from this nurse first
    await db.execute(
      'UPDATE patients SET assigned_nurse_id = NULL WHERE assigned_nurse_id = ?', [id]
    );

    // Delete nurse profile (CASCADE will delete from nurses too)
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Nurse deleted successfully.' });

  } catch (err) {
    console.error('Delete nurse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
