# JobTrack

## Sovelluksen tarkoitus

JobTrack on työnhaun seurantasovellus, jonka toteutan Full Stack Web Development -opintojakson harjoitustyönä. Sovelluksen avulla voin tallentaa kiinnostavia työpaikkoja ja seurata omien hakemusteni etenemistä yhdessä paikassa.

Tavoitteena on oppia rakentamaan kokonainen web-sovellus ja ymmärtää käyttöliittymän, palvelimen ja tietokannan välinen toiminta.

## Ensimmäisen version suunnitellut ominaisuudet

- Käyttäjän rekisteröityminen, kirjautuminen ja uloskirjautuminen.
- Omien työpaikkatietojen lisääminen, listaaminen, muokkaaminen ja poistaminen eli CRUD-toiminnot.
- Hakemuksen tilan seuranta ja työpaikkojen suodatus tilan perusteella.
- Työpaikan prioriteetin valinta ja listan järjestäminen prioriteetin mukaan.
- Valinnainen sopivuusluokka oman osaamisen ja tehtävän vaatimusten vertailuun.
- Tietojen pysyvä tallentaminen MariaDB-tietokantaan.
- Käyttäjäkohtaiset tiedot, joihin vain niiden omistajalla on pääsy.

Frontend käyttää backendin REST API -rajapintaa. Keskeiset toiminnot, virhetilanteet ja käyttäjien tietojen eristäminen testataan toteutuksen edetessä.

### Hakujen priorisointi

Prioriteetti kertoo, mihin hakuihin haluan käyttää aikaa ensin. Vaihtoehdot ovat korkea, normaali ja matala. Oletus on normaali, ja listan voi järjestää korkeasta prioriteetista matalaan.

Sopivuusluokka kuvaa omaa arviotani osaamiseni vastaavuudesta tehtävän vaatimuksiin. Vaihtoehdot ovat vahva vastaavuus, osittainen vastaavuus ja stretch. Stretch tarkoittaa tehtävää, joka olisi selvä askel nykyistä osaamistani vaativampaan rooliin. Luokan voi jättää tyhjäksi, jos ilmoitusta ei ole vielä arvioitu.

Prioriteetti, sopivuusluokka ja hakemuksen tila ovat erillisiä tietoja. Esimerkiksi stretch-tehtävällä voi olla korkea prioriteetti ja hakemuksen tilana haastattelu. Osaamisen kehityskohteet kirjataan aluksi muistiinpanoihin.

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

Backendin ensimmäinen versio on toteutettu Node.js:llä ja Express 5:llä. `backend/app.js` kokoaa sovelluksen reitit ja virheenkäsittelyn, `backend/routes/authRoutes.js` sisältää käyttäjätilin reitit ja `backend/server.js` käynnistää palvelimen porttiin 3000.

Reitti `GET /api/health` palauttaa JSON-vastauksen `{"status":"ok"}`. Sen toiminta on tarkistettu käsin curlilla. Reitti kertoo backendin vastaavan pyyntöihin, mutta ei tarkista tietokantaa.

Työskentelyohjeet ovat tiedostossa `AGENTS.md`. Kehitysympäristössä on käytössä Node.js 24 nvm:n kautta. Docker-palveluun on saatu yhteys komennolla `docker info --format '{{.ServerVersion}}'`.

Kehityksen MariaDB-palvelu toimii Dockerissa, ja sen asetukset ovat tiedostossa `docker-compose.dev.yml`. Tietokannassa ovat `users`- ja `jobs`-taulut. Niiden suunniteltu rakenne on tallennettu tiedostoon `backend/schema.sql`.

`backend/db.js` määrittelee mysql2-yhteyspoolin ja tarkistaa tarvittavien ympäristömuuttujien olemassaolon sekä portin kelvollisuuden. Komento `npm run db:check` on onnistunut: Node.js sai yhteyden tietokantaan sovelluksen tunnuksella ja pystyi suorittamaan lukukyselyn molempiin tauluihin palauttamatta käyttäjätietoja. Tämä ei vielä varmista kaikkia sarakkeita tai tietokantarajoitteita.

