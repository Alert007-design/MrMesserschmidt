// /facebook/kladde?n=<FACEBOOK_KLADDE_NOEGLE>: Mortens lukkede kladdeside.
// Viser ugens stories, hvordan et opslag om seneste afsnit ser ud, og loggen over alt, der er sket.

const crypto = require('crypto');
const { miljoe, hentAfsnitMedBilleder } = require('../lib/facebook/kilder');
const { hentStatus } = require('../lib/facebook/status');
const plan = require('../lib/facebook/plan');
const { esc } = require('../lib/podcast');
const { datoTekst } = require('../lib/facebook/billede');

const NAVNE = { podcast: 'Podcast', benzin: 'Benzinpriser', mortensaften: 'Mortens aften' };
const RESULTAT = {
  lagt: 'Lagt ud', kladde: 'Kladde (ikke lagt ud)', fejl: 'Fejlede', sprunget_over: 'Sprunget over', start: 'Startet', ikke_opsat: 'Ikke sat op',
};

function lige(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  const cfg = miljoe();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!cfg.kladdeNoegle || !lige((req.query || {}).n || '', cfg.kladdeNoegle)) return res.status(404).send('Findes ikke');

  const [status, afsnit] = await Promise.all([
    hentStatus().catch(() => null),
    hentAfsnitMedBilleder().catch(() => []),
  ]);

  const nu = new Date();
  const uge = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(nu.getTime() + i * 86400000);
    const { dato } = plan.kbh(d);
    const type = plan.storyType(d, cfg.mortensaftenFra);
    const gjort = status && status.stories && status.stories[dato];
    // Benzinbilledet kan kun vises for i dag, fordi priserne først kendes samme morgen.
    const billede = type && (type !== 'benzin' || i === 0) ? cfg.billedUrl(type, dato) : '';
    uge.push(`<div class="kort"><b>${esc(datoTekst(dato))}</b><span>${type ? esc(NAVNE[type]) : 'Ingen story'}</span>${gjort ? `<span class="st">Facebook: ${esc(RESULTAT[gjort.resultat] || gjort.resultat)}${gjort.instagram ? `<br>Instagram: ${esc(RESULTAT[gjort.instagram.resultat] || gjort.instagram.resultat)}` : ''}</span>` : ''}${billede ? `<a href="${esc(billede)}"><img src="${esc(billede)}" alt="" loading="lazy"></a>` : type === 'benzin' ? '<i>Billedet laves samme morgen med dagens priser</i>' : ''}</div>`);
  }

  const a = afsnit[0];
  const opslag = a ? `<div class="opslag"><img src="${esc(a.billede)}" alt=""><pre>${esc(plan.podcastTekst(a))}</pre></div>` : '<p>Afsnittene kunne ikke hentes lige nu.</p>';

  const log = ((status && status.log) || []).map((l) => `<tr><td>${esc(new Date(l.tid).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }))}</td><td>${esc(l.hvad === 'story' ? `Facebook-story: ${NAVNE[l.type] || l.type}` : l.hvad === 'instagramstory' ? `Instagram-story: ${NAVNE[l.type] || l.type}` : l.hvad === 'podcastopslag' ? `Opslag: ${l.afsnit || ''}` : l.hvad)}</td><td>${esc(RESULTAT[l.resultat] || l.resultat)}${l.besked ? `<br><small>${esc(l.besked)}</small>` : ''}</td></tr>`).join('');

  const tilstand = { fra: 'Slukket', kladde: 'Kladde: intet lægges ud på Facebook', live: 'Live: opslag og stories lægges ud' }[cfg.tilstand];
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Facebook – kladde</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;color:#1d2a3a}main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{font-size:26px}h2{font-size:20px;margin-top:36px}.tilstand{display:inline-block;background:#1D3557;color:#fff;padding:6px 12px;border-radius:6px}.uge{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.kort{background:#fff;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;font-size:14px}.kort img{width:100%;border-radius:4px}.st{color:#2a6b3a}.opslag{display:flex;flex-wrap:wrap;gap:16px;background:#fff;border-radius:8px;padding:16px}.opslag img{width:320px;max-width:100%;border-radius:4px}.opslag pre{white-space:pre-wrap;font-family:inherit;flex:1 1 300px;margin:0}table{width:100%;border-collapse:collapse;background:#fff;font-size:14px}td{padding:8px;border-bottom:1px solid #eee;vertical-align:top}</style></head>
<body><main><h1>Facebook: opslag og stories</h1><p class="tilstand">${esc(tilstand)}</p>
<h2>Stories på Facebook og Instagram de næste 7 dage (kl. 9)</h2><div class="uge">${uge.join('')}</div>
<h2>Sådan ser opslaget ud, når der kommer et nyt afsnit</h2><p>Eksempel med det seneste afsnit.</p>${opslag}
<h2>Log</h2>${log ? `<table>${log}</table>` : '<p>Intet endnu.</p>'}</main></body></html>`);
};
