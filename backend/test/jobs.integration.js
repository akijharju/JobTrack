const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

// Stop before loading database modules if the test environment is not selected.
if (
  process.env.NODE_ENV !== 'test' ||
  process.env.DB_NAME !== 'jobtrack_test' ||
  process.env.DB_USER !== 'jobtrack_test'
) {
  throw new Error('Use the dedicated jobtrack_test database and account.');
}

const app = require('../app');
const pool = require('../db');
const { createToken } = require('../auth');

// Reserve unique names so cleanup only targets accounts from this test run.
const usernames = [
  `jobs_a_${randomBytes(8).toString('hex')}`,
  `jobs_b_${randomBytes(8).toString('hex')}`,
];

let server;
let baseUrl;
let databaseVerified = false;

before(async () => {
  // Confirm the actual database before allowing test writes or cleanup.
  const [rows] = await pool.execute('SELECT DATABASE() AS name');
  assert.equal(rows[0].name, 'jobtrack_test');
  databaseVerified = true;

  // Use a free local port so the development server can stay running.
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    // Stop accepting requests before removing the test records.
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    if (databaseVerified) {
      // Find only the accounts reserved for this test run.
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE username IN (?, ?)',
        usernames
      );

      for (const user of users) {
        // Remove jobs first because the foreign key protects their owner.
        await pool.execute(
          'DELETE FROM jobs WHERE user_id = ?',
          [user.id]
        );

        await pool.execute(
          'DELETE FROM users WHERE id = ?',
          [user.id]
        );
      }
    }
  } finally {
    // Release connections even when a test or cleanup operation fails.
    await pool.end();
  }
});

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};

  // Tell Express to parse the body as JSON only when a body is present.
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Omit this header when testing access without authentication.
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
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

test('job creation validates input and keeps user records separate', async () => {
  const users = [];

  // Create two real accounts so both owners satisfy the database foreign key.
  for (const username of usernames) {
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { username, password: 'JobsIntegration_123!' },
    });

    assert.equal(registration.status, 201);
    users.push(registration.body);
  }

  // Login is tested separately; use the real token function for these accounts.
  const tokenA = createToken(users[0].id);
  const tokenB = createToken(users[1].id);

  // Protect both reading and writing when no token is provided.
  const anonymousList = await request('/api/jobs');
  assert.equal(anonymousList.status, 401);

  const anonymousCreate = await request('/api/jobs', {
    method: 'POST',
    body: { company: 'Testiyritys', title: 'Kehittäjä' },
  });
  assert.equal(anonymousCreate.status, 401);

  // A new account should have no jobs.
  const emptyList = await request('/api/jobs', { token: tokenA });
  assert.equal(emptyList.status, 200);
  assert.deepEqual(emptyList.body, []);

  const validBody = {
    company: 'Testiyritys',
    title: 'Kehittäjä',
  };

  // Change one field at a time so each case checks a specific validation rule.
  const invalidBodies = [
    null,
    [],
    {},
    { ...validBody, company: 123 },
    { ...validBody, company: '   ' },
    { ...validBody, title: '   ' },
    { ...validBody, company: 'a'.repeat(101) },
    { ...validBody, title: 'a'.repeat(101) },
    { ...validBody, user_id: users[1].id },
    { ...validBody, status: 'unknown' },
    { ...validBody, status: null },
    { ...validBody, status: 123 },
    { ...validBody, priority: 'urgent' },
    { ...validBody, priority: null },
    { ...validBody, priority: 123 },
    { ...validBody, match_level: 'perfect' },
    { ...validBody, match_level: '' },
    { ...validBody, match_level: 123 },
    { ...validBody, location: 123 },
    { ...validBody, location: 'a'.repeat(151) },
    { ...validBody, url: false },
    { ...validBody, url: 'ei-osoite' },
    { ...validBody, url: 'javascript:alert(1)' },
    { ...validBody, url: 'https://example.com/' + 'a'.repeat(2048) },
    { ...validBody, deadline: 20261031 },
    { ...validBody, deadline: '31.10.2026' },
    { ...validBody, deadline: '2026-02-30' },
    { ...validBody, deadline: '2026-02-29' },
    { ...validBody, deadline: '2026-13-01' },
    { ...validBody, notes: [] },
    { ...validBody, notes: 'a'.repeat(2001) },
  ];

  for (const body of invalidBodies) {
    const response = await request('/api/jobs', {
      method: 'POST',
      token: tokenA,
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.error, 'string');
  }

  // Save explicit choices for user A, including high priority for a stretch role.
  const jobA = await request('/api/jobs', {
    method: 'POST',
    token: tokenA,
    body: {
      company: '  Yritys A  ',
      title: '  Kehittäjä  ',
      status: 'applied',
      priority: 'high',
      match_level: 'stretch',
      location: '  Helsinki / etä  ',
      url: '  https://example.com/jobs/123  ',
      deadline: '2028-02-29',
      notes: '  React ja Node.js.\nKysy etätyöstä.  ',
    },
  });

  // Omit optional fields for user B to verify the default values.
  const jobB = await request('/api/jobs', {
    method: 'POST',
    token: tokenB,
    body: {
      company: 'Yritys B',
      title: 'Testaaja',
    },
  });

  assert.equal(jobA.status, 201);
  assert.equal(jobB.status, 201);
  assert.ok(Number.isSafeInteger(jobA.body.id) && jobA.body.id > 0);
  assert.ok(Number.isSafeInteger(jobB.body.id) && jobB.body.id > 0);
  assert.notEqual(jobA.body.id, jobB.body.id);

  // Check trimming and confirm that each explicit choice is returned unchanged.
  assert.deepEqual(jobA.body, {
    id: jobA.body.id,
    company: 'Yritys A',
    title: 'Kehittäjä',
    status: 'applied',
    priority: 'high',
    match_level: 'stretch',
    location: 'Helsinki / etä',
    url: 'https://example.com/jobs/123',
    deadline: '2028-02-29',
    notes: 'React ja Node.js.\nKysy etätyöstä.',
  });

  // Defaults must be visible in the response, not just stored in the database.
  assert.deepEqual(jobB.body, {
    id: jobB.body.id,
    company: 'Yritys B',
    title: 'Testaaja',
    status: 'interested',
    priority: 'normal',
    match_level: null,
    location: null,
    url: null,
    deadline: null,
    notes: null,
  });

  // Read the records again to verify storage and user-specific filtering.
  const listA = await request('/api/jobs', { token: tokenA });
  const listB = await request('/api/jobs', { token: tokenB });

  assert.equal(listA.status, 200);
  assert.equal(listB.status, 200);
  assert.deepEqual(listA.body, [jobA.body]);
  assert.deepEqual(listB.body, [jobB.body]);

    // Empty strings, whitespace and explicit null must all mean missing details.
  for (const value of ['', '   ', null]) {
    const response = await request('/api/jobs', {
      method: 'POST',
      token: tokenA,
      body: {
        ...validBody,
        location: value,
        url: value,
        deadline: value,
        notes: value,
      },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.location, null);
    assert.equal(response.body.url, null);
    assert.equal(response.body.deadline, null);
    assert.equal(response.body.notes, null);

    // Read the record back to check stored NULL values as well as the response.
    const list = await request('/api/jobs', { token: tokenA });
    assert.equal(list.status, 200);

    const savedJob = list.body.find((job) => job.id === response.body.id);
    assert.deepEqual(savedJob, response.body);
  }
});