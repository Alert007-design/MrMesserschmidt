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

describe('ugeplan for stories', () => {
  const fra = '2026-11-06';
  it('mandag, onsdag og fredag er podcast', () => {
    expect(p.storyType(kl('2026-11-02', 8), fra)).toBe('podcast');
    expect(p.storyType(kl('2026-11-04', 8), fra)).toBe('podcast');
    expect(p.storyType(kl('2026-11-06', 8), fra)).toBe('podcast');
  });
  it('tirsdag er benzin, lørdag elpriser', () => {
    expect(p.storyType(kl('2026-11-03', 8), fra)).toBe('benzin');
    expect(p.storyType(kl('2026-11-07', 8), fra)).toBe('el');
  });
  it('torsdag og søndag er Mortens aften, men først fra startdatoen', () => {
    expect(p.storyType(kl('2026-11-05', 8), fra)).toBe(null);
    expect(p.storyType(kl('2026-11-01', 8), fra)).toBe(null);
    expect(p.storyType(kl('2026-11-08', 8), fra)).toBe('mortensaften');
    expect(p.storyType(kl('2026-11-12', 8), fra)).toBe('mortensaften');
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
    const a = p.mortensaftenBillede(kl('2026-11-08', 8));
    const b = p.mortensaftenBillede(kl('2026-11-15', 8));
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
  it('tirsdag og lørdag har hver sit foto', async () => {
    const { benzinFoto } = await import('../lib/facebook/billede.js');
    const tir = benzinFoto('2026-11-03'), loer = benzinFoto('2026-11-07');
    expect(tir).toMatch(/^data:image\/jpeg;base64,/);
    expect(loer).toMatch(/^data:image\/jpeg;base64,/);
    expect(tir).not.toBe(loer);
  });
});

describe('Mortens aften-billeder', () => {
  it('kun billeder med andre, og søndag 8. november er middagen med levende lys', () => {
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('flambering-koekken.jpg');
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('adventslys.jpg');
    expect(p.mortensaftenBillede(kl('2026-11-08', 8))).toBe('middag-med-dot-lys.jpg');
  });
});

describe('Mortens aften skifter billede hver gang', () => {
  it('torsdag og søndag får aldrig samme billede i træk', () => {
    const dage = ['2026-11-08', '2026-11-12', '2026-11-15', '2026-11-19', '2026-11-22', '2026-11-26'];
    const b = dage.map((d) => p.mortensaftenBillede(kl(d, 8)));
    for (let i = 1; i < b.length; i++) expect(b[i]).not.toBe(b[i - 1]);
  });
});

describe('elpriser lørdag', () => {
  it('lørdag er elpriser, tirsdag stadig benzin', () => {
    expect(p.storyType(kl('2026-11-07', 8), '2026-11-06')).toBe('el');
    expect(p.storyType(kl('2026-11-03', 8), '2026-11-06')).toBe('benzin');
  });

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
  const fra = '2026-11-06';
  it('storyen den 10. november er Mortens aften i stedet for benzinpriser', () => {
    expect(p.storyType(kl('2026-11-10', 8), fra)).toBe('mortensaften');
  });
  it('andre tirsdage er stadig benzinpriser', () => {
    expect(p.storyType(kl('2026-11-03', 8), fra)).toBe('benzin');
    expect(p.storyType(kl('2026-11-17', 8), fra)).toBe('benzin');
  });
  it('billedet den 10. er et andet end søndag den 8. og torsdag den 12.', () => {
    const b = (d) => p.mortensaftenBillede(kl(d, 8));
    expect(b('2026-11-10')).toBe('skaal-med-dot.jpg');
    expect(b('2026-11-10')).not.toBe(b('2026-11-08'));
    expect(b('2026-11-10')).not.toBe(b('2026-11-12'));
  });
  it('Mortens aften-dagen respekterer stadig startdatoen', () => {
    expect(p.storyType(kl('2026-11-10', 8), '2026-11-20')).toBe(null);
  });
});
