# Facebook: opslag på podcastsiden og daglige stories

Godkendt af Morten 1. november 2026 (chat). Ingen persondata indgår.

## Podcastsiden »Ikke et ord om politik«
- Kørslen tjekker én gang i timen, om der er kommet et nyt afsnit (Spreaker, koblet med YouTube som på /podcast).
- Nyt afsnit: ét opslag med afsnittets billede, titlen, første afsnit af beskrivelsen og link til afsnittet på mrmesserschmidt.dk/podcast.
- Første kørsel markerer alle eksisterende afsnit som set. Der lægges aldrig gamle afsnit op.
- Højst ét podcastopslag pr. kørsel.

## Stories på politikersiden (Morten Messerschmidt), kl. 9 dansk tid
- Mandag, onsdag, fredag: seneste podcastafsnit, billede og »mrmesserschmidt.dk/podcast«.
- Tirsdag, lørdag: dagens laveste benzin- og dieselpris fra DFpriser (lukket adresse med fælles nøgle) og »dfpriser.dk«. Mangler tallene, springes dagen over.
- Torsdag, søndag: Mortens aften, billede af Morten og »mortensaften.dk«. Først fra MORTENSAFTEN_FRA (standard 2026-11-06).
- Billederne laves automatisk i 1080×1920.
- Højst én story pr. dag.

## Sikkerhed
- FACEBOOK_TILSTAND: `fra` (intet sker), `kladde` (intet lægges ud, men alt vises på den lukkede kladdeside), `live`.
- Kladdesiden /facebook/kladde?n=<FACEBOOK_KLADDE_NOEGLE> viser næste podcastopslag, ugens stories og loggen.
- Status (sete afsnit, log) ligger i Vercel Blob. Samme opslag eller story kan ikke gå ud to gange samme dag.
- Fejl fra Meta logges og vises på kladdesiden. Der prøves ikke igen samme dag for en story, og et podcastopslag med uvist svar markeres som lagt.
- Kun kørsler med CRON_SECRET kan starte noget.

## Meta
- Appen »DFpriser opslag« genbruges. Side-nøgler: FB_NOEGLE_PODCAST og FB_NOEGLE_POLITIKER, side-id'er FB_SIDE_PODCAST og FB_SIDE_POLITIKER.
- Stories via API: /{side}/photos (published=false) og derefter /{side}/photo_stories.
