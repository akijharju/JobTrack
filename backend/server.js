const app = require('./app');

const port = 3000;

// Keep network startup separate from route definitions in app.js.
app.listen(port, () => {
  console.log(`JobTrack API käynnissä osoitteessa http://localhost:${port}`);
});
