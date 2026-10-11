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

Rekisteröitymisen, kirjautumisen ja omien tietojen haun yhteistoimintaa testataan myös oikealla MariaDB-yhteydellä. Integraatiotesti käyttää erillistä testikonttia, jonka asetukset ovat tiedostossa `docker-compose.test.yml`.

Työpaikkojen käyttäjäkohtainen CRUD on toteutettu tiedostossa `backend/routes/jobRoutes.js`: lisääminen, listaus, yksittäisen työpaikan haku, muokkaaminen ja poistaminen. Rajapinta käsittelee yrityksen, tehtävänimikkeen, hakemuksen tilan, prioriteetin, sopivuusluokan, sijainnin, ilmoituksen URL-osoitteen, hakuajan ja muistiinpanot. Syötteiden validointi on erotettu tiedostoon `backend/jobValidation.js`. Kahden käyttäjän integraatiotesti varmistaa tallennetut tiedot, oletusarvot sekä sen, ettei toinen käyttäjä voi lukea, muokata tai poistaa toisen työpaikkaa.

Backendin listaus tukee hakemuksen tilan mukaista suodatusta ja prioriteettijärjestystä. Myös niiden käyttäjäkohtainen rajaus on testattu.

Frontend on toteutettu Reactilla ja Vitellä. Siinä ovat kirjautumis- ja rekisteröitymislomake, omien työpaikkojen taulukko, yhteinen lisäys- ja muokkauslomake, poisto vahvistuskyselyllä, listan päivitys ja paikallinen uloskirjautuminen. Rekisteröityminen, kirjautuminen ja työpaikkojen CRUD-toiminnot on vahvistettu selaimessa. Frontendin lint-tarkistus ja tuotantoversion koostaminen ovat onnistuneet.

Käyttöliittymässä on tilasuodatus sekä järjestysvalinnat Uusimmat ensin ja Prioriteetti: korkea ensin. Niiden toiminta on vahvistettu selaimessa myös työpaikan lisäämisen ja muokkaamisen yhteydessä. Koko sovelluksen kontitus ja Nginx-asetukset tehdään myöhemmin.

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

Token allekirjoitetaan HS256-algoritmilla, ja tarkistuksessa hyväksytään vain sama algoritmi. Token sisältää käyttäjätunnisteen `sub`-kentässä sekä myöntämis- ja vanhenemisajan. Tokenin sisältö ei ole salattu. `requireAuth` asettaa tarkistetun käyttäjätunnisteen arvoon `req.user.id`. Työpaikan lisääminen käyttää tätä tunnistetta omistajana, ja listaus rajataan siihen SQL-kyselyssä.

### Työpaikkojen CRUD

Kaikki työpaikkareitit edellyttävät otsaketta `Authorization: Bearer <token>`.

| Metodi ja polku | Toiminta | Onnistunut vastaus |
| --- | --- | --- |
| `POST /api/jobs` | Lisää työpaikan kirjautuneelle käyttäjälle | `201`, tallennettu työpaikka oliona |
| `GET /api/jobs` | Listaa kirjautuneen käyttäjän työpaikat; tukee tila- ja järjestysparametreja | `200`, taulukko työpaikkaolioita |
| `GET /api/jobs/:id` | Hakee yhden oman työpaikan | `200`, työpaikka oliona |
| `PUT /api/jobs/:id` | Korvaa oman työpaikan muokattavat tiedot | `200`, tallennettu työpaikka oliona |
| `DELETE /api/jobs/:id` | Poistaa oman työpaikan | `200`, `{"message":"Työpaikka poistettu."}` |

Työpaikkaolio sisältää kentät `id`, `company`, `title`, `status`, `priority`, `match_level`, `location`, `url`, `deadline` ja `notes`. Hakuaika palautetaan merkkijonona muodossa `YYYY-MM-DD` tai arvona `null`.

Listauksen kyselyparametrit:

| Parametri | Sallitut arvot | Toiminta ilman parametria |
| --- | --- | --- |
| `status` | `interested`, `applied`, `interview`, `offer`, `rejected` | Kaikki oman käyttäjän tilat |
| `sort` | `newest`, `priority` | `newest` |

Järjestys `newest` tarkoittaa suurinta tunnistetta ensin (`id DESC`). Järjestys `priority` palauttaa ensin korkean, sitten normaalin ja lopuksi matalan prioriteetin työpaikat. Saman prioriteetin sisällä järjestys on `id DESC`.

