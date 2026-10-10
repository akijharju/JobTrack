const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../auth');
const { validateJob, validateJobQuery } = require('../jobValidation');

const router = express.Router();

// Check authentication before any job route accesses the database.
router.use(requireAuth);

// Validate the ID once for every route that contains an :id parameter.
router.param('id', (req, res, next, value) => {
  const jobId = Number(value);

  // Accept only positive whole numbers that fit the database's INT UNSIGNED.
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(jobId) ||
    jobId > 4294967295
  ) {
    return res.status(400).json({
      error: 'Työpaikan tunnisteen tulee olla positiivinen kokonaisluku välillä 1–4294967295.',
    });
  }

  // Give route handlers a checked number instead of the original URL text.
  req.jobId = jobId;
  next();
});

// Reuse the same fields and ownership check when reading a single job.
async function findOwnJob(jobId, userId) {
  const [rows] = await pool.execute(
    `SELECT id, company, title, status, priority, match_level,
            location, url,
            DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
            notes
     FROM jobs
     WHERE id = ? AND user_id = ?`,
    [jobId, userId]
  );

  // Undefined means that no matching record belongs to this user.
  return rows[0];
}

router.get('/', async (req, res) => {
  const validation = validateJobQuery(req.query);

  // Reject invalid query options before sending anything to the database.
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { status, sort } = validation.value;

  // Ownership is always required, even when no status filter is selected.
  const parameters = [req.user.id];
  let statusFilter = '';

  if (status !== null) {
    // Bind the status as a value instead of inserting client text into SQL.
    statusFilter = ' AND status = ?';
    parameters.push(status);
  }

  // Choose SQL only from fixed strings written here, never from user input.
  const orderBy = sort === 'priority'
    ? `CASE priority
         WHEN 'high' THEN 1
         WHEN 'normal' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END ASC, id DESC`
    : 'id DESC';

  // Apply ownership, filtering and ordering before returning the records.
  const [jobs] = await pool.execute(
    `SELECT id, company, title, status, priority, match_level,
            location, url,
            DATE_FORMAT(deadline, '%Y-%m-%d') AS deadline,
            notes
     FROM jobs
     WHERE user_id = ?${statusFilter}
     ORDER BY ${orderBy}`,
    parameters
  );

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

router.get('/:id', async (req, res) => {
  const job = await findOwnJob(req.jobId, req.user.id);

  // Do not reveal whether a missing result belongs to another user.
  if (!job) {
    return res.status(404).json({ error: 'Työpaikkaa ei löytynyt.' });
  }

  return res.json(job);
});

router.put('/:id', async (req, res) => {
  // Apply the same field rules and defaults as when creating a job.
  const validation = validateJob(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const job = validation.value;

  // Check ownership in the UPDATE itself so another user's row cannot change.
  await pool.execute(
    `UPDATE jobs
     SET company = ?, title = ?, status = ?, priority = ?,
         match_level = ?, location = ?, url = ?, deadline = ?, notes = ?
     WHERE id = ? AND user_id = ?`,
    [
      job.company,
      job.title,
      job.status,
      job.priority,
      job.match_level,
      job.location,
      job.url,
      job.deadline,
      job.notes,
      req.jobId,
      req.user.id,
    ]
  );

  // Read the saved row; submitting unchanged values must also succeed.
  const updatedJob = await findOwnJob(req.jobId, req.user.id);

  if (!updatedJob) {
    return res.status(404).json({ error: 'Työpaikkaa ei löytynyt.' });
  }

  return res.json(updatedJob);
});

router.delete('/:id', async (req, res) => {
  // Both conditions must match before MariaDB can delete the record.
  const [result] = await pool.execute(
    'DELETE FROM jobs WHERE id = ? AND user_id = ?',
    [req.jobId, req.user.id]
  );

  // Zero deleted rows means this user had no matching job.
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Työpaikkaa ei löytynyt.' });
  }

  return res.json({ message: 'Työpaikka poistettu.' });
});

module.exports = router;