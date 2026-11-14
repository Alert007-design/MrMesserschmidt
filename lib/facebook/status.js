// Status for Facebook-kørslen (sete afsnit, dagens stories, log), gemt som én JSON-fil i Vercel Blob.
// Indeholder kun afsnits-id'er, datoer og tekster, der i forvejen er offentlige.

const STI = 'facebook/status.json';

function blob() {
  return require('@vercel/blob');
}

async function hentStatus(STI_ = STI) {
  const tom = { initialiseret: false, sete: [], stories: {}, log: [] };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return tom;
  let info;
  try {
    info = await blob().head(STI_);
  } catch {
    return tom; // findes ikke endnu
  }
  // Blob-adresser caches. Et tilfældigt tal i adressen giver den nyeste udgave.
  const r = await fetch(`${info.url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Status kunne ikke læses (${r.status})`);
  return { ...tom, ...(await r.json()) };
}

async function gemStatus(status, STI_ = STI) {
  await blob().put(STI_, JSON.stringify(status), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

// El-stories har deres egen fil, så kørslen hvert kvarter aldrig overskriver de daglige stories.
const EL_STI = 'facebook/el-status.json';

module.exports = { hentStatus, gemStatus, EL_STI };
