const express = require('express');

const app = express();

// Check that the API responds; database availability is not checked here.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export without opening a port so tests can control the server lifecycle.
module.exports = app;