Rekisteröityminen on toteutettu. Backend validoi syötteen, normalisoi käyttäjätunnuksen pieniksi kirjaimiksi ja poistaa sen reunoilta välilyönnit. Salasana tallennetaan bcrypt-tiivisteenä, ja tietokantaan kirjoitetaan parametrisoidulla kyselyllä. Vastaukseen palautetaan vain käyttäjän tunniste ja käyttäjätunnus.

Kirjautuminen ja suojattu omien käyttäjätietojen haku on toteutettu. `backend/auth.js` luo JWT-tokenit ja sisältää `requireAuth`-middlewaren, joka tarkistaa tokenin ennen suojatun reitin käsittelyä. Autentikointilogiikalle ja `requireAuth`-middlewarelle on toteutettu automaattiset testit tiedostoon `backend/test/auth.test.js`, jotka ajetaan Node.js:n sisäänrakennetulla test runnerilla.

Expressin health-reitti ei tarkista tietokantaa. Frontend, työpaikkojen käsittely sekä koko sovelluksen kontitus ovat vielä toteuttamatta.

## REST API

### Rekisteröityminen

`POST /api/auth/register` vastaanottaa JSON-olion, jossa ovat merkkijonokentät `username` ja `password`. Normalisoidussa käyttäjätunnuksessa sallitaan 3–30 merkkiä joukosta `a–z`, `0–9` ja alaviiva. Salasanan vähimmäispituus on kahdeksan Unicode-koodipistettä ja enimmäispituus 72 UTF-8-tavua. Salasanaa ei normalisoida tai trimmata.

| Status | Merkitys |
| --- | --- |
| `201` | Käyttäjä luotu; vastaus sisältää `id`- ja `username`-kentät |
| `400` | Virheellinen syöte tai rikkinäinen JSON |
| `409` | Käyttäjätunnus on jo käytössä |
| `413` | Pyynnön runko ylittää 16 kilotavun rajan |
| `500` | Odottamaton palvelinvirhe |

Virhevastauksen muoto on `{"error":"Virheen kuvaus"}`. Sisäisiä virhetietoja, salasanoja tai niiden tiivisteitä ei palauteta. Rekisteröityminen luo tilin, mutta ei vielä kirjaa käyttäjää sisään.

### Kirjautuminen ja omat käyttäjätiedot

`POST /api/auth/login` vastaanottaa merkkijonokentät `username` ja `password`. Backend normalisoi käyttäjätunnuksen kuten rekisteröitymisessä ja vertaa salasanaa tallennettuun tiivisteeseen `bcrypt.compare`-funktiolla. Onnistunut vastaus on `200`, ja siinä palautetaan `token` sekä `user`-olio, jonka kentät ovat `id` ja `username`.

Väärä salasana ja tuntematon käyttäjätunnus palauttavat saman `401`-virheen: `Virheellinen tunnus tai salasana.` Tuntemattoman käyttäjän tapauksessa tehdään vertailu valehashiin, jotta puuttuva bcrypt-vertailu ei aiheuta selvää vastausaikaeroa. Virheellinen pyynnön rakenne tai kenttien tietotyyppi palauttaa `400`.

`GET /api/auth/me` edellyttää otsaketta `Authorization: Bearer <token>`. Kelvollisella tokenilla se palauttaa `200` ja käyttäjän `id`- ja `username`-kentät. Puuttuva tai virheellinen token sekä poistettu käyttäjätili johtavat `401`-vastaukseen.

Token allekirjoitetaan HS256-algoritmilla, ja tarkistuksessa hyväksytään vain sama algoritmi. Token sisältää käyttäjätunnisteen `sub`-kentässä sekä myöntämis- ja vanhenemisajan. Tokenin sisältö ei ole salattu. `requireAuth` asettaa tarkistetun käyttäjätunnisteen arvoon `req.user.id`. Työpaikkareittien käyttäjäkohtaiset omistajuustarkistukset toteutetaan myöhemmin erikseen.

## Kehityksen ympäristöasetukset