Esimerkiksi `GET /api/jobs?status=applied&sort=priority` palauttaa vain omat lähetetyt hakemukset prioriteettijärjestyksessä. Kelvollinen suodatin, jolla ei löydy työpaikkoja, palauttaa `200` ja tyhjän taulukon. Tuntemattomat parametrit, virheelliset tai tyhjät arvot sekä saman parametrin toistaminen palauttavat `400`.

Kyselyparametrit tarkistetaan `validateJobQuery`-funktiolla. Tila välitetään SQL-kyselyyn parametrina, ja järjestys valitaan palvelinkoodissa määritellyistä SQL-lausekkeista. Käyttäjän tekstiä ei liitetä SQL-rakenteeseen. Omistajuusrajaus säilyy myös suodatetuissa ja järjestetyissä listauksissa.

Polun `:id` tarkistetaan yhteisessä `router.param`-käsittelijässä. Sallittu muoto on positiivinen kokonaisluku välillä 1–4294967295 ilman etunollia. Virheellinen tunniste palauttaa `400` ennen tietokantakyselyä.

Yksittäisen työpaikan haku, päivitys ja poisto rajataan SQL-ehdolla `WHERE id = ? AND user_id = ?`. Puuttuva työpaikka ja toisen käyttäjän työpaikka palauttavat saman `404`-vastauksen `{"error":"Työpaikkaa ei löytynyt."}`. Päivityksessä pyynnön sisältö validoidaan ensin, joten virheellinen syöte palauttaa `400`.

`PUT` korvaa kaikki muokattavat tiedot ja käyttää samaa validointia kuin lisääminen. Yritys ja tehtävänimike ovat pakollisia. Pois jätetyt valinnaiset kentät palautuvat alla kuvattuihin oletusarvoihinsa. Tunniste ja omistaja säilyvät ennallaan. Myös saman päivityksen toistaminen muuttumattomilla arvoilla palauttaa `200`.

Lisäyspyynnön esimerkki:

```json
{
  "company": "Esimerkki Oy",
  "title": "Ohjelmistokehittäjä",
  "status": "applied",
  "priority": "high",
  "match_level": "stretch",
  "location": "Helsinki / etä",
  "url": "https://example.com/jobs/123",
  "deadline": "2028-02-29",
  "notes": "Kysy etätyömahdollisuudesta."
}
```

Kentät `company` ja `title` ovat pakollisia merkkijonoja. Niiden reunoilta poistetaan välilyönnit, minkä jälkeen pituuden on oltava 1–100 Unicode-koodipistettä. Kirjainkoko säilytetään.

| Valinnainen kenttä | Sallitut arvot | Oletusarvo kentän puuttuessa |
| --- | --- | --- |
| `status` | `interested`, `applied`, `interview`, `offer`, `rejected` | `interested` |
| `priority` | `high`, `normal`, `low` | `normal` |
| `match_level` | `strong`, `partial`, `stretch` tai JSON-arvo `null` | `null` |

Oletusarvo asetetaan vain puuttuvalle kentälle. Kentät `status` ja `priority` eivät hyväksy arvoa `null`. Sopivuusluokan `null` tarkoittaa, ettei sopivuutta ole arvioitu. Valintojen merkkijonoarvot hyväksytään täsmälleen taulukon muodossa. Virheelliset arvot hylätään `400`-vastauksella ennen tietokantaan kirjoittamista.

Lisätietojen säännöt:

| Valinnainen kenttä | Sääntö |
| --- | --- |
| `location` | Merkkijono, enintään 150 Unicode-koodipistettä |
| `url` | Merkkijono, enintään 2048 Unicode-koodipistettä; alkaa `http://` tai `https://` ja läpäisee URL-jäsennyksen |
| `deadline` | Todellinen päivämäärä muodossa `YYYY-MM-DD`, vuosi 1000–9999; myös mennyt päivämäärä sallitaan |
| `notes` | Merkkijono, enintään 2000 Unicode-koodipistettä; sovelluksen oma pituusraja |

Näissä neljässä lisätietokentässä puuttuva arvo, JSON-arvo `null`, tyhjä merkkijono ja pelkät välilyönnit tallennetaan arvona `null`. Tekstin reunoilta poistetaan välilyönnit ennen pituustarkistusta, mutta sisäiset välilyönnit ja rivinvaihdot säilytetään. Muita tietotyyppejä ei muuteta automaattisesti tekstiksi.

