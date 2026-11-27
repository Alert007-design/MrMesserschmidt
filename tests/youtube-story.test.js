import { describe, it, expect } from 'vitest';
import p from '../lib/facebook/plan.js';
import k from '../lib/facebook/koersel.js';
import { videoFraFeed, godkendte } from '../lib/facebook/kilder.js';
import { tegn } from '../lib/facebook/billede.js';
import { variantFor } from '../api/facebook-billede.js';

const kl = (dato, utcTime) => new Date(`${dato}T${String(utcTime).padStart(2, '0')}:00:00Z`);
const TIRSDAG_KL_9 = kl('2026-12-08', 8); // 2026-12-08 er en tirsdag, 9 dansk tid
const LOERDAG_KL_9 = kl('2026-11-28', 8);
const TORSDAG_KL_9 = kl('2026-11-26', 8);

describe('ugeplan og reserve', () => {
  it('tirsdag og lørdag kl. 9 er YouTube, torsdag el, de andre dage benzin', () => {
    expect(p.storyType(TIRSDAG_KL_9, '2026-11-06')).toBe('youtube');
    expect(p.storyType(LOERDAG_KL_9, '2026-11-06')).toBe('youtube');
    expect(p.storyType(TORSDAG_KL_9, '2026-11-06')).toBe('el');
    for (const d of ['2026-11-30', '2026-12-02', '2026-12-04', '2026-12-06']) expect(p.storyType(kl(d, 8), '2026-11-06')).toBe('benzin');
  });
  it('aftenens stories er uændrede tirsdag og lørdag', () => {
    expect(p.storyType(kl('2026-12-08', 18), '2026-11-06', 'aften')).toBe('mortensaften');
    expect(p.storyType(kl('2026-11-28', 18), '2026-11-06', 'aften')).toBe('mortensaften');
  });
  it('reserven for YouTube er el, aldrig YouTube', () => {
    expect(p.reserveType(TIRSDAG_KL_9)).toBe('el');
    expect(p.reserveType(LOERDAG_KL_9)).toBe('el');
    expect(p.reserveType(kl('2026-12-01', 8))).toBe('el'); // 1. december er en tirsdag
    expect(p.reserveType(kl('2026-11-30', 8))).toBe('benzin');
  });
  it('YouTube er ikke godkendt i chatten og skal stå i FACEBOOK_GODKENDT', () => {
    expect(p.GODKENDT_I_CHAT).not.toContain('youtube');
    expect(godkendte('youtube, el')).toEqual(['youtube', 'el']);
  });
});

describe('titel', () => {
  it('fjerner smiley-tegn og flag, som skrifttypen ikke kan vise', () => {
    expect(p.renTitel('Macron...!? 🤦‍♂️')).toBe('Macron...!?');
    expect(p.renTitel('Jeg fløj til Bruxelles (Dan Jørgensen dukkede op) 🇧🇪')).toBe('Jeg fløj til Bruxelles (Dan Jørgensen dukkede op)');
    expect(p.renTitel('Gin and tonic please 🍸')).toBe('Gin and tonic please');
  });
  it('beholder æ, ø, å og laver lange tankestreger om til korte', () => {
    expect(p.renTitel('Øl – på Åen — nu')).toBe('Øl – på Åen – nu');
  });
  it('afkorter lange titler og tåler tomt', () => {
    const t = p.renTitel('ord '.repeat(60));
    expect(t.length).toBeLessThanOrEqual(81);
    expect(t.endsWith('…')).toBe(true);
    expect(p.renTitel(undefined)).toBe('');
  });
});

const entry = (id, dato, titel) => `<entry><yt:videoId>${id}</yt:videoId><title>${titel}</title><published>${dato}</published></entry>`;
const feed = (...e) => `<?xml version="1.0"?><feed><title>Kanal</title>${e.join('')}</feed>`;

