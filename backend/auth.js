const jwt = require('jsonwebtoken');

const secretHex = process.env.JWT_SECRET;
const tokenLifetime = Number(process.env.JWT_TTL_SECONDS);

// Require the 32-byte random key generated as 64 hexadecimal characters.
if (!secretHex || !/^[a-f0-9]{64}$/i.test(secretHex)) {
  throw new Error('JWT_SECRET must contain 64 hexadecimal characters.');
}

// Read the lifetime as seconds, not as a time string.
if (!Number.isSafeInteger(tokenLifetime) || tokenLifetime <= 0) {
  throw new Error('JWT_TTL_SECONDS must be a positive integer.');
}

const signingKey = Buffer.from(secretHex, 'hex');

function createToken(userId) {
  // The subject identifies the user. No password data goes into the token.
  return jwt.sign({}, signingKey, {
    subject: String(userId),
    algorithm: 'HS256',
    expiresIn: tokenLifetime,
  });
}

function requireAuth(req, res, next) {
  // Read the token from the Authorization: Bearer header.
  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer (\S+)$/i);

  if (!match) {
    return res.status(401).json({
      error: 'Kirjautuminen vaaditaan.',
    });
  }

  let payload;

  try {
    // Verify the signature and expiry. Accept only our chosen algorithm.
    payload = jwt.verify(match[1], signingKey, {
      algorithms: ['HS256'],
    });
  } catch {
    return res.status(401).json({
      error: 'Istunto on virheellinen tai vanhentunut.',
    });
  }

  // Accept only tokens with an expiry and a positive integer user ID.
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof payload.exp !== 'number' ||
    typeof payload.sub !== 'string' ||
    !/^[1-9]\d*$/.test(payload.sub)
  ) {
    return res.status(401).json({
      error: 'Virheellinen istunto.',
    });
  }

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId)) {
    return res.status(401).json({
      error: 'Virheellinen istunto.',
    });
  }

  // Later routes use this verified ID instead of an ID sent in the request body.
  req.user = { id: userId };
  next();
}

module.exports = { createToken, requireAuth };