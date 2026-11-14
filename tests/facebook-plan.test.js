import { describe, it, expect } from 'vitest';
import p from '../lib/facebook/plan.js';

// 2026-11-02 er en mandag. Vintertid: dansk tid = UTC+1.
const kl = (dato, utcTime) => new Date(`${dato}T${String(utcTime).padStart(2, '0')}:00:00Z`);

describe('dansk tid', () => {
  it('giver dato, time og ugedag i dansk tid', () => {
    expect(p.kbh(kl('2026-11-02', 8))).toEqual({ dato: '2026-11-02', time: 9, ugedag: 1 });
    expect(p.kbh(new Date('2026-11-01T23:30:00Z'))).toEqual({ dato: '2026-11-02', time: 0, ugedag: 1 });
  });

  it('kl. 9 følger sommertid', () => {
    expect(p.erStoryTime(new Date('2027-06-01T07:00:00Z'))).toBe(true);
    expect(p.erStoryTime(new Date('2027-06-01T08:00:00Z'))).toBe(false);
    expect(p.erStoryTime(kl('2026-11-02', 8))).toBe(true);
  });
});

describe('ugeplan for stories (fra 15/11-2026)', () => {
  const fra = '2026-11-06';
  const kl19 = (dato) => new Date(`${dato}T18:00:00Z`);
  it('kl. 9: benzin mandag, onsdag, fredag og søndag', () => {
    for (const d of ['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-22']) expect(p.storyType(kl(d, 8), fra)).toBe('benzin');
  });
  it('kl. 9: el tirsdag, torsdag og lørdag', () => {
    for (const d of ['2026-11-17', '2026-11-19', '2026-11-21']) expect(p.storyType(kl(d, 8), fra)).toBe('el');
  });
  it('kl. 19: podcast mandag, onsdag, fredag og søndag', () => {
    for (const d of ['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-22']) expect(p.storyType(kl19(d), fra, 'aften')).toBe('podcast');
  });
  it('kl. 19: Mortens aften tirsdag, torsdag og lørdag, men først fra startdatoen', () => {
    for (const d of ['2026-11-17', '2026-11-19', '2026-11-21']) expect(p.storyType(kl19(d), fra, 'aften')).toBe('mortensaften');
    expect(p.storyType(kl19('2026-11-17'), '2026-12-01', 'aften')).toBe(null);
  });
  it('tidspunkterne er kl. 9 og kl. 19 dansk tid', () => {
    expect(p.erStoryTime(kl('2026-11-16', 8))).toBe(true);
    expect(p.erStoryTime(kl19('2026-11-16'), 'aften')).toBe(true);
    expect(p.erStoryTime(kl('2026-11-16', 8), 'aften')).toBe(false);
    expect(p.erStoryTime(new Date('2027-06-01T17:00:00Z'), 'aften')).toBe(true);
  });
  it('1. december kl. 9 er 2-kroners-storyen med el som reserve', () => {
    expect(p.storyType(kl('2026-12-01', 8), fra)).toBe('to-kroner');
    expect(p.reserveType(kl('2026-12-01', 8))).toBe('el');
    expect(p.storyType(kl19('2026-12-01'), fra, 'aften')).toBe('mortensaften');
  });
});

describe('nedtælling til 1. december', () => {
  it('tæller dagene ned, og stopper den 1. december', () => {
    expect(p.dageTilToKroner('2026-11-15')).toBe(16);
    expect(p.dageTilToKroner('2026-11-30')).toBe(1);
    expect(p.dageTilToKroner('2026-12-01')).toBe(null);
    expect(p.dageTilToKroner('2026-12-24')).toBe(null);
  });
  it('teksten er korrekt dansk, også for den sidste dag', () => {
    expect(p.nedtaellingTekst(16)).toBe('Om 16 dage bliver benzin og diesel 2 kr. billigere pr. liter');
    expect(p.nedtaellingTekst(1)).toBe('I morgen bliver benzin og diesel 2 kr. billigere pr. liter');
    expect(p.nedtaellingTekst(16)).not.toContain('—');
  });
});

describe('jul', () => {
  it('hele december og kun december', () => {
    expect(p.erJul('2026-11-30')).toBe(false);
    expect(p.erJul('2026-12-01')).toBe(true);
    expect(p.erJul('2026-12-31')).toBe(true);
    expect(p.erJul('2027-01-01')).toBe(false);
  });
});

describe('formater, Morten har godkendt i chatten', () => {
  it('de fire faste formater er godkendt, de nye er det ikke', () => {
    expect(p.GODKENDT_I_CHAT).toEqual(expect.arrayContaining(['podcast', 'benzin', 'el', 'mortensaften']));
    for (const ny of ['nedtaelling', 'jul', 'to-kroner']) expect(p.GODKENDT_I_CHAT).not.toContain(ny);
  });
});

