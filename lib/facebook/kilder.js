// Indstillinger fra Vercel og de data, Facebook-delen bygger på: seneste afsnit og dagens benzinpriser.

const plan = require('./plan');

function miljoe() {
  const v = (n, std = '') => (process.env[n] || std).trim();
  const tilstand = v('FACEBOOK_TILSTAND', 'fra').toLowerCase();
  const site = v('SITE_URL', 'https://mrmesserschmidt.dk').replace(/\/$/, '');
  return {
    tilstand: ['fra', 'kladde', 'live'].includes(tilstand) ? tilstand : 'fra',
    site,
    kladdeNoegle: v('FACEBOOK_KLADDE_NOEGLE'),
    cronSecret: v('CRON_SECRET'),
    mortensaftenFra: v('MORTENSAFTEN_FRA', '2026-11-06'),
    mortensaftenUrl: v('MORTENSAFTEN_URL', 'https://mortensaften.vercel.app').replace(/\/$/, ''),
    dfpriserUrl: v('DFPRISER_DATA_URL', 'https://dfpriser.dk/api/story-data'),
    dfpriserNoegle: v('DFPRISER_NOEGLE'),
    sider: {
      podcast: { id: v('FB_SIDE_PODCAST'), noegle: v('FB_NOEGLE_PODCAST') },
      politiker: { id: v('FB_SIDE_POLITIKER', '111394892261429'), noegle: v('FB_NOEGLE_POLITIKER') },
    },
    billedUrl: (type, dato) => `${site}/facebook/billede/${type}/${dato}.png`,
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

module.exports = { miljoe, afsnitsBillede, hentAfsnitMedBilleder, hentBenzin };
