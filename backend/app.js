const express = require('express');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

// Read JSON data before handling requests. Limit the body size to 16 KB.
app.use(express.json({ limit: '16kb' }));

// Check that the API responds. This does not check the database.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add the /api/auth prefix to all routes in authRoutes.
app.use('/api/auth', authRoutes);

// Mount job routes under /api/jobs; the router checks authentication itself.
app.use('/api/jobs', jobRoutes);

// Handle errors after the routes. Express needs all four parameters.
app.use((error, req, res, next) => {
  // Let Express handle the error if the response has already started.
  if (res.headersSent) {
    return next(error);
  }

  // Return 400 if the request contains invalid JSON.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Virheellinen JSON.',
    });
  }

  // Return 413 if the request body is too large.
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Pyynnön sisältö on liian suuri.',
    });
  }

  // Log only the error code. Full errors may contain private data.
  console.error('Palvelinvirhe:', error.code || 'UNKNOWN_ERROR');

  // Keep internal error details out of the response.
  return res.status(500).json({
    error: 'Palvelinvirhe.',
  });
});

// Export the app. The server.js file starts the HTTP server.
module.exports = app;
