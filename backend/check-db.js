const pool = require('./db');

// Run a read-only diagnostic independently of the HTTP server.
async function checkDatabase() {
  try {
    // Verify connectivity without reading application data.
    await pool.execute('SELECT 1');

    // LIMIT 0 checks table access without fetching records or verifying all constraints.
    await pool.execute('SELECT id FROM users LIMIT 0');
    await pool.execute('SELECT id FROM jobs LIMIT 0');

    console.log('Tietokantayhteys toimii. users- ja jobs-taulut löytyvät.');
  } finally {
    // Release all connections so this standalone check can exit.
    await pool.end();
  }
}

checkDatabase().catch((error) => {
  // Avoid logging full database errors that may contain query details.
  console.error(
    'Tietokannan tarkistus epäonnistui:',
    error.code || 'UNKNOWN_ERROR'
  );
  // Report failure to npm and scripts without forcing immediate process termination.
  process.exitCode = 1;
});
