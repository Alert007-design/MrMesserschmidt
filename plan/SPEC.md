# Podcastsider og redaktøradgang – specifikation

Status: godkendt af Morten 29/10-2026 (Louisas mail, DNS-ok, cover modtaget).

## Rettelser efter godkendelsen (fundet ved tjek af de rigtige data 29/10)
- Spreaker har 152 afsnit, men ingen afsnitsnumre. Numrene på Apple (fx »154«) findes ikke i
  data, så siderne viser dato og gæst, ikke nummer. Adresserne bliver /podcast/<titel-som-ord>,
  fx /podcast/daniel-wass-stopper-mens-legen-er-god.
- Billeder: YouTube-kanalen @IkkeEtOrdOmPolitik har et billede med gæsten til hvert afsnit, og
  videobeskrivelsen begynder med gæstens navn. Siden kobler selv video og afsnit på gæstens
  navn og bruger YouTube-billedet. YouTubes åbne feed viser kun de 15 nyeste videoer; ældre
  afsnit kræver en YouTube-nøgle (kan tilføjes senere) eller et billede fra Louisa.
  Rækkefølge: Louisas billede, ellers YouTube-billedet, ellers podcastens cover.
- Grafik: podcastens egen stil – navy tekst i smal, fed skrift, cremefarvet bund, banner i
  lyseblå som på YouTube-kanalen.
- Beskrivelsen af podcasten tages fra podcastens egen tekst hos Spreaker.

## Formål
Flere lyttere til »Ikke et ord om politik« via Google. Hvert afsnit får sin egen side på
mrmesserschmidt.dk med gæstens navn i titlen, så folk, der søger på gæsten, kan finde afsnittet.
Domænet ikkeetordompolitik.dk er optaget, så siderne ligger på mrmesserschmidt.dk/podcast.

## Hvad der bygges

### 1. Podcastkort på forsiden
Et bredt kort under de seks eksisterende kort, over alle tre kolonner. Langt billede øverst,
derunder »Podcast: Ikke et ord om politik«, nyeste gæst og dato, og »Hør →«, som fører til
/podcast. Farver og grafik som podcastens cover (afventer coverbillede fra Morten).

### 2. /podcast – oversigt over alle afsnit
Kort i tre kolonner efter samme model som forsiden: billede, afsnitsnummer, gæstens navn, »Hør →«.
Øverst et banner, en kort beskrivelse af podcasten (Morten skriver eller godkender teksten) og
knapper til Spotify, Apple Podcasts og YouTube. Søgefelt efter gæst. Nyeste afsnit først.

### 3. /podcast/<nummer>-<gæst> – én side pr. afsnit
Fx /podcast/154-daniel-wass. Afsnittets billede, titel, dato, afspiller direkte på siden,
knapper til Spotify/Apple/YouTube, beskrivelsen fra podcastfeedet og links til andre afsnit.
Tom beskrivelse i feedet viser ingenting i stedet for en opfundet tekst.

### 4. Google
Siderne leveres som færdig HTML (ikke bygget i browseren), så Google kan læse dem. Hver side får
titel, beskrivelse, delingsbillede og maskinlæsbar opmærkning som podcastafsnit. Der laves
/sitemap.xml med alle afsnit og /robots.txt. Redaktionssiden udelukkes fra Google.

### 5. Data
Afsnittene hentes automatisk fra podcastens feed hos Spreaker
(https://www.spreaker.com/show/5968966/episodes/feed, ellers Spreakers offentlige API, hvis
feedet ikke indeholder alle afsnit). Svaret gemmes i Vercels cache i en time, så nye afsnit
kommer på siden af sig selv. Feedet har kun showets cover som billede, derfor billederne nedenfor.

### 6. Redaktøradgang for Louisa
- Adressen mrmesserschmidt.dk/podcast/redaktion. Kræver login.
- Login med mail-link: Louisa skriver sin mailadresse og får et link, der logger hende ind
  i 30 dage. Ingen adgangskoder at huske eller sende rundt. Kun mailadresser på en liste
  i Vercel (miljøvariabel) kan logge ind. Morten kan også stå på listen.
- Hun kan kun én ting: vælge et afsnit og uploade eller udskifte billedet til det
  (jpg, png eller webp, højst 5 MB). Hun kan ikke ændre forsiden, teksterne eller noget andet.
- Billederne gemmes i Vercel Blob under podcast/<afsnits-id>. Uploades et nyt, erstatter det
  det gamle. Har et afsnit intet billede, vises podcastens cover.
- Login-mailen sendes via Resend fra en afsenderadresse på mrmesserschmidt.dk. Det kræver
  nye DNS-poster hos DanDomain.

### 7. Senere (ikke i denne omgang)
- Automatisk billede fra Instagram, når Meta har godkendt forbindelsen.
- Udskrifter af afsnittene.

## Filer, der ændres eller oprettes (i denne rækkefølge)
- package.json (ny: testværktøj og Vercel Blob)
- lib/podcast.js (ny: henter og fortolker afsnit) og tests/podcast.test.js
- api/podcast.js og api/afsnit.js (nye: oversigt og afsnitsside som færdig HTML)
- api/sitemap.js og robots.txt (nye)
- vercel.json (ny: pæne adresser /podcast, /podcast/<afsnit>, /sitemap.xml)
- index.html (podcastkortet på forsiden)
- lib/login.js, api/login.js, api/redaktion.js, api/upload.js og tests (nye: login og upload)
- README.md (opdateres)

## Persondata
Eneste persondata er redaktørernes mailadresser (i Vercels miljøvariabel) og et
login-cookie i deres browser. Ingen data om besøgende, ingen tilmelding. Login-links udløber
efter 15 minutter og kan kun bruges én gang.

## Hvad kan gå galt
- Spreaker er nede: siderne viser den seneste gemte udgave fra cachen.
- Et billede uploades til forkert afsnit: Louisa kan selv udskifte det.
- Login-mailen ender i spam, indtil afsenderdomænet er godkendt hos Resend.

## Åbne spørgsmål til Morten
1. Louisas mailadresse (til listen over redaktører).
2. Ok til nye DNS-poster hos DanDomain for mrmesserschmidt.dk (afsender til login-mail)?
3. Coverbillede eller farver til podcastens grafik.
4. Beskrivelsen af podcasten på /podcast.
5. Repoet er offentligt på GitHub. De faste regler siger privat – skal det gøres privat?

## Går live
Bygges på grenen podcast-sider og vises først på en prøveadresse fra Vercel. Fletning til main
(som gør siderne offentlige) sker først efter Mortens udtrykkelige ja.
