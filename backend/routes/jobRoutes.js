const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../auth');
const { validateJob } = require('../jobValidation');

const router = express.Router();

// Check authentication before any job route accesses the database.
router.use(requireAuth);

router.get('/', async (req, res) => {
  // Format the deadline as plain text so no timezone conversion changes it.
  const [jobs] = await pool.execute(
    `SELECT id, company, title, status, priority, match_level,
            location, url,
            DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
            notes
     FROM jobs
     WHERE user_id = ?
     ORDER BY id DESC`,
    [req.user.id]
  );

  // The owner filter ensures that only this user's records are returned.
  res.json(jobs);
});

router.post('/', async (req, res) => {
  const validation = validateJob(req.body);

  // Reject invalid input before writing any part of the record.
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const job = validation.value;

  // Bind validated values in the same order as the SQL columns.
  const [result] = await pool.execute(
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

  // Return the generated ID and checked values without exposing the owner ID.
  return res.status(201).json({
    id: result.insertId,
    ...job,
  });
});

module.exports = router;