// ================================================
// db.js - MySQL Database Connection
// ================================================
// This file creates ONE connection to MySQL and
// shares it with all other files that need it.
// Think of it like a phone line to your database.
// ================================================

const mysql = require('mysql2');
require('dotenv').config();

// Create the connection using values from .env file
const db = mysql.createPool({
  host:     process.env.DB_HOST,       // usually 'localhost'
  user:     process.env.DB_USER,       // usually 'root'
  password: process.env.DB_PASSWORD,   // your MySQL password
  database: process.env.DB_NAME,       // 'mediflow'
  waitForConnections: true,
  connectionLimit: 10,                 // max 10 connections at once
  queueLimit: 0
});

// Test the connection when server starts
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    console.error('👉 Check your .env file - is your password correct?');
    return;
  }
  console.log('✅ MySQL Database Connected Successfully!');
  connection.release(); // release back to pool
});

// Export so other files can use it
// Usage in other files:  const db = require('../db');
module.exports = db.promise(); // .promise() lets us use async/await
