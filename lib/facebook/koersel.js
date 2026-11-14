// Én kørsel (hver time): nyt podcastafsnit til podcastsiden og kl. 9 og kl. 19 dagens stories til politikersiden.
// `status` ændres her og gemmes af den, der kalder. Intet prøves igen: et kald, der fejlede, logges og vises på kladdesiden.

const plan = require('./plan');

const MAKS_LOG = 60;
const MAKS_DAGE = 80; // to stories om dagen: 40 dage

function log(status, post) {
  status.log = [{ tid: new Date().toISOString(), ...post }, ...(status.log || [])].slice(0, MAKS_LOG);
}

// Lægges en type ud? Live lægger alt ud. I kladde lægges kun de typer ud, Morten har godkendt (FACEBOOK_GODKENDT).
function erLive(i, type) {
  if (i.tilstand === 'live') return true;
  return i.tilstand === 'kladde' && ((i.cfg && i.cfg.godkendt) || []).includes(type);
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

// Nøglen i status: morgenens story har datoen (som før 15/11-2026), aftenens har ":aften" efter.
function noegle(dato, slot) {
  return slot === 'morgen' ? dato : `${dato}:aften`;
}

// Til hvilken time en kladde kan indhentes, når typen bliver godkendt samme dag.
const INDHENT_TIL = { morgen: 17, aften: 21 };

// Blev storyen kun en kladde, og er typen siden godkendt, lægges den op ved en senere kørsel samme dag.
function indhent(i, dato, time, slot) {
  const gjort = (i.status.stories || {})[noegle(dato, slot)];
  return !!gjort && gjort.resultat === 'kladde' && !!gjort.type && time > plan.TIDER[slot] && time <= INDHENT_TIL[slot] && erLive(i, gjort.type);
}

// Nye formater skal altid stå på listen over godkendte, også når resten er live.
function saerligtGodkendt(i, type) {
  return ((i.cfg && i.cfg.godkendt) || []).includes(type);
}

async function priserMangler(i, type) {
  if (type === 'benzin') {
    let tal = null;
    try { tal = await i.hentBenzin(); } catch { tal = null; }
    if (!tal || !tal.benzin) return 'Ingen benzinpriser fra DFpriser';
  }
  if (type === 'el') {
    let tal = null;
    try { tal = i.hentEl ? await i.hentEl() : null; } catch { tal = null; }
    if (!tal) return 'Ingen elpriser fra DFelpriser';
  }
  return null;
}

async function story(i, slot) {
  const { dato, time } = plan.kbh(i.nu);
  const n = noegle(dato, slot);
  i.status.stories = i.status.stories || {};
  const senere = indhent(i, dato, time, slot);
  if (!senere && !plan.erStoryTime(i.nu, slot)) return { resultat: 'ikke_tid' };
  if (!senere && i.status.stories[n]) return { resultat: 'allerede_gjort' };

  let type = senere ? i.status.stories[n].type : plan.storyType(i.nu, i.cfg.mortensaftenFra, slot);
  let erstatter;
  if (type === 'to-kroner' && !saerligtGodkendt(i, 'to-kroner')) {
    erstatter = 'to-kroner';
    type = plan.reserveType(i.nu);
  }
  if (!type) {
    i.status.stories[n] = { type: null, resultat: 'ingen_i_dag' };
    return { resultat: 'ingen_i_dag' };
  }
  const mangler = await priserMangler(i, type);
  if (mangler) {
    i.status.stories[n] = { type, resultat: 'sprunget_over', besked: mangler };
    log(i.status, { hvad: 'story', type, dato, slot, resultat: 'sprunget_over' });
    return { resultat: 'sprunget_over' };
  }

  const billede = i.cfg.billedUrl(type, dato);
  const ekstra = erstatter ? { erstatter } : {};
  // Storyen reserveres, før Meta kaldes.
  i.status.stories[n] = { type, billede, ...ekstra, resultat: 'i_gang' };
  const live = type === 'to-kroner' ? saerligtGodkendt(i, type) : erLive(i, type);
  let udfald;
  if (!live) {
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
  } else if (!live || !(i.tilstand === 'live' || saerligtGodkendt(i, 'instagram'))) {
    instagram = { resultat: 'kladde' };
  } else {
    try {
      const r = await i.meta.instagramStory(ig.id, ig.noegle, i.cfg.billedUrl(type, dato, 'jpg'));
      instagram = { resultat: 'lagt', id: r.id };
    } catch (e) {
      instagram = fejlInfo(e);
    }
  }
  i.status.stories[n] = { type, billede, ...ekstra, ...udfald, instagram };
  log(i.status, { hvad: 'story', type, dato, slot, billede, ...ekstra, ...udfald });
  if (instagram.resultat !== 'ikke_opsat') log(i.status, { hvad: 'instagramstory', type, dato, slot, ...instagram });
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
  const morgen = await story(i, 'morgen');
  const aften = await story(i, 'aften');
  ryd(i.status);
  return { tilstand: i.tilstand, podcast: p, story: morgen, aften };
}

module.exports = { MAKS_LOG, koer, erLive };
