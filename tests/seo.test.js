import { describe, it, expect } from 'vitest';
import p from '../lib/podcast.js';
import side from '../lib/side.js';

describe('Apple-links pr. afsnit', () => {
  const apple = { results: [
    { wrapperType: 'track', kind: 'podcast' },
    { wrapperType: 'podcastEpisode', trackName: 'Daniel Wass: Stopper mens legen er god', trackViewUrl: 'https://podcasts.apple.com/dk/podcast/x/id1710139799?i=1000001', releaseDate: '2026-10-22T22:10:02Z' },
    { wrapperType: 'podcastEpisode', trackName: 'Andet navn i Apple', trackViewUrl: 'https://podcasts.apple.com/dk/podcast/y/id1710139799?i=1000002', releaseDate: '2024-01-04T10:05:00Z' },
  ] };

  it('læser afsnit fra Apples svar', () => {
    const l = p.appleFraLookup(apple);
    expect(l).toHaveLength(2);
    expect(l[0].link).toContain('i=1000001');
  });

  it('kobler på titel, ellers på samme dag', () => {
    const afsnit = [
      { id: '2', titel: 'Daniel Wass: Stopper mens legen er god', dato: '2026-10-22T22:10:02Z' },
      { id: '1', titel: 'Politiker Rosa Lund', dato: '2024-01-04T10:00:00Z' },
      { id: '0', titel: 'Ingen match', dato: '2020-01-01T10:00:00Z' },
    ];
    p.koblApple(afsnit, p.appleFraLookup(apple));
    expect(afsnit[0].apple).toContain('i=1000001');
    expect(afsnit[1].apple).toContain('i=1000002');
    expect(afsnit[2].apple).toBeUndefined();
  });

  it('tåler tomt eller ødelagt svar', () => {
    expect(p.appleFraLookup(null)).toEqual([]);
    expect(p.appleFraLookup({ results: 'x' })).toEqual([]);
  });
});

describe('YouTube med nøgle', () => {
  it('læser videoer fra YouTubes API', () => {
    const v = p.videoerFraApi({ items: [
      { snippet: { title: 'T', description: 'Ghita Nørby er gæst', publishedAt: '2024-09-20T05:00:00Z', resourceId: { videoId: 'g1' } } },
      { snippet: { title: 'uden id' } },
    ] });
    expect(v).toEqual([{ id: 'g1', titel: 'T', beskrivelse: 'Ghita Nørby er gæst', dato: '2024-09-20T05:00:00Z' }]);
    expect(p.videoerFraApi(null)).toEqual([]);
  });

  it('vælger videoen tættest på afsnittets dato, når gæsten har været med flere gange', () => {
    const afsnit = [
      { id: '2', gaest: 'Stig Rossen', dato: '2026-07-30T22:00:00Z' },
      { id: '1', gaest: 'Stig Rossen', dato: '2024-11-28T22:00:00Z' },
    ];
    const videoer = [
      { id: 'ny', titel: '', beskrivelse: 'Stig Rossen', dato: '2026-07-31T05:00:00Z' },
      { id: 'gammel', titel: '', beskrivelse: 'Stig Rossen', dato: '2024-11-29T05:00:00Z' },
    ];
    p.koblYoutube(afsnit, videoer);
    expect(afsnit[0].youtube.id).toBe('ny');
    expect(afsnit[1].youtube.id).toBe('gammel');
  });
});

describe('afsnitssiden til Google', () => {
  const show = { beskrivelse: 'En podcast', cover: 'https://x/cover.jpg' };
  const a = { id: '2', titel: 'Ghita Nørby', gaest: 'Ghita Nørby', emne: '', slug: 'ghita', dato: '2024-09-20T05:00:00Z', minutter: 53, lyd: 'https://x/a.mp3', billede: 'https://x/g.jpg', apple: 'https://podcasts.apple.com/dk/podcast/x?i=9' };

  it('titlen nævner podcast og Morten Messerschmidt', () => {
    const html = side.afsnitSide({ show, afsnit: [a] }, a, []);
    expect(html).toMatch(/<title>Ghita Nørby[^<]*podcast[^<]*Morten Messerschmidt<\/title>/i);
  });

  it('Apple-knappen går til selve afsnittet', () => {
    const html = side.afsnitSide({ show, afsnit: [a] }, a, []);
    expect(html).toContain('href="https://podcasts.apple.com/dk/podcast/x?i=9"');
  });

  it('opmærkningen nævner værten', () => {
    const html = side.afsnitSide({ show, afsnit: [a] }, a, []);
    expect(html).toContain('"name":"Morten Messerschmidt"');
  });

  it('Google-bekræftelse kommer kun med, når koden er sat', () => {
    expect(side.ramme({ titel: 't', beskrivelse: '', sti: '/', indhold: '' })).not.toContain('google-site-verification');
    process.env.GOOGLE_SITE_VERIFICATION = 'abc"<x';
    const html = side.ramme({ titel: 't', beskrivelse: '', sti: '/', indhold: '' });
    expect(html).toContain('<meta name="google-site-verification" content="abc&quot;&lt;x">');
    delete process.env.GOOGLE_SITE_VERIFICATION;
  });
});
