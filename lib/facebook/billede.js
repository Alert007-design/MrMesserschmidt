// Story-billeder i 1080×1920 (PNG). Tegnes med satori (HTML-agtige bokse til SVG) og resvg (SVG til PNG).
// Fejler et foto, tegnes billedet uden foto. Teksterne her vises offentligt og skal være korrekt dansk.

const fs = require('fs');
const plan = require('./plan');

const B = 1080;
const H = 1920;

let skrifter;
function fonte() {
  if (skrifter) return skrifter;
  // Skrevet fuldt ud, så Vercel tager filerne med i funktionen.
  skrifter = [
    { name: 'Oswald', data: fs.readFileSync(require.resolve('@fontsource/oswald/files/oswald-latin-500-normal.woff')), weight: 500, style: 'normal' },
    { name: 'Oswald', data: fs.readFileSync(require.resolve('@fontsource/oswald/files/oswald-latin-700-normal.woff')), weight: 700, style: 'normal' },
    { name: 'Playfair', data: fs.readFileSync(require.resolve('@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff')), weight: 400, style: 'italic' },
    { name: 'Playfair', data: fs.readFileSync(require.resolve('@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff')), weight: 700, style: 'normal' },
    { name: 'Playfair', data: fs.readFileSync(require.resolve('@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff')), weight: 900, style: 'normal' },
  ];
  return skrifter;
}

// Lille hjælper, så layoutet kan skrives som e('div', {...stil}, børn).
function e(type, style, ...boern) {
  const children = boern.flat().filter((x) => x !== null && x !== undefined && x !== false);
  return { type, props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } };
}
function img(src, style) {
  return { type: 'img', props: { src, style } };
}

async function hentFoto(url, hent = fetch) {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await hent(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!r.ok) return null;
    const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!/^image\/(jpeg|png)$/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

const NAVY = '#1D3557';
const CREME = '#F3ECE0';
const LYSBLAA = '#9FC3E6';

// Fast format fra 23/11-2026 (Morten): hele afsnitsbilledet vises uden beskæring, så gæstens navn på billedet
// aldrig skæres over. Bagved ligger en sløret udgave af samme billede, der går over i mørkeblåt.
const PODCAST_NAVY = '#0B2447';
function podcastLayout({ foto, emne }) {
  return e('div', { width: B, height: H, background: PODCAST_NAVY, position: 'relative', fontFamily: 'Oswald', color: '#FFFFFF' },
    foto ? img(foto, { position: 'absolute', left: -60, top: -60, width: 1200, height: 1260, objectFit: 'cover', filter: 'blur(36px) brightness(0.55)' }) : null,
    e('div', { position: 'absolute', left: 0, top: 680, width: B, height: 500, backgroundImage: `linear-gradient(to bottom, rgba(11,36,71,0) 0%, ${PODCAST_NAVY} 100%)` }),
    foto ? img(foto, { position: 'absolute', left: 40, top: 380, width: 1000, height: 562, objectFit: 'contain', borderRadius: 18 }) : null,
    e('div', { position: 'absolute', left: 64, top: 250, background: GULD, color: PODCAST_NAVY, fontSize: 40, fontWeight: 700, letterSpacing: 6, paddingLeft: 28, paddingRight: 28, paddingTop: 10, paddingBottom: 12, borderRadius: 8 }, 'NYT AFSNIT'),
    e('div', { position: 'absolute', left: 80, top: 1060, width: 920, flexDirection: 'column' },
      e('div', { fontSize: 42, fontWeight: 500, letterSpacing: 8, color: GULD }, 'IKKE ET ORD OM POLITIK'),
      emne ? e('div', { fontSize: 84, fontWeight: 500, lineHeight: 1.15, marginTop: 28 }, emne) : null),
    e('div', { position: 'absolute', left: 80, top: 1480, fontSize: 40, fontWeight: 500, letterSpacing: 1 }, 'mrmesserschmidt.dk/podcast'));
}

// YouTube-storyen tirsdag og lørdag (godkendt af Morten 27/11-2026): opfordring til at følge kanalen og ugens video.
function youtubeLayout({ foto, titel }) {
  const lang = String(titel || '').length > 22;
  const afspil = e('div', { position: 'absolute', left: 830, top: 432, width: 140, height: 100, background: '#FF0000', borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    { type: 'svg', props: { width: 44, height: 50, viewBox: '0 0 44 50', children: { type: 'path', props: { d: 'M4 2 L42 25 L4 48 Z', fill: '#FFFFFF' } } } });
  return e('div', { width: B, height: H, background: PODCAST_NAVY, position: 'relative', fontFamily: 'Oswald', color: '#FFFFFF' },
    e('div', { position: 'absolute', left: 80, top: 260, width: 1000, flexDirection: 'column', fontSize: 74, fontWeight: 700, lineHeight: 1.1 },
      e('div', {}, 'Følg Morten Messerschmidt'), e('div', {}, 'på YouTube')),
    e('div', { position: 'absolute', left: 80, top: 505, fontSize: 44, fontWeight: 500, letterSpacing: 6, color: GULD }, 'DENNE UGES AFSNIT:'),
    e('div', { position: 'absolute', left: 40, top: 600, width: 1000, height: 562, borderRadius: 18, overflow: 'hidden', background: '#16386B' },
      foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: 1000, height: 562, objectFit: 'cover' }) : null),
    e('div', { position: 'absolute', left: 40, top: 600, width: 1000, height: 562 }, afspil),
    e('div', { position: 'absolute', left: 80, top: 1190, width: 920, flexDirection: 'column' },
      titel ? e('div', { fontSize: lang ? 64 : 84, fontWeight: 500, lineHeight: 1.15 }, titel) : null,
      e('div', { fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginTop: 50 }, 'Nye film hver søndag'),
      e('div', { fontSize: 44, fontWeight: 500, lineHeight: 1.25, marginTop: 18, color: LYSBLAA }, 'Noget andet end de hurtige klip på Facebook'),
      e('div', { alignSelf: 'flex-start', marginTop: 60, background: '#FF0000', fontSize: 52, fontWeight: 700, letterSpacing: 1, paddingLeft: 36, paddingRight: 36, paddingTop: 8, paddingBottom: 12, borderRadius: 16 }, 'youtube.com/@MrMesserschmidt')));
}

