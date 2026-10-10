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

Projekti on suunnitteluvaiheessa. Työskentelyohjeet on tallennettu `AGENTS.md`-tiedostoon. Kehitysympäristössä on tarkistettu Gitin, npm:n, Dockerin ja Docker Composen versiot sekä otettu käyttöön Node.js 24 nvm:n avulla. Docker-palvelun toimintaa ei ole vielä testattu.

Sovelluskoodia, tietokantaa tai Docker-asetuksia ei ole vielä toteutettu, eikä sovellustestejä ole ajettu. Asennus- ja käynnistysohjeet lisätään, kun niiden toimivuus on varmistettu.
