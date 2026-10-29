import { describe, it, expect } from 'vitest';
import l from '../lib/login.js';

const HEMMELIG = 'test-hemmelighed-der-er-lang-nok-123';

describe('redaktørliste', () => {
  it('kun mails på listen, uanset store bogstaver og mellemrum', () => {
    const liste = 'louisa.mortensen@ft.dk, Dfmome@ft.dk';
    expect(l.erRedaktoer('Louisa.Mortensen@ft.dk', liste)).toBe(true);
    expect(l.erRedaktoer(' dfmome@ft.dk ', liste)).toBe(true);
    expect(l.erRedaktoer('fremmed@ft.dk', liste)).toBe(false);
    expect(l.erRedaktoer('', liste)).toBe(false);
    expect(l.erRedaktoer('louisa.mortensen@ft.dk', '')).toBe(false);
    expect(l.erRedaktoer('louisa.mortensen@ft.dk', undefined)).toBe(false);
  });
});

describe('signerede billetter', () => {
  it('godtager gyldig billet', () => {
    const t = l.lav({ mail: 'a@b.dk', type: 'session' }, HEMMELIG, 60, 1000);
    expect(l.tjek(t, HEMMELIG, 'session', 1000 + 59 * 1000)).toMatchObject({ mail: 'a@b.dk' });
  });
  it('afviser udløbet billet', () => {
    const t = l.lav({ mail: 'a@b.dk', type: 'session' }, HEMMELIG, 60, 1000);
    expect(l.tjek(t, HEMMELIG, 'session', 1000 + 61 * 1000)).toBeNull();
  });
  it('afviser ændret billet og forkert hemmelighed', () => {
    const t = l.lav({ mail: 'a@b.dk', type: 'session' }, HEMMELIG, 60, 1000);
    const [data, sig] = t.split('.');
    const falsk = Buffer.from(JSON.stringify({ mail: 'ond@b.dk', type: 'session', exp: 9e15 })).toString('base64url');
    expect(l.tjek(`${falsk}.${sig}`, HEMMELIG, 'session', 2000)).toBeNull();
    expect(l.tjek(t, 'en-anden-hemmelighed-som-er-lang', 'session', 2000)).toBeNull();
    expect(l.tjek(`${data}`, HEMMELIG, 'session', 2000)).toBeNull();
  });
  it('afviser forkert type (login-link kan ikke bruges som session)', () => {
    const t = l.lav({ mail: 'a@b.dk', type: 'link' }, HEMMELIG, 60, 1000);
    expect(l.tjek(t, HEMMELIG, 'session', 2000)).toBeNull();
  });
  it('afviser tomt og kort hemmelighed', () => {
    expect(l.tjek('', HEMMELIG, 'session')).toBeNull();
    expect(l.tjek(undefined, HEMMELIG, 'session')).toBeNull();
    expect(() => l.lav({ mail: 'a' }, 'kort', 60)).toThrow();
  });
});

describe('cookie', () => {
  it('finder session i cookie-header', () => {
    expect(l.cookie('a=1; podcast_session=xyz.abc; b=2', 'podcast_session')).toBe('xyz.abc');
    expect(l.cookie('', 'podcast_session')).toBe('');
    expect(l.cookie(undefined, 'podcast_session')).toBe('');
  });
});

describe('upload', () => {
  it('tillader kun billeder op til 4 MB', () => {
    expect(l.tilladtBillede('image/jpeg', 1000)).toBe(true);
    expect(l.tilladtBillede('image/webp', 4 * 1024 * 1024)).toBe(true);
    expect(l.tilladtBillede('image/png', 4 * 1024 * 1024 + 1)).toBe(false);
    expect(l.tilladtBillede('image/gif', 1000)).toBe(false);
    expect(l.tilladtBillede('text/html', 10)).toBe(false);
    expect(l.tilladtBillede('image/jpeg', 0)).toBe(false);
  });
  it('godtager kun rene afsnits-id', () => {
    expect(l.gyldigtId('75921084')).toBe(true);
    expect(l.gyldigtId('../x')).toBe(false);
    expect(l.gyldigtId('')).toBe(false);
  });
});