// Fotos (Unsplash). Benzin har altid tankpistolen (fast format fra 15/11-2026), el turen ud ad landevejen.
const BENZIN_FOTO = 'benzin-tank.jpg';
const EL_FOTO = 'benzin-vindue.jpg';
function benzinFoto() {
  const fil = BENZIN_FOTO;
  try {
    const buf = fs.readFileSync(require('path').join(__dirname, 'fotos', fil));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function filFoto(fil) {
  try {
    return `data:image/jpeg;base64,${fs.readFileSync(require('path').join(__dirname, 'fotos', fil)).toString('base64')}`;
  } catch {
    return null;
  }
}

// Nedtælling til 1. december (Morten 14/11-2026): guldbånd under priserne på benzin- og el-storyen.
const GULD = '#F4C542';
function nedtaellingBaand(n) {
  if (!n || !n.dage) return null;
  const MOERK = '#0B2545';
  const imorgen = n.dage === 1;
  return e('div', { width: 900, background: GULD, color: MOERK, borderRadius: 28, marginTop: 40, paddingTop: 22, paddingBottom: 26, flexDirection: 'column', alignItems: 'center' },
    e('div', { fontSize: 92, fontWeight: 700, lineHeight: 1 }, imorgen ? 'I MORGEN' : `OM ${n.dage} DAGE`),
    e('div', { fontSize: 40, fontWeight: 500, marginTop: 10, textAlign: 'center', maxWidth: 820, lineHeight: 1.2 }, 'bliver benzin og diesel 2 kr. billigere pr. liter'));
}

function elLayout({ vest, oest, datoTekst, tilmeldingAaben, foto, nedtaelling }) {
  const MOERK = '#0B2545';
  const kort = (navn, p) => e('div', { width: 450, background: '#FFFFFF', color: MOERK, borderRadius: 28, paddingTop: 30, paddingBottom: 30, flexDirection: 'column', alignItems: 'center', marginLeft: 15, marginRight: 15 },
    e('div', { fontSize: 36, fontWeight: 500, letterSpacing: 5, color: '#C8102E' }, navn),
    e('div', { fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }, plan.tidsrum(p.start, p.slut)),
    e('div', { fontSize: 34, fontWeight: 500, color: '#4A5A70', marginTop: 4 }, `ca. ${Math.round(p.gennemsnitOere)} øre pr. kWh`));
  return e('div', { width: B, height: H, background: MOERK, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF', position: 'relative' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 900, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 900, backgroundImage: 'linear-gradient(to bottom, rgba(11,37,69,0.35) 0%, rgba(11,37,69,0) 25%, rgba(11,37,69,0) 50%, rgba(11,37,69,1) 100%)' }),
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 40, fontWeight: 500, letterSpacing: 8, marginTop: 640 }, 'BILLIGSTE STRØM I DAG'),
      e('div', { fontSize: 50, fontWeight: 500, marginTop: 8, color: '#BFD3EE' }, datoTekst),
      e('div', { marginTop: 50, flexDirection: 'row', justifyContent: 'center' },
        kort('VESTDANMARK', vest),
        kort('ØSTDANMARK', oest)),
      e('div', { fontSize: 30, fontWeight: 500, color: '#BFD3EE', marginTop: 28 }, 'Spotpris før moms, afgifter og nettarif'),
      nedtaellingBaand(nedtaelling),
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: nedtaelling ? 80 : 96, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', flexDirection: 'column', alignItems: 'center' },
        ...(tilmeldingAaben ? [e('div', {}, 'Få elpriserne i din mail'), e('div', {}, 'hver dag')] : [e('div', {}, 'Se dagens elpriser')])),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: nedtaelling ? 30 : 40, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk/el')));
}

// »Nu er det nu«: Østdanmarks billigste periode er begyndt (Morten 14/11-2026).
function elNuLayout({ til, oereOest, vestTekst, tilmeldingAaben, foto }) {
  const MOERK = '#0B2545';
  return e('div', { width: B, height: H, background: MOERK, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF', position: 'relative' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 760, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 760, backgroundImage: 'linear-gradient(to bottom, rgba(11,37,69,0.35) 0%, rgba(11,37,69,0) 30%, rgba(11,37,69,1) 100%)' }),
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 150, fontWeight: 700, lineHeight: 1, marginTop: 560, color: '#FFFFFF' }, 'NU ER DET NU'),
      e('div', { fontSize: 50, fontWeight: 500, marginTop: 24, color: '#BFD3EE', textAlign: 'center' }, 'Strømmen er billigst i Østdanmark'),
      e('div', { width: 900, background: '#FFFFFF', color: MOERK, borderRadius: 28, paddingTop: 34, paddingBottom: 34, marginTop: 40, flexDirection: 'column', alignItems: 'center' },
        e('div', { fontSize: 40, fontWeight: 500, letterSpacing: 5, color: '#C8102E' }, 'FREM TIL'),
        e('div', { fontSize: 150, fontWeight: 700, lineHeight: 1.05 }, `kl. ${til}`),
        e('div', { fontSize: 36, fontWeight: 500, color: '#4A5A70', marginTop: 4 }, `ca. ${Math.round(oereOest)} øre pr. kWh i perioden`)),
      vestTekst ? e('div', { fontSize: 40, fontWeight: 500, marginTop: 30 }, vestTekst) : null,
      e('div', { fontSize: 30, fontWeight: 500, color: '#BFD3EE', marginTop: 14 }, 'Spotpris før moms, afgifter og nettarif'),
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: 84, fontWeight: 700, lineHeight: 1.05, textAlign: 'center' }, tilmeldingAaben ? 'Få elpriserne i din mail' : 'Se elpriserne'),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: 36, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk/el')));
}

