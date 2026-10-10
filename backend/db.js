// The Promise API lets callers wait for database operations with await.
const mysql = require('mysql2/promise');

// Fail early if configuration is missing, without exposing its values.
const requiredVariables = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

// Reject empty values as well as missing variables before creating the pool.
for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

// Environment values are strings; validate the converted port before use.
const port = Number(process.env.DB_PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

// Create connections on demand and reuse them across queries.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  // Use the application account rather than the database administrator.
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Queue queries when all connections are busy instead of failing immediately.
  waitForConnections: true,
  // Cap simultaneous connections to limit database resource use.
  connectionLimit: 10,
  // Support the same Unicode character set as the database tables.
  charset: 'utf8mb4',
});

// Share one pool across modules; close it only when its process is finished.
module.exports = pool;
