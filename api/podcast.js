// /podcast (oversigt), /podcast/<adresse> (ét afsnit) og ?seneste=1 (data til kortet på forsiden).
// Svaret caches 15 minutter hos Vercel, så nye afsnit og nye billeder kommer på af sig selv.

const { hentAlt, hentEnBeskrivelse, sikkert, danskDato } = require('../lib/podcast');
const { egneBilleder } = require('../lib/billeder');
const side = require('../lib/side');

module.exports = async (req, res) => {
  const egne = await sikkert(egneBilleder, {});
  const data = await hentAlt(egne);
  const q = req.query || {};
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');

  if (q.seneste) {
    const a = data.afsnit[0];
    return res.status(200).json(a ? { gaest: a.gaest, emne: a.emne, dato: danskDato(a.dato), link: `/podcast/${a.slug}` } : null);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (q.afsnit) {
    const a = data.afsnit.find((x) => x.slug === String(q.afsnit));
    if (!a) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(404).send(side.ramme({
        titel: 'Afsnittet findes ikke', beskrivelse: '', sti: '/podcast', ikkeIndeks: true,
        indhold: `<a class="tilbage" href="/podcast">← Alle afsnit</a>${side.banner()}<p>Afsnittet findes ikke. Måske er adressen skrevet forkert.</p>`,
      }));
    }
    const beskrivelse = a.beskrivelse || (await sikkert(() => hentEnBeskrivelse(a.id), []));
    return res.status(200).send(side.afsnitSide(data, a, beskrivelse));
  }

  return res.status(200).send(side.oversigt(data));
};
