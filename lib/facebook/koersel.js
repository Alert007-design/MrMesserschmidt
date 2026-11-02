// Én kørsel (hver time): nyt podcastafsnit til podcastsiden og kl. 9 dagens story til politikersiden.
// `status` ændres her og gemmes af den, der kalder. Intet prøves igen: et kald, der fejlede, logges og vises på kladdesiden.

const plan = require('./plan');

const MAKS_LOG = 60;
const MAKS_DAGE = 40;

function log(status, post) {
  status.log = [{ tid: new Date().toISOString(), ...post }, ...(status.log || [])].slice(0, MAKS_LOG);
}

// Lægges en type ud? Live lægger alt ud. I kladde lægges kun de typer ud, Morten har godkendt (FACEBOOK_GODKENDT).
function erLive(i, type) {
  if (i.tilstand === 'live') return true;
  return i.tilstand === 'kladde' && ((i.cfg && i.cfg.godkendt) || []).includes(type);
}

// Instagram følger med, når typen er live, men kun hvis Instagram selv er godkendt eller alt er live.
function erLiveInstagram(i, type) {
  if (i.tilstand === 'live') return true;
  return erLive(i, type) && ((i.cfg && i.cfg.godkendt) || []).includes('instagram');
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

  if (!erLive(i, 'podcast')) {
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

// Blev dagens story kun en kladde, og er typen siden godkendt, lægges den op ved næste kørsel samme dag (senest kl. 20).
function indhent(i, dato, time) {
  const gjort = (i.status.stories || {})[dato];
  return !!gjort && gjort.resultat === 'kladde' && !!gjort.type && time > plan.STORY_TIME && time <= 20 && erLive(i, gjort.type);
}

async function story(i) {
  const { dato, time } = plan.kbh(i.nu);
  i.status.stories = i.status.stories || {};
  const senere = indhent(i, dato, time);
  if (!senere && !plan.erStoryTime(i.nu)) return { resultat: 'ikke_tid' };
  if (!senere && i.status.stories[dato]) return { resultat: 'allerede_gjort' };

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
  if (!erLive(i, type)) {
    udfald = { resultat: 'kladde' };
  } else {
    try {
      const r = await i.meta.story(i.cfg.sider.politiker.id, i.cfg.sider.politiker.noegle, billede);
      udfald = { resultat: 'lagt', id: r.id };
    } catch (e) {
      udfald = fejlInfo(e);
    }
  }
  // Instagram får samme billede som JPEG. Fejler Facebook, prøves Instagram alligevel.
  const ig = i.cfg.instagram || {};
  let instagram;
  if (!ig.id || !ig.noegle) {
    instagram = { resultat: 'ikke_opsat' };
  } else if (!erLiveInstagram(i, type)) {
    instagram = { resultat: 'kladde' };
  } else {
    try {
      const r = await i.meta.instagramStory(ig.id, ig.noegle, i.cfg.billedUrl(type, dato, 'jpg'));
      instagram = { resultat: 'lagt', id: r.id };
    } catch (e) {
      instagram = fejlInfo(e);
    }
  }
  i.status.stories[dato] = { type, billede, ...udfald, instagram };
  log(i.status, { hvad: 'story', type, dato, billede, ...udfald });
  if (instagram.resultat !== 'ikke_opsat') log(i.status, { hvad: 'instagramstory', type, dato, ...instagram });
  return { ...udfald, instagram };
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

module.exports = { MAKS_LOG, koer, erLive };