Compose ja backendin npm-käynnistyskomennot lukevat ympäristökohtaiset arvot repon juuressa olevasta `.env`-tiedostosta. Uudessa asennuksessa kopioi `.env.example` tiedostoksi `.env`, täytä tietokantasalasanat ja luo JWT-allekirjoitusavain. Säilytä olemassa olevan `.env`-tiedoston arvot.

| Muuttuja | Tarkoitus | Malliarvo |
| --- | --- | --- |
| `MARIADB_VERSION` | MariaDB-kuvan versio | `11.8` |
| `DB_NAME` | Sovelluksen tietokanta | `jobtrack` |
| `DB_USER` | Sovelluksen tietokantakäyttäjä | `appuser` |
| `DB_HOST` | Kehityksen portin sidontaosoite ja paikallisen Noden tietokantapalvelin | `127.0.0.1` |
| `DB_PORT` | Kehityskoneelle julkaistu portti, jota paikallinen Node käyttää | `3306` |
| `DB_ROOT_PASSWORD` | Ylläpitäjän salasana | Täytetään vain `.env`:iin |
| `DB_PASSWORD` | Sovelluksen tietokantakäyttäjän salasana | Täytetään vain `.env`:iin |
| `JWT_SECRET` | Satunnainen 32 tavun allekirjoitusavain 64 heksadesimaalimerkkinä | Luodaan vain paikalliseen `.env`:iin |
| `JWT_TTL_SECONDS` | Tokenin voimassaoloaika sekunteina | `3600` |

JWT-avain luodaan kryptografisesti turvallisella satunnaisgeneraattorilla. Backend tarkistaa avaimen muodon ja voimassaoloajan käynnistyksessä. `.env`-muutosten jälkeen backend on käynnistettävä uudelleen, jotta uudet arvot latautuvat.

Pidä kehityksen `DB_HOST` arvossa `127.0.0.1`, jotta portti on käytettävissä vain omalla koneella. Kontin sisäinen MariaDB-portti on 3306. Tietokannan tiedot tallennetaan nimettyyn `dbdata`-volumeen.

Tarkista asetukset tulostamatta niiden sisältöä:

```sh
docker compose -f docker-compose.dev.yml config --quiet
```

`.env` ei kuulu versionhallintaan. Tietokannan ja käyttäjien alustusarvot otetaan käyttöön vain tyhjän tietokannan ensimmäisellä käynnistyksellä; niiden muuttaminen `.env`:ssä ei muuta olemassa olevaa tietokantaa tai sen salasanoja.

Käynnistä tietokanta repon juuressa:

```sh
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Odota, että tietokannan tila on `healthy`. Uudessa tietokannassa taulut on luotava erikseen tiedoston `backend/schema.sql` avulla; nykyinen Compose-asetus ei suorita tiedostoa automaattisesti.

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

Käynnistyskomento lataa repon juuren `.env`-tiedoston. Rekisteröityminen edellyttää käynnissä olevaa tietokantaa ja luotua `users`-taulua. Palvelin kuuntelee osoitteessa `http://localhost:3000`. Kehitystila käynnistää palvelimen uudelleen koodin muuttuessa. Palvelimen voi pysäyttää näppäinyhdistelmällä Ctrl+C.

## Testaus

### Tietokantayhteyden tarkistus

Kun tietokanta on käynnissä ja taulut on luotu, aja `backend/`-hakemistossa:

```sh
npm run db:check
```

Komento lataa repon juuren `.env`-tiedoston ja suorittaa `check-db.js`-tarkistuksen. Odotettu tulos on `Tietokantayhteys toimii. users- ja jobs-taulut löytyvät.` Virhetilanteessa komento palauttaa poistumiskoodin 1. Tarkistus sulkee lopuksi oman yhteyspoolinsa eikä muuta tietokannan sisältöä.

### Health-reitin käsintesti

Kun backend on käynnissä, suorita toisessa terminaalissa:

```sh
curl -i http://localhost:3000/api/health
```

Odotettu HTTP-status on `200 OK` ja vastauksen runko `{"status":"ok"}`. Tämä käsintesti on onnistunut paikallisessa kehitysympäristössä.

