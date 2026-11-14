import { describe, it, expect } from 'vitest';
import s from '../lib/facebook/el-stories.js';
import { tegn } from '../lib/facebook/billede.js';

const oest = { start: '2026-11-15T10:30:00Z', slut: '2026-11-15T13:30:00Z', gennemsnitOere: 71.6 }; // 11.30–14.30 dansk tid
const vest = { start: '2026-11-15T11:00:00Z', slut: '2026-11-15T14:00:00Z', gennemsnitOere: 68.2 };
const data = (over = {}) => ({
  dato: '2026-11-15', tilmeldingAaben: true,
  idag: { DK1: { billigste: vest }, DK2: { billigste: oest } },
  uge: { DK1: { fra: '2026-11-08', til: '2026-11-14', dage: 7, gnsForskelOere: 112.4 }, DK2: { fra: '2026-11-08', til: '2026-11-14', dage: 7, gnsForskelOere: 98.1 } },
  ...over,
});

function falskMeta() {
  const kald = [];
  return {
    kald,
    async story(side, noegle, billede) { kald.push({ type: 'story', side, billede }); return { id: 's1' }; },
    async instagramStory(konto, noegle, billede) { kald.push({ type: 'igstory', konto, billede }); return { id: 'i1' }; },
  };
}
const cfg = {
  sider: { politiker: { id: 'POL', noegle: 'n' } }, instagram: { id: 'IG', noegle: 'n' },
  godkendt: ['el-nu', 'el-uge', 'instagram'],
  billedUrl: (type, dato, fmt = 'png') => `https://mrmesserschmidt.dk/facebook/billede/${type}/${dato}.${fmt}`,
};
const ind = (nu, over = {}) => ({ nu: new Date(nu), tilstand: 'live', status: {}, hentEl: async () => data(), meta: falskMeta(), cfg, ...over });

describe('tidspunkter', () => {
  it('klokkeslæt med minutter i dansk tid', () => {
    expect(s.klokke('2026-11-15T10:30:00Z')).toBe('11.30');
    expect(s.klokke('2026-11-15T13:00:00Z')).toBe('14.00');
  });
  it('»Nu er det nu« i de første 20 minutter af perioden', () => {
    expect(s.erNuTid(new Date('2026-11-15T10:30:00Z'), oest)).toBe(true);
    expect(s.erNuTid(new Date('2026-11-15T10:45:00Z'), oest)).toBe(true);
    expect(s.erNuTid(new Date('2026-11-15T10:50:00Z'), oest)).toBe(false);
    expect(s.erNuTid(new Date('2026-11-15T10:15:00Z'), oest)).toBe(false);
  });
  it('ikke om natten', () => {
    expect(s.erNuTid(new Date('2026-11-15T02:00:00Z'), { start: '2026-11-15T02:00:00Z', slut: '2026-11-15T05:00:00Z' })).toBe(false);
  });
  it('ugens story: søndag kl. 19 Vest, onsdag kl. 19 Øst, ellers ingen', () => {
    expect(s.ugeOmraade(new Date('2026-11-15T18:00:00Z'))).toBe('DK1');
    expect(s.ugeOmraade(new Date('2026-11-18T18:15:00Z'))).toBe('DK2');
    expect(s.ugeOmraade(new Date('2026-11-15T17:45:00Z'))).toBeNull();
    expect(s.ugeOmraade(new Date('2026-11-16T18:00:00Z'))).toBeNull();
  });
  it('kroner med komma', () => {
    expect(s.kr(112.4)).toBe('1,12');
  });
});

describe('kørslen', () => {
  it('lægger »Nu er det nu« op på Facebook og Instagram, når perioden begynder, og kun én gang', async () => {
    const i = ind('2026-11-15T10:30:00Z');
    const r = await s.koerElStories(i);
    expect(r.nu.resultat).toBe('lagt');
    expect(i.meta.kald.map((k) => k.type)).toEqual(['story', 'igstory']);
    expect(i.meta.kald[1].billede).toBe('https://mrmesserschmidt.dk/facebook/billede/el-nu/2026-11-15.jpg');
    const igen = await s.koerElStories({ ...i, nu: new Date('2026-11-15T10:45:00Z'), meta: falskMeta() });
    expect(igen.nu.resultat).toBe('allerede_gjort');
  });
  it('lægger intet ud, før typen er godkendt, heller ikke når resten er live', async () => {
    const i = ind('2026-11-15T10:30:00Z', { cfg: { ...cfg, godkendt: ['podcast'] } });
    const r = await s.koerElStories(i);
    expect(r.nu.resultat).toBe('kladde');
    expect(i.meta.kald).toEqual([]);
  });
  it('slukket: intet sker', async () => {
    const i = ind('2026-11-15T10:30:00Z', { tilstand: 'fra' });
    expect(await s.koerElStories(i)).toEqual({ tilstand: 'fra' });
  });
  it('ugens story søndag kl. 19 med Vestdanmarks tal', async () => {
    const i = ind('2026-11-15T18:00:00Z');
    const r = await s.koerElStories(i);
    expect(r.uge.resultat).toBe('lagt');
    expect(r.uge.omraade).toBe('DK1');
    expect(i.meta.kald[0].billede).toBe('https://mrmesserschmidt.dk/facebook/billede/el-uge/2026-11-15.png');
  });
  it('springer ugens story over uden tal', async () => {
    const i = ind('2026-11-15T18:00:00Z', { hentEl: async () => data({ uge: { DK1: { dage: 3, gnsForskelOere: null }, DK2: { dage: 3, gnsForskelOere: null } } }) });
    const r = await s.koerElStories(i);
    expect(r.uge.resultat).toBe('sprunget_over');
    expect(i.meta.kald).toEqual([]);
  });
  it('springer over, når elpriserne mangler', async () => {
    const i = ind('2026-11-15T10:30:00Z', { hentEl: async () => null });
    const r = await s.koerElStories(i);
    expect(r.nu.resultat).toBe('ingen_data');
    expect(i.meta.kald).toEqual([]);
  });
});

describe('billeder', () => {
  it('tegner begge stories i 1080 × 1920', async () => {
    const d = data();
    for (const [type, ind] of [['el-nu', s.nuIndhold(d)], ['el-uge', s.ugeIndhold(d, 'DK1')]]) {
      const png = await tegn(type, { ...ind, foto: null });
      expect(png.readUInt32BE(16)).toBe(1080);
      expect(png.readUInt32BE(20)).toBe(1920);
    }
  }, 30000);
  it('teksterne', () => {
    const n = s.nuIndhold(data());
    expect(n.til).toBe('14.30');
    expect(n.vestTekst).toBe('Vestdanmark: kl. 12.00–15.00');
    const u = s.ugeIndhold(data(), 'DK1');
    expect(u.omraadeNavn).toBe('Vestdanmark');
    expect(u.beloeb).toBe('1,12');
    expect(u.periode).toBe('8.–14. november');
  });
});