// »Den seneste uge«: forskellen mellem døgnets dyreste og billigste time (Morten 14/11-2026).
function elUgeLayout({ omraadeNavn, beloeb, periode, tilmeldingAaben, foto }) {
  const MOERK = '#0B2545';
  return e('div', { width: B, height: H, background: MOERK, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF', position: 'relative' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 760, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 760, backgroundImage: 'linear-gradient(to bottom, rgba(11,37,69,0.35) 0%, rgba(11,37,69,0) 30%, rgba(11,37,69,1) 100%)' }),
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 44, fontWeight: 500, letterSpacing: 8, marginTop: 560 }, 'DEN SENESTE UGE'),
      e('div', { fontSize: 50, fontWeight: 500, marginTop: 8, color: '#BFD3EE' }, `${omraadeNavn} · ${periode}`),
      e('div', { width: 900, background: '#FFFFFF', color: MOERK, borderRadius: 28, paddingTop: 34, paddingBottom: 38, marginTop: 44, flexDirection: 'column', alignItems: 'center' },
        e('div', { fontSize: 170, fontWeight: 700, lineHeight: 1 }, `${beloeb} kr.`),
        e('div', { fontSize: 40, fontWeight: 500, color: '#4A5A70', marginTop: 14, textAlign: 'center', maxWidth: 780, lineHeight: 1.25 }, 'pr. kWh var strømmen i gennemsnit dyrere i døgnets dyreste time end i den billigste')),
      e('div', { fontSize: 46, fontWeight: 500, marginTop: 40, textAlign: 'center', maxWidth: 900, lineHeight: 1.25 }, 'Flyt vasken, opvasken og opladningen til de billige timer.'),
      e('div', { fontSize: 30, fontWeight: 500, color: '#BFD3EE', marginTop: 18 }, 'Spotpris før moms, afgifter og nettarif'),
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: 84, fontWeight: 700, lineHeight: 1.05, textAlign: 'center' }, tilmeldingAaben ? 'Få elpriserne i din mail' : 'Se elpriserne'),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: 36, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk/el')));
}

