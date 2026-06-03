// ================================================
// server.js - Main Server File
// ================================================
// This is the ENTRY POINT of your backend.
// Run this file with:   node server.js
//
// What this file does:
//   1. Creates an Express web server
//   2. Connects all route files
//   3. Serves your frontend HTML files
//   4. Starts listening on port 5000
// ================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config(); // load .env variables

const app = express();

// ── Middleware (runs on every request) ────────
app.use(cors());             // allow frontend to talk to backend
app.use(express.json());     // allow reading JSON from request body
app.use(express.urlencoded({ extended: true }));

// ── Serve Frontend Files ───────────────────────
// This makes your HTML/CSS/JS files accessible
// from the browser at http://localhost:5000
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ────────────────────────────────
// Each route file handles a group of related API endpoints
app.use('/api/auth',     require('./routes/auth'));      // login/logout
app.use('/api/nurses',   require('./routes/nurses'));    // nurse CRUD
app.use('/api/patients', require('./routes/patients')); // patient CRUD
app.use('/api/alerts',   require('./routes/alerts'));   // alert log
app.use('/api/readings', require('./routes/readings')); // sensor history

// ── Health Check ──────────────────────────────
// Visit http://localhost:5000/api/health to check if server is running
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MediFlow Server is running! ✅',
    time: new Date().toLocaleString()
  });
});

// ── Catch-all: serve index.html for all other routes ──
// This allows browser navigation to work
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Handle 404 for API routes ─────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong.' });
});

// ── Start Server ──────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  🏥 MediFlow Server Started!');
  console.log(`  📡 URL: http://localhost:${PORT}`);
  console.log(`  📅 Time: ${new Date().toLocaleString()}`);
  console.log('========================================');
  console.log('');
});
