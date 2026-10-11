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

test('job CRUD validates input and keeps user records separate', async () => {
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

  const jobPath = `/api/jobs/${jobA.body.id}`;
  const methods = ['GET', 'PUT', 'DELETE'];

  // Every route must require authentication, including reads and deletion.
  for (const method of methods) {
    const response = await request(jobPath, {
      method,
      body: method === 'PUT' ? validBody : undefined,
    });

    assert.equal(response.status, 401);
  }

  // Reject malformed IDs instead of letting SQL convert them into numbers.
  const invalidIds = ['abc', '0', '-1', '1.5', '12abc', '4294967296'];

  for (const id of invalidIds) {
    for (const method of methods) {
      const response = await request(`/api/jobs/${id}`, {
        method,
        token: tokenA,
        body: method === 'PUT' ? validBody : undefined,
      });

      assert.equal(response.status, 400);
    }
  }

  // User B must not read, replace or delete the record owned by user A.
  for (const method of methods) {
    const response = await request(jobPath, {
      method,
      token: tokenB,
      body: method === 'PUT' ? validBody : undefined,
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: 'Työpaikkaa ei löytynyt.',
    });
  }

  // Editing must reject the same invalid inputs as creation.
  for (const body of invalidBodies) {
    const response = await request(jobPath, {
      method: 'PUT',
      token: tokenA,
      body,
    });

    assert.equal(response.status, 400);
  }

  // Failed requests must leave the owner's original record unchanged.
  const originalJob = await request(jobPath, { token: tokenA });
  assert.equal(originalJob.status, 200);
  assert.deepEqual(originalJob.body, jobA.body);

  const replacement = {
    company: 'Yritys A Oy',
    title: 'Ohjelmistokehittäjä',
    status: 'interview',
    priority: 'normal',
    match_level: 'partial',
    location: 'Tampere',
    url: 'https://example.com/jobs/updated',
    deadline: '2028-03-01',
    notes: 'Haastattelu sovittu.',
  };

  // Repeat the same update to check that unchanged values still return 200.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const updated = await request(jobPath, {
      method: 'PUT',
      token: tokenA,
      body: replacement,
    });

    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, {
      id: jobA.body.id,
      ...replacement,
    });
  }

  // A separate GET confirms that the replacement was stored in the database.
  const savedReplacement = await request(jobPath, { token: tokenA });
  assert.equal(savedReplacement.status, 200);
  assert.deepEqual(savedReplacement.body, {
    id: jobA.body.id,
    ...replacement,
  });

  // PUT resets omitted optional fields instead of keeping their previous values.
  const reset = await request(jobPath, {
    method: 'PUT',
    token: tokenA,
    body: validBody,
  });

  assert.equal(reset.status, 200);
  assert.deepEqual(reset.body, {
    id: jobA.body.id,
    ...validBody,
    status: 'interested',
    priority: 'normal',
    match_level: null,
    location: null,
    url: null,
    deadline: null,
    notes: null,
  });

  // The owner can delete the record after reading and editing it.
  const deleted = await request(jobPath, {
    method: 'DELETE',
    token: tokenA,
  });

  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.body, {
    message: 'Työpaikka poistettu.',
  });

  // A deleted record must return the same error as another user's record.
  for (const method of methods) {
    const response = await request(jobPath, {
      method,
      token: tokenA,
      body: method === 'PUT' ? validBody : undefined,
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: 'Työpaikkaa ei löytynyt.',
    });
  }

  // Deletion must also remove the record from the owner's list.
  const remainingJobs = await request('/api/jobs', { token: tokenA });
  assert.equal(remainingJobs.status, 200);
  assert.equal(
    remainingJobs.body.some((job) => job.id === jobA.body.id),
    false
  );

  // All operations on user A's record must leave user B's record untouched.
  const otherJob = await request(`/api/jobs/${jobB.body.id}`, {
    token: tokenB,
  });

  assert.equal(otherJob.status, 200);
  assert.deepEqual(otherJob.body, jobB.body);

  const offerJobs = [];

  // Create records in a mixed order so priority sorting cannot pass by accident.
  for (const priority of ['high', 'low', 'normal', 'high']) {
    const response = await request('/api/jobs', {
      method: 'POST',
      token: tokenA,
      body: {
        company: 'Järjestystesti Oy',
        title: `Tehtävä ${offerJobs.length + 1}`,
        status: 'offer',
        priority,
      },
    });

    assert.equal(response.status, 201);
    offerJobs.push(response.body);
  }

  // Give user B a matching record to test ownership together with filtering.
  const otherOffer = await request('/api/jobs', {
    method: 'POST',
    token: tokenB,
    body: {
      company: 'Toisen käyttäjän yritys',
      title: 'Oma tehtävä',
      status: 'offer',
      priority: 'high',
    },
  });

  assert.equal(otherOffer.status, 201);

  // New records must appear before the owner's older records.
  const newestOfferIds = [...offerJobs].reverse().map((job) => job.id);
  const olderIds = remainingJobs.body.map((job) => job.id);
  const expectedNewestIds = [...newestOfferIds, ...olderIds];

  // The default order and the explicit newest option must produce the same list.
  for (const path of ['/api/jobs', '/api/jobs?sort=newest']) {
    const response = await request(path, { token: tokenA });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.map((job) => job.id),
      expectedNewestIds
    );
  }

  // A status filter must exclude both other statuses and the other user's offer.
  const offers = await request('/api/jobs?status=offer', {
    token: tokenA,
  });

  assert.equal(offers.status, 200);
  assert.deepEqual(
    offers.body.map((job) => job.id),
    newestOfferIds
  );

  // High priorities come first, with the newer high-priority record before the older one.
  const expectedOfferPriorityIds = [
    offerJobs[3].id,
    offerJobs[0].id,
    offerJobs[2].id,
    offerJobs[1].id,
  ];

  const sortedOffers = await request(
    '/api/jobs?status=offer&sort=priority',
    { token: tokenA }
  );

  assert.equal(sortedOffers.status, 200);
  assert.deepEqual(
    sortedOffers.body.map((job) => job.id),
    expectedOfferPriorityIds
  );

  // Earlier test records have normal priority and are older than these offers.
  const allByPriority = await request('/api/jobs?sort=priority', {
    token: tokenA,
  });

  assert.equal(allByPriority.status, 200);
  assert.deepEqual(
    allByPriority.body.map((job) => job.id),
    [
      offerJobs[3].id,
      offerJobs[0].id,
      offerJobs[2].id,
      ...olderIds,
      offerJobs[1].id,
    ]
  );

  // A valid filter with no matching records must return an empty array.
  const rejectedJobs = await request('/api/jobs?status=rejected', {
    token: tokenA,
  });

  assert.equal(rejectedJobs.status, 200);
  assert.deepEqual(rejectedJobs.body, []);

  // The same filter must show user B only their own matching record.
  const otherOffers = await request(
    '/api/jobs?status=offer&sort=priority',
    { token: tokenB }
  );

  assert.equal(otherOffers.status, 200);
  assert.deepEqual(otherOffers.body, [otherOffer.body]);

  // Reject unknown, empty and repeated query options instead of guessing intent.
  const invalidQueries = [
    'status=unknown',
    'status=',
    'sort=unknown',
    'sort=',
    'status=offer&status=interested',
    'sort=priority&sort=newest',
    'status[]=offer',
    `user_id=${users[1].id}`,
  ];

  for (const query of invalidQueries) {
    const response = await request(`/api/jobs?${query}`, {
      token: tokenA,
    });

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.error, 'string');
  }

  // Give user A one saved URL to compare against the import preview.
  const importJob = {
    company: 'Tuontitesti Oy',
    title: 'Kehittäjä',
    url: 'https://example.com/jobs/import-existing',
  };

  const savedImportJob = await request('/api/jobs', {
    method: 'POST',
    token: tokenA,
    body: importJob,
  });

  assert.equal(savedImportJob.status, 201);

  // Include an existing URL, a new URL, a file duplicate and an invalid row.
  const newImportJob = {
    ...importJob,
    url: 'https://example.com/jobs/import-new',
  };

  const importBody = {
    jobs: [
      importJob,
      newImportJob,
      { ...newImportJob, url: `  ${newImportJob.url}  ` },
      { company: 'Puuttuva linkki Oy', title: 'Kehittäjä' },
    ],
  };

  // Take snapshots after setup to prove that preview does not save records.
  const beforePreviewA = await request('/api/jobs', { token: tokenA });
  const beforePreviewB = await request('/api/jobs', { token: tokenB });

  assert.equal(beforePreviewA.status, 200);
  assert.equal(beforePreviewB.status, 200);

  const anonymousPreview = await request('/api/job-import/preview', {
    method: 'POST',
    body: importBody,
  });

  assert.equal(anonymousPreview.status, 401);

  const previewA = await request('/api/job-import/preview', {
    method: 'POST',
    token: tokenA,
    body: importBody,
  });

  assert.equal(previewA.status, 200);
  assert.deepEqual(previewA.body.summary, {
    total: 4,
    ready: 1,
    invalid: 1,
    duplicate: 2,
  });

  assert.deepEqual(
    previewA.body.rows.map((row) => row.status),
    ['duplicate', 'ready', 'duplicate', 'invalid']
  );

  // Valid rows contain the same defaults as ordinary job creation.
  assert.equal(previewA.body.rows[1].job.status, 'interested');
  assert.equal(previewA.body.rows[1].job.priority, 'normal');
  assert.equal(previewA.body.rows[1].job.match_level, null);
  assert.equal(previewA.body.rows[2].job.url, newImportJob.url);
  assert.equal(previewA.body.rows[3].row, 4);
  assert.equal(typeof previewA.body.rows[3].message, 'string');

  // User A's saved URL must not count as an existing record for user B.
  const previewB = await request('/api/job-import/preview', {
    method: 'POST',
    token: tokenB,
    body: importBody,
  });

  assert.equal(previewB.status, 200);
  assert.deepEqual(previewB.body.summary, {
    total: 4,
    ready: 2,
    invalid: 1,
    duplicate: 1,
  });
  assert.equal(previewB.body.rows[0].status, 'ready');

  // Reject invalid document structures and batches above the agreed limit.
  const invalidImports = [
    {},
    [],
    { jobs: [] },
    { jobs: 'wrong type' },
    { jobs: [importJob], user_id: users[1].id },
    { jobs: Array.from({ length: 21 }, () => importJob) },
  ];

  for (const body of invalidImports) {
    const response = await request('/api/job-import/preview', {
      method: 'POST',
      token: tokenA,
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.error, 'string');
  }

  // Keep row validation active even when the document itself is valid.
  const invalidRows = await request('/api/job-import/preview', {
    method: 'POST',
    token: tokenA,
    body: {
      jobs: [
        { ...newImportJob, user_id: users[1].id },
        { ...newImportJob, deadline: '2026-02-30' },
        { ...newImportJob, url: 'javascript:alert(1)' },
        { ...newImportJob, company: ' ' },
      ],
    },
  });

  assert.equal(invalidRows.status, 200);
  assert.equal(invalidRows.body.summary.invalid, 4);
  assert.equal(invalidRows.body.summary.ready, 0);

  // Accept a valid import above the ordinary 16 KiB request limit.
  const largerImport = {
    jobs: Array.from({ length: 20 }, (_, index) => ({
      ...importJob,
      url: `https://example.com/jobs/import-large-${index}`,
      notes: 'a'.repeat(1000),
    })),
  };

  assert.ok(Buffer.byteLength(JSON.stringify(largerImport)) > 16 * 1024);

  const largerPreview = await request('/api/job-import/preview', {
    method: 'POST',
    token: tokenA,
    body: largerImport,
  });

  assert.equal(largerPreview.status, 200);
  assert.equal(largerPreview.body.summary.ready, 20);

  // Reject requests above the separate import body limit.
  const oversizedPreview = await request('/api/job-import/preview', {
    method: 'POST',
    token: tokenA,
    body: {
      jobs: [{ ...importJob, notes: 'a'.repeat(256 * 1024) }],
    },
  });

  assert.equal(oversizedPreview.status, 413);

  // All preview requests must leave both users' saved records unchanged.
  const afterPreviewA = await request('/api/jobs', { token: tokenA });
  const afterPreviewB = await request('/api/jobs', { token: tokenB });

  assert.equal(afterPreviewA.status, 200);
  assert.equal(afterPreviewB.status, 200);
  assert.deepEqual(afterPreviewA.body, beforePreviewA.body);
  assert.deepEqual(afterPreviewB.body, beforePreviewB.body);


  // Reuse the preview fixtures: one saved URL and one new URL.
  const saveBody = {
    jobs: [
      importJob,
      newImportJob,
      { ...newImportJob, url: ` ${newImportJob.url} ` },
    ],
  };

  const anonymousSave = await request('/api/job-import/save', {
    method: 'POST',
    body: saveBody,
  });

  assert.equal(anonymousSave.status, 401);

  // Reject an invalid selection without saving its otherwise valid row.
  const rejectedJob = {
    ...importJob,
    url: 'https://example.com/jobs/import-rejected-batch',
  };

  const rejectedSave = await request('/api/job-import/save', {
    method: 'POST',
    token: tokenA,
    body: {
      jobs: [
        rejectedJob,
        { ...newImportJob, user_id: users[1].id },
      ],
    },
  });

  assert.equal(rejectedSave.status, 400);
  assert.equal(rejectedSave.body.rows[0].row, 2);

  const afterRejectedSave = await request('/api/jobs', {
    token: tokenA,
  });

  assert.equal(afterRejectedSave.status, 200);
  assert.deepEqual(afterRejectedSave.body, afterPreviewA.body);

  // Shared document rules must also protect the save endpoint.
  for (const body of invalidImports) {
    const response = await request('/api/job-import/save', {
      method: 'POST',
      token: tokenA,
      body,
    });

    assert.equal(response.status, 400);
  }

  // Save only the new URL and skip both kinds of duplicate.
  const firstSave = await request('/api/job-import/save', {
    method: 'POST',
    token: tokenA,
    body: saveBody,
  });

  assert.equal(firstSave.status, 201);
  assert.deepEqual(firstSave.body.summary, {
    total: 3,
    imported: 1,
    duplicate: 2,
  });

  assert.deepEqual(
    firstSave.body.rows.map((row) => row.status),
    ['duplicate', 'imported', 'duplicate']
  );

  const importedJob = firstSave.body.rows[1].job;

  assert.ok(Number.isSafeInteger(importedJob.id));
  assert.ok(importedJob.id > 0);
  assert.equal(importedJob.url, newImportJob.url);
  assert.equal(importedJob.status, 'interested');
  assert.equal(importedJob.priority, 'normal');

  // Confirm that the returned job was actually saved.
  const savedJobList = await request('/api/jobs', {
    token: tokenA,
  });

  assert.equal(savedJobList.status, 200);
  assert.equal(
    savedJobList.body.length,
    afterPreviewA.body.length + 1
  );
  assert.deepEqual(
    savedJobList.body.find((job) => job.id === importedJob.id),
    importedJob
  );

  // Importing the same selection again must not create more records.
  const repeatedSave = await request('/api/job-import/save', {
    method: 'POST',
    token: tokenA,
    body: saveBody,
  });

  assert.equal(repeatedSave.status, 200);
  assert.deepEqual(repeatedSave.body.summary, {
    total: 3,
    imported: 0,
    duplicate: 3,
  });

  // Duplicate imports must not overwrite existing titles or priorities.
  const changedDuplicate = await request('/api/job-import/save', {
    method: 'POST',
    token: tokenA,
    body: {
      jobs: [{
        ...newImportJob,
        title: 'Tätä ei saa tallentaa vanhan tilalle',
        priority: 'high',
      }],
    },
  });

  assert.equal(changedDuplicate.status, 200);
  assert.equal(changedDuplicate.body.summary.imported, 0);

  const afterRepeatedSave = await request('/api/jobs', {
    token: tokenA,
  });

  assert.equal(afterRepeatedSave.status, 200);
  assert.deepEqual(afterRepeatedSave.body, savedJobList.body);

  // A different user can import the same URL into their own collection.
  const otherUserSave = await request('/api/job-import/save', {
    method: 'POST',
    token: tokenB,
    body: { jobs: [newImportJob] },
  });

  assert.equal(otherUserSave.status, 201);
  assert.equal(otherUserSave.body.summary.imported, 1);
  assert.notEqual(
    otherUserSave.body.rows[0].job.id,
    importedJob.id
  );

  const otherUserList = await request('/api/jobs', {
    token: tokenB,
  });

  assert.equal(otherUserList.status, 200);
  assert.equal(
    otherUserList.body.length,
    afterPreviewB.body.length + 1
  );
  assert.equal(
    otherUserList.body.some((job) => job.id === importedJob.id),
    false
  );

  // Start two imports together to test the per-user transaction lock.
  const parallelBody = {
    jobs: [{
      ...importJob,
      url: 'https://example.com/jobs/import-parallel',
    }],
  };

  const parallelResults = await Promise.all([
    request('/api/job-import/save', {
      method: 'POST',
      token: tokenA,
      body: parallelBody,
    }),
    request('/api/job-import/save', {
      method: 'POST',
      token: tokenA,
      body: parallelBody,
    }),
  ]);

  assert.deepEqual(
    parallelResults.map((result) => result.status).sort(),
    [200, 201]
  );

  assert.deepEqual(
    parallelResults
      .map((result) => result.body.summary.imported)
      .sort(),
    [0, 1]
  );

  // The database must contain exactly one record from the parallel requests.
  const afterParallelSave = await request('/api/jobs', {
    token: tokenA,
  });

  assert.equal(afterParallelSave.status, 200);
  assert.equal(
    afterParallelSave.body.filter(
      (job) => job.url === parallelBody.jobs[0].url
    ).length,
    1
  );
});