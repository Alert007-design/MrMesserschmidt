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
  it('tirsdag og lørdag er benzin', () => {
    expect(p.storyType(kl('2026-11-03', 8), fra)).toBe('benzin');
    expect(p.storyType(kl('2026-11-07', 8), fra)).toBe('benzin');
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
    expect(p.MORTENSAFTEN_BILLEDER.join(' ')).not.toMatch(/dot/);
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
  it('flambering bruges ikke, og søndag 8. november er adventslysene', () => {
    expect(p.MORTENSAFTEN_BILLEDER).not.toContain('flambering-koekken.jpg');
    expect(p.mortensaftenBillede(kl('2026-11-08', 8))).toBe('adventslys.jpg');
  });
});

describe('Mortens aften skifter billede hver gang', () => {
  it('torsdag og søndag får aldrig samme billede i træk', () => {
    const dage = ['2026-11-08', '2026-11-12', '2026-11-15', '2026-11-19', '2026-11-22', '2026-11-26'];
    const b = dage.map((d) => p.mortensaftenBillede(kl(d, 8)));
    for (let i = 1; i < b.length; i++) expect(b[i]).not.toBe(b[i - 1]);
  });
});
