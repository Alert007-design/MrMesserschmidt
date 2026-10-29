// Login for redaktører.
// POST (mail fra formularen): sender et login-link, hvis mailen står på listen PODCAST_REDAKTOERER.
// GET ?t=<link>: tjekker linket (15 minutter, kun én gang) og sætter login-cookie i 30 dage.
// GET ?ud=1: logger ud.

const crypto = require('crypto');
const login = require('../lib/login');
const { brugLink } = require('../lib/billeder');
const side = require('../lib/side');

const LINK_SEK = 15 * 60;
const SESSION_SEK = 30 * 24 * 60 * 60;

function besked(res, status, tekst) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(side.ramme({
    titel: 'Redaktion', beskrivelse: '', sti: '/podcast/redaktion', ikkeIndeks: true,
    indhold: `${side.banner()}<p style="margin-top:20px">${tekst}</p><p><a href="/podcast/redaktion">Til redaktionen</a></p>`,
  }));
}

function cookieHeader(vaerdi, sek) {
  return `${login.COOKIE}=${vaerdi}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sek}`;
}

async function sendMail(til, link) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.PODCAST_AFSENDER || 'mrmesserschmidt.dk <login@mrmesserschmidt.dk>',
      to: [til],
      subject: 'Dit login til podcastredaktionen',
      text: `Brug linket her til at logge ind på redaktionen for Ikke et ord om politik:\n\n${link}\n\nLinket virker i 15 minutter og kan kun bruges én gang. Har du ikke bedt om det, kan du se bort fra mailen.`,
    }),
  });
  if (!res.ok) throw new Error(`Resend svarede ${res.status}`);
}

async function laesFormular(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  return {};
}

module.exports = async (req, res) => {
  const hemmelig = process.env.SESSION_SECRET;
  const q = req.query || {};

  if (req.method === 'GET' && q.ud) {
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return besked(res, 200, 'Du er logget ud.');
  }

  if (req.method === 'GET' && q.t) {
    const b = login.tjek(String(q.t), hemmelig, 'link');
    if (!b || !login.erRedaktoer(b.mail, process.env.PODCAST_REDAKTOERER)) {
      return besked(res, 400, 'Linket er udløbet eller ugyldigt. Bed om et nyt.');
    }
    if (!(await brugLink(b.n))) return besked(res, 400, 'Linket er allerede brugt. Bed om et nyt.');
    res.setHeader('Set-Cookie', cookieHeader(login.lav({ mail: b.mail, type: 'session' }, hemmelig, SESSION_SEK), SESSION_SEK));
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 303;
    res.setHeader('Location', '/podcast/redaktion');
    return res.end();
  }

  if (req.method === 'POST') {
    const mail = String((await laesFormular(req)).mail || '').trim().toLowerCase();
    if (login.erRedaktoer(mail, process.env.PODCAST_REDAKTOERER)) {
      try {
        const t = login.lav({ mail, type: 'link', n: crypto.randomBytes(16).toString('hex') }, hemmelig, LINK_SEK);
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        await sendMail(mail, `https://${host}/api/login?t=${encodeURIComponent(t)}`);
      } catch (e) {
        console.error('[login]', e && e.message);
        return besked(res, 500, 'Mailen kunne ikke sendes lige nu. Prøv igen om lidt.');
      }
    }
    return besked(res, 200, 'Står adressen på listen over redaktører, er der nu sendt et login-link. Tjek også spam.');
  }

  res.setHeader('Allow', 'GET, POST');
  return besked(res, 405, 'Ugyldig forespørgsel.');
};
