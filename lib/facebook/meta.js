// Det eneste sted, der taler med Metas Graph API. Prøver aldrig igen af sig selv:
// et kald, hvis svar vi ikke fik, kan godt være gået igennem. Nøglen sendes i kroppen og står aldrig i en fejlbesked.

const VERSION = 'v25.0';
const TIMEOUT = 20000;
const RETTIGHED = new Set([10, 200, 283]);
const GRAENSE = new Set([4, 17, 32, 613]);

class MetaFejl extends Error {
  constructor(besked, art, kode) {
    super(besked);
    this.name = 'MetaFejl';
    this.art = art;
    this.kode = kode;
  }
}

function art(status, kode) {
  if (kode === 190) return 'noegle_doed';
  if (RETTIGHED.has(kode)) return 'rettighed';
  if (GRAENSE.has(kode)) return 'graense';
  if (kode === 368) return 'blokeret';
  if (status >= 500 || kode === 1 || kode === 2) return 'uvist';
  return 'afvist';
}

function opretMeta({ fetch: hent = fetch, version = VERSION } = {}) {
  async function post(sti, noegle, felter) {
    const rens = (s) => String(s || '').split(noegle).join('***');
    const body = new URLSearchParams({ ...felter, access_token: noegle }).toString();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    let svar;
    try {
      svar = await hent(`https://graph.facebook.com/${version}/${sti}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: ctrl.signal,
      });
    } catch (e) {
      throw new MetaFejl(`Intet svar fra Meta: ${rens(e && e.message)}`, 'uvist');
    } finally {
      clearTimeout(t);
    }
    let data = {};
    try { data = await svar.json(); } catch { data = {}; }
    if (!svar.ok || (data && data.error)) {
      const fejl = (data && data.error) || {};
      throw new MetaFejl(`Meta svarede ${svar.status}: ${rens(fejl.message).slice(0, 300)}`, art(svar.status, fejl.code), fejl.code);
    }
    return data || {};
  }

  function tjek(sideId, noegle) {
    if (!sideId || !noegle) throw new MetaFejl('Side-id eller side-nøgle mangler i Vercel', 'opsaetning');
  }

  return {
    // Fotoopslag på siden med tekst. Billedet hentes af Meta fra adressen.
    async fotoOpslag(sideId, noegle, { billede, tekst }) {
      tjek(sideId, noegle);
      const d = await post(`${sideId}/photos`, noegle, { url: billede, message: tekst });
      const id = d.post_id || d.id;
      if (!id) throw new MetaFejl('Meta svarede uden id', 'uvist');
      return { id: String(id) };
    },

    // Story i to trin: billedet lægges op uden at blive udgivet, og bliver derefter til en story.
    async story(sideId, noegle, billede) {
      tjek(sideId, noegle);
      const foto = await post(`${sideId}/photos`, noegle, { url: billede, published: 'false' });
      if (!foto.id) throw new MetaFejl('Meta svarede uden id på billedet', 'uvist');
      const d = await post(`${sideId}/photo_stories`, noegle, { photo_id: String(foto.id) });
      const id = d.post_id || d.id;
      if (!id) throw new MetaFejl('Meta svarede uden id på storyen', 'uvist');
      return { id: String(id) };
    },
  };
}

module.exports = { MetaFejl, opretMeta };
