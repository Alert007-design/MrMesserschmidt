import { describe, it, expect } from 'vitest';
import k from '../lib/facebook/koersel.js';
import { MetaFejl } from '../lib/facebook/meta.js';

const MANDAG_KL_9 = new Date('2026-11-02T08:00:00Z');
const MANDAG_KL_10 = new Date('2026-11-02T09:00:00Z');
const TIRSDAG_KL_9 = new Date('2026-11-03T08:00:00Z');

const afsnit = (id) => ({ id: String(id), titel: `Gæst ${id}: Emne`, slug: `gaest-${id}`, beskrivelse: ['Om afsnittet.'], billede: `https://b/${id}.jpg` });

function falskMeta(fejl) {
  const kald = [];
  return {
    kald,
    async fotoOpslag(side, noegle, ind) { kald.push({ type: 'opslag', side, ...ind }); if (fejl) throw fejl; return { id: 'p1' }; },
    async story(side, noegle, billede) { kald.push({ type: 'story', side, billede }); if (fejl) throw fejl; return { id: 's1' }; },
    async instagramStory(konto, noegle, billede) { kald.push({ type: 'igstory', konto, billede }); if (fejl) throw fejl; return { id: 'i1' }; },
  };
}

function ind(over = {}) {
  return {
    nu: MANDAG_KL_10,
    tilstand: 'live',
    status: { initialiseret: true, sete: ['1'], stories: {}, log: [] },
    hentAfsnit: async () => [afsnit(1)],
    hentBenzin: async () => ({ benzin: { prisOere: 1349 }, diesel: { prisOere: 1299 } }),
    meta: falskMeta(),
    cfg: {
      sider: { podcast: { id: 'POD', noegle: 'n1' }, politiker: { id: 'POL', noegle: 'n2' } },
      instagram: { id: 'IG', noegle: 'n2' },
      mortensaftenFra: '2026-11-06',
      billedUrl: (type, dato, fmt = 'png') => `https://mrmesserschmidt.dk/facebook/billede/${type}/${dato}.${fmt}`,
    },
    ...over,
  };
}