describe('nyeste video fra feedet', () => {
  const nu = kl('2026-11-27', 12);
  it('henter id, titel og dato fra den øverste video', () => {
    const v = videoFraFeed(feed(entry('BBOl3MJzCMk', '2026-11-26T10:00:00+00:00', 'Macron...!? 🤦'), entry('xx', '2026-11-22T10:00:00+00:00', 'Ældre')), nu);
    expect(v).toMatchObject({ id: 'BBOl3MJzCMk', titel: 'Macron...!?' });
    expect(v.billede).toBe('https://i.ytimg.com/vi/BBOl3MJzCMk/maxresdefault.jpg');
    expect(v.billedeReserve).toBe('https://i.ytimg.com/vi/BBOl3MJzCMk/hqdefault.jpg');
  });
  it('en video over 7 dage gammel er ikke ny', () => {
    expect(videoFraFeed(feed(entry('a', '2026-11-19T10:00:00+00:00', 'Gammel')), nu)).toBeNull();
    expect(videoFraFeed(feed(entry('a', '2026-11-20T13:00:00+00:00', 'Lige nok')), nu)).not.toBeNull();
  });
  it('med ignorerAlder vises den nyeste, også en gammel (til kladdesiden)', () => {
    expect(videoFraFeed(feed(entry('a', '2026-10-01T10:00:00+00:00', 'Gammel')), nu, { ignorerAlder: true })).toMatchObject({ id: 'a' });
  });
  it('tomt eller ødelagt feed giver null', () => {
    expect(videoFraFeed('', nu)).toBeNull();
    expect(videoFraFeed(feed(), nu)).toBeNull();
    expect(videoFraFeed('<html>fejl</html>', nu)).toBeNull();
    expect(videoFraFeed(null, nu)).toBeNull();
  });
  it('et id med mærkelige tegn afvises', () => {
    expect(videoFraFeed(feed(entry('a"><script>', '2026-11-26T10:00:00+00:00', 'x')), nu)).toBeNull();
  });
});

function falskMeta() {
  const kald = [];
  return {
    kald,
    async story(side, noegle, billede) { kald.push({ type: 'story', billede }); return { id: 's1' }; },
    async instagramStory(konto, noegle, billede) { kald.push({ type: 'igstory', billede }); return { id: 'i1' }; },
    async fotoOpslag() { throw new Error('ikke brugt'); },
  };
}
const VIDEO = { id: 'BBOl3MJzCMk', titel: 'Macron...!?', dato: '2026-12-07T10:00:00Z' };
function ind(over = {}) {
  return {
    nu: TIRSDAG_KL_9,
    tilstand: 'live',
    status: { initialiseret: true, sete: ['1'], stories: {}, log: [] },
    hentAfsnit: async () => [{ id: '1', titel: 'A', slug: 'a', beskrivelse: [], billede: 'https://b/1.jpg' }],
    hentBenzin: async () => ({ benzin: { prisOere: 1349 }, diesel: { prisOere: 1299 } }),
    hentEl: async () => ({ dato: '2026-12-08', vest: {}, oest: {} }),
    hentVideo: async () => VIDEO,
    meta: falskMeta(),
    cfg: {
      sider: { podcast: { id: 'POD', noegle: 'n1' }, politiker: { id: 'POL', noegle: 'n2' } },
      instagram: { id: 'IG', noegle: 'n2' },
      mortensaftenFra: '2026-11-06',
      godkendt: ['podcast', 'benzin', 'el', 'mortensaften', 'youtube'],
      billedUrl: (type, dato, fmt = 'png') => `https://mrmesserschmidt.dk/facebook/billede/${type}/${dato}.${fmt}`,
    },
    ...over,
  };
}
const storyKald = (i) => i.meta.kald.filter((x) => x.type === 'story');

