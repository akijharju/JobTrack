const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../auth');
const {
  validateImport,
  buildImportPreview,
} = require('../jobImport');

const router = express.Router();

// Verify the token before reading a larger import body.
router.use(requireAuth);

// Keep the larger body limit restricted to import requests.
router.use(express.json({ limit: '256kb' }));

async function findExistingUrls(database, userId, rows) {
  // Search only valid rows and avoid repeated query parameters.
  const urls = [...new Set(
    rows
      .filter((row) => row.status === 'ready')
      .map((row) => row.job.url)
  )];

  if (urls.length === 0) {
    return [];
  }

  // Only placeholder marks become SQL text; values remain parameters.
  const placeholders = urls.map(() => '?').join(', ');

  // The caller supplies either the pool or one transaction connection.
  const [existingJobs] = await database.execute(
    `SELECT url
     FROM jobs
     WHERE user_id = ?
       AND url IN (${placeholders})`,
    [userId, ...urls]
  );

  return existingJobs.map((job) => job.url);
}

router.post('/preview', async (req, res) => {
  const validation = validateImport(req.body);

  if (validation.error) {
    return res.status(400).json({
      error: validation.error,
    });
  }

  // Preview only reads the current user's possible duplicates.
  const existingUrls = await findExistingUrls(
    pool,
    req.user.id,
    validation.rows
  );

  return res.json(
    buildImportPreview(validation.rows, existingUrls)
  );
});

router.post('/save', async (req, res) => {
  // Never trust an earlier preview or validation done in the browser.
  const validation = validateImport(req.body);

  if (validation.error) {
    return res.status(400).json({
      error: validation.error,
    });
  }

  // Reject the entire selection before writing if any row is invalid.
  const invalidRows = validation.rows.filter(
    (row) => row.status === 'invalid'
  );

  if (invalidRows.length > 0) {
    return res.status(400).json({
      error: 'Korjaa virheelliset työpaikat ennen tallennusta.',
      rows: invalidRows,
    });
  }

  // Every query in a transaction must use the same connection.
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Serialize imports for this user before checking existing URLs.
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [req.user.id]
    );

    // A valid token may belong to an account that has been deleted.
    if (users.length === 0) {
      await connection.rollback();

      return res.status(401).json({
        error: 'Käyttäjätiliä ei löydy.',
      });
    }

    // Check again because saved records may have changed after preview.
    const existingUrls = await findExistingUrls(
      connection,
      req.user.id,
      validation.rows
    );

    const preview = buildImportPreview(
      validation.rows,
      existingUrls
    );

    const resultRows = [];
    let imported = 0;

    for (const row of preview.rows) {
      // Keep duplicate information in the response without updating the job.
      if (row.status === 'duplicate') {
        resultRows.push(row);
        continue;
      }

      const job = row.job;

      // Ownership always comes from the verified token.
      const [result] = await connection.execute(
        `INSERT INTO jobs
           (user_id, company, title, status, priority, match_level,
            location, url, deadline, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          job.company,
          job.title,
          job.status,
          job.priority,
          job.match_level,
          job.location,
          job.url,
          job.deadline,
          job.notes,
        ]
      );

      imported += 1;

      resultRows.push({
        row: row.row,
        status: 'imported',
        message: null,
        job: {
          id: result.insertId,
          ...job,
        },
      });
    }

    // Make all new records permanent and release the transaction locks.
    await connection.commit();

    // A repeated import succeeds even when every row is skipped.
    return res.status(imported > 0 ? 201 : 200).json({
      summary: {
        total: resultRows.length,
        imported,
        duplicate: preview.summary.duplicate,
      },
      rows: resultRows,
    });
  } catch (error) {
    // Undo this transaction's writes if a database operation fails.
    await connection.rollback();
    throw error;
  } finally {
    // Return the connection to the pool after success or failure.
    connection.release();
  }
});

module.exports = router;