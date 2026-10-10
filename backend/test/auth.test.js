const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a new random secret key just for this test run.
// This keeps the tests isolated from the real .env file.
const signingKey = randomBytes(32);
process.env.JWT_SECRET = signingKey.toString('hex');
process.env.JWT_TTL_SECONDS = '3600';

// Import the auth module after setting the environment variables above.
const { createToken, requireAuth } = require('../auth');

let server;
let baseUrl;

before(async () => {
  const app = express();

  // Set up a simple protected test route using the real middleware.
  app.get('/protected', requireAuth, (req, res) => {
    res.json(req.user);
  });

  await new Promise((resolve, reject) => {
    // Port 0 tells the operating system to pick any free port automatically.
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) {
    return;
  }

  // Stop the server after tests finish so Node.js can exit cleanly.
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

// Helper function to send a GET request to the test route.
async function requestProtected(token) {
  const headers = {};

  // Add the Bearer token only if one was passed in.
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Abort if the server does not respond within 5 seconds.
  const response = await fetch(`${baseUrl}/protected`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test('createToken includes the user ID and configured expiry', () => {
  const token = createToken(42);

  // Check the signature and algorithm (HS256) to ensure the token is valid.
  const payload = jwt.verify(token, signingKey, {
    algorithms: ['HS256'],
  });

  // Check that the user ID is stored in 'sub' and the lifetime is exactly 1 hour.
  assert.equal(payload.sub, '42');
  assert.equal(payload.exp - payload.iat, 3600);

  // Make sure no extra fields were added by mistake.
  assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'sub']);
});

test('a valid token gives the route the verified user ID', async () => {
  // A good token should succeed with status 200 and return the user data.
  const response = await requestProtected(createToken(42));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 42 });
});

test('a missing token is rejected', async () => {
  // Requests without an Authorization header must be rejected with status 401.
  const response = await requestProtected();

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    error: 'Kirjautuminen vaaditaan.',
  });
});

test('a malformed token is rejected', async () => {
  // Invalid text strings that are not real tokens must be rejected.
  const response = await requestProtected('invalid-token');

  assert.equal(response.status, 401);
});

test('an expired token is rejected', async () => {
  // Make a token that is already 60 seconds expired to test expiration logic.
  const token = jwt.sign({ sub: '42' }, signingKey, {
    algorithm: 'HS256',
    expiresIn: -60,
  });

  const response = await requestProtected(token);

  assert.equal(response.status, 401);
});

test('a token signed with another key is rejected', async () => {
  // A token signed with a different secret key should fail validation.
  const token = jwt.sign({ sub: '42' }, randomBytes(32), {
    algorithm: 'HS256',
    expiresIn: 3600,
  });

  const response = await requestProtected(token);

  assert.equal(response.status, 401);
});

test('a token with another algorithm is rejected', async () => {
  // Even with the correct key, only the expected algorithm (HS256) should be accepted.
  const token = jwt.sign({ sub: '42' }, signingKey, {
    algorithm: 'HS384',
    expiresIn: 3600,
  });

  const response = await requestProtected(token);

  assert.equal(response.status, 401);
});

test('a token without an expiry is rejected', async () => {
  // Tokens without an expiration date ('exp') should not be allowed.
  const token = jwt.sign({ sub: '42' }, signingKey, {
    algorithm: 'HS256',
  });

  const response = await requestProtected(token);

  assert.equal(response.status, 401);
});

test('a token with an invalid user ID is rejected', async () => {
  // The token is signed correctly, but the user ID in the payload is invalid.
  const token = jwt.sign({ sub: 'not-a-number' }, signingKey, {
    algorithm: 'HS256',
    expiresIn: 3600,
  });

  const response = await requestProtected(token);

  assert.equal(response.status, 401);
});