describe('kørsel: YouTube-story', () => {
  it('godkendt og ny video: YouTube-storyen lægges på Facebook og Instagram', async () => {
    const i = ind();
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/youtube/2026-12-08');
    expect(i.meta.kald.find((x) => x.type === 'igstory').billede).toContain('/youtube/2026-12-08.jpg');
    expect(i.status.stories['2026-12-08']).toMatchObject({ type: 'youtube', video: VIDEO.id, resultat: 'lagt' });
    expect(i.status.ytSete).toContain(VIDEO.id);
  });

  it('ikke godkendt, også når alt andet er live: elstoryen i stedet, og videoen bruges ikke', async () => {
    const i = ind();
    i.cfg.godkendt = ['podcast', 'benzin', 'el', 'mortensaften'];
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/el/2026-12-08');
    expect(i.status.log.find((l) => l.hvad === 'story')).toMatchObject({ type: 'el', erstatter: 'youtube' });
    expect(i.status.ytSete || []).not.toContain(VIDEO.id);
  });

  it('kladde-tilstand med youtube godkendt lægges ud, uden godkendelse kun som kladde', async () => {
    const a = ind({ tilstand: 'kladde' });
    await k.koer(a);
    expect(storyKald(a)[0].billede).toContain('/youtube/');
    const b = ind({ tilstand: 'kladde' });
    b.cfg.godkendt = ['podcast'];
    await k.koer(b);
    expect(storyKald(b)).toHaveLength(0);
    expect(b.status.stories['2026-12-08']).toMatchObject({ type: 'el', resultat: 'kladde' });
  });

  it('ingen ny video: elstoryen i stedet', async () => {
    const i = ind({ hentVideo: async () => null });
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/el/2026-12-08');
    expect(i.status.log.find((l) => l.hvad === 'story')).toMatchObject({ type: 'el', erstatter: 'youtube' });
  });

  it('feedet kaster fejl: elstoryen i stedet, kørslen går ikke i stå', async () => {
    const i = ind({ hentVideo: async () => { throw new Error('feed nede'); } });
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/el/2026-12-08');
  });

  it('manglende hentVideo (ældre kald) giver elstory', async () => {
    const i = ind();
    delete i.hentVideo;
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/el/2026-12-08');
  });

  it('samme video bruges ikke to gange: lørdag uden ny video giver el', async () => {
    const i = ind();
    await k.koer(i);
    const l = ind({ nu: LOERDAG_KL_9, status: i.status, hentEl: async () => ({ dato: '2026-11-28', vest: {}, oest: {} }), hentVideo: async () => ({ ...VIDEO, dato: '2026-11-27T10:00:00Z' }) });
    await k.koer(l);
    expect(storyKald(l)[0].billede).toContain('/el/2026-11-28');
  });

  it('en ny video lørdag lægges ud', async () => {
    const i = ind();
    await k.koer(i);
    const l = ind({ nu: LOERDAG_KL_9, status: i.status, hentVideo: async () => ({ id: 'NY', titel: 'Ny', dato: '2026-11-27T10:00:00Z' }) });
    await k.koer(l);
    expect(storyKald(l)[0].billede).toContain('/youtube/2026-11-28');
    expect(l.status.ytSete).toEqual([VIDEO.id, 'NY']);
  });

  it('samme dag lægges YouTube-storyen aldrig to gange', async () => {
    const i = ind();
    await k.koer(i);
    await k.koer(i);
    expect(storyKald(i)).toHaveLength(1);
  });

  it('en fejl fra Meta bruger videoen alligevel (ingen ny forsøg samme dag)', async () => {
    const i = ind();
    i.meta.story = async () => { throw Object.assign(new Error('Meta nede'), { art: 'meta' }); };
    await k.koer(i);
    expect(i.status.ytSete).toContain(VIDEO.id);
    expect(i.status.stories['2026-12-08'].resultat).toBe('fejl');
  });

  it('1. december (tirsdag): 2-kroners-storyen går forud, og reserven er el', async () => {
    const i = ind({ nu: kl('2026-12-01', 8), hentEl: async () => ({ dato: '2026-12-01', vest: {}, oest: {} }) });
    i.cfg.godkendt = ['el', 'youtube'];
    await k.koer(i);
    expect(storyKald(i)[0].billede).toContain('/el/2026-12-01');
    expect(i.status.log.find((l) => l.hvad === 'story')).toMatchObject({ type: 'el', erstatter: 'to-kroner' });
  });

  it('mandag, onsdag, fredag, søndag og torsdag er uændrede', async () => {
    const man = ind({ nu: kl('2026-11-30', 8) });
    await k.koer(man);
    expect(storyKald(man)[0].billede).toContain('/benzin/2026-11-30');
    const tor = ind({ nu: TORSDAG_KL_9, hentEl: async () => ({ dato: '2026-11-26', vest: {}, oest: {} }) });
    await k.koer(tor);
    expect(storyKald(tor)[0].billede).toContain('/el/2026-11-26');
  });
});

describe('billedet', () => {
  const stoerrelse = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];
  it('tegnes i 1080 × 1920 uden foto og med lang titel', async () => {
    expect(stoerrelse(await tegn('youtube', { foto: null, titel: 'Macron...!?' }))).toEqual([1080, 1920]);
    expect(stoerrelse(await tegn('youtube', { foto: null, titel: p.renTitel('Jeg snakker Europæisk Toppolitik - med Marine Le Pen '.repeat(2)) }))).toEqual([1080, 1920]);
  }, 60000);
  it('en anden titel giver et andet billede', async () => {
    const a = await tegn('youtube', { foto: null, titel: 'A' });
    const b = await tegn('youtube', { foto: null, titel: 'B' });
    expect(Buffer.compare(a, b)).not.toBe(0);
  }, 60000);
  it('julepynt bruges ikke på YouTube-storyen', () => {
    expect(variantFor('youtube', '2026-12-08', ['jul', 'nedtaelling'], false)).toEqual({});
  });
});