### Rekisteröitymisen käsintestit

Seuraavat curlilla suoritetut testit ovat onnistuneet paikallisessa kehitysympäristössä:

| Tapaus | Todettu tulos |
| --- | --- |
| Kelvollinen uusi testikäyttäjä | `201`, vastauksessa vain `id` ja `username` |
| Saman käyttäjätunnuksen rekisteröinti uudelleen | `409`, viesti `Käyttäjätunnus on jo käytössä.` |
| Liian lyhyt käyttäjätunnus `ab` | `400`, käyttäjätunnuksen validointivirhe |
| Rikkinäinen JSON | `400`, viesti `Virheellinen JSON.` |

Puuttuvat kentät, salasanan pituusrajat ja liian suuri pyyntö odottavat vielä testausta.

### Kirjautumisen ja suojatun reitin käsintestit

Seuraavat paikallisen kehitysympäristön testit ovat onnistuneet:

| Tapaus | Todettu tulos |
| --- | --- |
| Kirjautuminen oikeilla tunnuksilla | `200`, vastauksessa token ja käyttäjän julkiset tiedot |
| `/api/auth/me` kirjautumisesta saadulla tokenilla | `200`, oikean käyttäjän `id` ja `username` |
| `/api/auth/me` ilman tokenia | `401`, viesti `Kirjautuminen vaaditaan.` |
| Kirjautuminen väärällä salasanalla | `401`, viesti `Virheellinen tunnus tai salasana.` |
| Kirjautuminen tuntemattomalla käyttäjätunnuksella | `401`, sama vastaus kuin väärällä salasanalla |
| `/api/auth/me` virheellisellä tokenilla | `401`, viesti `Istunto on virheellinen tai vanhentunut.` |

### Automaattiset autentikointitestit

Autentikointimoduulin (`backend/auth.js`) ja `requireAuth`-middlewaren toiminta varmistetaan automaattisilla testeillä tiedostossa `backend/test/auth.test.js`. Testit käyttävät Node.js:n sisäänrakennettua testityökalua (`node:test` ja `node:assert/strict`), joten erillisiä ulkoisia testikirjastoja ei tarvita.

Aja testit `backend/`-hakemistossa:

```sh
npm test
```

Komento suorittaa skriptin `node --test`. Testit käynnistävät erillisen Express-testipalvelimen satunnaiseen vapaaseen porttiin ja käyttävät testikohtaista satunnaista JWT-avainta, joten ne ovat riippumattomia tietokannasta ja paikallisesta `.env`-tiedostosta.

Testisarja kattaa seuraavat tapaukset:

| Testitapaus | Varmistettava asia |
| --- | --- |
| Tokenin luonti (`createToken`) | Token sisältää käyttäjätunnisteen (`sub`), voimassaoloajan (`exp`), myöntämisajan (`iat`) ja HS256-algoritmin eikä ylimääräisiä kenttiä |
| Kelvollinen token | Päästää suojatulle reitille (`200 OK`) ja asettaa tarkistetun käyttäjän tunnisteen arvoon `req.user` |
| Puuttuva token | Estää pääsyn (`401 Unauthorized`, viesti `Kirjautuminen vaaditaan.`) |
| Rikkinäinen / virheellinen token | Hylätään (`401 Unauthorized`) |
| Vanhentunut token | Hylätään automaattisesti (`401 Unauthorized`) |
| Väärällä avaimella allekirjoitettu token | Hylätään allekirjoitusvirheenä (`401 Unauthorized`) |
| Väärällä algoritmilla luotu token | Hylätään algoritmitarkistuksessa (`401 Unauthorized`) |
| Token ilman vanhenemisaikaa | Hylätään (`401 Unauthorized`) |
| Token, jossa virheellinen käyttäjä-id (ei numero) | Hylätään (`401 Unauthorized`) |

Tietokantaa käyttävät rekisteröitymisen ja kirjautumisen reittitestit sekä frontendin testit toteutetaan myöhemmässä vaiheessa.
