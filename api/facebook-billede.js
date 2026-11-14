// /facebook/billede/<type>/<dato>.png: story-billedet til dagens story (podcast, benzin, el, mortensaften, el-nu, el-uge eller to-kroner).
// Offentligt, fordi Meta selv henter billedet. Indeholder kun oplysninger, der i forvejen er offentlige.

const { tegn, hentFoto } = require('../lib/facebook/billede');
const { miljoe, hentAfsnitMedBilleder, hentBenzin, hentEl } = require('../lib/facebook/kilder');
const plan = require('../lib/facebook/plan');
const elStories = require('../lib/facebook/el-stories');
const { hentElData } = require('../lib/facebook/kilder');

function variantFor(type, dato, godkendt, udkast) {
  const ok = (navn) => udkast || godkendt.includes(navn);
  const v = {};
  if (plan.erJul(dato) && ['podcast', 'benzin', 'el', 'mortensaften', 'to-kroner'].includes(type) && ok('jul')) v.jul = true;
  const dage = plan.dageTilToKroner(dato);
  if ((type === 'benzin' || type === 'el') && dage && ok('nedtaelling')) v.nedtaelling = { dage };
  return v;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const type = String(q.type || '');
  const dato = String(q.dato || '');
  const format = q.format === 'jpg' ? 'jpg' : 'png';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato) || !['podcast', 'benzin', 'el', 'mortensaften', 'el-nu', 'el-uge', 'to-kroner'].includes(type)) return res.status(404).send('Findes ikke');
  const cfg = miljoe();
  const nu = new Date();
  // Nye formater (nedtælling, jul, 2-kroners-storyen) bruges kun, når Morten har godkendt dem.
  // ?udkast=1 viser dem alligevel, så de kan ses på kladdesiden. Udkast kan vises op til 60 dage frem.
  const udkast = q.udkast === '1';
  const variant = variantFor(type, dato, cfg.godkendt, udkast);
  const maksDage = udkast ? 60 : 7;

  try {
    let png;
    if (type === 'podcast') {
      const a = (await hentAfsnitMedBilleder())[0];
      png = await tegn('podcast', { foto: await hentFoto(a.billede), gaest: a.gaest, emne: a.emne, ...variant }, format);
    } else if (type === 'to-kroner') {
      if (dato !== plan.TO_KRONER_DATO && !udkast) return res.status(404).send('Findes ikke');
      png = await tegn('to-kroner', { ...variant }, format);
    } else if (type === 'benzin') {
      // Priserne er altid dagens. En kommende dag (op til en uge frem) vises som udkast med den dags foto.
      const idag = plan.kbh(nu).dato;
      const dage = (Date.parse(`${dato}T00:00:00Z`) - Date.parse(`${idag}T00:00:00Z`)) / 86400000;
      if (dage < 0 || dage > maksDage) return res.status(404).send('Kun dagens priser');
      const tal = await hentBenzin(cfg, nu);
      if (!tal) return res.status(503).send('Ingen priser fra DFpriser');
      png = await tegn('benzin', { benzin: tal.benzin, diesel: tal.diesel, dato, ...variant }, format);
    } else if (type === 'el') {
      // Som benzin: altid dagens tal, en kommende lørdag vises som udkast.
      const idag = plan.kbh(nu).dato;
      const dage = (Date.parse(`${dato}T00:00:00Z`) - Date.parse(`${idag}T00:00:00Z`)) / 86400000;
      if (dage < 0 || dage > maksDage) return res.status(404).send('Kun dagens priser');
      const tal = await hentEl(cfg, nu);
      if (!tal) return res.status(503).send('Ingen elpriser fra DFelpriser');
      png = await tegn('el', { ...tal, dato, ...variant }, format);
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
      png = await tegn('mortensaften', { foto: await hentFoto(`${cfg.mortensaftenUrl}/billeder/web/${fil}`), liggende: plan.LIGGENDE.includes(fil), ...variant }, format);
    }
    res.setHeader('Content-Type', format === 'jpg' ? 'image/jpeg' : 'image/png');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
    return res.status(200).send(png);
  } catch (e) {
    console.error('[facebook-billede]', e && e.message);
    return res.status(503).send('Billedet kunne ikke laves');
  }
};

module.exports.variantFor = variantFor;
