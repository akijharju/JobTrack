const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Check the token before any job route can read or change database records.
router.use(requireAuth);

// Keep these values aligned with the ENUM columns in schema.sql.
const allowedStatuses = [
  'interested',
  'applied',
  'interview',
  'offer',
  'rejected',
];

const allowedPriorities = ['high', 'normal', 'low'];
const allowedMatchLevels = ['strong', 'partial', 'stretch'];

function validateJob(body) {
  // Reject missing bodies and arrays before reading individual fields.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Anna työpaikan tiedot JSON-oliona.' };
  }

  // Accept only supported fields; the client cannot choose the record owner.
  const allowedFields = [
    'company',
    'title',
    'status',
    'priority',
    'match_level',
  ];

  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    return {
      error:
        'Sallitut kentät ovat company, title, status, priority ja match_level.',
    };
  }

  // Check types before calling string methods on data from the client.
  if (typeof body.company !== 'string' || typeof body.title !== 'string') {
    return {
      error: 'Yritys ja tehtävänimike ovat pakollisia merkkijonoja.',
    };
  }

  // Remove accidental spaces while keeping the original letter case.
  const company = body.company.trim();
  const title = body.title.trim();

  // Count Unicode code points instead of JavaScript string storage units.
  if ([...company].length < 1 || [...company].length > 100) {
    return { error: 'Yrityksen nimen tulee olla 1–100 merkkiä.' };
  }

  if ([...title].length < 1 || [...title].length > 100) {
    return { error: 'Tehtävänimikkeen tulee olla 1–100 merkkiä.' };
  }

  // Apply defaults only to missing fields; explicit null values stay unchanged.
  const {
    status = 'interested',
    priority = 'normal',
    match_level: matchLevel = null,
  } = body;

  // Reject unknown values here so the client receives a clear validation error.
  if (!allowedStatuses.includes(status)) {
    return {
      error:
        'Tilan tulee olla interested, applied, interview, offer tai rejected.',
    };
  }

  if (!allowedPriorities.includes(priority)) {
    return {
      error: 'Prioriteetin tulee olla high, normal tai low.',
    };
  }

  // Null means that the user has not assessed the skill match yet.
  if (matchLevel !== null && !allowedMatchLevels.includes(matchLevel)) {
    return {
      error: 'Sopivuusluokan tulee olla strong, partial, stretch tai null.',
    };
  }

  // Build a new object containing only checked and normalized values.
  return {
    value: {
      company,
      title,
      status,
      priority,
      match_level: matchLevel,
    },
  };
}

router.get('/', async (req, res) => {
  // Filter by the verified owner before returning any database records.
  const [jobs] = await pool.execute(
    `SELECT id, company, title, status, priority, match_level
     FROM jobs
     WHERE user_id = ?
     ORDER BY id DESC`,
    [req.user.id]
  );

  // Return the same public fields as the creation route.
  res.json(jobs);
});

router.post('/', async (req, res) => {
  const validation = validateJob(req.body);

  // Invalid requests must stop before any database write.
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const job = validation.value;

  // Bind each checked value to a placeholder and take ownership from the token.
  const [result] = await pool.execute(
    `INSERT INTO jobs
       (user_id, company, title, status, priority, match_level)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      job.company,
      job.title,
      job.status,
      job.priority,
      job.match_level,
    ]
  );

  // Spread only the validated object, never the original request body.
  return res.status(201).json({
    id: result.insertId,
    ...job,
  });
});

module.exports = router;