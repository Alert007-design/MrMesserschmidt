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

// Fotos til benzin-storyen (Unsplash). Tirsdag tankpistolen, lørdag turen ud ad landevejen.
const BENZIN_FOTOS = { 2: 'benzin-tank.jpg', 6: 'benzin-vindue.jpg' };
function benzinFoto(dato) {
  const [a, m, d] = dato.split('-').map(Number);
  const fil = BENZIN_FOTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()] || BENZIN_FOTOS[2];
  try {
    const buf = fs.readFileSync(require('path').join(__dirname, 'fotos', fil));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function benzinLayout({ benzin, diesel, datoTekst, foto }) {
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
      e('div', { flexGrow: 1 }),
      e('div', { fontSize: 96, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', flexDirection: 'column', alignItems: 'center' },
        e('div', {}, 'Få priserne i din mail'), e('div', {}, 'hver morgen')),
      e('div', { fontSize: 96, fontWeight: 700, marginTop: 40, marginBottom: 150, background: '#C8102E', paddingLeft: 60, paddingRight: 60, paddingTop: 6, paddingBottom: 10, borderRadius: 20 }, 'dfpriser.dk')));
}

function mortensaftenLayout({ foto, liggende }) {
  const fotoFelt = liggende
    ? [foto ? img(foto, { position: 'absolute', left: 0, top: 170, width: B, height: 810, objectFit: 'cover' }) : null,
      e('div', { position: 'absolute', left: 0, top: 170, width: B, height: 810, backgroundImage: 'linear-gradient(to bottom, rgba(58,20,16,0.6) 0%, rgba(58,20,16,0) 18%, rgba(58,20,16,0) 70%, rgba(58,20,16,1) 100%)' })]
    : [foto ? img(foto, { position: 'absolute', left: 0, top: 0, width: B, height: 1200, objectFit: 'cover', objectPosition: '50% 60%' }) : null,
      e('div', { position: 'absolute', left: 0, top: 0, width: B, height: 1200, backgroundImage: 'linear-gradient(to bottom, rgba(58,20,16,0) 0%, rgba(58,20,16,0) 72%, rgba(58,20,16,1) 100%)' })];
  return e('div', { width: B, height: H, background: '#3A1410', position: 'relative', fontFamily: 'Playfair', color: '#FBF3E4' },
    ...fotoFelt,
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

async function tegn(type, data, format = 'png') {
  const satori = require('satori').default || require('satori');
  const { Resvg } = require('@resvg/resvg-js');
  let figur;
  if (type === 'podcast') figur = podcastLayout(data);
  else if (type === 'benzin') figur = benzinLayout({ ...data, datoTekst: datoTekst(data.dato), foto: data.foto === undefined ? benzinFoto(data.fotoDato || data.dato) : data.foto });
  else if (type === 'mortensaften') figur = mortensaftenLayout(data);
  else throw new Error(`Ukendt type: ${type}`);
  const svg = await satori(figur, { width: B, height: H, fonts: fonte() });
  const billede = new Resvg(svg, { fitTo: { mode: 'width', value: B } }).render();
  if (format !== 'jpg') return billede.asPng();
  // Instagram tager kun JPEG.
  const jpeg = require('jpeg-js');
  return jpeg.encode({ data: Buffer.from(billede.pixels), width: billede.width, height: billede.height }, 90).data;
}

module.exports = { tegn, hentFoto, datoTekst, benzinFoto };
