// /sitemap.xml: forsiden, podcastoversigten og alle afsnit, så Google finder dem.

const { hentAlt, esc } = require('../lib/podcast');
const { DOMAENE } = require('../lib/side');

module.exports = async (req, res) => {
  const { afsnit } = await hentAlt({});
  const url = (sti, dato) => `<url><loc>${DOMAENE}${esc(sti)}</loc>${dato ? `<lastmod>${esc(dato.slice(0, 10))}</lastmod>` : ''}</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${url('/')}
${url('/podcast', afsnit[0] && afsnit[0].dato)}
${afsnit.map((a) => url(`/podcast/${a.slug}`, a.dato)).join('\n')}
</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
