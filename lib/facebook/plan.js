// Ugeplan, klokkeslæt og tekster til Facebook. Ren logik uden netværk, så det hele kan testes.

const STORY_TIME = 9;
const SITE = 'https://mrmesserschmidt.dk';
const MAKS_BESKRIVELSE = 500;

// Billeder fra mortensaften.dk, hvor Morten er alene på billedet.
const MORTENSAFTEN_BILLEDER = [
  'flambering-koekken.jpg',
  'roedvin-selfie-aften.jpg',
  'gigondas-skilt.jpg',
  'adventslys.jpg',
  'smoking-jul.jpg',
  'hat-hund-terrasse.jpg',
];

// 0 = søndag … 6 = lørdag
const UGEPLAN = { 1: 'podcast', 3: 'podcast', 5: 'podcast', 2: 'benzin', 6: 'benzin', 4: 'mortensaften', 0: 'mortensaften' };

const DAGE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function kbh(nu) {
  const dele = {};
  for (const d of new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(nu)) dele[d.type] = d.value;
  return { dato: `${dele.year}-${dele.month}-${dele.day}`, time: Number(dele.hour), ugedag: DAGE[dele.weekday] };
}

function erStoryTime(nu) {
  return kbh(nu).time === STORY_TIME;
}

function storyType(nu, mortensaftenFra) {
  const { dato, ugedag } = kbh(nu);
  const type = UGEPLAN[ugedag] || null;
  if (type === 'mortensaften' && (!mortensaftenFra || dato < mortensaftenFra)) return null;
  return type;
}

function afkort(tekst, maks) {
  const ren = String(tekst || '').replace(/\s+/g, ' ').trim();
  if (ren.length <= maks) return ren;
  const klip = ren.slice(0, maks);
  const mellemrum = klip.lastIndexOf(' ');
  return (mellemrum > maks * 0.6 ? klip.slice(0, mellemrum) : klip).replace(/[,.;:\s]+$/, '') + '…';
}

function afsnitUrl(afsnit) {
  return `${SITE}/podcast/${afsnit.slug}`;
}

function podcastTekst(afsnit) {
  const linjer = [String(afsnit.titel || '').trim()];
  const foerste = Array.isArray(afsnit.beskrivelse) ? afsnit.beskrivelse[0] : '';
  if (foerste) linjer.push(afkort(foerste, MAKS_BESKRIVELSE));
  linjer.push(`Hør hele afsnittet her: ${afsnitUrl(afsnit)}`);
  return linjer.filter(Boolean).join('\n\n').replace(/—/g, '–');
}

function kroner(oere) {
  return (Math.round(oere) / 100).toFixed(2).replace('.', ',');
}

function mortensaftenBillede(nu) {
  const dag = Math.floor(Date.parse(`${kbh(nu).dato}T00:00:00Z`) / 86400000);
  return MORTENSAFTEN_BILLEDER[dag % MORTENSAFTEN_BILLEDER.length];
}

module.exports = { STORY_TIME, MORTENSAFTEN_BILLEDER, kbh, erStoryTime, storyType, afsnitUrl, podcastTekst, kroner, mortensaftenBillede };
