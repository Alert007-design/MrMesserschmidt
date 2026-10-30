// HTML for podcastsiderne. Alt flettes ind med esc(), så tekst fra feeds ikke kan blive til kode.

const { esc, danskDato, LINKS } = require('./podcast');

const DOMAENE = 'https://mrmesserschmidt.dk';
const SERIE = 'Ikke et ord om politik';

const CSS = `
:root { --navy:#123a64; --navy2:#0c2a4a; --creme:#f4efe6; --banner:#b7cade; --daemp:#5a6b80; --roed:#c8102e; }
* { box-sizing:border-box; }
html,body { margin:0; }
body { background:var(--creme); color:var(--navy2); font:16px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
a { color:var(--navy); }
main { max-width:760px; margin:0 auto; padding:20px 16px 48px; }
.tilbage { display:inline-block; font-weight:600; text-decoration:none; margin-bottom:16px; }
.banner { background:var(--banner); border-radius:14px; padding:22px 16px 18px; text-align:center; color:var(--navy); }
.banner .navn, h1.titel, .kort .gaest, .oswald { font-family:Oswald,"Arial Narrow",sans-serif; text-transform:uppercase; letter-spacing:.01em; }
.banner .navn { display:block; font-weight:700; font-size:clamp(30px,8vw,52px); line-height:1; }
.banner .vaert { display:block; font-family:Oswald,"Arial Narrow",sans-serif; font-weight:600; font-size:clamp(15px,3.6vw,20px); margin-top:8px; text-transform:uppercase; }
.intro { display:flex; gap:16px; align-items:flex-start; margin:20px 0 8px; }
.intro img { width:104px; height:104px; border-radius:12px; flex-shrink:0; background:#fff; }
.intro p { margin:0; color:#33475e; }
.knapper { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 4px; }
.knapper a { padding:9px 14px; border-radius:999px; background:var(--navy); color:#fff; text-decoration:none; font-weight:600; font-size:14px; }
.knapper.lys a { background:#fff; color:var(--navy); border:1px solid var(--navy); }
label.soeg { display:block; font-weight:600; margin:22px 0 14px; }
label.soeg input { display:block; width:100%; margin-top:6px; padding:12px 14px; border-radius:12px; border:1px solid #c9c2b4; font:inherit; background:#fff; }
.gitter { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
@media (max-width:560px) { .gitter { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } }
.kort { display:flex; flex-direction:column; background:#fff; border-radius:14px; overflow:hidden; text-decoration:none; color:var(--navy2); box-shadow:0 6px 18px rgba(18,58,100,.12); transition:transform .15s; }
.kort:hover { transform:translateY(-2px); }
.kort .bill { aspect-ratio:16/9; background:var(--creme); }
.kort .bill img { width:100%; height:100%; object-fit:cover; display:block; }
.kort .bill img.cover { object-fit:contain; }
.kort .tekst { padding:10px 11px 12px; display:flex; flex-direction:column; gap:3px; flex:1; }
.kort .gaest { font-weight:700; font-size:17px; line-height:1.15; color:var(--navy); }
.kort .emne { font-size:13px; color:#33475e; line-height:1.3; }
.kort .dato { font-size:12px; color:var(--daemp); margin-top:auto; padding-top:4px; }
.kort .hoer { font-size:13px; font-weight:800; color:var(--roed); }
.ingen { color:var(--daemp); }
.hoved img { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:14px; display:block; background:#fff; }
.hoved img.cover { object-fit:contain; }
.meta { color:var(--daemp); font-size:14px; margin:16px 0 4px; }
h1.titel { font-size:clamp(28px,7vw,40px); line-height:1.05; margin:0; color:var(--navy); }
.emne-stor { font-size:20px; margin:6px 0 0; color:#33475e; }
audio { width:100%; margin:18px 0 6px; }
h2 { font-family:Oswald,"Arial Narrow",sans-serif; text-transform:uppercase; color:var(--navy); font-size:22px; margin:28px 0 8px; }
.beskrivelse p { margin:0 0 12px; }
footer { text-align:center; margin-top:40px; font-size:14px; }
`;

function ramme({ titel, beskrivelse, sti, billede, jsonld, indhold, ikkeIndeks }) {
  return `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beskrivelse)}">
${process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">\n` : ''}${ikkeIndeks ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${DOMAENE}${esc(sti)}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Morten Messerschmidt">
<meta property="og:locale" content="da_DK">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beskrivelse)}">
<meta property="og:url" content="${DOMAENE}${esc(sti)}">
${billede ? `<meta property="og:image" content="${esc(billede)}">` : ''}
<link rel="icon" href="https://dfpriser.dk/mail/logo-lys.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<main>
${indhold}
</main>
</body>
</html>`;
}

function banner() {
  return `<div class="banner"><span class="navn">Ikke et ord om politik</span><span class="vaert">Morten Messerschmidt</span></div>`;
}

function billedTag(a, cover, ekstra = '') {
  const erCover = a.billede === cover;
  return `<img src="${esc(a.billede)}" alt="${esc(a.gaest)} i ${SERIE}" loading="lazy"${erCover ? ' class="cover"' : ''}${ekstra}>`;
}

function kort(a, cover) {
  return `<a class="kort" href="/podcast/${esc(a.slug)}" data-soeg="${esc((a.titel + ' ' + (a.beskrivelse || []).join(' ')).toLowerCase())}">
