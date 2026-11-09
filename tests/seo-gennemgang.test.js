import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import side from '../lib/side.js';

const show = { beskrivelse: 'En podcast af Morten Messerschmidt', cover: 'https://x/cover.jpg' };
const a = { id: '2', titel: 'Daniel Wass: Stopper', gaest: 'Daniel Wass', emne: 'Stopper', slug: 'daniel-wass', dato: '2026-10-22T22:10:02Z', minutter: 25, lyd: 'https://x/play.mp3', billede: 'https://x/yt.jpg' };
const b = { ...a, id: '1', gaest: 'Hans Engell', slug: 'hans-engell' };

describe('SEO-gennemgang 9/11', () => {
  it('podcastoversigten har én h1 og en beskrivelse på mindst 60 tegn', () => {
    const html = side.oversigt({ show, afsnit: [a, b] });
    expect(html.match(/<h1/g)).toHaveLength(1);
    const besk = html.match(/<meta name="description" content="([^"]*)"/)[1];
    expect(besk.length).toBeGreaterThanOrEqual(60);
    expect(besk.length).toBeLessThanOrEqual(160);
    expect(besk).toContain('Hør alle 2 afsnit');
    expect(besk).not.toContain('\n');
  });
  it('alle podcastsider har twitter-kort', () => {
    expect(side.oversigt({ show, afsnit: [a] })).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(side.afsnitSide({ show, afsnit: [a] }, a, [])).toContain('<meta name="twitter:card"');
  });
  it('forsiden har kanonisk adresse, fuld billedadresse, twitter-kort og Person-data', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('<link rel="canonical" href="https://mrmesserschmidt.dk/">');
    expect(html).toContain('<meta property="og:image" content="https://mrmesserschmidt.dk/mig.webp">');
    expect(html).toContain('<meta name="twitter:card"');
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    expect(ld['@type']).toBe('Person');
    expect(ld.sameAs).toContain('https://www.facebook.com/MortenMesserschmidt');
  });
});
