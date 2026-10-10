const app = require('./app');

const port = 3000;

// Keep network startup separate from route definitions in app.js.
app.listen(port, () => {
  // This callback runs once the server is listening, not for each request.
  console.log(`JobTrack API käynnissä osoitteessa http://localhost:${port}`);
});
