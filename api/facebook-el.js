// Kørslen hvert kvarter (Vercel Cron): el-stories »Nu er det nu« og »Den seneste uge« (lib/facebook/el-stories.js).
// Slukket, så længe FACEBOOK_TILSTAND ikke er kladde eller live. Kun Vercel Cron (CRON_SECRET) kan starte den.

const { miljoe, hentElData } = require('../lib/facebook/kilder');
const { hentStatus, gemStatus, EL_STI } = require('../lib/facebook/status');
const { opretMeta } = require('../lib/facebook/meta');
const { koerElStories } = require('../lib/facebook/el-stories');

module.exports = async (req, res) => {
  const cfg = miljoe();
  if (!cfg.cronSecret || req.headers.authorization !== `Bearer ${cfg.cronSecret}`) return res.status(401).send('Ikke tilladt');
  if (cfg.tilstand === 'fra') return res.status(200).json({ tilstand: 'fra' });

  const nu = new Date();
  const status = await hentStatus(EL_STI);
  const resultat = await koerElStories({ nu, tilstand: cfg.tilstand, status, hentEl: () => hentElData(cfg, nu), meta: opretMeta(), cfg });
  await gemStatus(status, EL_STI);
  console.log('facebook-el', JSON.stringify(resultat));
  const fejl = [resultat.nu, resultat.uge].some((x) => x && x.resultat === 'fejl');
  return res.status(fejl ? 503 : 200).json(resultat);
};