URL-tarkistus ei tee verkkopyyntöä eikä varmista ilmoituksen olemassaoloa. Päivämäärän tarkistus hylkää mahdottomat päivät, kuten `2026-02-30`, ja hyväksyy kelvollisen karkauspäivän. Listauksen SQL-kysely käyttää `DATE_FORMAT`-funktiota, jotta hakuaika palautuu päivämäärätekstinä ilman aikavyöhykemuunnosta.

Tuntemattomat kentät, myös asiakkaan lähettämät `id` ja `user_id`, hylätään `400`-vastauksella.

Työpaikan omistaja otetaan aina tarkistetusta tokenista. Listauksen parametrisoitu SQL-kysely rajaa rivit ehdolla `WHERE user_id = ?`. Käyttäjä, jolla ei ole työpaikkoja, saa vastaukseksi tyhjän taulukon `[]`.

Virheellinen lisäyssyöte palauttaa `400`. Puuttuva tai virheellinen token johtaa `401`-vastaukseen. Sovelluksen yhteinen virheenkäsittely palauttaa rikkinäisestä JSON:sta `400`, liian suuresta pyynnöstä `413` ja odottamattomasta palvelinvirheestä `500`.

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

## Frontendin käynnistäminen kehityksessä

Frontendin npm-komennot ajetaan `frontend/`-hakemistossa. Asenna riippuvuudet ensimmäisellä käyttökerralla repon juuresta:

```sh
cd frontend
npm install
```

Luo ensimmäisellä käyttökerralla `frontend/.env` tiedoston `frontend/.env.example` pohjalta. Säilytä olemassa oleva asetustiedosto. Kehityspalvelimen asetus on:

```dotenv
API_PROXY_TARGET=http://127.0.0.1:3000
```

Frontendin ympäristötiedosto sisältää vain kehityksen API-välityksen osoitteen. Tietokantasalasanat ja JWT-allekirjoitusavain kuuluvat backendin asetuksiin repon juuren `.env`-tiedostossa. Frontendin paikallinen `.env` on suljettu pois versionhallinnasta.

Pidä kehitystietokanta ja backend käynnissä. Käynnistä frontend omassa terminaalissaan `frontend/`-hakemistossa:

```sh
npm run dev
```

Avaa `http://localhost:5173`. Vite käyttää kiinteää porttia 5173 ja ilmoittaa virheestä, jos portti on varattu. Selain käyttää suhteellisia `/api`-osoitteita, ja Viten kehitysproxy välittää pyynnöt Expressille. Tuotannossa API-välityksen toteuttaa myöhemmin Nginx.

### Frontendin rakenne ja istunto

- `src/App.jsx` hallitsee kirjautumis- ja rekisteröitymislomaketta, istuntoa, työpaikkalistaa, muokattavaa työpaikkaa, palvelinpyyntöjä sekä lataus- ja ilmoitustiloja.
- `src/JobForm.jsx` sisältää yhteisen lisäys- ja muokkauslomakkeen. Epäonnistunut tallennus säilyttää syötteet korjaamista varten, jos istunto on edelleen voimassa.
- `src/JobList.jsx` näyttää yrityksen, tehtävän, tilan, prioriteetin ja hakuajan sekä muokkaus- ja poistopainikkeet. Ilmoituksen URL näkyy tehtävänimikkeen linkkinä.
- `src/jobLabels.js` sisältää hakemuksen tilan, prioriteetin ja sopivuusluokan yhteiset käyttöliittymätekstit.
- `src/api.js` tekee fetch-kutsut, lisää Bearer-tokenin ja välittää virheilmoitukset käyttöliittymään. Pyyntöjen aikaraja on 10 sekuntia.
- `src/index.css` sisältää käyttöliittymän tyylit.
- `vite.config.js` määrittelee React-lisäosan ja kehityksen API-välityksen.

Kirjautumisnäkymän Luo käyttäjätili -painikkeella voi vaihtaa rekisteröitymiseen. Backend validoi tunnuksen ja salasanan, ja käyttöliittymä näyttää mahdolliset virheilmoitukset. Onnistunut rekisteröityminen palauttaa kirjautumislomakkeelle ja näyttää vahvistuksen. Kirjautuminen tehdään erikseen. Lomaketilan vaihtaminen tyhjentää syötteet ja vanhat ilmoitukset.

