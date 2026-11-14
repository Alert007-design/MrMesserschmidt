// /facebook/billede/<type>/<dato>.png: story-billedet til dagens story (podcast, benzin eller mortensaften).
// Offentligt, fordi Meta selv henter billedet. Indeholder kun oplysninger, der i forvejen er offentlige.

const { tegn, hentFoto } = require('../lib/facebook/billede');
const { miljoe, hentAfsnitMedBilleder, hentBenzin, hentEl } = require('../lib/facebook/kilder');
const plan = require('../lib/facebook/plan');
const elStories = require('../lib/facebook/el-stories');
const { hentElData } = require('../lib/facebook/kilder');

module.exports = async (req, res) => {
  const q = req.query || {};
  const type = String(q.type || '');
  const dato = String(q.dato || '');
  const format = q.format === 'jpg' ? 'jpg' : 'png';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato) || !['podcast', 'benzin', 'el', 'mortensaften', 'el-nu', 'el-uge'].includes(type)) return res.status(404).send('Findes ikke');
  const cfg = miljoe();
  const nu = new Date();

  try {
    let png;
    if (type === 'podcast') {
      const a = (await hentAfsnitMedBilleder())[0];
      png = await tegn('podcast', { foto: await hentFoto(a.billede), gaest: a.gaest, emne: a.emne }, format);
    } else if (type === 'benzin') {
      // Priserne er altid dagens. En kommende dag (op til en uge frem) vises som udkast med den dags foto.
      const idag = plan.kbh(nu).dato;
      const dage = (Date.parse(`${dato}T00:00:00Z`) - Date.parse(`${idag}T00:00:00Z`)) / 86400000;
      if (dage < 0 || dage > 7) return res.status(404).send('Kun dagens priser');
      const tal = await hentBenzin(cfg, nu);
      if (!tal) return res.status(503).send('Ingen priser fra DFpriser');
      png = await tegn('benzin', { benzin: tal.benzin, diesel: tal.diesel, dato: idag, fotoDato: dato }, format);
    } else if (type === 'el') {
      // Som benzin: altid dagens tal, en kommende lørdag vises som udkast.
      const idag = plan.kbh(nu).dato;
      const dage = (Date.parse(`${dato}T00:00:00Z`) - Date.parse(`${idag}T00:00:00Z`)) / 86400000;
      if (dage < 0 || dage > 7) return res.status(404).send('Kun dagens priser');
      const tal = await hentEl(cfg, nu);
      if (!tal) return res.status(503).send('Ingen elpriser fra DFelpriser');
      png = await tegn('el', { ...tal, dato: idag }, format);
    } else if (type === 'el-nu' || type === 'el-uge') {
      // Altid dagens tal. En kommende dag (op til en uge frem) vises som udkast på kladdesiden.
      const idag = plan.kbh(nu).dato;
      const dage = (Date.parse(`${dato}T00:00:00Z`) - Date.parse(`${idag}T00:00:00Z`)) / 86400000;
      if (dage < 0 || dage > 7) return res.status(404).send('Kun dagens priser');
      const d = await hentElData(cfg, nu);
      if (!d) return res.status(503).send('Ingen elpriser fra DFelpriser');
      if (type === 'el-nu') {
        if (!d.idag || !d.idag.DK2 || !d.idag.DK2.billigste) return res.status(503).send('Ingen periode i dag');
        png = await tegn('el-nu', elStories.nuIndhold(d), format);
      } else {
        // Søndag Vestdanmark, ellers Østdanmark (onsdag).
        const omr = new Date(`${dato}T12:00:00Z`).getUTCDay() === 0 ? 'DK1' : 'DK2';
        if (!d.uge || !d.uge[omr] || d.uge[omr].gnsForskelOere == null) return res.status(503).send('Ingen ugetal');
        png = await tegn('el-uge', elStories.ugeIndhold(d, omr), format);
      }
    } else {
      const fil = plan.mortensaftenBillede(new Date(`${dato}T10:00:00Z`));
      png = await tegn('mortensaften', { foto: await hentFoto(`${cfg.mortensaftenUrl}/billeder/web/${fil}`), liggende: plan.LIGGENDE.includes(fil) }, format);
    }
    res.setHeader('Content-Type', format === 'jpg' ? 'image/jpeg' : 'image/png');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
    return res.status(200).send(png);
  } catch (e) {
    console.error('[facebook-billede]', e && e.message);
    return res.status(503).send('Billedet kunne ikke laves');
  }
};
