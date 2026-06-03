// ================================================
// routes/auth.js - Login & Registration Routes
// ================================================
// Routes in this file:
//   POST /api/auth/login          → login (admin or nurse)
//   POST /api/auth/register-admin → create first admin account
//   GET  /api/auth/me             → get current logged-in user info
// ================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');   // for hashing passwords
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// ────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────
// Used by: Login page (both admin and nurse)
// Body: { email, password }
// Returns: { token, user }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check all fields are filled
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password.'
      });
    }

    // 2. Find user in database by email
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    // 3. If no user found
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // 4. Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 5. Create JWT token (expires in 8 hours)
    const token = jwt.sign(
      {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 6. If nurse, also get nurse-specific info
    let nurseInfo = null;
    if (user.role === 'nurse') {
      const [nurseRows] = await db.execute(
        'SELECT * FROM nurses WHERE user_id = ?',
        [user.id]
      );
      if (nurseRows.length > 0) nurseInfo = nurseRows[0];
    }

    // 7. Send back token and user info
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        nurseId:  nurseInfo ? nurseInfo.id : null,
        ward:     nurseInfo ? nurseInfo.ward : null
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Try again.' });
  }
});

// ────────────────────────────────────────────────
// POST /api/auth/register-admin
// ────────────────────────────────────────────────
// Used only ONCE to create the first admin account.
// After that, comment this route out for security.
// Body: { name, email, password }
router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }

    // Check if admin already exists
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password before saving (never save plain passwords!)
    // bcrypt saltRounds=10 means it hashes 2^10 = 1024 times → very secure
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to database
    await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'admin']
    );

    res.json({ success: true, message: 'Admin account created! You can now login.' });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ────────────────────────────────────────────────
// GET /api/auth/me
// ────────────────────────────────────────────────
// Returns info about the currently logged-in user.
// Used by frontend to check if session is valid.
// Requires: Authorization header with JWT token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