Kirjautumisen jälkeen sovellus hakee käyttäjän työpaikat ja näyttää työpaikkanäkymän. Token säilytetään vain Reactin muistissa, joten sivun uudelleenlataus palauttaa kirjautumisnäkymän. Uloskirjautuminen poistaa paikallisen tokenin, työpaikkatiedot ja muokkaustilan; se ei mitätöi jo myönnettyä tokenia palvelimella. Työpaikkapyynnön palauttama `401` tyhjentää myös istunnon, työpaikat ja muokkaustilan.

Uusi työpaikka lisätään lomakkeella. Muokkaa-painike avaa valitun työpaikan tiedot samaan lomakkeeseen, ja Peruuta muokkaus palauttaa lisäystilaan tallentamatta muutoksia. Tallennuksen jälkeen lista haetaan uudelleen nykyisillä suodatus- ja järjestysvalinnoilla. Jos tallennus onnistuu mutta listan haku epäonnistuu, käyttöliittymä ilmoittaa molemmista erikseen. Poisto vaatii vahvistuksen, ja rivi poistuu listalta vasta onnistuneen palvelinpyynnön jälkeen.

Hakemuksen tila -valinta rajaa listaa backendin `status`-kyselyparametrilla. Kaikki tilat jättää parametrin pois. Järjestys-valinta käyttää `sort=newest`- tai `sort=priority`-parametria. Prioriteettijärjestys on korkea, normaali ja matala; saman prioriteetin sisällä uusin tunniste tulee ensin. Otsikon lukumäärä kertoo nykyisen hakutuloksen koon. Päivitä lista säilyttää valinnat, ja uusi kirjautuminen palauttaa oletukset Kaikki tilat ja Uusimmat ensin.

## Testaus

### Frontendin tarkistukset

Aja `frontend/`-hakemistossa:

```sh
npm run lint
npm run build
```

Nykyinen Vite-pohja käyttää linttaukseen Oxlintia. Opiskelijan paikallisessa ajossa 11.10.2026 tarkistus valmistui ilman varoituksia tai virheitä. Tuotantoversion koostaminen onnistui Vitellä 8.3.4 ja loi `frontend/dist/`-hakemiston. Myös Viten kehityspalvelin käynnistyi onnistuneesti.

Opiskelija vahvisti kirjautumisen onnistuvan selaimessa. Lisäksi seuraavat käyttöliittymän käsintestit vahvistettiin onnistuneiksi 11.10.2026:

- Työpaikan lisääminen ja tietojen säilyminen listan päivityksen jälkeen.
- Tehtävänimikkeen ja prioriteetin muokkaaminen sekä muutosten säilyminen listan päivityksen jälkeen.
- Muokkauksen peruuttaminen tallennettuja tietoja muuttamatta.
- Pelkistä välilyönneistä koostuvan yritysnimen hylkääminen: virheilmoitus näkyy ja syötteet säilyvät lomakkeella.
- Poiston peruuttaminen ja testityöpaikan poistaminen vahvistuksen jälkeen.
- Liian lyhyen salasanan virheilmoitus rekisteröitymisessä.
- Uuden käyttäjän rekisteröityminen, vahvistusviesti ja paluu kirjautumislomakkeelle.
- Uudella tunnuksella kirjautuminen ja tyhjä työpaikkalista.
- Uloskirjautuminen ja saman tunnuksen uuden rekisteröintiyrityksen hylkääminen.
- Syötteiden ja vanhojen ilmoitusten tyhjentyminen kirjautumis- ja rekisteröitymistilan välillä vaihdettaessa.
- Tilasuodatus ja paluu kaikkien tilojen listaukseen.
- Prioriteettijärjestys: korkea, normaali ja matala.
- Lisäyksen ja muokkauksen vaikutus listaan nykyisen suodatuksen ja järjestyksen mukaisesti.
- Valintojen säilyminen listan päivityksessä ja palautuminen oletuksiin uudessa kirjautumisessa.

Väärän salasanan virheilmoituksen ja sivun uudelleenlatauksen käsintestien tulokset odottavat vielä vahvistusta. Lint- ja build-tarkistukset eivät yksin varmista käyttöliittymän toimintaa. Frontendin automaattisia toimintatestejä ei ole vielä toteutettu.

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

Komento suorittaa skriptin `node --test test/*.test.js`. Testit käynnistävät erillisen Express-testipalvelimen satunnaiseen vapaaseen porttiin ja käyttävät testiajoa varten luotua satunnaista JWT-avainta, joten ne ovat riippumattomia tietokannasta ja paikallisesta `.env`-tiedostosta. Tietokantaa käyttävät integraatiotestit ajetaan omalla komennollaan.

