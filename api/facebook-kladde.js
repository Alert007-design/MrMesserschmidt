// /facebook/kladde?n=<FACEBOOK_KLADDE_NOEGLE>: Mortens lukkede kladdeside.
// Viser ugens stories, hvordan et opslag om seneste afsnit ser ud, og loggen over alt, der er sket.

const crypto = require('crypto');
const { miljoe, hentAfsnitMedBilleder } = require('../lib/facebook/kilder');
const { hentStatus, EL_STI } = require('../lib/facebook/status');
const elStories = require('../lib/facebook/el-stories');
const plan = require('../lib/facebook/plan');
const { esc } = require('../lib/podcast');
const { datoTekst } = require('../lib/facebook/billede');

const NAVNE = { podcast: 'Podcast', benzin: 'Benzinpriser', el: 'Elpriser', mortensaften: 'Mortens aften', 'el-nu': 'El: Nu er det nu', 'el-uge': 'El: Den seneste uge' };
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

  const [status, afsnit, elStatus] = await Promise.all([
    hentStatus().catch(() => null),
    hentAfsnitMedBilleder().catch(() => []),
    hentStatus(EL_STI).catch(() => null),
  ]);

  const nu = new Date();
  const idag = plan.kbh(nu).dato;
  const live = (type) => cfg.tilstand === 'live' || cfg.godkendt.includes(type);
  const uge = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(nu.getTime() + i * 86400000);
    const { dato } = plan.kbh(d);
    const type = plan.storyType(d, cfg.mortensaftenFra);
    const gjort = status && status.stories && status.stories[dato];
    // Benzinpriser kendes først samme morgen. Andre dage vises et udkast med dagens priser.
    const benzinUdkast = (type === 'benzin' || type === 'el') && i > 0;
    const billede = type ? cfg.billedUrl(type, dato) : '';
    const godkendt = type ? (live(type) ? '<span class="ok">Godkendt: lægges ud kl. 9</span>' : '<span class="kl">Ikke godkendt: kun kladde</span>') : '';
    uge.push(`<div class="kort"><b>${esc(datoTekst(dato))}</b><span>${type ? esc(NAVNE[type]) : 'Ingen story'}</span>${gjort ? `<span class="st">Facebook: ${esc(RESULTAT[gjort.resultat] || gjort.resultat)}${gjort.instagram ? `<br>Instagram: ${esc(RESULTAT[gjort.instagram.resultat] || gjort.instagram.resultat)}` : ''}</span>` : godkendt}${billede ? `<a href="${esc(billede)}"><img src="${esc(billede)}" alt="" loading="lazy"></a>` : ''}${benzinUdkast ? '<i>Udkast med dagens priser. Den dag bruges dagens tal.</i>' : ''}</div>`);
  }

  // El-stories (Morten 14/11-2026): i dag »Nu er det nu« og de næste to ugestories.
  const elKort = [];
  const elGjort = (elStatus && elStatus.gjort) || {};
  const elGodkendt = (type) => (cfg.godkendt.includes(type) ? '<span class="ok">Godkendt</span>' : '<span class="kl">Ikke godkendt: kun kladde</span>');
  const elUd = (g) => (g ? `<span class="st">Facebook: ${esc(RESULTAT[g.resultat] || g.resultat)}${g.instagram ? `<br>Instagram: ${esc(RESULTAT[g.instagram.resultat] || g.instagram.resultat)}` : ''}</span>` : '');
  elKort.push(`<div class="kort"><b>${esc(datoTekst(idag))}</b><span>${esc(NAVNE['el-nu'])}</span><i>Lægges op, når den billigste periode i Østdanmark begynder (ikke om natten).</i>${elUd(elGjort[`${idag}:el-nu`]) || elGodkendt('el-nu')}<a href="${esc(cfg.billedUrl('el-nu', idag))}"><img src="${esc(cfg.billedUrl('el-nu', idag))}" alt="" loading="lazy"></a></div>`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(nu.getTime() + i * 86400000);
    const { dato, ugedag } = plan.kbh(d);
    const omr = elStories.UGE_DAGE[ugedag];
    if (!omr) continue;
    const b = cfg.billedUrl('el-uge', dato);
    elKort.push(`<div class="kort"><b>${esc(datoTekst(dato))} kl. 19</b><span>${esc(NAVNE['el-uge'])}: ${esc(elStories.NAVN[omr])}</span>${elUd(elGjort[`${dato}:el-uge`]) || elGodkendt('el-uge')}<a href="${esc(b)}"><img src="${esc(b)}" alt="" loading="lazy"></a>${i > 0 ? '<i>Udkast med dagens tal. Den dag bruges den uges tal.</i>' : ''}</div>`);
  }

  const a = afsnit[0];
  const opslag = a ? `<div class="opslag"><img src="${esc(a.billede)}" alt=""><pre>${esc(plan.podcastTekst(a))}</pre></div>` : '<p>Afsnittene kunne ikke hentes lige nu.</p>';

  const log = [...((status && status.log) || []), ...((elStatus && elStatus.log) || [])].sort((x, y) => String(y.tid).localeCompare(String(x.tid))).slice(0, 80).map((l) => `<tr><td>${esc(new Date(l.tid).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }))}</td><td>${esc(l.hvad === 'story' ? `Facebook-story: ${NAVNE[l.type] || l.type}` : l.hvad === 'instagramstory' ? `Instagram-story: ${NAVNE[l.type] || l.type}` : l.hvad === 'podcastopslag' ? `Opslag: ${l.afsnit || ''}` : l.hvad)}</td><td>${esc(RESULTAT[l.resultat] || l.resultat)}${l.besked ? `<br><small>${esc(l.besked)}</small>` : ''}</td></tr>`).join('');

  const NAVN_SMAA = { podcast: 'podcast', benzin: 'benzinpriser', el: 'elpriser', mortensaften: 'Mortens aften', instagram: 'Instagram', 'el-nu': 'el: nu er det nu', 'el-uge': 'el: den seneste uge' };
  const godkendteNavne = cfg.godkendt.map((t) => NAVN_SMAA[t]).join(', ');
  const tilstand = cfg.tilstand === 'kladde' && godkendteNavne
    ? `Godkendt og lægges ud: ${godkendteNavne}. Resten er kladde.`
    : { fra: 'Slukket', kladde: 'Kladde: intet lægges ud på Facebook', live: 'Live: opslag og stories lægges ud' }[cfg.tilstand];
  const opslagStatus = live('podcast') ? '<p class="ok">Godkendt: lægges ud på podcastens Facebook-side, når der kommer et nyt afsnit.</p>' : '<p class="kl">Ikke godkendt: kun kladde.</p>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Facebook – kladde</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;color:#1d2a3a}main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{font-size:26px}h2{font-size:20px;margin-top:36px}.tilstand{display:inline-block;background:#1D3557;color:#fff;padding:6px 12px;border-radius:6px}.uge{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.kort{background:#fff;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;font-size:14px}.kort img{width:100%;border-radius:4px}.st{color:#2a6b3a}.ok{color:#2a6b3a;font-weight:bold}.kl{color:#8a5a00}.opslag{display:flex;flex-wrap:wrap;gap:16px;background:#fff;border-radius:8px;padding:16px}.opslag img{width:320px;max-width:100%;border-radius:4px}.opslag pre{white-space:pre-wrap;font-family:inherit;flex:1 1 300px;margin:0}table{width:100%;border-collapse:collapse;background:#fff;font-size:14px}td{padding:8px;border-bottom:1px solid #eee;vertical-align:top}</style></head>
<body><main><h1>Facebook: opslag og stories</h1><p class="tilstand">${esc(tilstand)}</p>
<h2>Stories på Facebook og Instagram de næste 7 dage (kl. 9)</h2><div class="uge">${uge.join('')}</div>
<h2>El-stories: »Nu er det nu« og »Den seneste uge«</h2><p>Lægges kun ud, når de er godkendt (el-nu og el-uge i FACEBOOK_GODKENDT).</p><div class="uge">${elKort.join('')}</div>
<h2>Sådan ser opslaget ud, når der kommer et nyt afsnit</h2><p>Eksempel med det seneste afsnit.</p>${opslagStatus}${opslag}
<h2>Log</h2>${log ? `<table>${log}</table>` : '<p>Intet endnu.</p>'}</main></body></html>`);
};
