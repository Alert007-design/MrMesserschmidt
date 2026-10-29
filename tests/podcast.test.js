import { describe, it, expect } from 'vitest';
import p from '../lib/podcast.js';

const spreaker = {
  response: {
    items: [
      { episode_id: 2, title: 'Daniel Wass: Stopper mens legen er god', slug: 'daniel-wass-stopper-mens-legen-er-god', published_at: '2026-10-22 22:10:02', duration: 1503947, playback_url: 'https://api.spreaker.com/v2/episodes/2/play.mp3', site_url: 'https://www.spreaker.com/episode/x--2' },
      { episode_id: 1, title: 'Politiker Rosa Lund', slug: 'politiker-rosa-lund', published_at: '2024-01-04 10:00:00', duration: 60000, playback_url: 'https://api.spreaker.com/v2/episodes/1/play.mp3', site_url: 'https://www.spreaker.com/episode/y--1' },
    ],
  },
};

describe('afsnit fra Spreaker', () => {
  it('læser afsnit med gæst, emne, dato og lyd', () => {
    const [a, b] = p.afsnitFraSpreaker(spreaker);
    expect(a).toMatchObject({ id: '2', gaest: 'Daniel Wass', emne: 'Stopper mens legen er god', slug: 'daniel-wass-stopper-mens-legen-er-god', lyd: 'https://api.spreaker.com/v2/episodes/2/play.mp3' });
    expect(a.dato).toBe('2026-10-22T22:10:02Z');
    expect(a.minutter).toBe(25);
    expect(b.gaest).toBe('Politiker Rosa Lund');
    expect(b.emne).toBe('');
  });

  it('giver tom liste ved tomt eller ødelagt svar', () => {
    expect(p.afsnitFraSpreaker(null)).toEqual([]);
    expect(p.afsnitFraSpreaker({})).toEqual([]);
    expect(p.afsnitFraSpreaker({ response: { items: 'x' } })).toEqual([]);
  });

  it('gør ens adresser unikke', () => {
    const data = { response: { items: [
      { episode_id: 5, title: 'Samme', slug: 'samme', published_at: '2026-01-02 10:00:00' },
      { episode_id: 4, title: 'Samme', slug: 'samme', published_at: '2026-01-01 10:00:00' },
    ] } };
    const l = p.afsnitFraSpreaker(data);
    expect(l[0].slug).toBe('samme');
    expect(l[1].slug).toBe('samme-4');
  });
});

describe('beskrivelser fra feedet', () => {
  const rss = `<rss><channel><item><title>A</title><guid isPermaLink="false">https://api.spreaker.com/episode/2</guid>
<description><![CDATA[Første linje 🚗<br /><br />Anden <i>linje</i> &amp; mere<script>alert(1)</script>]]></description></item>
<item><guid isPermaLink="false">https://api.spreaker.com/episode/1</guid></item></channel></rss>`;

  it('finder beskrivelse pr. afsnits-id og deler i afsnit', () => {
    const m = p.beskrivelserFraRss(rss);
    expect(m.get('2')).toEqual(['Første linje 🚗', 'Anden linje & mere']);
    expect(m.has('1')).toBe(false);
  });

  it('tåler tomt feed', () => {
    expect(p.beskrivelserFraRss('').size).toBe(0);
    expect(p.beskrivelserFraRss(null).size).toBe(0);
  });
});

describe('YouTube', () => {
  const xml = `<feed><entry><yt:videoId>abc123</yt:videoId><title>JEG HAR UDLEVET MIN DRØM</title><published>2026-10-23T03:00:08+00:00</published>
<media:group><media:description>Efter 20 år som professionel fodboldspiller er Daniel Wass klar til at stoppe</media:description></media:group></entry>
<entry><yt:videoId>zzz</yt:videoId><title>NOGET ANDET</title><media:group><media:description>Ingen gæst nævnt</media:description></media:group></entry></feed>`;

  it('læser videoer', () => {
    const v = p.videoerFraYoutube(xml);
    expect(v).toHaveLength(2);
    expect(v[0]).toMatchObject({ id: 'abc123', titel: 'JEG HAR UDLEVET MIN DRØM' });
  });

  it('kobler video til afsnit på gæstens navn', () => {
    const afsnit = p.afsnitFraSpreaker(spreaker);
    p.koblYoutube(afsnit, p.videoerFraYoutube(xml));
    expect(afsnit[0].youtube).toEqual({ id: 'abc123', link: 'https://www.youtube.com/watch?v=abc123', billede: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' });
    expect(afsnit[1].youtube).toBeUndefined();
  });

  it('kobler ikke på tomt gæstenavn eller ødelagt feed', () => {
    const afsnit = [{ id: '9', gaest: '' }];
    p.koblYoutube(afsnit, p.videoerFraYoutube(xml));
    expect(afsnit[0].youtube).toBeUndefined();
    expect(p.videoerFraYoutube(null)).toEqual([]);
  });
});

describe('billede', () => {
  it('foretrækker Louisas billede, så YouTube, så cover', () => {
    const cover = 'cover.jpg';
    expect(p.billede({ id: '1', youtube: { billede: 'yt.jpg' } }, { 1: 'eget.jpg' }, cover)).toBe('eget.jpg');
    expect(p.billede({ id: '1', youtube: { billede: 'yt.jpg' } }, {}, cover)).toBe('yt.jpg');
    expect(p.billede({ id: '1' }, {}, cover)).toBe('cover.jpg');
  });
});

describe('html-sikkerhed og dato', () => {
  it('escaper tekst', () => {
    expect(p.esc('<b>"&\'')).toBe('&lt;b&gt;&quot;&amp;&#39;');
  });
  it('skriver dansk dato', () => {
    expect(p.danskDato('2026-10-22T10:00:00Z')).toBe('22. oktober 2026');
    expect(p.danskDato('2026-10-22T22:10:02Z')).toBe('23. oktober 2026');
    expect(p.danskDato('ugyldig')).toBe('');
  });
});