describe('hovedafbryderen', () => {
  it('fra: intet sker, og status røres ikke', async () => {
    const i = ind({ tilstand: 'fra', hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    const r = await k.koer(i);
    expect(r.tilstand).toBe('fra');
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.sete).toEqual(['1']);
  });

  it('kladde: nyt afsnit logges som kladde, men sendes ikke til Meta', async () => {
    const i = ind({ tilstand: 'kladde', hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.sete).toContain('2');
    expect(i.status.log[0]).toMatchObject({ hvad: 'podcastopslag', resultat: 'kladde' });
    expect(i.status.log[0].tekst).toContain('Gæst 2');
  });
});

describe('podcastopslag', () => {
  it('første kørsel markerer alle afsnit som set og lægger intet op', async () => {
    const i = ind({ status: { sete: [], stories: {}, log: [] }, hentAfsnit: async () => [afsnit(3), afsnit(2), afsnit(1)] });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.initialiseret).toBe(true);
    expect(i.status.sete.sort()).toEqual(['1', '2', '3']);
  });

  it('et tomt feed ved første kørsel starter ikke systemet', async () => {
    const i = ind({ status: { sete: [], stories: {}, log: [] }, hentAfsnit: async () => [] });
    await k.koer(i);
    expect(i.status.initialiseret).toBeFalsy();
  });

  it('nyt afsnit lægges op på podcastsiden med billede og tekst', async () => {
    const i = ind({ hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    await k.koer(i);
    expect(i.meta.kald).toEqual([expect.objectContaining({ type: 'opslag', side: 'POD', billede: 'https://b/2.jpg' })]);
    expect(i.meta.kald[0].tekst).toContain('https://mrmesserschmidt.dk/podcast/gaest-2');
    expect(i.status.sete).toContain('2');
  });

  it('kommer to nye afsnit på én gang, lægges kun det nyeste op', async () => {
    const i = ind({ hentAfsnit: async () => [afsnit(3), afsnit(2), afsnit(1)] });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(1);
    expect(i.meta.kald[0].billede).toBe('https://b/3.jpg');
    expect(i.status.sete).toEqual(expect.arrayContaining(['2', '3']));
  });

  it('samme afsnit lægges aldrig op to gange', async () => {
    const i = ind({ hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    await k.koer(i);
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(1);
  });

  it('fejl hos Meta logges, og afsnittet prøves ikke igen', async () => {
    const i = ind({ meta: falskMeta(new MetaFejl('død', 'noegle_doed')), hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    await k.koer(i);
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(1);
    expect(i.status.log[0]).toMatchObject({ hvad: 'podcastopslag', resultat: 'fejl', art: 'noegle_doed' });
  });

  it('kan feedet ikke hentes, sker der intet', async () => {
    const i = ind({ hentAfsnit: async () => { throw new Error('nede'); } });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
  });
});


// Ugeplan fra 15/11-2026: kl. 9 priser (benzin man/ons/fre/søn, el tir/tor/lør), kl. 19 podcast (man/ons/fre/søn) eller Mortens aften (tir/tor/lør).
const MANDAG_KL_19 = new Date('2026-11-02T18:00:00Z');
const TIRSDAG_KL_19 = new Date('2026-11-17T18:00:00Z');
const MED_EL = async () => ({ vest: {}, oest: {} });

describe('daglige stories kl. 9 og kl. 19', () => {
  it('lægges kun kl. 9 og kl. 19', async () => {
    for (const nu of [MANDAG_KL_10, new Date('2026-11-02T17:00:00Z'), new Date('2026-11-02T19:00:00Z')]) {
      const i = ind({ nu });
      await k.koer(i);
      expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(0);
    }
  });

  it('mandag kl. 9: benzinstory på politikersiden med dagens billede', async () => {
    const i = ind({ nu: MANDAG_KL_9 });
    await k.koer(i);
    const s = i.meta.kald.filter((x) => x.type === 'story');
    expect(s).toEqual([{ type: 'story', side: 'POL', billede: 'https://mrmesserschmidt.dk/facebook/billede/benzin/2026-11-02.png' }]);
    expect(i.status.stories['2026-11-02']).toMatchObject({ type: 'benzin', resultat: 'lagt' });
  });

  it('mandag kl. 19: podcaststory, gemt for sig selv', async () => {
    const i = ind({ nu: MANDAG_KL_19 });
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toEqual([{ type: 'story', side: 'POL', billede: 'https://mrmesserschmidt.dk/facebook/billede/podcast/2026-11-02.png' }]);
    expect(i.status.stories['2026-11-02:aften']).toMatchObject({ type: 'podcast', resultat: 'lagt' });
    expect(i.status.stories['2026-11-02']).toBeUndefined();
  });

  it('tirsdag kl. 9 el og kl. 19 Mortens aften: to stories samme dag', async () => {
    const i = ind({ nu: new Date('2026-11-17T08:00:00Z'), hentEl: MED_EL });
    await k.koer(i);
    i.nu = TIRSDAG_KL_19;
    await k.koer(i);
    const b = i.meta.kald.filter((x) => x.type === 'story').map((x) => x.billede);
    expect(b).toEqual([
      'https://mrmesserschmidt.dk/facebook/billede/el/2026-11-17.png',
      'https://mrmesserschmidt.dk/facebook/billede/mortensaften/2026-11-17.png',
    ]);
  });

  it('samme story går også på Instagram, som JPEG', async () => {
    const i = ind({ nu: MANDAG_KL_19 });
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'igstory')).toEqual([{ type: 'igstory', konto: 'IG', billede: 'https://mrmesserschmidt.dk/facebook/billede/podcast/2026-11-02.jpg' }]);
  });

  it('uden Instagram-konto lægges kun på Facebook', async () => {
    const i = ind({ nu: MANDAG_KL_9 });
    i.cfg.instagram = { id: '', noegle: '' };
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'igstory')).toHaveLength(0);
    expect(i.status.stories['2026-11-02']).toMatchObject({ resultat: 'lagt', instagram: { resultat: 'ikke_opsat' } });
  });

  it('fejler Facebook, prøves Instagram stadig', async () => {
    const i = ind({ nu: MANDAG_KL_9 });
    i.meta.story = async () => { throw new MetaFejl('nej', 'rettighed'); };
    await k.koer(i);
    expect(i.status.stories['2026-11-02']).toMatchObject({ resultat: 'fejl', instagram: { resultat: 'lagt' } });
  });

  it('aldrig samme story to gange', async () => {
    const i = ind({ nu: MANDAG_KL_9 });
    await k.koer(i);
    await k.koer(i);
    i.nu = MANDAG_KL_19;
    await k.koer(i);
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(2);
  });

  it('uden benzinpriser springes morgenen over, men aftenens story kommer', async () => {
    const i = ind({ nu: MANDAG_KL_9, hentBenzin: async () => null });
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(0);
    expect(i.status.stories['2026-11-02']).toMatchObject({ type: 'benzin', resultat: 'sprunget_over' });
    i.nu = MANDAG_KL_19;
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(1);
  });

  it('uden elpriser springes tirsdag morgen over', async () => {
    const i = ind({ nu: new Date('2026-11-03T08:00:00Z'), hentEl: async () => null });
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(0);
    expect(i.status.stories['2026-11-03']).toMatchObject({ type: 'el', resultat: 'sprunget_over' });
  });

  it('kladde: storyen logges, men sendes ikke', async () => {
    const i = ind({ nu: MANDAG_KL_19, tilstand: 'kladde' });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.stories['2026-11-02:aften']).toMatchObject({ resultat: 'kladde' });
  });

  it('fejl hos Meta logges og prøves ikke igen samme aften', async () => {
    const i = ind({ nu: MANDAG_KL_19, meta: falskMeta(new MetaFejl('nej', 'rettighed')) });
    await k.koer(i);
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(1);
    expect(i.status.stories['2026-11-02:aften']).toMatchObject({ resultat: 'fejl', art: 'rettighed' });
  });

  it('loggen holdes kort', async () => {
    const i = ind();
    i.status.log = Array.from({ length: 200 }, (_, n) => ({ n }));
    i.hentAfsnit = async () => [afsnit(2), afsnit(1)];
    await k.koer(i);
    expect(i.status.log.length).toBeLessThanOrEqual(k.MAKS_LOG);
  });
});

describe('godkendelse pr. type', () => {
  const medGodkendt = (godkendt, over = {}) => {
    const i = ind({ tilstand: 'kladde', ...over });
    i.cfg = { ...i.cfg, godkendt };
    return i;
  };

  it('godkendt podcast: storyen lægges ud på Facebook, men ikke på Instagram', async () => {
    const i = medGodkendt(['podcast'], { nu: MANDAG_KL_19 });
    await k.koer(i);
    expect(i.meta.kald.map((x) => x.type)).toEqual(['story']);
    expect(i.status.stories['2026-11-02:aften']).toMatchObject({ resultat: 'lagt', instagram: { resultat: 'kladde' } });
  });

  it('godkendt podcast: opslag om nyt afsnit lægges ud', async () => {
    const i = medGodkendt(['podcast'], { hentAfsnit: async () => [afsnit(2), afsnit(1)] });
    await k.koer(i);
    expect(i.meta.kald).toEqual([expect.objectContaining({ type: 'opslag', side: 'POD' })]);
  });

  it('benzin er ikke godkendt: mandagens morgenstory bliver kladde', async () => {
    const i = medGodkendt(['podcast'], { nu: MANDAG_KL_9 });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.stories['2026-11-02']).toMatchObject({ type: 'benzin', resultat: 'kladde' });
  });

  it('Mortens aften er ikke godkendt: tirsdagens aftenstory bliver kladde', async () => {
    const i = medGodkendt(['podcast'], { nu: new Date('2026-11-10T18:00:00Z') });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
    expect(i.status.stories['2026-11-10:aften']).toMatchObject({ type: 'mortensaften', resultat: 'kladde' });
  });

  it('slukket slår også godkendte typer fra', async () => {
    const i = medGodkendt(['podcast'], { tilstand: 'fra', nu: MANDAG_KL_19 });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
  });

  it('instagram godkendt sammen med podcast: begge får storyen', async () => {
    const i = medGodkendt(['podcast', 'instagram'], { nu: MANDAG_KL_19 });
    await k.koer(i);
    expect(i.meta.kald.map((x) => x.type)).toEqual(['story', 'igstory']);
  });
});

describe('dagens kladde-story lægges op, når typen godkendes samme dag', () => {
  const kladdeIDag = (over = {}) => {
    const i = ind({ tilstand: 'kladde', ...over });
    i.cfg = { ...i.cfg, godkendt: ['benzin'] };
    i.status.stories = { '2026-11-02': { type: 'benzin', resultat: 'kladde' } };
    return i;
  };

  it('kl. 10 lægges morgenens story op, og kun én gang', async () => {
    const i = kladdeIDag({ nu: MANDAG_KL_10 });
    await k.koer(i);
    await k.koer(i);
    expect(i.meta.kald.filter((x) => x.type === 'story')).toHaveLength(1);
    expect(i.status.stories['2026-11-02']).toMatchObject({ resultat: 'lagt' });
  });

  it('efter kl. 18 indhentes morgenens story ikke', async () => {
    const i = kladdeIDag({ nu: new Date('2026-11-02T17:00:00Z') });
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
  });

  it('aftenens kladde indhentes frem til kl. 22', async () => {
    const i = ind({ tilstand: 'kladde', nu: new Date('2026-11-02T20:00:00Z') });
    i.cfg = { ...i.cfg, godkendt: ['podcast'] };
    i.status.stories = { '2026-11-02:aften': { type: 'podcast', resultat: 'kladde' } };
    await k.koer(i);
    expect(i.status.stories['2026-11-02:aften']).toMatchObject({ resultat: 'lagt' });
    const sent = ind({ tilstand: 'kladde', nu: new Date('2026-11-02T22:00:00Z') });
    sent.cfg = { ...sent.cfg, godkendt: ['podcast'] };
    sent.status.stories = { '2026-11-02:aften': { type: 'podcast', resultat: 'kladde' } };
    await k.koer(sent);
    expect(sent.meta.kald).toHaveLength(0);
  });

  it('en ikke-godkendt type indhentes ikke', async () => {
    const i = kladdeIDag({ nu: MANDAG_KL_10 });
    i.cfg.godkendt = [];
    await k.koer(i);
    expect(i.meta.kald).toHaveLength(0);
  });
});

describe('1. december: 2 kroner billigere', () => {
  const DEC1_KL_9 = new Date('2026-12-01T08:00:00Z');

  it('godkendt: dagens morgenstory er 2-kroners-storyen', async () => {
    const i = ind({ nu: DEC1_KL_9, hentEl: MED_EL });
    i.cfg = { ...i.cfg, godkendt: ['to-kroner'] };
    await k.koer(i);
    expect(i.meta.kald.find((x) => x.type === 'story').billede).toContain('/to-kroner/2026-12-01');
    expect(i.status.stories['2026-12-01']).toMatchObject({ type: 'to-kroner', resultat: 'lagt' });
  });

  it('ikke godkendt, også når alt andet er live: dagens almindelige elstory i stedet', async () => {
    const i = ind({ nu: DEC1_KL_9, hentEl: MED_EL });
    i.cfg = { ...i.cfg, godkendt: [] };
    await k.koer(i);
    expect(i.meta.kald.find((x) => x.type === 'story').billede).toContain('/el/2026-12-01');
    expect(i.status.log.find((l) => l.hvad === 'story')).toMatchObject({ type: 'el', erstatter: 'to-kroner' });
  });

  it('2-kroners-storyen kræver ingen priser', async () => {
    const i = ind({ nu: DEC1_KL_9, hentEl: async () => null });
    i.cfg = { ...i.cfg, godkendt: ['to-kroner'] };
    await k.koer(i);
    expect(i.status.stories['2026-12-01']).toMatchObject({ type: 'to-kroner', resultat: 'lagt' });
  });
});
