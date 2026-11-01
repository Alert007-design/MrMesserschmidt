// Kørslen hver time (Vercel Cron): nyt podcastafsnit på podcastsiden og kl. 9 dagens story på politikersiden.
// Slukket, så længe FACEBOOK_TILSTAND ikke er kladde eller live. Kun Vercel Cron (CRON_SECRET) kan starte den.

const { miljoe, hentAfsnitMedBilleder, hentBenzin } = require('../lib/facebook/kilder');
const { hentStatus, gemStatus } = require('../lib/facebook/status');
const { opretMeta } = require('../lib/facebook/meta');
const { koer } = require('../lib/facebook/koersel');

module.exports = async (req, res) => {
  const cfg = miljoe();
  if (!cfg.cronSecret || req.headers.authorization !== `Bearer ${cfg.cronSecret}`) return res.status(401).send('Ikke tilladt');
  if (cfg.tilstand === 'fra') return res.status(200).json({ tilstand: 'fra' });

  const status = await hentStatus();
  const nu = new Date();
  const resultat = await koer({
    nu,
    tilstand: cfg.tilstand,
    status,
    hentAfsnit: hentAfsnitMedBilleder,
    hentBenzin: () => hentBenzin(cfg, nu),
    meta: opretMeta(),
    cfg,
  });
  await gemStatus(status);
  console.log('facebook', JSON.stringify(resultat));
  const fejl = [resultat.podcast, resultat.story].some((x) => x && x.resultat === 'fejl');
  return res.status(fejl ? 503 : 200).json(resultat);
};
