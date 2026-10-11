const { validateJob } = require('./jobValidation');

// Keep import batches small enough to review before saving.
const MAX_IMPORT_JOBS = 20;

function validateImport(body) {
  // Require an object containing only the jobs array.
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== 'jobs') ||
    !Array.isArray(body.jobs)
  ) {
    return {
      error: 'Anna JSON-olio, jonka ainoa kenttä on jobs-taulukko.',
    };
  }

  if (body.jobs.length < 1 || body.jobs.length > MAX_IMPORT_JOBS) {
    return {
      error: `Tuonnissa tulee olla 1–${MAX_IMPORT_JOBS} työpaikkaa.`,
    };
  }

  // Keep the original row numbers so errors are easy to find in the file.
  const rows = body.jobs.map((bodyJob, index) => {
    const validation = validateJob(bodyJob);

    // Reuse the same field rules as the ordinary job form.
    if (validation.error) {
      return {
        row: index + 1,
        status: 'invalid',
        message: validation.error,
        job: null,
      };
    }

    // Imports need a URL so repeated records can be recognized.
    if (validation.value.url === null) {
      return {
        row: index + 1,
        status: 'invalid',
        message: 'JSON-tuonnissa ilmoituksen URL-osoite on pakollinen.',
        job: null,
      };
    }

    return {
      row: index + 1,
      status: 'ready',
      message: null,
      job: validation.value,
    };
  });

  return { rows };
}

function buildImportPreview(rows, existingUrls) {
  // Only URLs belonging to the current user may be passed here.
  const savedUrls = new Set(existingUrls);
  const seenUrls = new Set();

  const previewRows = rows.map((row) => {
    // Invalid rows do not reserve a URL or block later valid rows.
    if (row.status !== 'ready') {
      return row;
    }

    const url = row.job.url;

    // Compare complete URLs exactly after validateJob has trimmed them.
    if (savedUrls.has(url)) {
      return {
        ...row,
        status: 'duplicate',
        message: 'Sama URL-osoite on jo tallennettu työpaikkoihisi.',
      };
    }

    if (seenUrls.has(url)) {
      return {
        ...row,
        status: 'duplicate',
        message: 'Sama URL-osoite esiintyy tiedostossa jo aiemmin.',
      };
    }

    seenUrls.add(url);
    return row;
  });

  // Return counts alongside the rows for the future preview screen.
  const summary = {
    total: previewRows.length,
    ready: 0,
    invalid: 0,
    duplicate: 0,
  };

  for (const row of previewRows) {
    summary[row.status] += 1;
  }

  return {
    summary,
    rows: previewRows,
  };
}

module.exports = { validateImport, buildImportPreview };