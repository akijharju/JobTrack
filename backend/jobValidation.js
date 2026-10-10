// Keep these choices aligned with the ENUM columns in schema.sql.
const allowedStatuses = [
  'interested',
  'applied',
  'interview',
  'offer',
  'rejected',
];

const allowedPriorities = ['high', 'normal', 'low'];
const allowedMatchLevels = ['strong', 'partial', 'stretch'];

function isValidWebUrl(value) {
  // Require an explicit web address instead of a relative path.
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    // Parsing checks the address structure without making a network request.
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidDate(value) {
  // Require a four-digit year within MariaDB's supported DATE range.
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  // Use UTC for validation so the computer's timezone cannot change the day.
  const date = new Date(`${value}T00:00:00.000Z`);

  // Reject impossible dates that JavaScript may move into the next month.
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateJob(body) {
  // Reject missing bodies and arrays before reading individual fields.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Anna työpaikan tiedot JSON-oliona.' };
  }

  // The client may describe a job, but it cannot choose its ID or owner.
  const allowedFields = [
    'company',
    'title',
    'status',
    'priority',
    'match_level',
    'location',
    'url',
    'deadline',
    'notes',
  ];

  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    return { error: 'Pyyntö sisältää kentän, jota ei tueta.' };
  }

  // Check types before calling string methods on client input.
  if (typeof body.company !== 'string' || typeof body.title !== 'string') {
    return {
      error: 'Yritys ja tehtävänimike ovat pakollisia merkkijonoja.',
    };
  }

  // Remove surrounding spaces while keeping the original letter case.
  const company = body.company.trim();
  const title = body.title.trim();

  // Count Unicode code points rather than JavaScript string storage units.
  if ([...company].length < 1 || [...company].length > 100) {
    return { error: 'Yrityksen nimen tulee olla 1–100 merkkiä.' };
  }

  if ([...title].length < 1 || [...title].length > 100) {
    return { error: 'Tehtävänimikkeen tulee olla 1–100 merkkiä.' };
  }

  // Defaults apply to missing fields, not to explicit null values.
  const {
    status = 'interested',
    priority = 'normal',
    match_level: matchLevel = null,
  } = body;

  if (!allowedStatuses.includes(status)) {
    return {
      error:
        'Tilan tulee olla interested, applied, interview, offer tai rejected.',
    };
  }

  if (!allowedPriorities.includes(priority)) {
    return { error: 'Prioriteetin tulee olla high, normal tai low.' };
  }

  // A null match level means that the user has not assessed the role yet.
  if (matchLevel !== null && !allowedMatchLevels.includes(matchLevel)) {
    return {
      error: 'Sopivuusluokan tulee olla strong, partial, stretch tai null.',
    };
  }

  // Describe optional text fields once so they follow the same basic rules.
  const textFields = [
    ['location', 'Sijainti', 150],
    ['url', 'URL-osoite', 2048],
    ['deadline', 'Hakuaika', 10],
    ['notes', 'Muistiinpanot', 2000],
  ];

  const details = {};

  for (const [field, label, maxLength] of textFields) {
    const value = body[field];

    // Store missing information consistently as SQL NULL.
    if (value === undefined || value === null) {
      details[field] = null;
      continue;
    }

    // Do not silently convert numbers or objects into text.
    if (typeof value !== 'string') {
      return { error: `${label}: anna merkkijono tai null.` };
    }

    // Keep internal spaces and line breaks, including those in notes.
    const trimmed = value.trim();

    if ([...trimmed].length > maxLength) {
      return { error: `${label}: enimmäispituus on ${maxLength} merkkiä.` };
    }

    // Treat an empty form field as missing information.
    details[field] = trimmed === '' ? null : trimmed;
  }

  // Only web links are accepted; scripts and other URL schemes are rejected.
  if (details.url !== null && !isValidWebUrl(details.url)) {
    return { error: 'Anna kelvollinen http://- tai https://-osoite.' };
  }

  // Check the actual calendar date, not just the shape of the text.
  if (details.deadline !== null && !isValidDate(details.deadline)) {
    return {
      error: 'Anna todellinen hakupäivä muodossa YYYY-MM-DD, vuosilta 1000–9999.',
    };
  }

  // Return a new object containing only validated and normalized fields.
  return {
    value: {
      company,
      title,
      status,
      priority,
      match_level: matchLevel,
      ...details,
    },
  };
}

module.exports = { validateJob };