Opiskelijan paikallisessa testiajossa 10.10.2026 kaikki yhdeksän testiä läpäistiin (9 läpäistyä, 0 epäonnistunutta).

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

### Autentikoinnin integraatiotesti

Tiedosto `backend/test/authRoutes.integration.js` testaa oikean Express-sovelluksen ja MariaDB:n yhteistoimintaa. Testi käy läpi yhden käyttäjän rekisteröitymisen, kirjautumisen ja omien tietojen haun sekä niihin liittyviä virhetilanteita.

Kopioi ensimmäisellä käyttökerralla repon juuren `.env.test.example` tiedostoksi `.env.test`. Luo siihen erilliset satunnaiset arvot kenttiin `DB_ROOT_PASSWORD`, `DB_PASSWORD` ja `JWT_SECRET`. JWT-avain on 32 satunnaista tavua 64 heksadesimaalimerkkinä. Säilytä olemassa olevan `.env.test`-tiedoston arvot. Paikallinen tiedosto on suljettu pois Gitistä, mutta salaisuuksia sisältämätön esimerkkitiedosto kuuluu versionhallintaan.

Testiasetuksissa `NODE_ENV=test`, `DB_NAME=jobtrack_test` ja `DB_USER=jobtrack_test`. Testikanta käyttää osoitetta `127.0.0.1:3307`, kun kehityskanta käyttää porttia 3306. Testi tarkistaa ympäristöasetukset ennen sovelluksen lataamista ja tietokannan nimen ennen testidatan kirjoittamista.

Käynnistä testitietokanta repon juuressa:

```sh
docker compose --env-file .env.test -f docker-compose.test.yml config --quiet
docker compose --env-file .env.test -f docker-compose.test.yml up -d --wait
```

Compose-projektin nimi on `jobtrack-tests`. Testikontti luo taulut tiedostosta `backend/schema.sql` alustuksen yhteydessä. Tietokannan tiedostot ovat väliaikaisessa `tmpfs`-liitoksessa, joten testidata häviää kontin pysähtyessä. Kehitystietokannan `dbdata`-volumea ei käytetä.

Aja yhteyden tarkistus ja integraatiotestit repon juuresta:

```sh
cd backend
node --env-file=../.env.test check-db.js
npm run test:integration
```

Testikontin on oltava käynnissä. Erillistä `npm run dev` -palvelinta ei tarvita, sillä testi käynnistää sovelluksen vapaaseen paikalliseen porttiin. Testi luo satunnaisen käyttäjätunnuksen ja poistaa lopuksi vain kyseisen tunnuksen sekä sulkee palvelimen ja tietokantayhteyspoolin.

| Tarkistus | Odotettu tulos |
| --- | --- |
| Rekisteröityminen | `201`, positiivinen kokonaisluku-id ja normalisoitu käyttäjätunnus ilman salasanakenttiä |
| Tallennettu salasana | Tietokannassa on alkuperäisestä salasanasta poikkeava tiiviste, jonka bcrypt-vertailu onnistuu |
| Saman tunnuksen rekisteröinti uudelleen | `409` |
| Kirjautuminen | `200`, token ja käyttäjän julkiset tiedot; tunnus normalisoidaan kuten rekisteröitymisessä |
| Omien tietojen haku tokenilla | `200`, rekisteröidyn käyttäjän julkiset tiedot |
| Omien tietojen haku ilman tokenia | `401` |
| Väärä salasana ja tuntematon käyttäjä | Molemmista `401` ja sama virheviesti |

### Työpaikkojen integraatiotesti

Tiedosto `backend/test/jobs.integration.js` ajetaan samalla `npm run test:integration` -komennolla ja samalla testitietokannalla kuin autentikoinnin integraatiotesti. Se luo kaksi omaa testikäyttäjää ja tarkistaa työpaikkojen CRUD-toiminnot, validoinnin sekä käyttäjien tietojen eristämisen.

