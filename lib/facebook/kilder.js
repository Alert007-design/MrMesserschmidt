// Indstillinger fra Vercel og de data, Facebook-delen bygger på: seneste afsnit og dagens benzinpriser.

const plan = require('./plan');

const TYPER = ['podcast', 'benzin', 'el', 'mortensaften', 'instagram'];
function godkendte(tekst) {
  return String(tekst || '').toLowerCase().split(',').map((x) => x.trim()).filter((x) => TYPER.includes(x));
}

function miljoe() {
  const v = (n, std = '') => (process.env[n] || std).trim();
  const tilstand = v('FACEBOOK_TILSTAND', 'fra').toLowerCase();
  const site = v('SITE_URL', 'https://mrmesserschmidt.dk').replace(/\/$/, '');
  return {
    tilstand: ['fra', 'kladde', 'live'].includes(tilstand) ? tilstand : 'fra',
    site,
    kladdeNoegle: v('FACEBOOK_KLADDE_NOEGLE'),
    // Typer, der lægges ud, selv om resten står i kladde: podcast, benzin, mortensaften, instagram.
    godkendt: godkendte(v('FACEBOOK_GODKENDT')),
    cronSecret: v('CRON_SECRET'),
    mortensaftenFra: v('MORTENSAFTEN_FRA', '2026-11-06'),
    mortensaftenUrl: v('MORTENSAFTEN_URL', 'https://mortensaften.vercel.app').replace(/\/$/, ''),
    dfpriserUrl: v('DFPRISER_DATA_URL', 'https://dfpriser.dk/api/story-data'),
    dfpriserNoegle: v('DFPRISER_NOEGLE'),
    elUrl: v('EL_DATA_URL', 'https://dfelpriser.dk/el/api/opslag-data'),
    elNoegle: v('EL_NOEGLE'),
    sider: {
      podcast: { id: v('FB_SIDE_PODCAST'), noegle: v('FB_NOEGLE_PODCAST') },
      politiker: { id: v('FB_SIDE_POLITIKER', '111394892261429'), noegle: v('FB_NOEGLE_POLITIKER') },
    },
    // Instagram-kontoen bruger politikersidens nøgle (kontoen er koblet til siden).
    instagram: { id: v('IG_KONTO_ID'), noegle: v('FB_NOEGLE_POLITIKER') },
    billedUrl: (type, dato, fmt = 'png') => `${site}/facebook/billede/${type}/${dato}.${fmt}`,
  };
}

async function findes(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

// Bedste billede til et afsnit: redaktionens eget, ellers YouTubes store billede, ellers det, siden i forvejen bruger.
async function afsnitsBillede(a) {
  if (a.egetBillede) return a.billede;
  if (a.youtube && a.youtube.id) {
    const stor = `https://i.ytimg.com/vi/${a.youtube.id}/maxresdefault.jpg`;
    if (await findes(stor)) return stor;
  }
  return a.billede;
}

async function hentAfsnitMedBilleder() {
  const { hentAlt, sikkert } = require('../podcast');
  const { egneBilleder } = require('../billeder');
  const egne = await sikkert(egneBilleder, {});
  const data = await hentAlt(egne);
  if (!data.afsnit.length) throw new Error('Ingen afsnit fra Spreaker');
  // Kun det nyeste afsnit får tjekket det store billede: det er det eneste, der kan blive lagt op.
  data.afsnit[0].billede = await afsnitsBillede(data.afsnit[0]);
  return data.afsnit;
}

// Dagens laveste priser fra DFpriser. Kun tal for i dag godtages.
async function hentBenzin(cfg, nu = new Date()) {
  if (!cfg.dfpriserNoegle) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(cfg.dfpriserUrl, { headers: { Authorization: `Bearer ${cfg.dfpriserNoegle}` }, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.dato !== plan.kbh(nu).dato || !d.benzin || !d.benzin.prisOere) return null;
    return d;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Dagens billigste tretimersperiode i DK1 og DK2 fra DFelpriser. Kun tal for i dag og kun rigtige priser godtages.
function elTal(d, idag) {
  if (!d || d.dato !== idag || !d.idag) return null;
  const vest = d.idag.DK1 && d.idag.DK1.billigste;
  const oest = d.idag.DK2 && d.idag.DK2.billigste;
  if (!vest || !oest) return null;
  return { dato: d.dato, vest, oest, tilmeldingAaben: d.tilmeldingAaben === true };
}

async function hentEl(cfg, nu = new Date()) {
  if (!cfg.elNoegle) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(cfg.elUrl, { headers: { Authorization: `Bearer ${cfg.elNoegle}` }, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    return elTal(await r.json(), plan.kbh(nu).dato);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

module.exports = { miljoe, godkendte, afsnitsBillede, hentAfsnitMedBilleder, hentBenzin, hentEl, elTal };
