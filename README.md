# mrmesserschmidt.dk

Linkside til Morten Messerschmidts kanaler. Statisk side på Vercel.

- `index.html` – selve siden
- `api/seneste.js` – henter seneste opslag fra YouTube (RSS) og Facebook/Instagram (Graph API, kræver miljøvariablen `FB_PAGE_TOKEN`). Svaret caches 30 minutter.
- `mig.webp`, `df-navn.webp` – billeder
