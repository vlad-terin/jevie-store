// The air where a place is, as a card while it is typed: the US AQI with its
// band, and the pollutants behind it, from Open-Meteo (no key). A place is
// found once by Open-Meteo's geocoder and kept; a reading is kept an hour.
//
//   "air quality berlin", "aqi delhi", "air quality in san francisco"

const WORDS = ['air quality', 'aqi'];
/// The US EPA's bands, low to high: [upper bound, name, what to do].
export const BANDS = [[50, 'Good', 'fine for everyone'], [100, 'Moderate', 'fine for most'], [150, 'Unhealthy for sensitive groups', 'sensitive people take it easy outside'],
  [200, 'Unhealthy', 'everyone limits long time outside'], [300, 'Very unhealthy', 'stay in if you can'], [Infinity, 'Hazardous', 'stay inside']];
export const bandOf = aqi => BANDS.find(([top]) => aqi <= top);

/// "air quality in san francisco" → "san francisco".
export function placeIn(text) {
  const lower = String(text ?? '').trim().toLowerCase();
  const word = WORDS.find(w => lower === w || lower.startsWith(`${w} `));
  return word === undefined ? null : String(text).trim().slice(word.length).trim().replace(/^(?:in|at|for|of)\s+/i, '').replace(/[?.!]+$/, '');
}

export function cardOf(place, now, P) {
  const { line, spread, stack, hero, chip, meta, text, bar } = P;
  const [, name, advice] = bandOf(now.us_aqi);
  const summary = `${place.name}: AQI ${now.us_aqi}, ${name.toLowerCase()}`;
  const parts = [['PM2.5', now.pm2_5], ['PM10', now.pm10], ['O₃', now.ozone], ['NO₂', now.nitrogen_dioxide]].filter(([, v]) => Number.isFinite(v)).map(([k, v]) => `${k} ${v}`);
  return {
    summary, copy: summary, complete: 1,
    body: [
      spread(stack('leading', line(hero(String(now.us_aqi))), line(chip(name, 'aqi.medium'))), stack('trailing', line(text(place.label)), line(meta(advice)))),
      bar(Math.min(now.us_aqi, 300), 300),
      line(meta(`${parts.join(' · ')} µg/m³ · European AQI ${now.european_aqi}`))
    ]
  };
}

export default function airQuality(jevie, context) {
  const P = jevie.CardParts;
  const note = text => ({ summary: 'Air quality', complete: 0, body: [P.line(P.text(text, true))] });
  const get = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
    return response?.ok ? response.json().catch(() => null) : null;
  };
  jevie.registerCard({
    name: 'air-quality', label: 'Air quality', symbol: 'aqi.medium',
    match: { words: WORDS },
    examples: ['air quality berlin', 'aqi delhi'],
    async render(said) {
      const where = placeIn(said);
      if (!where) return note('Type a place after it, like “air quality berlin”');
      const state = (await context.state.get('kept').catch(() => null)) ?? { places: {}, readings: {} };
      const key = where.toLowerCase();
      let place = state.places[key];
      if (!place) {
        const found = (await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(where)}&count=1`))?.results?.[0];
        if (!found) return { ...note(`No place called ${where}`), error: true };
        place = { name: found.name, label: [found.name, found.admin1 !== found.name ? found.admin1 : null, found.country_code].filter(Boolean).join(', '), lat: found.latitude, lon: found.longitude };
        state.places[key] = place;
      }
      let reading = state.readings[key];
      if (!reading || Date.now() - reading.at > 3600_000) {
        const now = (await get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}&current=us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide`))?.current;
        if (!Number.isFinite(now?.us_aqi)) return { ...note('Open-Meteo has no reading for there right now'), error: true };
        reading = { at: Date.now(), now };
        state.readings[key] = reading;
      }
      await context.state.set('kept', { places: Object.fromEntries(Object.entries(state.places).slice(-200)), readings: Object.fromEntries(Object.entries(state.readings).slice(-50)) }).catch(() => {});
      return cardOf(place, reading.now, P);
    }
  });
}
