import { describe, it, expect } from 'vitest';
import m from '../lib/facebook/meta.js';

const NOEGLE = 'HEMMELIG-NOEGLE-123';

function falskFetch(svar) {
  const kald = [];
  const f = async (url, init) => {
    kald.push({ url, body: String(init && init.body || '') });
    const s = svar.shift();
    if (s instanceof Error) throw s;
    return { ok: s.status < 400, status: s.status, json: async () => s.body };
  };
  f.kald = kald;
  return f;
}

describe('Meta-klienten', () => {
  it('lægger et fotoopslag med tekst og giver opslagets id', async () => {
    const f = falskFetch([{ status: 200, body: { id: '1', post_id: '99_1' } }]);
    const k = m.opretMeta({ fetch: f });
    const r = await k.fotoOpslag('99', NOEGLE, { billede: 'https://x/b.png', tekst: 'Hej' });
    expect(r.id).toBe('99_1');
    expect(f.kald[0].url).toBe('https://graph.facebook.com/v25.0/99/photos');
    expect(f.kald[0].url).not.toContain(NOEGLE);
    expect(f.kald[0].body).toContain('message=Hej');
    expect(f.kald[0].body).toContain(`access_token=${NOEGLE}`);
  });

  it('lægger en story i to trin: upload uden at udgive, derefter story', async () => {
    const f = falskFetch([{ status: 200, body: { id: '555' } }, { status: 200, body: { success: true, post_id: '777' } }]);
    const k = m.opretMeta({ fetch: f });
    const r = await k.story('99', NOEGLE, 'https://x/s.png');
    expect(r.id).toBe('777');
    expect(f.kald[0].url).toContain('/99/photos');
    expect(f.kald[0].body).toContain('published=false');
    expect(f.kald[1].url).toContain('/99/photo_stories');
    expect(f.kald[1].body).toContain('photo_id=555');
  });

  it('kode 190 betyder død nøgle, og nøglen står aldrig i fejlbeskeden', async () => {
    const f = falskFetch([{ status: 400, body: { error: { code: 190, message: `Token ${NOEGLE} expired` } } }]);
    const k = m.opretMeta({ fetch: f });
    const fejl = await k.fotoOpslag('99', NOEGLE, { billede: 'https://x', tekst: 't' }).catch((e) => e);
    expect(fejl).toBeInstanceOf(m.MetaFejl);
    expect(fejl.art).toBe('noegle_doed');
    expect(fejl.message).not.toContain(NOEGLE);
  });

  it('manglende rettighed og serverfejl får hver sin art', async () => {
    const k1 = m.opretMeta({ fetch: falskFetch([{ status: 403, body: { error: { code: 200, message: 'perm' } } }]) });
    expect((await k1.story('9', NOEGLE, 'u').catch((e) => e)).art).toBe('rettighed');
    const k2 = m.opretMeta({ fetch: falskFetch([{ status: 500, body: {} }]) });
    expect((await k2.story('9', NOEGLE, 'u').catch((e) => e)).art).toBe('uvist');
    const k3 = m.opretMeta({ fetch: falskFetch([new Error('netværk væk')]) });
    expect((await k3.story('9', NOEGLE, 'u').catch((e) => e)).art).toBe('uvist');
  });

  it('afviser at køre uden side-id eller nøgle', async () => {
    const k = m.opretMeta({ fetch: falskFetch([]) });
    expect((await k.story('', NOEGLE, 'u').catch((e) => e)).art).toBe('opsaetning');
    expect((await k.story('9', '', 'u').catch((e) => e)).art).toBe('opsaetning');
  });
});
