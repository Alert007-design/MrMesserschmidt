// /facebook/billede/<type>/<dato>.png: story-billedet til dagens story (podcast, benzin eller mortensaften).
// Offentligt, fordi Meta selv henter billedet. Indeholder kun oplysninger, der i forvejen er offentlige.

const { tegn, hentFoto } = require('../lib/facebook/billede');
const { miljoe, hentAfsnitMedBilleder, hentBenzin } = require('../lib/facebook/kilder');
const plan = require('../lib/facebook/plan');

module.exports = async (req, res) => {
  const q = req.query || {};
  const type = String(q.type || '');
  const dato = String(q.dato || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato) || !['podcast', 'benzin', 'mortensaften'].includes(type)) return res.status(404).send('Findes ikke');
  const cfg = miljoe();
  const nu = new Date();

  try {
    let png;
    if (type === 'podcast') {
      const a = (await hentAfsnitMedBilleder())[0];
      png = await tegn('podcast', { foto: await hentFoto(a.billede), gaest: a.gaest, emne: a.emne });
    } else if (type === 'benzin') {
      // Benzinpriser vises kun for i dag.
      if (dato !== plan.kbh(nu).dato) return res.status(404).send('Kun dagens priser');
      const tal = await hentBenzin(cfg, nu);
      if (!tal) return res.status(503).send('Ingen priser fra DFpriser');
      png = await tegn('benzin', { benzin: tal.benzin, diesel: tal.diesel, dato });
    } else {
      const fil = plan.mortensaftenBillede(new Date(`${dato}T10:00:00Z`));
      png = await tegn('mortensaften', { foto: await hentFoto(`${cfg.mortensaftenUrl}/billeder/web/${fil}`) });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
    return res.status(200).send(png);
  } catch (e) {
    console.error('[facebook-billede]', e && e.message);
    return res.status(503).send('Billedet kunne ikke laves');
  }
};
