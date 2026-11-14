import { describe, it, expect } from 'vitest';
import { tegn } from '../lib/facebook/billede.js';
import p from '../lib/facebook/plan.js';

const stoerrelse = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];
const b = { start: '2026-11-17T12:00:00Z', slut: '2026-11-17T15:00:00Z', gennemsnitOere: 41.2 };
const benzin = { benzin: { prisOere: 1349 }, diesel: { prisOere: 1299 }, dato: '2026-11-16', foto: null };
const el = { vest: b, oest: b, dato: '2026-11-17', tilmeldingAaben: true, foto: null };

describe('nedtællingsbåndet', () => {
  it('benzin og el kan tegnes med båndet i 1080 × 1920', async () => {
    const tekst = p.nedtaellingTekst(15);
    const a = await tegn('benzin', { ...benzin, nedtaelling: { dage: 15, tekst } });
    const c = await tegn('el', { ...el, nedtaelling: { dage: 14, tekst: p.nedtaellingTekst(14) } });
    expect(stoerrelse(a)).toEqual([1080, 1920]);
    expect(stoerrelse(c)).toEqual([1080, 1920]);
    const uden = await tegn('benzin', benzin);
    expect(Buffer.compare(a, uden)).not.toBe(0);
  }, 60000);
});

describe('2-kroners-storyen 1. december', () => {
  it('tegnes i 1080 × 1920 uden priser', async () => {
    expect(stoerrelse(await tegn('to-kroner', { foto: null }))).toEqual([1080, 1920]);
  }, 30000);
});

describe('juleudgaver', () => {
  it('alle fire faste formater kan tegnes med julepynt og ser anderledes ud end til hverdag', async () => {
    const sager = [
      ['podcast', { foto: null, gaest: 'Gæst', emne: 'Emne' }],
      ['benzin', { ...benzin, dato: '2026-12-02' }],
      ['el', { ...el, dato: '2026-12-03' }],
      ['mortensaften', { foto: null, liggende: false }],
    ];
    for (const [type, data] of sager) {
      const jul = await tegn(type, { ...data, jul: true });
      const hverdag = await tegn(type, data);
      expect(stoerrelse(jul)).toEqual([1080, 1920]);
      expect(Buffer.compare(jul, hverdag)).not.toBe(0);
    }
  }, 120000);
});

describe('hvornår de nye formater bruges', async () => {
  const { variantFor } = await import('../api/facebook-billede.js');
  it('ikke godkendt: det faste format, også i december og før 1. december', () => {
    expect(variantFor('benzin', '2026-11-16', ['benzin'], false)).toEqual({});
    expect(variantFor('podcast', '2026-12-07', ['podcast'], false)).toEqual({});
  });
  it('godkendt: nedtælling på benzin og el før 1. december, ikke på podcast', () => {
    expect(variantFor('benzin', '2026-11-16', ['nedtaelling'], false)).toEqual({ nedtaelling: { dage: 15 } });
    expect(variantFor('el', '2026-11-30', ['nedtaelling'], false)).toEqual({ nedtaelling: { dage: 1 } });
    expect(variantFor('podcast', '2026-11-16', ['nedtaelling'], false)).toEqual({});
    expect(variantFor('benzin', '2026-12-01', ['nedtaelling'], false)).toEqual({});
  });
  it('godkendt jul: kun i december', () => {
    expect(variantFor('mortensaften', '2026-12-08', ['jul'], false)).toEqual({ jul: true });
    expect(variantFor('mortensaften', '2026-11-28', ['jul'], false)).toEqual({});
  });
  it('udkast viser de nye formater uden godkendelse', () => {
    expect(variantFor('benzin', '2026-11-16', [], true)).toEqual({ nedtaelling: { dage: 15 } });
  });
});
