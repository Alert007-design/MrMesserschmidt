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

describe('Instagram-story', () => {
  it('opretter en story-beholder, venter til den er klar og udgiver den', async () => {
    const f = falskFetch([
      { status: 200, body: { id: 'C1' } },
      { status: 200, body: { status_code: 'IN_PROGRESS' } },
      { status: 200, body: { status_code: 'FINISHED' } },
      { status: 200, body: { id: 'IG9' } },
    ]);
    const k = m.opretMeta({ fetch: f, vent: async () => {} });
    const r = await k.instagramStory('17841', NOEGLE, 'https://x/s.jpg');
    expect(r.id).toBe('IG9');
    expect(f.kald[0].url).toContain('/17841/media');
    expect(f.kald[0].body).toContain('media_type=STORIES');
    expect(f.kald[0].body).toContain('image_url=https%3A%2F%2Fx%2Fs.jpg');
    expect(f.kald[1].url).toContain('/C1?fields=status_code');
    expect(f.kald[1].url).not.toContain(NOEGLE);
    expect(f.kald[3].url).toContain('/17841/media_publish');
    expect(f.kald[3].body).toContain('creation_id=C1');
  });

  it('giver op, hvis Meta melder fejl på billedet', async () => {
    const f = falskFetch([{ status: 200, body: { id: 'C1' } }, { status: 200, body: { status_code: 'ERROR' } }]);
    const k = m.opretMeta({ fetch: f, vent: async () => {} });
    const fejl = await k.instagramStory('17841', NOEGLE, 'u').catch((e) => e);
    expect(fejl.art).toBe('afvist');
    expect(f.kald).toHaveLength(2);
  });

  it('giver op efter nogle forsøg, hvis billedet aldrig bliver klar', async () => {
    const svar = [{ status: 200, body: { id: 'C1' } }, ...Array.from({ length: 20 }, () => ({ status: 200, body: { status_code: 'IN_PROGRESS' } }))];
    const k = m.opretMeta({ fetch: falskFetch(svar), vent: async () => {} });
    expect((await k.instagramStory('17841', NOEGLE, 'u').catch((e) => e)).art).toBe('uvist');
  });
});