| Tarkistus | Todettu tulos |
| --- | --- |
| Listaus ja lisääminen ilman tokenia | Molemmista `401` |
| Uuden käyttäjän listaus | `200` ja tyhjä taulukko |
| Virheelliset pyynnön rakenteet, puuttuvat kentät ja numeerinen yrityksen nimi | `400` |
| Tyhjä tai yli 100 merkin yritys tai tehtävänimike | `400` |
| Toisen käyttäjän `user_id` lisäyspyynnössä | `400` |
| Tuntemattomat tai numeeriset tila-, prioriteetti- ja sopivuusluokka-arvot | `400` |
| Tilan tai prioriteetin `null` sekä sopivuusluokan tyhjä merkkijono | `400` |
| Työpaikan lisääminen molemmille käyttäjille | `201`, erilliset positiiviset kokonaisluku-id:t ja tallennetut kentät |
| Yrityksen ja tehtävänimikkeen reunoilla olevat välilyönnit | Poistetaan ennen tallennusta |
| Valinnat `applied`, `high` ja `stretch` | Palautuvat sekä lisäysvastauksessa että tietokannasta luetussa listauksessa |
| Tilan, prioriteetin ja sopivuusluokan jättäminen pois pyynnöstä | Molemmissa vastauksissa oletusarvot `interested`, `normal` ja `null` |
| Lisätietojen väärät tietotyypit sekä sijainnin, URL-osoitteen ja muistiinpanojen ylipitkät arvot | `400` |
| Virheellinen URL-osoite ja `javascript:`-osoite | `400` |
| Väärä päivämäärämuoto, mahdoton päivä ja virheellinen kuukausi | `400` |
| Sijainti, HTTPS-osoite, karkauspäivä `2028-02-29` ja moniriviset muistiinpanot | Palautuvat normalisoituina sekä lisäysvastauksessa että listauksessa |
| Lisätietojen pois jättäminen, tyhjät merkkijonot, välilyönnit ja eksplisiittinen `null` | Lisätietokentät palautuvat arvona `null` myös tietokannasta luettuina |
| Käyttäjäkohtainen listaus | Kummankin listalla on täsmälleen oma työpaikka eikä hylättyjä lisäyksiä |
| Yksittäisen työpaikan haku, muokkaaminen ja poistaminen ilman tokenia | `401` |
| Virheelliset polun tunnisteet kaikissa kolmessa yksittäisen työpaikan reitissä | `400` |
| Toisen käyttäjän työpaikan haku, muokkaus ja poisto | `404` ja sama virheviesti; alkuperäinen tietue säilyy ennallaan |
| Virheelliset päivityssyötteet | `400`, alkuperäiset tiedot säilyvät |
| Oman työpaikan haku ja päivitys | `200`, oikeat tiedot myös erillisessä päivityksen jälkeisessä haussa |
| Saman päivityksen toistaminen | Molemmista `200` |
| Valinnaisten kenttien pois jättäminen PUT-pyynnöstä | Kentät palautuvat oletusarvoihinsa |
| Oman työpaikan poisto | `200`, eikä työpaikka enää näy listauksessa |
| Poistetun työpaikan haku, muokkaus ja uusi poisto | `404` ja sama virheviesti kuin toisen käyttäjän työpaikasta |
| Toisen käyttäjän tietue käsittelyketjun jälkeen | Säilyy ennallaan |
| Oletusjärjestys ja `sort=newest` usealla työpaikalla | Sama lista, suurin tunniste ensin |
| Suodatus tilalla `offer` | Vain oman käyttäjän kyseisen tilan työpaikat |
| `sort=priority` suodatuksen kanssa ja ilman | Korkea, normaali, matala; saman prioriteetin sisällä suurin tunniste ensin |
| Kelvollinen suodatus ilman osumia | `200` ja tyhjä taulukko |
| Sama suodatus kahdella käyttäjällä | Kumpikin saa vain omat osumansa |
| Tuntemattomat, tyhjät ja toistetut kyselyparametrit | `400` |

Testi käyttää satunnaisia käyttäjätunnuksia. Siivouksessa poistetaan vain testin omat työpaikat ja käyttäjät. Työpaikat poistetaan ennen käyttäjiä tietokannan viiteavaimen vuoksi.

Opiskelijan paikallisissa testiajoissa 11.10.2026 kaikki yhdeksän JWT-testiä ja kaksi integraatiotestiä läpäistiin, eikä epäonnistuneita testejä ollut. Työpaikkojen testi kattoi CRUD-toimintojen lisäksi tilasuodatuksen, prioriteettijärjestyksen ja kyselyparametrien validoinnin. Kumpikin integraatiotesti sisältää useita tarkistuksia, mutta testityökalu laskee sen yhdeksi testiksi.

Autentikoinnin puuttuvien kenttien ja salasanan pituusrajojen automaattiset testit sekä frontendin testit toteutetaan myöhemmin. Nykyinen työpaikkojen testi ei vielä tarkista kenttien kaikkia hyväksyttyjä pituusrajoja.
