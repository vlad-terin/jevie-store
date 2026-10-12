// How far, as a card while it is typed: both places found by Open-Meteo's
// geocoder (no key, kept), the great-circle distance by the haversine
// formula, and a flight time at a jet's ~850 km/h plus half an hour for
// taxi, climb and descent - a rough guide, not a schedule.
//
//   "distance london to tokyo", "how far is paris from berlin", "flight time new york to paris"

export const PATTERN = '^(?:distance|flight\\s+time|how\\s+far\\s+is)\\s+(?:from\\s+)?[a-z][a-z .\'-]{1,40}\\s+(?:to|from|and)\\s+[a-z][a-z .\'-]{1,40}\\??$';
export function placesIn(said) {
  const t = String(said).trim().toLowerCase().replace(/\?$/, '');
  const m = t.match(/^(?:distance|flight\s+time|how\s+far\s+is)\s+(?:from\s+)?(.+?)\s+(?:to|from|and)\s+(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
}
export function haversine(a, b) {
  const R = 6371.0088, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const flightHours = km => km / 850 + 0.5;
const hm = h => `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min`;

export default function travelDistance(jevie, context) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Distance', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  const find = async name => {
    const kept = (await context.state.get('places').catch(() => null)) ?? {};
    if (kept[name]) return kept[name];
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`, { signal: AbortSignal.timeout(6000) }).then(x => x.ok ? x.json() : null).catch(() => null);
    const f = r?.results?.[0]; if (!f) return null;
    const place = { name: f.name, country: f.country_code, lat: f.latitude, lon: f.longitude };
    await context.state.set('places', Object.fromEntries([...Object.entries(kept), [name, place]].slice(-300))).catch(() => {});
    return place;
  };
  jevie.registerCard({
    name: 'distance', label: 'Distance', symbol: 'airplane.departure', match: { pattern: PATTERN }, examples: ['distance london to tokyo', 'flight time new york to paris'],
    async render(said) {
      const names = placesIn(said); if (!names) return note('Type two places: “distance london to tokyo”');
      const [a, b] = await Promise.all(names.map(find));
      if (!a || !b) return note(`No place called ${!a ? names[0] : names[1]}`, true);
      const km = haversine(a, b), mi = km * 0.621371, h = flightHours(km);
      const summary = `${a.name} → ${b.name}: ${Math.round(km).toLocaleString('en-US')} km (${Math.round(mi).toLocaleString('en-US')} mi) · about ${hm(h)} flying`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(`${Math.round(km).toLocaleString('en-US')} km`)), line(chip(`${a.name}, ${a.country}`))), icon('airplane'), stack('trailing', line(hero(`≈ ${hm(h)}`, true)), line(chip(`${b.name}, ${b.country}`)))),
        line(meta(`${Math.round(mi).toLocaleString('en-US')} miles as the crow flies · flight time at ~850 km/h plus 30 min, a rough guide; winds and routes change it`))] };
    }
  });
}
