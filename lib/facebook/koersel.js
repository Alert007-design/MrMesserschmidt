// Én kørsel (hver time): nyt podcastafsnit til podcastsiden og kl. 9 dagens story til politikersiden.
// `status` ændres her og gemmes af den, der kalder. Intet prøves igen: et kald, der fejlede, logges og vises på kladdesiden.

const plan = require('./plan');

const MAKS_LOG = 60;
const MAKS_DAGE = 40;

function log(status, post) {
  status.log = [{ tid: new Date().toISOString(), ...post }, ...(status.log || [])].slice(0, MAKS_LOG);
}

function fejlInfo(e) {
  return { resultat: 'fejl', art: (e && e.art) || 'ukendt', besked: String((e && e.message) || e).slice(0, 300) };
}

async function podcast(i) {
  let afsnit;
  try {
    afsnit = await i.hentAfsnit();
  } catch (e) {
    return { resultat: 'feed_fejlede', besked: String(e && e.message) };
  }
  if (!Array.isArray(afsnit) || afsnit.length === 0) return { resultat: 'ingen_afsnit' };

  const sete = new Set(i.status.sete || []);
  if (!i.status.initialiseret) {
    i.status.sete = afsnit.map((a) => a.id);
    i.status.initialiseret = true;
    log(i.status, { hvad: 'start', resultat: `${afsnit.length} eksisterende afsnit markeret som set` });
    return { resultat: 'startet' };
  }

  const nye = afsnit.filter((a) => !sete.has(a.id));
  if (nye.length === 0) return { resultat: 'intet_nyt' };
  // Alle nye markeres som set, før Meta kaldes: et afsnit lægges aldrig op to gange.
  i.status.sete = [...sete, ...nye.map((a) => a.id)];
  const a = nye[0];
  const tekst = plan.podcastTekst(a);
  const post = { hvad: 'podcastopslag', afsnit: a.titel, billede: a.billede, tekst };

  if (i.tilstand !== 'live') {
    log(i.status, { ...post, resultat: 'kladde' });
    return { resultat: 'kladde' };
  }
  try {
    const r = await i.meta.fotoOpslag(i.cfg.sider.podcast.id, i.cfg.sider.podcast.noegle, { billede: a.billede, tekst });
    log(i.status, { ...post, resultat: 'lagt', id: r.id });
    return { resultat: 'lagt' };
  } catch (e) {
    log(i.status, { ...post, ...fejlInfo(e) });
    return fejlInfo(e);
  }
}

async function story(i) {
  if (!plan.erStoryTime(i.nu)) return { resultat: 'ikke_tid' };
  const { dato } = plan.kbh(i.nu);
  i.status.stories = i.status.stories || {};
  if (i.status.stories[dato]) return { resultat: 'allerede_gjort' };

  const type = plan.storyType(i.nu, i.cfg.mortensaftenFra);
  if (!type) {
    i.status.stories[dato] = { type: null, resultat: 'ingen_i_dag' };
    return { resultat: 'ingen_i_dag' };
  }
  if (type === 'benzin') {
    let tal = null;
    try { tal = await i.hentBenzin(); } catch { tal = null; }
    if (!tal || !tal.benzin) {
      i.status.stories[dato] = { type, resultat: 'sprunget_over', besked: 'Ingen benzinpriser fra DFpriser' };
      log(i.status, { hvad: 'story', type, dato, resultat: 'sprunget_over' });
      return { resultat: 'sprunget_over' };
    }
  }

  const billede = i.cfg.billedUrl(type, dato);
  // Dagen reserveres, før Meta kaldes.
  i.status.stories[dato] = { type, billede, resultat: 'i_gang' };
  let udfald;
  if (i.tilstand !== 'live') {
    udfald = { resultat: 'kladde' };
  } else {
    try {
      const r = await i.meta.story(i.cfg.sider.politiker.id, i.cfg.sider.politiker.noegle, billede);
      udfald = { resultat: 'lagt', id: r.id };
    } catch (e) {
      udfald = fejlInfo(e);
    }
  }
  i.status.stories[dato] = { type, billede, ...udfald };
  log(i.status, { hvad: 'story', type, dato, billede, ...udfald });
  return udfald;
}

function ryd(status) {
  const dage = Object.keys(status.stories || {}).sort();
  for (const d of dage.slice(0, Math.max(0, dage.length - MAKS_DAGE))) delete status.stories[d];
  if ((status.sete || []).length > 2000) status.sete = status.sete.slice(-2000);
}

async function koer(i) {
  if (i.tilstand !== 'live' && i.tilstand !== 'kladde') return { tilstand: 'fra' };
  const p = await podcast(i);
  const s = await story(i);
  ryd(i.status);
  return { tilstand: i.tilstand, podcast: p, story: s };
}

module.exports = { MAKS_LOG, koer };
