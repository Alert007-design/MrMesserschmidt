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

function podcastLayout({ foto, gaest, emne }) {
  return e('div', { width: B, height: H, background: NAVY, flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: CREME },
    e('div', { fontSize: 34, fontWeight: 500, letterSpacing: 10, color: LYSBLAA, marginTop: 150 }, 'PODCAST'),
    e('div', { fontSize: 112, fontWeight: 700, lineHeight: 1, marginTop: 24, textAlign: 'center', flexDirection: 'column', alignItems: 'center' },
      e('div', {}, 'IKKE ET ORD'), e('div', {}, 'OM POLITIK')),
    e('div', { width: 960, height: 540, marginTop: 110, background: '#16263D' },
      foto ? img(foto, { width: 960, height: 540, objectFit: 'cover' }) : null),
    e('div', { fontSize: 34, fontWeight: 500, letterSpacing: 8, color: LYSBLAA, marginTop: 110 }, 'SENESTE AFSNIT'),
    e('div', { fontSize: 76, fontWeight: 700, marginTop: 14, textAlign: 'center', maxWidth: 960, lineHeight: 1.05 }, String(gaest || '').toUpperCase()),
    emne ? e('div', { fontSize: 40, fontWeight: 500, marginTop: 16, textAlign: 'center', maxWidth: 900, lineHeight: 1.2 }, emne) : null,
    e('div', { flexGrow: 1 }),
    e('div', { fontSize: 46, fontWeight: 500, letterSpacing: 2, marginBottom: 140 }, 'mrmesserschmidt.dk/podcast'));
}

function benzinLayout({ benzin, diesel, datoTekst }) {
  const kort = (navn, oere) => e('div', { width: 900, background: '#FFFFFF', color: '#0B2545', borderRadius: 28, paddingLeft: 56, paddingTop: 40, paddingBottom: 40, flexDirection: 'column', marginTop: 40 },
    e('div', { fontSize: 40, fontWeight: 500, letterSpacing: 6, color: '#C8102E' }, navn),
    e('div', { fontSize: 150, fontWeight: 700, lineHeight: 1.05, marginTop: 8 }, `${plan.kroner(oere)} kr.`),
    e('div', { fontSize: 34, fontWeight: 500, color: '#4A5A70' }, 'pr. liter'));
  return e('div', { width: B, height: H, background: '#0B2545', flexDirection: 'column', alignItems: 'center', fontFamily: 'Oswald', color: '#FFFFFF' },
    e('div', { fontSize: 36, fontWeight: 500, letterSpacing: 8, color: '#BFD3EE', marginTop: 150 }, 'DAGENS LAVESTE PRIS'),
    e('div', { fontSize: 46, fontWeight: 500, marginTop: 18 }, datoTekst),
    e('div', { height: 30 }),
    benzin ? kort('BENZIN 95', benzin.prisOere) : null,
    diesel ? kort('DIESEL', diesel.prisOere) : null,
    e('div', { fontSize: 32, fontWeight: 500, color: '#BFD3EE', marginTop: 40, textAlign: 'center', maxWidth: 880, lineHeight: 1.3 },
      'Laveste literpris i dag blandt de selskaber, vi henter priser fra.'),
    e('div', { flexGrow: 1 }),
    e('div', { fontSize: 44, fontWeight: 500 }, 'Få priserne i din mail hver morgen'),
    e('div', { fontSize: 84, fontWeight: 700, marginTop: 14, marginBottom: 140, background: '#C8102E', paddingLeft: 50, paddingRight: 50, borderRadius: 18 }, 'dfpriser.dk'));
}

function mortensaftenLayout({ foto }) {
  return e('div', { width: B, height: H, background: '#3A1410', position: 'relative', fontFamily: 'Playfair', color: '#FBF3E4' },
    foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: H, objectFit: 'cover' }) : null,
    e('div', { position: 'absolute', left: 0, top: 0, width: B, height: H, backgroundImage: 'linear-gradient(to bottom, rgba(40,10,6,0) 40%, rgba(40,10,6,0.92) 78%)' }),
    e('div', { position: 'absolute', left: 0, bottom: 150, width: B, flexDirection: 'column', alignItems: 'center' },
      e('div', { fontSize: 104, fontWeight: 700, letterSpacing: 2, textAlign: 'center' }, 'MORTENS AFTEN'),
      e('div', { fontSize: 54, fontStyle: 'italic', fontWeight: 400, marginTop: 6 }, 'hver uge'),
      e('div', { fontSize: 44, fontStyle: 'italic', fontWeight: 400, marginTop: 40, textAlign: 'center', color: '#F1D9B5' }, 'Mad, vin og hygge til weekenden'),
      e('div', { fontFamily: 'Oswald', fontSize: 40, fontWeight: 500, letterSpacing: 3, marginTop: 60 }, 'TILMELD DIG PÅ'),
      e('div', { fontFamily: 'Oswald', fontSize: 80, fontWeight: 700, marginTop: 4 }, 'mortensaften.dk')));
}

const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const UGEDAGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
function datoTekst(dato) {
  const [a, m, d] = dato.split('-').map(Number);
  const dag = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${UGEDAGE[dag]} ${d}. ${MAANEDER[m - 1]}`;
}

async function tegn(type, data) {
  const satori = require('satori').default || require('satori');
  const { Resvg } = require('@resvg/resvg-js');
  let figur;
  if (type === 'podcast') figur = podcastLayout(data);
  else if (type === 'benzin') figur = benzinLayout({ ...data, datoTekst: datoTekst(data.dato) });
  else if (type === 'mortensaften') figur = mortensaftenLayout(data);
  else throw new Error(`Ukendt type: ${type}`);
  const svg = await satori(figur, { width: B, height: H, fonts: fonte() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: B } }).render().asPng();
}

module.exports = { tegn, hentFoto, datoTekst };