function benzinLayout({ benzin, diesel, datoTekst, foto, nedtaelling }) {
  const MOERK = '#0B2545';
  const kort = (navn, oere) => e('div', { width: 450, background: '#FFFFFF', color: MOERK, borderRadius: 28, paddingTop: 34, paddingBottom: 34, flexDirection: 'column', alignItems: 'center', marginLeft: 15, marginRight: 15 },
    e('div', { fontSize: 38, fontWeight: 500, letterSpacing: 6, color: '#C8102E' }, navn),
    e('div', { fontSize: 112, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }, plan.kroner(oere)),
    e('div', { fontSize: 32, fontWeight: 500, color: '#4A5A70' }, 'kr. pr. liter'));
  return e('div', { width: B, height: H, background: MOERK, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF', position: 'relative' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 900, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 900, backgroundImage: 'linear-gradient(to bottom, rgba(11,37,69,0.35) 0%, rgba(11,37,69,0) 25%, rgba(11,37,69,0) 50%, rgba(11,37,69,1) 100%)' }),
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 40, fontWeight: 500, letterSpacing: 8, marginTop: 640 }, 'DAGENS LAVESTE PRIS'),
      e('div', { fontSize: 50, fontWeight: 500, marginTop: 8, color: '#BFD3EE' }, datoTekst),
      e('div', { marginTop: 50, flexDirection: 'row', justifyContent: 'center' },
        benzin ? kort('BENZIN 95', benzin.prisOere) : null,
        diesel ? kort('DIESEL', diesel.prisOere) : null),
      nedtaellingBaand(nedtaelling),
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: nedtaelling ? 80 : 96, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', flexDirection: 'column', alignItems: 'center' },
        e('div', {}, 'Få priserne i din mail'), e('div', {}, 'hver morgen')),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: nedtaelling ? 30 : 40, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk')));
}

