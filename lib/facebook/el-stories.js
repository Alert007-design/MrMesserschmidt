// To el-stories på politikersiden og Instagram (Morten 14/11-2026):
//  A »Nu er det nu«: når dagens billigste periode i Østdanmark begynder (ikke om natten).
//  B »Den seneste uge«: søndag kl. 19 (Vestdanmark) og onsdag kl. 19 (Østdanmark).
// De nye typer lægges kun ud, når de står i FACEBOOK_GODKENDT, også når resten er live.
// `status` ændres her og gemmes af den, der kalder. Intet prøves igen samme dag.

const plan = require('./plan');

const NU_MINUTTER = 20;
const TIDLIGST = 6;
const SENEST = 21;
const UGE_TIME = 19;
const UGE_DAGE = { 0: 'DK1', 3: 'DK2' }; // søndag Vest, onsdag Øst
const NAVN = { DK1: 'Vestdanmark', DK2: 'Østdanmark' };
const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const MAKS_LOG = 60;
const MAKS_NOEGLER = 80;

function klokke(iso) {
  const d = {};
  for (const p of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))) d[p.type] = p.value;
  return `${d.hour === '24' ? '00' : d.hour}.${d.minute}`;
}

function kr(oere) {
  return (Math.round(oere) / 100).toFixed(2).replace('.', ',');
}

function erNuTid(nu, p) {
  if (!p || !p.start) return false;
  const start = Date.parse(p.start);
  const t = nu.getTime();
  if (t < start || t >= start + NU_MINUTTER * 60000) return false;
  const time = Number(klokke(p.start).split('.')[0]);
  return time >= TIDLIGST && time < SENEST;
}

function ugeOmraade(nu) {
  const { time, ugedag } = plan.kbh(nu);
  return time === UGE_TIME && UGE_DAGE[ugedag] ? UGE_DAGE[ugedag] : null;
}

function periodeTekst(fra, til) {
  const [, m1, d1] = fra.split('-').map(Number);
  const [, m2, d2] = til.split('-').map(Number);
  return m1 === m2 ? `${d1}.–${d2}. ${MAANEDER[m2 - 1]}` : `${d1}. ${MAANEDER[m1 - 1]}–${d2}. ${MAANEDER[m2 - 1]}`;
}

function nuIndhold(d) {
  const o = d.idag.DK2.billigste;
  const v = d.idag.DK1 && d.idag.DK1.billigste;
  return {
    til: klokke(o.slut),
    oereOest: o.gennemsnitOere,
    vestTekst: v ? `Vestdanmark: kl. ${klokke(v.start)}–${klokke(v.slut)}` : '',
    tilmeldingAaben: d.tilmeldingAaben === true,
  };
}

function ugeIndhold(d, omr) {
  const u = d.uge[omr];
  return { omraadeNavn: NAVN[omr], beloeb: kr(u.gnsForskelOere), periode: periodeTekst(u.fra, u.til), tilmeldingAaben: d.tilmeldingAaben === true };
}

function godkendt(i, type) {
  return (i.tilstand === 'live' || i.tilstand === 'kladde') && ((i.cfg && i.cfg.godkendt) || []).includes(type);
}
function godkendtInstagram(i, type) {
  return godkendt(i, type) && (i.tilstand === 'live' || ((i.cfg && i.cfg.godkendt) || []).includes('instagram'));
}

function log(status, post) {
  status.log = [{ tid: new Date().toISOString(), ...post }, ...(status.log || [])].slice(0, MAKS_LOG);
}

function fejlInfo(e) {
  return { resultat: 'fejl', art: (e && e.art) || 'ukendt', besked: String((e && e.message) || e).slice(0, 300) };
}

async function laeg(i, type, dato, ekstra) {
  const noegle = `${dato}:${type}`;
  const billede = i.cfg.billedUrl(type, dato);
  // Reserveres, før Meta kaldes: samme story kan aldrig gå ud to gange.
  i.status.gjort[noegle] = { type, billede, resultat: 'i_gang', ...ekstra };
  let fb;
  if (!godkendt(i, type)) fb = { resultat: 'kladde' };
  else {
    try {
      fb = { resultat: 'lagt', id: (await i.meta.story(i.cfg.sider.politiker.id, i.cfg.sider.politiker.noegle, billede)).id };
    } catch (e) {
      fb = fejlInfo(e);
    }
  }
  const ig = i.cfg.instagram || {};
  let instagram;
  if (!ig.id || !ig.noegle) instagram = { resultat: 'ikke_opsat' };
  else if (!godkendtInstagram(i, type)) instagram = { resultat: 'kladde' };
  else {
    try {
      instagram = { resultat: 'lagt', id: (await i.meta.instagramStory(ig.id, ig.noegle, i.cfg.billedUrl(type, dato, 'jpg'))).id };
    } catch (e) {
      instagram = fejlInfo(e);
    }
  }
  i.status.gjort[noegle] = { type, billede, ...ekstra, ...fb, instagram };
  log(i.status, { hvad: 'story', type, dato, billede, ...fb });
  if (instagram.resultat !== 'ikke_opsat') log(i.status, { hvad: 'instagramstory', type, dato, ...instagram });
  return { ...ekstra, ...fb, instagram };
}

function ryd(status) {
  const n = Object.keys(status.gjort || {}).sort();
  for (const k of n.slice(0, Math.max(0, n.length - MAKS_NOEGLER))) delete status.gjort[k];
}

async function koerElStories(i) {
  if (i.tilstand !== 'live' && i.tilstand !== 'kladde') return { tilstand: 'fra' };
  i.status.gjort = i.status.gjort || {};
  const { dato } = plan.kbh(i.nu);
  const omr = ugeOmraade(i.nu);
  const nuNoegle = `${dato}:el-nu`;
  const ugeNoegle = `${dato}:el-uge`;
  const nuGjort = !!i.status.gjort[nuNoegle];
  const ugeGjort = !omr || !!i.status.gjort[ugeNoegle];

  let d = null;
  try { d = await i.hentEl(); } catch { d = null; }
  const ok = d && d.dato === dato;

  let nu;
  if (nuGjort) nu = { resultat: 'allerede_gjort' };
  else if (!ok || !d.idag || !d.idag.DK2 || !d.idag.DK2.billigste) nu = { resultat: 'ingen_data' };
  else if (!erNuTid(i.nu, d.idag.DK2.billigste)) nu = { resultat: 'ikke_tid' };
  else nu = await laeg(i, 'el-nu', dato, {});

  let uge;
  if (!omr) uge = { resultat: 'ikke_tid' };
  else if (ugeGjort) uge = { resultat: 'allerede_gjort' };
  else if (!ok || !d.uge || !d.uge[omr] || d.uge[omr].gnsForskelOere === null || d.uge[omr].gnsForskelOere === undefined) {
    i.status.gjort[ugeNoegle] = { type: 'el-uge', omraade: omr, resultat: 'sprunget_over' };
    log(i.status, { hvad: 'story', type: 'el-uge', dato, resultat: 'sprunget_over' });
    uge = { resultat: 'sprunget_over', omraade: omr };
  } else uge = await laeg(i, 'el-uge', dato, { omraade: omr });

  ryd(i.status);
  return { tilstand: i.tilstand, nu, uge };
}

module.exports = { klokke, kr, erNuTid, ugeOmraade, periodeTekst, nuIndhold, ugeIndhold, koerElStories, NAVN, UGE_DAGE };
