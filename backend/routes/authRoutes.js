const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { createToken, requireAuth } = require('../auth');

// Group authentication routes so app.js can mount them under a shared prefix.
const router = express.Router();

// Compare against this hash when the username does not exist.
const dummyPasswordHash = bcrypt.hashSync('dummy-password-for-timing', 10);

// Create an account without logging the user in or issuing an access token.
router.post('/register', async (req, res) => {
  // Reject missing bodies and arrays before reading registration fields.
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Anna tiedot JSON-oliona.' });
  }

  const { username, password } = req.body;

  // Validate types before calling string methods or measuring password length.
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Käyttäjätunnus ja salasana ovat pakollisia merkkijonoja.',
    });
  }

  // Treat casing and surrounding whitespace consistently during registration and login.
  const normalizedUsername = username.trim().toLowerCase();

  // Accept only 3–30 ASCII letters, digits or underscores in the entire username.
  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    return res.status(400).json({
      error: 'Käyttäjätunnuksessa tulee olla 3–30 kirjainta, numeroa tai alaviivaa.',
    });
  }

  // Count Unicode code points for the minimum and UTF-8 bytes for bcrypt's 72-byte limit.
  if ([...password].length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      error: 'Salasanan tulee olla vähintään 8 merkkiä ja enintään 72 tavua.',
    });
  }

  // Hash the unchanged password with a fresh random salt and bcrypt cost factor 10.
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Bind values to the placeholders in order so input cannot become SQL syntax.
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [normalizedUsername, passwordHash]
    );

    // Return only the generated ID and public username; exclude the password and hash.
    return res.status(201).json({
      id: result.insertId,
      username: normalizedUsername,
    });
  } catch (error) {
    // Rely on UNIQUE rather than a preliminary SELECT that could race with another request.
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Käyttäjätunnus on jo käytössä.',
      });
    }

    // Express 5 forwards rejected async handlers to the error-handling middleware.
    throw error;
  }
});

// Verify credentials and return a token for later requests.
router.post('/login', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      error: 'Anna tiedot JSON-oliona.',
    });
  }

  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Käyttäjätunnus ja salasana ovat pakollisia merkkijonoja.',
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const loginError = 'Virheellinen tunnus tai salasana.';

  // Reject credentials that could not have passed registration.
  if (
    !/^[a-z0-9_]{3,30}$/.test(normalizedUsername) ||
    [...password].length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(401).json({ error: loginError });
  }

  const [rows] = await pool.execute(
    'SELECT id, username, password_hash FROM users WHERE username = ?',
    [normalizedUsername]
  );

  const user = rows[0];

  // Run a password comparison even when no matching user exists.
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : dummyPasswordHash
  );

  // Use the same response for a missing user and an incorrect password.
  if (!user || !passwordMatches) {
    return res.status(401).json({ error: loginError });
  }

  // Return only public user fields alongside the token.
  return res.json({
    token: createToken(user.id),
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

// Run requireAuth before reading the current user's details.
router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, username FROM users WHERE id = ?',
    [req.user.id]
  );

  const user = rows[0];

  // A signed token may still refer to an account that no longer exists.
  if (!user) {
    return res.status(401).json({
      error: 'Käyttäjätiliä ei löydy.',
    });
  }

  return res.json(user);
});

module.exports = router;
