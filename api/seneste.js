// Henter det seneste opslag fra YouTube, Facebook og Instagram.
// Svaret caches i 30 minutter hos Vercel, så kanalerne kun spørges få gange i timen.
// Fejler en kanal, returneres null for den, og siden viser et fast kort i stedet.

const YT_KANAL = 'UCHCUmInVKASl23MGy2o5dPg';
const FB_SIDE = '111394892261429';
const GRAPH = 'https://graph.facebook.com/v23.0';
const TIMEOUT = 6000;

async function hent(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return res;
  } finally {
    clearTimeout(t);
  }
}

function afkort(tekst, max = 140) {
  if (!tekst) return '';
  const ren = tekst.replace(/\s+/g, ' ').trim();
  return ren.length > max ? ren.slice(0, max - 1).trimEnd() + '…' : ren;
}

function xmlTekst(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
}

async function youtube() {
  const xml = await (await hent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_KANAL}`)).text();
  const entry = (xml.split('<entry>')[1] || '').split('</entry>')[0];
  const id = xmlTekst(entry, 'yt:videoId');
  if (!id) return null;
  return {
    tekst: afkort(xmlTekst(entry, 'title')),
    billede: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/watch?v=${id}`,
    dato: xmlTekst(entry, 'published'),
  };
}

async function facebook(token) {
  const url = `${GRAPH}/${FB_SIDE}/posts?fields=message,full_picture,permalink_url,created_time&limit=5&access_token=${encodeURIComponent(token)}`;
  const data = await (await hent(url)).json();
  const opslag = (data.data || []).find((p) => p.full_picture) || (data.data || [])[0];
  if (!opslag) return null;
  return { tekst: afkort(opslag.message), billede: opslag.full_picture || null, link: opslag.permalink_url, dato: opslag.created_time };
}

async function instagram(token) {
  const side = await (await hent(`${GRAPH}/${FB_SIDE}?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`)).json();
  const ig = side.instagram_business_account && side.instagram_business_account.id;
  if (!ig) return null;
  const url = `${GRAPH}/${ig}/media?fields=caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=1&access_token=${encodeURIComponent(token)}`;
  const m = ((await (await hent(url)).json()).data || [])[0];
  if (!m) return null;
  return { tekst: afkort(m.caption), billede: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url, link: m.permalink, dato: m.timestamp };
}

async function sikkert(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error('[seneste]', e && e.message);
    return null;
  }
}

module.exports = async (req, res) => {
  const token = process.env.FB_PAGE_TOKEN || '';
  const [yt, fb, ig] = await Promise.all([
    sikkert(youtube),
    token ? sikkert(() => facebook(token)) : null,
    token ? sikkert(() => instagram(token)) : null,
  ]);
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ youtube: yt, facebook: fb, instagram: ig }));
};
