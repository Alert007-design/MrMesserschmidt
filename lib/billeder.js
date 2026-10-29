// Billeder, som redaktørerne selv har lagt op, gemt i Vercel Blob under podcast/billeder/<id>-<tid>.jpg.

const PREFIX = 'podcast/billeder/';

function blob() {
  return require('@vercel/blob');
}

// { afsnitsId: url } med det nyeste billede pr. afsnit.
async function egneBilleder() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  const ud = {};
  const tid = {};
  let cursor;
  for (let i = 0; i < 20; i++) {
    const r = await blob().list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of r.blobs) {
      const m = b.pathname.slice(PREFIX.length).match(/^(\d+)-(\d+)\./);
      if (!m) continue;
      const [, id, t] = m;
      if (!tid[id] || +t > tid[id]) { tid[id] = +t; ud[id] = b.url; }
    }
    if (!r.hasMore) break;
    cursor = r.cursor;
  }
  return ud;
}

async function gem(id, data, type) {
  const endelse = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const ny = await blob().put(`${PREFIX}${id}-${Date.now()}.${endelse}`, data, { access: 'public', contentType: type, addRandomSuffix: false });
  await fjern(id, ny.url);
  return ny.url;
}

// Fjerner alle billeder for afsnittet undtagen `behold`.
async function fjern(id, behold) {
  const r = await blob().list({ prefix: `${PREFIX}${id}-` });
  const gamle = r.blobs.map((b) => b.url).filter((u) => u !== behold);
  if (gamle.length) await blob().del(gamle);
}

// Markerer et login-link som brugt. Returnerer false, hvis det allerede var brugt.
async function brugLink(noegle) {
  try {
    await blob().put(`podcast/login-brugt/${noegle}`, '1', { access: 'public', addRandomSuffix: false, allowOverwrite: false });
    return true;
  } catch (e) {
    console.error('[login] link afvist', e && e.message);
    return false;
  }
}

module.exports = { egneBilleder, gem, fjern, brugLink };
