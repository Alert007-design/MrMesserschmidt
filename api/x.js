// Henter det seneste opslag fra X (uden svar og reposts).
// Svaret caches i et døgn hos Vercel, så X kun spørges én gang om dagen.
// Mangler nøglen (X_BEARER_TOKEN), eller fejler X, returneres null, og siden viser det faste kort.

const BRUGER = 'mrmesserschmidt';
const API = 'https://api.x.com/2';
const TIMEOUT = 8000;

async function hent(url, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`X svarede ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function afkort(tekst, max = 140) {
  if (!tekst) return '';
  const ren = tekst.replace(/https:\/\/t\.co\/\S+/g, '').replace(/\s+/g, ' ').trim();
  return ren.length > max ? ren.slice(0, max - 1).trimEnd() + '…' : ren;
}

async function seneste(token) {
  // Profilen hentes for id'et og profilbilledet, som bruges, når opslaget ikke har et billede.
  const bruger = (await hent(`${API}/users/by/username/${BRUGER}?user.fields=profile_image_url`, token)).data;
  const id = bruger.id;
  const profilbillede = bruger.profile_image_url ? bruger.profile_image_url.replace('_normal', '_400x400') : null;
  const url = `${API}/users/${id}/tweets?max_results=5&exclude=retweets,replies` +
    '&tweet.fields=created_at,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type';
  const svar = await hent(url, token);
  const opslag = (svar.data || [])[0];
  if (!opslag) return null;
  const medier = (svar.includes && svar.includes.media) || [];
  const noegler = (opslag.attachments && opslag.attachments.media_keys) || [];
  const medie = medier.find((m) => noegler.includes(m.media_key));
  return {
    tekst: afkort(opslag.text),
    billede: (medie && (medie.url || medie.preview_image_url)) || profilbillede,
    link: `https://x.com/${BRUGER}/status/${opslag.id}`,
    dato: opslag.created_at,
  };
}

module.exports = async (req, res) => {
  const token = process.env.X_BEARER_TOKEN || '';
  let x = null;
  if (token) {
    try {
      x = await seneste(token);
    } catch (e) {
      console.error('[x]', e && e.message);
    }
  }
  res.setHeader('Cache-Control', x ? 's-maxage=86400, stale-while-revalidate=86400' : 's-maxage=3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ x }));
};
