// Login for redaktører af podcastsiderne. Ingen database: billetter er signerede med
// SESSION_SECRET og udløber af sig selv. Login-links kan kun bruges én gang (se api/login.js).

const crypto = require('crypto');

const COOKIE = 'podcast_session';
const MAKS_BYTES = 4 * 1024 * 1024;
const TYPER = ['image/jpeg', 'image/png', 'image/webp'];

function erRedaktoer(mail, liste) {
  const m = String(mail || '').trim().toLowerCase();
  if (!m || !liste) return false;
  return String(liste).split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(m);
}

function signer(data, hemmelig) {
  return crypto.createHmac('sha256', hemmelig).update(data).digest('base64url');
}

function lav(indhold, hemmelig, sekunder, nu = Date.now()) {
  if (!hemmelig || hemmelig.length < 24) throw new Error('SESSION_SECRET mangler eller er for kort');
  const data = Buffer.from(JSON.stringify({ ...indhold, exp: nu + sekunder * 1000 })).toString('base64url');
  return `${data}.${signer(data, hemmelig)}`;
}

function tjek(billet, hemmelig, type, nu = Date.now()) {
  if (!billet || !hemmelig || typeof billet !== 'string') return null;
  const [data, sig] = billet.split('.');
  if (!data || !sig) return null;
  const forventet = signer(data, hemmelig);
  const a = Buffer.from(sig);
  const b = Buffer.from(forventet);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let indhold;
  try {
    indhold = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!indhold || indhold.type !== type || typeof indhold.exp !== 'number' || indhold.exp < nu) return null;
  return indhold;
}

function cookie(header, navn) {
  for (const del of String(header || '').split(';')) {
    const i = del.indexOf('=');
    if (i > 0 && del.slice(0, i).trim() === navn) return del.slice(i + 1).trim();
  }
  return '';
}

function tilladtBillede(type, bytes) {
  return TYPER.includes(type) && bytes > 0 && bytes <= MAKS_BYTES;
}

function gyldigtId(id) {
  return /^\d{1,15}$/.test(String(id || ''));
}

// Den indloggede redaktørs mail, eller null.
function redaktoer(req) {
  const s = tjek(cookie(req.headers.cookie, COOKIE), process.env.SESSION_SECRET, 'session');
  if (!s || !erRedaktoer(s.mail, process.env.PODCAST_REDAKTOERER)) return null;
  return s.mail;
}

module.exports = { COOKIE, MAKS_BYTES, erRedaktoer, lav, tjek, cookie, tilladtBillede, gyldigtId, redaktoer };
