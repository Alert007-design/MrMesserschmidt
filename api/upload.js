// Upload og fjernelse af billede til ét afsnit. Kræver login som redaktør.
// POST ?id=<afsnit> med billedet som rå krop: gemmer det. DELETE ?id=<afsnit>: fjerner eget billede.

const login = require('../lib/login');
const billeder = require('../lib/billeder');

function samme(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return !origin || origin === `https://${host}`;
}

async function laesKrop(req, maks) {
  const dele = [];
  let n = 0;
  for await (const d of req) {
    n += d.length;
    if (n > maks) throw new Error('for stort');
    dele.push(d);
  }
  return Buffer.concat(dele);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const mail = login.redaktoer(req);
  if (!mail) return res.status(401).json({ fejl: 'Du er ikke logget ind.' });
  if (!samme(req) || req.headers['x-podcast'] !== '1') return res.status(403).json({ fejl: 'Afvist.' });

  const id = String((req.query || {}).id || '');
  if (!login.gyldigtId(id)) return res.status(400).json({ fejl: 'Ukendt afsnit.' });

  try {
    if (req.method === 'DELETE') {
      await billeder.fjern(id);
      console.log('[upload] fjernet', id, mail);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ fejl: 'Ugyldig forespørgsel.' });

    const type = String(req.headers['content-type'] || '').split(';')[0].trim();
    const laengde = Number(req.headers['content-length'] || 0);
    if (!login.tilladtBillede(type, laengde || 1)) return res.status(400).json({ fejl: 'Kun jpg, png eller webp op til 4 MB.' });
    const data = await laesKrop(req, login.MAKS_BYTES);
    if (!login.tilladtBillede(type, data.length)) return res.status(400).json({ fejl: 'Kun jpg, png eller webp op til 4 MB.' });

    const url = await billeder.gem(id, data, type);
    console.log('[upload] gemt', id, mail);
    return res.status(200).json({ ok: true, url });
  } catch (e) {
    console.error('[upload]', e && e.message);
    return res.status(500).json({ fejl: 'Billedet kunne ikke gemmes. Prøv igen.' });
  }
};

module.exports.config = { api: { bodyParser: false } };