// Mortens aften som juleavis (godkendt af Morten 23/11-2026): tilbudsavis i rødt, granegrønt og guld
// med temaet »Det behøver ikke at være dyrt at spise godt«. To udgaver, der skifter fra story til story.
const JUL_GRAN = '#0F4D2E';
const JUL_ROD = '#B3121F';
const JUL_GULD = '#E8B93C';
const JUL_HVID = '#FFFFFF';
function stjerneSvg(farve, n = 18) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? 40 : 50;
    const a = (Math.PI * i) / n;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="${pts.join(' ')}" fill="${farve}"/></svg>`).toString('base64')}`;
}
function stjerne(x, y, s, farve, rot, ...indhold) {
  return e('div', { position: 'absolute', left: x, top: y, width: s, height: s, transform: `rotate(${rot}deg)` },
    img(stjerneSvg(farve), { position: 'absolute', left: 0, top: 0, width: s, height: s }),
    e('div', { position: 'absolute', left: 0, top: 0, width: s, height: s, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, ...indhold));
}
function fnug(liste) {
  const f = snefnugSvg();
  return liste.map(([x, y, s, o]) => img(f, { position: 'absolute', left: x, top: y, width: s, height: s, opacity: o }));
}
function tilmeldKnap(baggrund, farve) {
  return e('div', { fontFamily: 'Oswald', fontWeight: 700, fontSize: 64, background: baggrund, color: farve, paddingLeft: 50, paddingRight: 50, paddingTop: 6, paddingBottom: 14, borderRadius: 12, border: `4px solid ${JUL_GULD}` }, 'Tilmeld dig på mortensaften.dk');
}

function juleavisLayout({ foto1, foto2 }) {
  const kort = (foto, pos, titel, under) => e('div', { width: 440, background: JUL_HVID, flexDirection: 'column', borderRadius: 18, overflow: 'hidden', marginLeft: 14, marginRight: 14, border: `6px solid ${JUL_GULD}` },
    e('div', { width: 428, height: 380, background: '#E9E2D6' }, foto ? img(foto, { width: 428, height: 380, objectFit: 'cover', objectPosition: pos }) : null),
    e('div', { flexDirection: 'column', paddingLeft: 22, paddingRight: 22, paddingTop: 14, paddingBottom: 20 },
      e('div', { fontSize: 48, fontWeight: 700, color: JUL_ROD, lineHeight: 1 }, titel),
      e('div', { fontSize: 30, fontWeight: 500, color: '#333333', marginTop: 6 }, under)));
  return e('div', { width: B, height: H, background: JUL_ROD, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', position: 'relative', color: JUL_HVID },
    e('div', { width: B, background: JUL_GRAN, flexDirection: 'column', alignItems: 'center', paddingTop: 220, paddingBottom: 30, borderBottom: `10px solid ${JUL_GULD}` },
      e('div', { fontWeight: 700, fontSize: 44, letterSpacing: 10, color: JUL_GULD }, 'JULEAVIS FRA'),
      e('div', { fontFamily: 'Playfair', fontWeight: 900, fontSize: 120, lineHeight: 1 }, 'Mortens aften')),
    e('div', { fontWeight: 700, fontSize: 96, lineHeight: 1, marginTop: 40, flexDirection: 'column', alignItems: 'center' },
      e('div', {}, 'DET BEHØVER IKKE'), e('div', {}, 'AT VÆRE DYRT'), e('div', { color: JUL_GULD }, 'AT SPISE GODT')),
    e('div', { flexDirection: 'row', justifyContent: 'center', marginTop: 38 },
      kort(foto1, '30% 60%', 'JULENS MAD', 'Nem og god til hele familien'),
      kort(foto2, '50% 35%', 'JULENS HYGGE', 'Pynt, lys og gode traditioner')),
    stjerne(390, 1330, 300, JUL_GULD, -12,
      e('div', { fontWeight: 700, fontSize: 44, color: JUL_GRAN, lineHeight: 1 }, 'NY JULEAVIS'),
      e('div', { fontWeight: 700, fontSize: 56, color: JUL_ROD, lineHeight: 1 }, 'HVER UGE')),
    e('div', { flexGrow: 1 }),
    e('div', { marginBottom: 170 }, tilmeldKnap(JUL_GRAN, JUL_HVID)),
    ...fnug([[40, 250, 70, 0.6], [960, 230, 80, 0.7], [30, 560, 50, 0.5], [990, 640, 46, 0.5], [960, 1380, 60, 0.5], [40, 1420, 50, 0.45], [150, 1500, 34, 0.4], [880, 1530, 36, 0.4]]));
}

function julePrisskiltLayout({ foto1 }) {
  return e('div', { width: B, height: H, background: JUL_ROD, position: 'relative', fontFamily: 'Oswald', color: '#111111' },
    foto1 ? img(foto1, { position: 'absolute', left: 0, top: 0, width: B, height: 1000, objectFit: 'cover', objectPosition: '50% 35%' }) : null,
    ...fnug([[60, 260, 70, 0.75], [920, 300, 80, 0.75], [60, 520, 44, 0.6], [960, 120, 50, 0.6], [40, 1540, 54, 0.5], [980, 1530, 44, 0.5]]),
    e('div', { position: 'absolute', left: 70, top: 920, width: 940, height: 580, background: JUL_GULD, flexDirection: 'column' },
      e('div', { background: JUL_GRAN, color: JUL_HVID, fontWeight: 700, fontSize: 44, letterSpacing: 6, paddingLeft: 36, paddingTop: 10, paddingBottom: 14 }, 'JULENS GODE KØB'),
      e('div', { flexDirection: 'column', paddingLeft: 40, paddingRight: 40, paddingTop: 30 },
        e('div', { fontFamily: 'Playfair', fontWeight: 900, fontSize: 92, lineHeight: 1 }, 'Mortens aften'),
        e('div', { fontWeight: 500, fontSize: 36, marginTop: 14, color: '#333333' }, 'Julemad, vintip og hygge til weekenden'),
        e('div', { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 40 },
          e('div', { fontFamily: 'Playfair', fontStyle: 'italic', fontSize: 50, lineHeight: 1.15, flexDirection: 'column', width: 520 },
            e('div', {}, 'Det behøver ikke'), e('div', {}, 'at være dyrt'), e('div', {}, 'at spise godt')),
          e('div', { flexDirection: 'column', alignItems: 'flex-end' },
            e('div', { fontWeight: 700, fontSize: 150, lineHeight: 0.85, color: JUL_ROD }, 'GODT'),
            e('div', { fontWeight: 500, fontSize: 34 }, 'pr. uge'))))),
    e('div', { position: 'absolute', left: 0, top: 1600, width: B, justifyContent: 'center' }, tilmeldKnap(JUL_GRAN, JUL_HVID)));
}

function mortensaftenLayout(data) {
  return data.variant === 'prisskilt' ? julePrisskiltLayout(data) : juleavisLayout(data);
}

// 1. december 2026: afgiften på benzin og diesel er sat ned svarende til 2 kr. pr. liter (Morten 14/11-2026).
function toKronerLayout({ foto }) {
  const MOERK = '#0B2545';
  return e('div', { width: B, height: H, background: MOERK, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF', position: 'relative' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 860, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 860, backgroundImage: 'linear-gradient(to bottom, rgba(11,37,69,0.35) 0%, rgba(11,37,69,0) 25%, rgba(11,37,69,0) 45%, rgba(11,37,69,1) 100%)' }),
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 46, fontWeight: 500, letterSpacing: 10, marginTop: 600, color: GULD }, 'FRA I DAG'),
      e('div', { fontSize: 300, fontWeight: 700, lineHeight: 1, marginTop: 10 }, '2 KR.'),
      e('div', { fontSize: 88, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }, 'billigere pr. liter'),
      e('div', { fontSize: 42, fontWeight: 500, color: '#BFD3EE', marginTop: 30, flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 },
        e('div', {}, 'Afgiften på benzin og diesel er sat ned'), e('div', {}, 'svarende til 2 kr. pr. liter inkl. moms')),
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: 84, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', flexDirection: 'column', alignItems: 'center' },
        e('div', {}, 'Følg priserne'), e('div', {}, 'hver morgen')),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: 36, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk')));
}

// Julepynt i december (Morten 14/11-2026): guldramme og snefnug lagt oven på det faste format. Ingen ekstra tekst.
function snefnugSvg() {
  const arm = (v) => `<g transform="rotate(${v} 50 50)"><line x1="50" y1="50" x2="50" y2="6"/><line x1="50" y1="20" x2="40" y2="10"/><line x1="50" y1="20" x2="60" y2="10"/><line x1="50" y1="32" x2="42" y2="24"/><line x1="50" y1="32" x2="58" y2="24"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" fill="none">${[0, 60, 120, 180, 240, 300].map(arm).join('')}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
// Kun langs kanterne, så teksterne aldrig dækkes.
const SNEFNUG = [
  [64, 230, 76, 0.95], [190, 330, 40, 0.7], [70, 420, 34, 0.6], [150, 520, 52, 0.75], [60, 660, 30, 0.5],
  [900, 210, 84, 0.95], [990, 360, 40, 0.7], [880, 430, 50, 0.75], [1000, 560, 34, 0.6], [910, 680, 44, 0.55],
]
function julPynt() {
  const fnug = snefnugSvg();
  return [
    ...SNEFNUG.map(([x, y, s, o]) => img(fnug, { position: 'absolute', left: x, top: y, width: s, height: s, opacity: o })),
    e('div', { position: 'absolute', left: 22, top: 22, width: B - 44, height: H - 44, border: `8px solid ${GULD}`, borderRadius: 36 }),
    e('div', { position: 'absolute', left: 38, top: 38, width: B - 76, height: H - 76, border: '3px solid #C8102E', borderRadius: 28 }),
  ];
}
function medJul(figur, jul) {
  if (!jul) return figur;
  return e('div', { width: B, height: H, position: 'relative' }, figur, ...julPynt());
}

const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const UGEDAGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
function datoTekst(dato) {
  const [a, m, d] = dato.split('-').map(Number);
  const dag = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${UGEDAGE[dag]} ${d}. ${MAANEDER[m - 1]}`;
}

async function tegn(type, data, format = 'png') {
  const satori = require('satori').default || require('satori');
  const { Resvg } = require('@resvg/resvg-js');
  let figur;
  if (type === 'podcast') figur = podcastLayout(data);
  else if (type === 'youtube') figur = youtubeLayout(data);
  else if (type === 'benzin') figur = benzinLayout({ ...data, datoTekst: datoTekst(data.dato), foto: data.foto === undefined ? benzinFoto(data.fotoDato || data.dato) : data.foto });
  else if (type === 'el') figur = elLayout({ ...data, datoTekst: datoTekst(data.dato), foto: data.foto === undefined ? filFoto(EL_FOTO) : data.foto });
  else if (type === 'el-nu') figur = elNuLayout({ ...data, foto: data.foto === undefined ? filFoto(EL_FOTO) : data.foto });
  else if (type === 'el-uge') figur = elUgeLayout({ ...data, foto: data.foto === undefined ? filFoto(EL_FOTO) : data.foto });
  else if (type === 'mortensaften') figur = mortensaftenLayout(data);
  else if (type === 'to-kroner') figur = toKronerLayout({ foto: data.foto === undefined ? benzinFoto() : data.foto });
  else throw new Error(`Ukendt type: ${type}`);
  figur = medJul(figur, data.jul === true);
  const svg = await satori(figur, { width: B, height: H, fonts: fonte() });
  const billede = new Resvg(svg, { fitTo: { mode: 'width', value: B } }).render();
  if (format !== 'jpg') return billede.asPng();
  // Instagram tager kun JPEG.
  const jpeg = require('jpeg-js');
  return jpeg.encode({ data: Buffer.from(billede.pixels), width: billede.width, height: billede.height }, 90).data;
}

module.exports = { tegn, hentFoto, datoTekst, benzinFoto };
