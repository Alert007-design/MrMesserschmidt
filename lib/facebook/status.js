// Status for Facebook-kørslen (sete afsnit, dagens stories, log), gemt som én JSON-fil i Vercel Blob.
// Indeholder kun afsnits-id'er, datoer og tekster, der i forvejen er offentlige.

const STI = 'facebook/status.json';

function blob() {
  return require('@vercel/blob');
}

async function hentStatus() {
  const tom = { initialiseret: false, sete: [], stories: {}, log: [] };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return tom;
  let info;
  try {
    info = await blob().head(STI);
  } catch {
    return tom; // findes ikke endnu
  }
  // Blob-adresser caches. Et tilfældigt tal i adressen giver den nyeste udgave.
  const r = await fetch(`${info.url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Status kunne ikke læses (${r.status})`);
  return { ...tom, ...(await r.json()) };
}

async function gemStatus(status) {
  await blob().put(STI, JSON.stringify(status), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

module.exports = { hentStatus, gemStatus };
