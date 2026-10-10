# JobTrack

## Sovelluksen tarkoitus

JobTrack on työnhaun seurantasovellus, jonka toteutan Full Stack Web Development -opintojakson harjoitustyönä. Sovelluksen avulla voin tallentaa kiinnostavia työpaikkoja ja seurata omien hakemusteni etenemistä yhdessä paikassa.

Tavoitteena on oppia rakentamaan kokonainen web-sovellus ja ymmärtää käyttöliittymän, palvelimen ja tietokannan välinen toiminta.

## Ensimmäisen version suunnitellut ominaisuudet

- Käyttäjän rekisteröityminen, kirjautuminen ja uloskirjautuminen.
- Omien työpaikkatietojen lisääminen, listaaminen, muokkaaminen ja poistaminen eli CRUD-toiminnot.
- Hakemuksen tilan seuranta ja työpaikkojen suodatus tilan perusteella.
- Tietojen pysyvä tallentaminen MariaDB-tietokantaan.
- Käyttäjäkohtaiset tiedot, joihin vain niiden omistajalla on pääsy.

Frontend käyttää backendin REST API -rajapintaa. Keskeiset toiminnot, virhetilanteet ja käyttäjien tietojen eristäminen testataan toteutuksen edetessä.

## Suunnitellut teknologiat

- **React** – sovelluksen käyttöliittymä selaimessa.
- **Node.js ja Express** – backend ja REST API, joka käsittelee käyttöliittymän pyynnöt.
- **MariaDB** – käyttäjien ja työpaikkatietojen tallentaminen.
- **Docker Compose** – sovelluksen palvelujen käynnistäminen ja hallinta kontteina.
- **Nginx** – frontendin tiedostojen tarjoaminen selaimelle ja API-pyyntöjen välittäminen backendille.

## Myöhempi laajennus

Perustoimintojen valmistuttua sovellukseen lisätään työpaikkojen tuonti JSON-tiedostosta. Tarkoituksena on tuoda ChatGPT:ssä käyttämäni työpaikkavahdin löytämiä työpaikkoja sovellukseen käsin siirrettävällä tiedostolla.

Tuontiin suunnitellaan esikatselu, tallennettavien työpaikkojen valinta, tietojen validointi ja saman ilmoituksen toistuvan tuonnin käsittely. JSON-muoto sovitaan tietomallin suunnittelun yhteydessä. Suora automaattinen yhteys ChatGPT:n ja sovelluksen välillä jää jatkokehitykseen.

## Projektin nykytila

Backendin ensimmäinen versio on toteutettu Node.js:llä ja Express 5:llä. Sovelluksen reitit määritellään tiedostossa `backend/app.js`, ja `backend/server.js` käynnistää palvelimen porttiin 3000.

Reitti `GET /api/health` palauttaa JSON-vastauksen `{"status":"ok"}`. Sen toiminta on tarkistettu käsin curlilla. Reitti kertoo backendin vastaavan pyyntöihin, mutta ei tarkista tietokantaa.

Työskentelyohjeet ovat tiedostossa `AGENTS.md`. Kehitysympäristössä on käytössä Node.js 24 nvm:n kautta. Docker-palveluun on saatu yhteys komennolla `docker info --format '{{.ServerVersion}}'`.

Frontend, kirjautuminen, työpaikkojen käsittely, tietokanta ja Docker-asetukset ovat vielä toteuttamatta.

## Backendin käynnistäminen kehityksessä

Kehityksessä käytetään Node.js 24:ää ja npm:ää. Asenna riippuvuudet ensimmäisellä käyttökerralla repon juuresta seuraavasti:

```sh
cd backend
npm install
```

Käynnistä backend samassa hakemistossa:

```sh
npm run dev
```

Palvelin kuuntelee osoitteessa `http://localhost:3000`. Kehitystila käynnistää palvelimen uudelleen koodin muuttuessa. Palvelimen voi pysäyttää näppäinyhdistelmällä Ctrl+C.

## Testaus

Kun backend on käynnissä, suorita toisessa terminaalissa:

```sh
curl -i http://localhost:3000/api/health
```

Odotettu HTTP-status on `200 OK` ja vastauksen runko `{"status":"ok"}`. Tämä käsintesti on onnistunut paikallisessa kehitysympäristössä.

Automaattisia testejä ei ole vielä toteutettu. `package.json`-tiedoston `test`-komento on npm:n luoma oletus, joka päättyy virheeseen eikä suorita sovellustestejä.
