const app = require('./app');

const port = 3000;

app.listen(port, () => {
  console.log(`JobTrack API käynnissä osoitteessa http://localhost:${port}`);
});