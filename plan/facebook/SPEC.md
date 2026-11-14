# Facebook: opslag på podcastsiden og daglige stories

Godkendt af Morten 1. november 2026 (chat). Ingen persondata indgår.

## Podcastsiden »Ikke et ord om politik«
- Kørslen tjekker én gang i timen, om der er kommet et nyt afsnit (Spreaker, koblet med YouTube som på /podcast).
- Nyt afsnit: ét opslag med afsnittets billede, titlen, første afsnit af beskrivelsen og link til afsnittet på mrmesserschmidt.dk/podcast.
- Første kørsel markerer alle eksisterende afsnit som set. Der lægges aldrig gamle afsnit op.
- Højst ét podcastopslag pr. kørsel.

## Stories på politikersiden (Morten Messerschmidt), kl. 9 og kl. 19 dansk tid (fra 15/11-2026)
- Kl. 9, priser: benzin mandag, onsdag, fredag og søndag; el tirsdag, torsdag og lørdag. Mangler tallene, springes storyen over.
- Kl. 19, indhold: seneste podcastafsnit mandag, onsdag, fredag og søndag; Mortens aften tirsdag, torsdag og lørdag (først fra MORTENSAFTEN_FRA).
- El-storyen »Den seneste uge« er flyttet til kl. 20 (søndag Vest, onsdag Øst). »Nu er det nu« er uændret.
- Godkendt i chatten 14/11-2026 og lægges ud uden ny godkendelse: podcast, benzin, el, mortensaften (plan.GODKENDT_I_CHAT).
- Nye formater lægges kun ud, når de står på listen over godkendte, også når resten er live:
  - nedtaelling: guldbånd på benzin og el kl. 9 frem til 30. november (»Om 15 dage …«, »I morgen …«).
  - jul: guldramme og snefnug på podcast, benzin, el og Mortens aften i hele december.
  - to-kroner: særlig story 1. december kl. 9. Ikke godkendt: dagens almindelige elstory i stedet.
- Kladdesiden viser de nye formater som udkast (billed-adressen med ?udkast=1).
- Billederne laves automatisk i 1080×1920. Højst én story pr. tidspunkt pr. dag.

## Sikkerhed
- FACEBOOK_TILSTAND: `fra` (intet sker), `kladde` (intet lægges ud, men alt vises på den lukkede kladdeside), `live`.
- Kladdesiden /facebook/kladde?n=<FACEBOOK_KLADDE_NOEGLE> viser næste podcastopslag, ugens stories og loggen.
- Status (sete afsnit, log) ligger i Vercel Blob. Samme opslag eller story kan ikke gå ud to gange samme dag.
- Fejl fra Meta logges og vises på kladdesiden. Der prøves ikke igen samme dag for en story, og et podcastopslag med uvist svar markeres som lagt.
- Kun kørsler med CRON_SECRET kan starte noget.

## Meta
- Appen »DFpriser opslag« genbruges. Side-nøgler: FB_NOEGLE_PODCAST og FB_NOEGLE_POLITIKER, side-id'er FB_SIDE_PODCAST og FB_SIDE_POLITIKER.
- Stories via API: /{side}/photos (published=false) og derefter /{side}/photo_stories.
