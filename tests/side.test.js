import { describe, it, expect } from 'vitest';
import side from '../lib/side.js';

const show = { beskrivelse: 'En podcast af Morten Messerschmidt', cover: 'https://x/cover.jpg' };
const a = { id: '2', titel: 'Daniel Wass: Stopper <b>nu</b>', gaest: 'Daniel Wass', emne: 'Stopper <b>nu</b>', slug: 'daniel-wass', dato: '2026-10-22T22:10:02Z', minutter: 25, lyd: 'https://x/play.mp3', billede: 'https://x/yt.jpg', youtube: { link: 'https://www.youtube.com/watch?v=abc' } };
const b = { ...a, id: '1', gaest: 'Hans Engell', slug: 'hans-engell', emne: '', billede: show.cover, youtube: undefined };

describe('sider', () => {
  it('oversigten viser kort og escaper tekst fra feedet', () => {
    const html = side.oversigt({ show, afsnit: [a, b] });
    expect(html).toContain('href="/podcast/daniel-wass"');
    expect(html).toContain('Stopper &lt;b&gt;nu&lt;/b&gt;');
    expect(html).not.toContain('<b>nu</b>');
    expect(html).toContain('"@type":"PodcastSeries"');
    expect(html).toContain('<link rel="canonical" href="https://mrmesserschmidt.dk/podcast">');
  });
  it('oversigten siger til, når afsnit mangler', () => {
    expect(side.oversigt({ show, afsnit: [] })).toContain('kunne ikke hentes');
  });
  it('afsnitssiden har afspiller, opmærkning og YouTube-link', () => {
    const html = side.afsnitSide({ show, afsnit: [a, b] }, a, ['Første afsnit', 'Andet']);
    expect(html).toContain('<audio controls preload="none" src="https://x/play.mp3">');
    expect(html).toContain('"@type":"PodcastEpisode"');
    expect(html).toContain('https://www.youtube.com/watch?v=abc');
    expect(html).toContain('<p>Første afsnit</p>');
    expect(html).toContain('23. oktober 2026');
    expect(html).toContain('href="/podcast/hans-engell"');
  });
  it('afsnitssiden uden beskrivelse opfinder ingen tekst', () => {
    const html = side.afsnitSide({ show, afsnit: [b] }, b, []);
    expect(html).not.toContain('Om afsnittet');
  });
  it('json-ld kan ikke bryde ud af script-tag', () => {
    const ond = { ...a, titel: '</script><script>alert(1)</script>' };
    const html = side.afsnitSide({ show, afsnit: [ond] }, ond, []);
    expect(html).not.toContain('</script><script>alert(1)');
  });
});
