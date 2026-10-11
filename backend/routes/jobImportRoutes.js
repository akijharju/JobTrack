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

// Allow a larger JSON body only for import requests.
router.use(express.json({ limit: '256kb' }));

router.post('/preview', async (req, res) => {
  const validation = validateImport(req.body);

  // Reject an invalid file structure before querying the database.
  if (validation.error) {
    return res.status(400).json({
      error: validation.error,
    });
  }

  // Search only for URLs from valid rows and remove repeated query values.
  const urls = [...new Set(
    validation.rows
      .filter((row) => row.status === 'ready')
      .map((row) => row.job.url)
  )];

  let existingUrls = [];

  if (urls.length > 0) {
    // Only placeholder marks become SQL text; all values remain parameters.
    const placeholders = urls.map(() => '?').join(', ');

    const [existingJobs] = await pool.execute(
      `SELECT url
       FROM jobs
       WHERE user_id = ?
         AND url IN (${placeholders})`,
      [req.user.id, ...urls]
    );

    existingUrls = existingJobs.map((job) => job.url);
  }

  // Exact comparison in JavaScript avoids database collation differences.
  const preview = buildImportPreview(
    validation.rows,
    existingUrls
  );

  // Preview only reads records; saving will have a separate endpoint.
  return res.json(preview);
});

module.exports = router;