<div class="bill">${billedTag(a, cover)}</div>
<div class="tekst"><span class="gaest">${esc(a.gaest)}</span>${a.emne ? `<span class="emne">${esc(a.emne)}</span>` : ''}<span class="dato">${esc(danskDato(a.dato))}</span><span class="hoer">Hør →</span></div>
</a>`;
}

function oversigt({ show, afsnit }) {
  const besk = show.beskrivelse || 'En podcast af Morten Messerschmidt.';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'PodcastSeries', name: SERIE,
    url: `${DOMAENE}/podcast`, description: besk, image: show.cover || undefined,
    author: { '@type': 'Person', name: 'Morten Messerschmidt' }, webFeed: 'https://www.spreaker.com/show/5968966/episodes/feed',
  };
  const indhold = `<a class="tilbage" href="/">← mrmesserschmidt.dk</a>
${banner()}
<div class="intro">${show.cover ? `<img src="${esc(show.cover)}" alt="Podcastens cover">` : ''}<p>${esc(besk)}</p></div>
<div class="knapper"><a href="${LINKS.spotify}">Spotify</a><a href="${LINKS.apple}">Apple Podcasts</a><a href="${LINKS.youtube}">YouTube</a></div>
<label class="soeg">Søg efter gæst eller emne<input type="search" id="soeg" placeholder="Fx Hans Engell" autocomplete="off"></label>
${afsnit.length ? `<div class="gitter" id="gitter">${afsnit.map((a) => kort(a, show.cover)).join('\n')}</div><p class="ingen" id="ingen" hidden>Ingen afsnit passer på søgningen.</p>`
    : '<p class="ingen">Afsnittene kunne ikke hentes lige nu. Prøv igen om lidt.</p>'}
<footer><a href="/">Følg Morten Messerschmidt på de sociale medier</a></footer>
<script>
(function(){var f=document.getElementById('soeg'),k=document.querySelectorAll('#gitter .kort'),ingen=document.getElementById('ingen');if(!f)return;
f.addEventListener('input',function(){var q=f.value.trim().toLowerCase(),n=0;k.forEach(function(e){var vis=!q||e.getAttribute('data-soeg').indexOf(q)>-1;e.hidden=!vis;if(vis)n++;});if(ingen)ingen.hidden=n>0;});})();
</script>`;
  return ramme({
    titel: `${SERIE} – podcast med Morten Messerschmidt`, beskrivelse: besk.slice(0, 160), sti: '/podcast',
    billede: show.cover, jsonld, indhold,
  });
}

function afsnitSide({ show, afsnit }, a, beskrivelse) {
  const tekst = beskrivelse && beskrivelse.length ? beskrivelse : null;
  const metaBesk = tekst ? tekst.join(' ').slice(0, 158) : `Hør ${a.gaest} i podcasten ${SERIE} med Morten Messerschmidt.`;
  const andre = afsnit.filter((x) => x.id !== a.id).slice(0, 6);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'PodcastEpisode', name: a.titel,
    url: `${DOMAENE}/podcast/${a.slug}`, datePublished: a.dato || undefined,
    description: metaBesk, image: a.billede || undefined,
    timeRequired: a.minutter ? `PT${a.minutter}M` : undefined,
    associatedMedia: a.lyd ? { '@type': 'MediaObject', contentUrl: a.lyd } : undefined,
    partOfSeries: { '@type': 'PodcastSeries', name: SERIE, url: `${DOMAENE}/podcast`, author: { '@type': 'Person', name: 'Morten Messerschmidt' } },
    sameAs: [a.apple, a.youtube && a.youtube.link].filter(Boolean),
  };
  if (!jsonld.sameAs.length) delete jsonld.sameAs;
  const knapper = [`<a href="${LINKS.spotify}">Spotify</a>`, `<a href="${esc(a.apple || LINKS.apple)}">Apple Podcasts</a>`,
    `<a href="${esc(a.youtube ? a.youtube.link : LINKS.youtube)}">YouTube</a>`].join('');
  const indhold = `<a class="tilbage" href="/podcast">← Alle afsnit af ${SERIE}</a>
<div class="hoved">${billedTag(a, show.cover, ' fetchpriority="high"').replace(' loading="lazy"', '')}</div>
<p class="meta">${esc(danskDato(a.dato))}${a.minutter ? ` · ${a.minutter} min.` : ''}</p>
<h1 class="titel">${esc(a.gaest)}</h1>
${a.emne ? `<p class="emne-stor">${esc(a.emne)}</p>` : ''}
${a.lyd ? `<audio controls preload="none" src="${esc(a.lyd)}"></audio>` : ''}
<div class="knapper lys">${knapper}</div>
${tekst ? `<h2>Om afsnittet</h2><div class="beskrivelse">${tekst.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
${andre.length ? `<h2>Flere afsnit</h2><div class="gitter">${andre.map((x) => kort(x, show.cover)).join('\n')}</div>` : ''}
<footer><a href="/">Følg Morten Messerschmidt på de sociale medier</a></footer>`;
  return ramme({
    titel: `${a.titel} – podcast med Morten Messerschmidt`, beskrivelse: metaBesk, sti: `/podcast/${a.slug}`,
    billede: a.billede, jsonld, indhold,
  });
}

module.exports = { DOMAENE, SERIE, ramme, banner, oversigt, afsnitSide };