describe('opslag om nyt afsnit', () => {
  const afsnit = {
    titel: 'Daniel Wass: Stopper mens legen er god',
    slug: 'daniel-wass-stopper-mens-legen-er-god',
    beskrivelse: ['Daniel Wass fortæller om at stoppe karrieren.', 'Producer: Louisa'],
  };

  it('har titel, første afsnit af beskrivelsen og link til afsnittet', () => {
    const t = p.podcastTekst(afsnit);
    expect(t).toContain('Daniel Wass: Stopper mens legen er god');
    expect(t).toContain('Daniel Wass fortæller om at stoppe karrieren.');
    expect(t).not.toContain('Producer');
    expect(t).toContain('https://mrmesserschmidt.dk/podcast/daniel-wass-stopper-mens-legen-er-god');
  });

  it('klarer sig uden beskrivelse', () => {
    const t = p.podcastTekst({ ...afsnit, beskrivelse: null });
    expect(t).toContain('Daniel Wass');
    expect(t).not.toContain('null');
    expect(t).not.toContain('undefined');
  });

  it('afkorter en meget lang beskrivelse ved et ord', () => {
    const lang = 'ord '.repeat(300).trim();
    const t = p.podcastTekst({ ...afsnit, beskrivelse: [lang] });
    expect(t.length).toBeLessThan(800);
    expect(t).toContain('…');
  });

  it('bruger ingen lange tankestreger', () => {
    expect(p.podcastTekst(afsnit)).not.toContain('—');
  });
});

describe('priser og billeder', () => {
  it('skriver øre som danske kroner', () => {
    expect(p.kroner(1349)).toBe('13,49');
    expect(p.kroner(1300)).toBe('13,00');
  });

  it('skifter billede til Mortens aften fra uge til uge', () => {
    const a = p.mortensaftenBillede(kl('2026-11-17', 8));
    const b = p.mortensaftenBillede(kl('2026-11-24', 8));
    expect(a).toMatch(/^[a-z-]+\.jpg$/);
    expect(a).not.toBe(b);
  });
});

describe('godkendte typer fra Vercel', () => {
  it('læser en kommasepareret liste og ignorerer ukendte ord', async () => {
    const { godkendte } = await import('../lib/facebook/kilder.js');
    expect(godkendte(' Podcast, benzin ,fisk,')).toEqual(['podcast', 'benzin']);
    expect(godkendte('')).toEqual([]);
  });

  it('billedet, Morten har fjernet fra mortensaften.dk, bruges ikke', () => {
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('hat-hund-terrasse.jpg');
  });
});

describe('benzinfotos', () => {
  it('benzin-storyen bruger samme foto hver gang', async () => {
    const { benzinFoto } = await import('../lib/facebook/billede.js');
    expect(benzinFoto('2026-11-16')).toMatch(/^data:image\/jpeg;base64,/);
    expect(benzinFoto('2026-11-16')).toBe(benzinFoto('2026-11-18'));
  });
});

describe('Mortens aften skifter billede hver gang', () => {
  it('tirsdag, torsdag og lørdag får aldrig samme billede i træk, og intet gentages inden for syv', () => {
    const dage = ['2026-11-17', '2026-11-19', '2026-11-21', '2026-11-24', '2026-11-26', '2026-11-28', '2026-12-01'];
    const b = dage.map((d) => p.mortensaftenBillede(kl(d, 18)));
    expect(new Set(b).size).toBe(b.length);
  });
});

describe('elpriser lørdag', () => {
  it('tidsrum vises i dansk tid', () => {
    expect(p.tidsrum('2026-11-07T12:00:00.000Z', '2026-11-07T15:00:00.000Z')).toBe('kl. 13–16');
    expect(p.tidsrum('2026-11-07T20:00:00.000Z', '2026-11-07T23:00:00.000Z')).toBe('kl. 21–24');
  });

  it('kun dagens rigtige tal godtages', async () => {
    const { elTal } = await import('../lib/facebook/kilder.js');
    const b = { start: '2026-11-07T12:00:00Z', slut: '2026-11-07T15:00:00Z', gennemsnitOere: 41.2 };
    const d = { dato: '2026-11-07', tilmeldingAaben: false, idag: { DK1: { billigste: b }, DK2: { billigste: b } } };
    expect(elTal(d, '2026-11-07')).toMatchObject({ vest: b, oest: b, tilmeldingAaben: false });
    expect(elTal(d, '2026-11-08')).toBeNull();
    expect(elTal({ ...d, idag: { DK1: { billigste: null }, DK2: { billigste: b } } }, '2026-11-07')).toBeNull();
    expect(elTal(null, '2026-11-07')).toBeNull();
  });

  it('el-storyen kan tegnes, også når tilmeldingen er lukket', async () => {
    const { tegn } = await import('../lib/facebook/billede.js');
    const b = { start: '2026-11-07T12:00:00Z', slut: '2026-11-07T15:00:00Z', gennemsnitOere: 41.2 };
    const png = await tegn('el', { vest: b, oest: b, dato: '2026-11-07', tilmeldingAaben: false });
    expect(png.length).toBeGreaterThan(10000);
  }, 30000);
});

describe('Mortens aften tirsdag 10. november', () => {
  it('billedet den 10. var middagen med Dot', () => {
    expect(p.mortensaftenBillede(kl('2026-11-10', 8))).toBe('skaal-med-dot.jpg');
  });
});

describe('flere Mortens aften-billeder (7/11-2026)', () => {
  it('syv billeder, alle med andre, inklusive madlavningen udendørs og aftenen ved bordet', () => {
    expect(p.MORTENSAFTEN_BILLEDER).toHaveLength(7);
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('hat-hund-terrasse.jpg');
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('flambering-koekken.jpg');
    expect(p.LIGGENDE).toContain('madlavning-udendoers.jpg');
  });
});
