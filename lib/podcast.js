// Afsnit af »Ikke et ord om politik«: henter fra Spreaker og YouTube og kobler dem sammen.
// Alt fejler stille: et feed, der ikke svarer, giver en tom liste i stedet for en fejlside.

const SHOW = '5968966';
const YT_KANAL = 'UC3TlbVNx8frD3DYgYyVQWRA';
const TIMEOUT = 8000;

const LINKS = {
  spotify: 'https://open.spotify.com/show/2c0xtgxfUWIoTxkKfWGCqD',
  apple: 'https://podcasts.apple.com/dk/podcast/id1710139799',
  youtube: 'https://www.youtube.com/@IkkeEtOrdOmPolitik',
};

const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function danskDato(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const k = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }));
  return `${k.getDate()}. ${MAANEDER[k.getMonth()]} ${k.getFullYear()}`;
}

function afkod(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');
}

function normaliser(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function afsnitFraSpreaker(data) {
  const items = data && data.response && data.response.items;
  if (!Array.isArray(items)) return [];
  const brugt = new Set();
  return items.filter((i) => i && i.episode_id && i.title).map((i) => {
    const titel = String(i.title).trim();
    const kolon = titel.indexOf(':');
    let gaest = kolon > 0 ? titel.slice(0, kolon).trim() : titel;
    let emne = kolon > 0 ? titel.slice(kolon + 1).trim() : '';
    // »Fik du hørt: Ulrich Thomsen« er et genudsendt uddrag – gæsten står efter kolon.
    if (/^fik du hørt$/i.test(gaest) && emne) { gaest = emne; emne = 'Fik du hørt'; }
    let slug = String(i.slug || i.episode_id).toLowerCase().replace(/[^a-z0-9-]/g, '') || String(i.episode_id);
    if (brugt.has(slug)) slug = `${slug}-${i.episode_id}`;
    brugt.add(slug);
    const dato = i.published_at ? String(i.published_at).replace(' ', 'T') + 'Z' : '';
    return {
      id: String(i.episode_id),
      titel, gaest, emne, slug, dato,
      minutter: i.duration ? Math.round(i.duration / 60000) : 0,
      lyd: i.playback_url || '',
      spreaker: i.site_url || '',
    };
  });
}

function beskrivelserFraRss(xml) {
  const m = new Map();
  if (!xml) return m;
  for (const item of String(xml).split('<item>').slice(1)) {
    const id = (item.match(/api\.spreaker\.com\/episode\/(\d+)/) || [])[1];
    let b = (item.match(/<description>([\s\S]*?)<\/description>/) || [])[1];
    if (!id || !b) continue;
    b = b.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
    b = b.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    b = b.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');
    b = afkod(b.replace(/<[^>]+>/g, ''));
    const afsnit = b.split(/\n\s*\n|\n/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (afsnit.length) m.set(id, afsnit);
  }
  return m;
}

function videoerFraYoutube(xml) {
  if (!xml) return [];
  return String(xml).split('<entry>').slice(1).map((e) => ({
    id: (e.match(/<yt:videoId>([^<]+)</) || [])[1] || '',
    titel: afkod((e.match(/<title>([^<]*)</) || [])[1] || ''),
    beskrivelse: afkod((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || ''),
  })).filter((v) => v.id);
}

function koblYoutube(afsnit, videoer) {
  for (const a of afsnit) {
    const navn = normaliser(a.gaest);
    if (navn.length < 4) continue;
    const v = videoer.find((x) => normaliser(x.beskrivelse.slice(0, 300)).includes(navn) || normaliser(x.titel).includes(navn));
    if (v) a.youtube = { id: v.id, link: `https://www.youtube.com/watch?v=${v.id}`, billede: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` };
  }
  return afsnit;
}

function billede(afsnit, egne, cover) {
  return (egne && egne[afsnit.id]) || (afsnit.youtube && afsnit.youtube.billede) || cover;
}

async function hent(url, som) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} svarede ${res.status}`);
    return som === 'json' ? await res.json() : await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function sikkert(fn, standard) {
  try {
    return await fn();
  } catch (e) {
    console.error('[podcast]', e && e.message);
    return standard;
  }
}

async function hentShow() {
  const d = await hent(`https://api.spreaker.com/v2/shows/${SHOW}`, 'json');
  const s = (d && d.response && d.response.show) || {};
  return { beskrivelse: String(s.description || '').trim(), cover: s.image_original_url || s.image_url || '' };
}

async function hentAlleAfsnit() {
  const sider = [];
  let url = `https://api.spreaker.com/v2/shows/${SHOW}/episodes?limit=100`;
  for (let i = 0; url && i < 10; i++) {
    const d = await hent(url, 'json');
    sider.push(...((d && d.response && d.response.items) || []));
    url = d && d.response && d.response.next_url;
  }
  return afsnitFraSpreaker({ response: { items: sider } });
}

async function hentEnBeskrivelse(id) {
  const d = await hent(`https://api.spreaker.com/v2/episodes/${encodeURIComponent(id)}`, 'json');
  const b = d && d.response && d.response.episode && d.response.episode.description;
  if (!b) return [];
  return beskrivelserFraRss(`<item>api.spreaker.com/episode/${id}<description>${b}</description>`).get(String(id)) || [];
}

// Henter alt på én gang. Kaldes fra serverfunktionerne, som selv cacher svaret.
async function hentAlt(egneBilleder) {
  const [show, afsnit, rss, yt] = await Promise.all([
    sikkert(hentShow, { beskrivelse: '', cover: '' }),
    sikkert(hentAlleAfsnit, []),
    sikkert(() => hent(`https://www.spreaker.com/show/${SHOW}/episodes/feed`, 'text'), ''),
    sikkert(() => hent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_KANAL}`, 'text'), ''),
  ]);
  koblYoutube(afsnit, videoerFraYoutube(yt));
  const beskrivelser = beskrivelserFraRss(rss);
  const egne = egneBilleder || {};
  for (const a of afsnit) {
    a.beskrivelse = beskrivelser.get(a.id) || null;
    a.billede = billede(a, egne, show.cover);
    a.egetBillede = Boolean(egne[a.id]);
  }
  return { show, afsnit };
}

module.exports = {
  LINKS, esc, danskDato, afsnitFraSpreaker, beskrivelserFraRss, videoerFraYoutube,
  koblYoutube, billede, hentAlt, hentEnBeskrivelse, sikkert,
};
