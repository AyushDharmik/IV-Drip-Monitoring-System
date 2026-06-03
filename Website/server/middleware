// ================================================
// middleware/authMiddleware.js
// ================================================
// WHAT IS MIDDLEWARE?
// Middleware is code that runs BEFORE your route
// handles a request. Think of it like a security
// guard at a door - it checks your ID (JWT token)
// before letting you in.
//
// WHAT IS JWT?
// JSON Web Token - a small digital "badge" given
// to users after login. They send it with every
// request to prove who they are.
// ================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Main auth checker ──────────────────────────
// This runs before any protected route
function verifyToken(req, res, next) {
  // Get token from request header
  // Frontend sends it as:  Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // get part after "Bearer "

  // If no token sent → deny access
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login first.'
    });
  }

  // Verify the token is valid and not expired
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();             // ✅ token valid → allow to proceed
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
}

// ── Admin-only checker ─────────────────────────
// Use this on routes only admins can access
function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    next(); // ✅ is admin → allow
  });
}

// ── Nurse-only checker ─────────────────────────
function verifyNurse(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Nurses only.'
      });
    }
    next();
  });
}

module.exports = { verifyToken, verifyAdmin, verifyNurse };
