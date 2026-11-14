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
