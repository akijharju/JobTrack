const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');

// Check the environment before loading the app or opening a database connection.
if (
  process.env.NODE_ENV !== 'test' ||
  process.env.DB_NAME !== 'jobtrack_test' ||
  process.env.DB_USER !== 'jobtrack_test'
) {
  throw new Error('Use the dedicated jobtrack_test database and account.');
}

const app = require('../app');
const pool = require('../db');

// Use a unique account so repeated test runs do not share data.
const username = `it_${randomBytes(12).toString('hex')}`;
const password = 'IntegrationTest_123!';

let server;
let baseUrl;
let databaseVerified = false;

before(async () => {
  // Verify the selected database before allowing test writes or cleanup.
  const [rows] = await pool.execute('SELECT DATABASE() AS name');
  assert.equal(rows[0].name, 'jobtrack_test');
  databaseVerified = true;

  // Run the real app on a free port, separate from the development server.
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    // Delete only the account reserved for this test run.
    if (databaseVerified) {
      await pool.execute(
        'DELETE FROM users WHERE username = ?',
        [username]
      );
    }
  } finally {
    // Release database connections even if cleanup fails.
    await pool.end();
  }
});

// Keep HTTP requests short and give stalled requests a time limit.
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/auth${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test('registration, login and profile work with MariaDB', async () => {
  // Registration must normalize the username and return only public fields.
  const registration = await request('/register', {
    method: 'POST',
    body: {
      username: `  ${username.toUpperCase()}  `,
      password,
    },
  });

  assert.equal(registration.status, 201);
  assert.ok(Number.isSafeInteger(registration.body.id));
  assert.ok(registration.body.id > 0);

  const expectedUser = {
    id: registration.body.id,
    username,
  };

  assert.deepEqual(registration.body, expectedUser);

  // Verify that the stored value is a working password hash.
  const [rows] = await pool.execute(
    'SELECT password_hash FROM users WHERE id = ?',
    [expectedUser.id]
  );

  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].password_hash, password);
  assert.equal(await bcrypt.compare(password, rows[0].password_hash), true);

  // The same normalized username must not create another account.
  const duplicate = await request('/register', {
    method: 'POST',
    body: { username, password },
  });

  assert.equal(duplicate.status, 409);

  // Login must use the same username normalization as registration.
  const login = await request('/login', {
    method: 'POST',
    body: {
      username: ` ${username.toUpperCase()} `,
      password,
    },
  });

  assert.equal(login.status, 200);
  assert.deepEqual(Object.keys(login.body).sort(), ['token', 'user']);
  assert.deepEqual(login.body.user, expectedUser);
  assert.equal(typeof login.body.token, 'string');
  assert.ok(login.body.token.length > 0);

  // Use the issued token to fetch this account through the protected route.
  const profile = await request('/me', { token: login.body.token });

  assert.equal(profile.status, 200);
  assert.deepEqual(profile.body, expectedUser);

  // A request without a token must be rejected.
  const anonymous = await request('/me');
  assert.equal(anonymous.status, 401);

  // Wrong passwords and unknown accounts must return the same public error.
  const wrongPassword = await request('/login', {
    method: 'POST',
    body: { username, password: 'WrongPassword_123!' },
  });

  const unknownUser = await request('/login', {
    method: 'POST',
    body: {
      username: `missing_${randomBytes(8).toString('hex')}`,
      password,
    },
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.deepEqual(wrongPassword.body, {
    error: 'Virheellinen tunnus tai salasana.',
  });
  assert.deepEqual(unknownUser.body, wrongPassword.body);
});