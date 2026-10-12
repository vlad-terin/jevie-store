// Sunrise, sunset and the length of the day anywhere, as a card while it is
// typed: Open-Meteo's geocoder and forecast, no key. A place is kept; a
// day's times are kept until the day changes there.
//
//   "sunrise tokyo", "sunset in lisbon", "daylight reykjavik"
//
// ↵ copies "Tokyo: sunrise 5:43 AM, sunset 5:12 PM (11 h 29 min)".

const WORDS = ['sunrise', 'sunset', 'daylight', 'sun times'];
const clock = iso => { const [, h, m] = String(iso).match(/T(\d\d):(\d\d)/) ?? []; if (!h) return '—'; const hour = Number(h) % 12 || 12; return `${hour}:${m} ${Number(h) < 12 ? 'AM' : 'PM'}`; };
export const length = seconds => `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;

export function placeIn(said) {
  const lower = String(said ?? '').trim().toLowerCase();
  const word = WORDS.find(w => lower === w || lower.startsWith(`${w} `));
  return word === undefined ? null : { word, place: String(said).trim().slice(word.length).trim().replace(/^(?:in|at|for)\s+/i, '').replace(/[?.!]+$/, '') };
}

export function cardOf(place, day, word, P) {
  const { line, pair, stack, hero, chip, meta, icon } = P;
  const summary = `${place.name}: sunrise ${clock(day.sunrise)}, sunset ${clock(day.sunset)} (${length(day.daylight)})`;
  return { summary, copy: summary, complete: 1, body: [
    pair(stack('leading', line(hero(clock(day.sunrise), word === 'sunset')), line(chip('sunrise', 'sunrise'))), icon('arrow.right'),
      stack('trailing', line(hero(clock(day.sunset), word === 'sunrise')), line(chip('sunset', 'sunset')))),
    line(meta(`${place.label} · ${length(day.daylight)} of daylight · ${day.date} · local time`))
  ] };
}

export default function sunTimes(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Sunrise & sunset', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  const get = async url => { const r = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null); return r?.ok ? r.json().catch(() => null) : null; };
  jevie.registerCard({
    name: 'sun', label: 'Sunrise & sunset', symbol: 'sunrise', match: { words: WORDS }, examples: ['sunrise tokyo', 'sunset in lisbon'],
    async render(said) {
      const asked = placeIn(said);
      if (!asked?.place) return note('Type a place after it, like “sunrise tokyo”');
      const kept = (await context.state.get('kept').catch(() => null)) ?? { places: {}, days: {} };
      const key = asked.place.toLowerCase();
      let place = kept.places[key];
      if (!place) {
        const found = (await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(asked.place)}&count=1`))?.results?.[0];
        if (!found) return note(`No place called ${asked.place}`, true);
        place = { name: found.name, label: [found.name, found.country_code].filter(Boolean).join(', '), lat: found.latitude, lon: found.longitude, tz: found.timezone };
        kept.places[key] = place;
      }
      const today = new Date().toLocaleDateString('en-CA', { timeZone: place.tz ?? 'UTC' });
      let day = kept.days[key];
      if (!day || day.date !== today) {
        const d = (await get(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&daily=sunrise,sunset,daylight_duration&timezone=auto&forecast_days=1`))?.daily;
        if (!d?.sunrise?.[0]) return note('Open-Meteo has no times for there right now', true);
        day = { date: today, sunrise: d.sunrise[0], sunset: d.sunset[0], daylight: d.daylight_duration[0] };
        kept.days[key] = day;
      }
      await context.state.set('kept', { places: Object.fromEntries(Object.entries(kept.places).slice(-200)), days: Object.fromEntries(Object.entries(kept.days).slice(-50)) }).catch(() => {});
      return cardOf(place, day, asked.word, P);
    }
  });
}
