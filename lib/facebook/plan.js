// Ugeplan, klokkeslæt og tekster til Facebook. Ren logik uden netværk, så det hele kan testes.

const STORY_TIME = 9;
// To stories om dagen fra 15/11-2026 (Morten 14/11): kl. 9 priser, kl. 19 podcast eller Mortens aften.
const TIDER = { morgen: 9, aften: 19 };
const SITE = 'https://mrmesserschmidt.dk';
const MAKS_BESKRIVELSE = 500;

// Billeder fra mortensaften.dk, hvor Morten er sammen med andre (syv fra 7/11-2026). Søndag 8. november: middagen med levende lys.
const MORTENSAFTEN_BILLEDER = [
  'skaal-restaurant.jpg',
  'madlavning-udendoers.jpg',
  'tv-koekken-aften.jpg',
  'skaal-med-dot.jpg',
  'middag-med-dot-lys.jpg',
  'frokost-hvidvin.jpg',
  'cafe-med-dot.jpg',
];
// Billeder i bredformat vises i et felt øverst i storyen i stedet for at fylde hele fladen.
const LIGGENDE = ['middag-med-dot-lys.jpg', 'skaal-med-dot.jpg', 'skaal-restaurant.jpg', 'madlavning-udendoers.jpg', 'tv-koekken-aften.jpg'];

// 0 = søndag … 6 = lørdag
const UGEPLAN = {
  morgen: { 1: 'benzin', 3: 'benzin', 5: 'benzin', 0: 'benzin', 2: 'el', 4: 'el', 6: 'el' },
  aften: { 1: 'podcast', 3: 'podcast', 5: 'podcast', 0: 'podcast', 2: 'mortensaften', 4: 'mortensaften', 6: 'mortensaften' },
};

// Formater, Morten har godkendt i chatten (14/11-2026). De lægges ud uden ny godkendelse; kun indholdet skifter.
// Nye formater (nedtaelling, jul, to-kroner) kommer først med her, når han har set og godkendt dem.
const GODKENDT_I_CHAT = ['podcast', 'benzin', 'el', 'mortensaften'];

// Afgiften på benzin og diesel sættes ned svarende til 2 kr. pr. liter fra 1. december 2026 (Morten 14/11).
const TO_KRONER_DATO = '2026-12-01';

// Enkelte dage med en anden story end ugeplanen. Mortens aften tirsdag 10. november 2026 (Mortens ønske 7/11).
// 1. december: 2-kroners-storyen kl. 9. Er den ikke godkendt, kommer dagens almindelige story (reserve).
const SAERDAGE = {
  '2026-11-10': { type: 'mortensaften', billede: 'skaal-med-dot.jpg' },
  [TO_KRONER_DATO]: { type: 'to-kroner' },
};

const DAGE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function kbh(nu) {
  const dele = {};
  for (const d of new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(nu)) dele[d.type] = d.value;
  return { dato: `${dele.year}-${dele.month}-${dele.day}`, time: Number(dele.hour), ugedag: DAGE[dele.weekday] };
}

function erStoryTime(nu, slot = 'morgen') {
  return kbh(nu).time === TIDER[slot];
}

// Særdagene gælder kun morgenens story.
function storyType(nu, mortensaftenFra, slot = 'morgen') {
  const { dato, ugedag } = kbh(nu);
  const saer = slot === 'morgen' && SAERDAGE[dato] && SAERDAGE[dato].type;
  const type = saer || UGEPLAN[slot][ugedag] || null;
  if (type === 'mortensaften' && (!mortensaftenFra || dato < mortensaftenFra)) return null;
  return type;
}

// Morgenens almindelige story, når en særlig story ikke er godkendt.
function reserveType(nu) {
  return UGEPLAN.morgen[kbh(nu).ugedag];
}

function dagNr(dato) {
  return Math.round(Date.parse(`${dato}T00:00:00Z`) / 86400000);
}

// Dage til 1. december. null fra og med dagen selv.
function dageTilToKroner(dato) {
  const n = dagNr(TO_KRONER_DATO) - dagNr(dato);
  return n > 0 ? n : null;
}

function nedtaellingTekst(dage) {
  return dage === 1
    ? 'I morgen bliver benzin og diesel 2 kr. billigere pr. liter'
    : `Om ${dage} dage bliver benzin og diesel 2 kr. billigere pr. liter`;
}

function erJul(dato) {
  return /^\d{4}-12-\d{2}$/.test(dato);
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

// "kl. 13–16" i dansk tid ud fra to tidspunkter i UTC.
function tidsrum(startIso, slutIso) {
  const t = (iso) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)));
  const fra = t(startIso);
  const til = t(slutIso);
  return `kl. ${fra}–${til === 0 ? 24 : til}`;
}

function kroner(oere) {
  return (Math.round(oere) / 100).toFixed(2).replace('.', ',');
}

// Næste billede hver gang (tirsdag, torsdag og lørdag), så samme billede ikke kommer to gange i træk.
const MORTENSAFTEN_PLADS = { 2: 0, 4: 1, 6: 2 };
function mortensaftenBillede(nu) {
  const { dato, ugedag } = kbh(nu);
  if (SAERDAGE[dato] && SAERDAGE[dato].billede) return SAERDAGE[dato].billede;
  const dag = Math.floor(Date.parse(`${dato}T00:00:00Z`) / 86400000);
  const uge = Math.floor((dag + 3) / 7); // uger, der starter mandag
  const nr = uge * 3 + (MORTENSAFTEN_PLADS[ugedag] || 0);
  return MORTENSAFTEN_BILLEDER[nr % MORTENSAFTEN_BILLEDER.length];
}

module.exports = { tidsrum, STORY_TIME, TIDER, GODKENDT_I_CHAT, TO_KRONER_DATO, reserveType, dageTilToKroner, nedtaellingTekst, erJul, MORTENSAFTEN_BILLEDER, LIGGENDE, kbh, erStoryTime, storyType, afsnitUrl, podcastTekst, kroner, mortensaftenBillede };
