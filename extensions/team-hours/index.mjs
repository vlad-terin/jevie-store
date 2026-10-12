// When a spread-out team overlaps, as a card while it is typed, worked out on
// this Mac with the time zones it knows: the hours every place is inside its
// working day (9 to 5 unless named), shown in your time and in each place's.
//
//   "overlap new york london", "team hours san francisco berlin tokyo 8-6",
//   "meeting time sf nyc london"

export const CITIES = {
  'san francisco': 'America/Los_Angeles', sf: 'America/Los_Angeles', 'los angeles': 'America/Los_Angeles', la: 'America/Los_Angeles', seattle: 'America/Los_Angeles', vancouver: 'America/Vancouver', portland: 'America/Los_Angeles',
  denver: 'America/Denver', phoenix: 'America/Phoenix', chicago: 'America/Chicago', austin: 'America/Chicago', dallas: 'America/Chicago', houston: 'America/Chicago', mexico: 'America/Mexico_City', 'mexico city': 'America/Mexico_City',
  'new york': 'America/New_York', nyc: 'America/New_York', ny: 'America/New_York', boston: 'America/New_York', miami: 'America/New_York', atlanta: 'America/New_York', toronto: 'America/Toronto', montreal: 'America/Toronto', washington: 'America/New_York',
  'sao paulo': 'America/Sao_Paulo', 'são paulo': 'America/Sao_Paulo', 'buenos aires': 'America/Argentina/Buenos_Aires', bogota: 'America/Bogota', lima: 'America/Lima', santiago: 'America/Santiago',
  london: 'Europe/London', dublin: 'Europe/Dublin', lisbon: 'Europe/Lisbon', paris: 'Europe/Paris', berlin: 'Europe/Berlin', amsterdam: 'Europe/Amsterdam', madrid: 'Europe/Madrid', barcelona: 'Europe/Madrid', rome: 'Europe/Rome', milan: 'Europe/Rome',
  zurich: 'Europe/Zurich', vienna: 'Europe/Vienna', stockholm: 'Europe/Stockholm', oslo: 'Europe/Oslo', copenhagen: 'Europe/Copenhagen', warsaw: 'Europe/Warsaw', prague: 'Europe/Prague', helsinki: 'Europe/Helsinki', athens: 'Europe/Athens',
  kyiv: 'Europe/Kyiv', kiev: 'Europe/Kyiv', istanbul: 'Europe/Istanbul', moscow: 'Europe/Moscow', 'tel aviv': 'Asia/Jerusalem', cairo: 'Africa/Cairo', lagos: 'Africa/Lagos', nairobi: 'Africa/Nairobi', johannesburg: 'Africa/Johannesburg',
  dubai: 'Asia/Dubai', riyadh: 'Asia/Riyadh', karachi: 'Asia/Karachi', mumbai: 'Asia/Kolkata', bangalore: 'Asia/Kolkata', bengaluru: 'Asia/Kolkata', delhi: 'Asia/Kolkata', chennai: 'Asia/Kolkata', hyderabad: 'Asia/Kolkata', dhaka: 'Asia/Dhaka',
  bangkok: 'Asia/Bangkok', jakarta: 'Asia/Jakarta', singapore: 'Asia/Singapore', 'kuala lumpur': 'Asia/Kuala_Lumpur', manila: 'Asia/Manila', 'hong kong': 'Asia/Hong_Kong', shanghai: 'Asia/Shanghai', beijing: 'Asia/Shanghai', shenzhen: 'Asia/Shanghai', taipei: 'Asia/Taipei',
  seoul: 'Asia/Seoul', tokyo: 'Asia/Tokyo', osaka: 'Asia/Tokyo', sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne', brisbane: 'Australia/Brisbane', perth: 'Australia/Perth', auckland: 'Pacific/Auckland', honolulu: 'Pacific/Honolulu'
};
const NAMES = Object.keys(CITIES).sort((a, b) => b.length - a.length);
export const PATTERN = `^(?:overlap|team\\s+hours|meeting\\s+time|working\\s+hours\\s+overlap|when\\s+can\\s+we\\s+meet)\\s+(?:(?:${NAMES.join('|')})[\\s,]+(?:and\\s+)?)+(?:${NAMES.join('|')})(?:\\s+\\d{1,2}\\s*-\\s*\\d{1,2})?$`;

export function placesIn(said) {
  let t = ` ${String(said).toLowerCase().replace(/^\s*(?:overlap|team\s+hours|meeting\s+time|working\s+hours\s+overlap|when\s+can\s+we\s+meet)\s+/, '').replace(/,/g, ' ').replace(/\band\b/g, ' ')} `;
  const hours = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*$/);
  if (hours) t = t.replace(hours[0], ' ');
  const found = [];
  for (const n of NAMES) { const at = t.indexOf(` ${n} `); if (at >= 0) { found.push({ at, name: n, tz: CITIES[n] }); t = t.slice(0, at) + ' '.repeat(n.length + 1) + t.slice(at + n.length + 1); } }
  return { places: found.sort((a, b) => a.at - b.at), start: hours ? Number(hours[1]) : 9, end: hours ? Number(hours[2]) : 17 };
}
/// The hour (0-23, with a fraction) in a zone at an instant.
const hourIn = (tz, ms) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms)); return Number(p.find(x => x.type === 'hour').value) + Number(p.find(x => x.type === 'minute').value) / 60; };
export function overlap(places, start, end, now = Date.now()) {
  // Every half hour of the next week: is each place inside its working hours
  // on a weekday there? (Asked on a Friday night, the next shared hours are Monday's.)
  const day = new Date(now); day.setMinutes(0, 0, 0);
  const slots = [];
  for (let i = 0; i < 7 * 48; i++) {
    const ms = day.getTime() + i * 30 * 60_000;
    const all = places.every(p => { const h = hourIn(p.tz, ms); const wd = new Intl.DateTimeFormat('en-US', { timeZone: p.tz, weekday: 'short' }).format(new Date(ms)); return h >= start && h < end && !['Sat', 'Sun'].includes(wd); });
    slots.push({ ms, all });
  }
  const runs = []; let run = null;
  for (const s of slots) { if (s.all) { run ??= { from: s.ms, to: s.ms }; run.to = s.ms + 30 * 60_000; } else if (run) { runs.push(run); run = null; } }
  if (run) runs.push(run);
  return runs;
}
const clock = (ms, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(':00', '');
const title = n => n.replace(/\b\w/g, c => c.toUpperCase()).replace(/^(Sf|La|Ny|Nyc)$/, s => s.toUpperCase());

export default function teamHours(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  jevie.registerCard({
    name: 'team-hours', label: 'Team hours', symbol: 'person.3', match: { pattern: PATTERN }, examples: ['overlap new york london', 'team hours san francisco berlin tokyo'],
    async render(said) {
      const { places, start, end } = placesIn(said);
      if (places.length < 2) return { summary: 'Team hours', complete: 0, body: [line(meta('Name two places or more: “overlap new york london”'))] };
      const runs = overlap(places, start, end);
      const best = runs[0];
      const when = best && new Date(best.from).toDateString() !== new Date().toDateString() ? ` (${new Date(best.from).toLocaleDateString('en-US', { weekday: 'long' })})` : '';
      if (!best) return { summary: `No shared ${start}–${end} hours`, copy: 'No overlap', complete: 1, body: [line(hero('No overlap', true)), line(meta(`${places.map(p => title(p.name)).join(', ')} share no ${start}:00–${end}:00 weekday hour · try wider hours, “… 8-6”`))] };
      const hours = (best.to - best.from) / 3600_000;
      const summary = `${hours} h overlap${when}: ${clock(best.from, here)}–${clock(best.to, here)} your time (${places.map(p => `${title(p.name)} ${clock(best.from, p.tz)}–${clock(best.to, p.tz)}`).join(', ')})`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${clock(best.from, here)}–${clock(best.to, here)}`)), line(chip('your time', 'clock'))), stack('trailing', line(hero(`${hours} h`, true)), line(chip('everyone working', 'person.3')))),
        line(...places.slice(0, 5).map(p => chip(`${title(p.name)} ${clock(best.from, p.tz)}–${clock(best.to, p.tz)}`))),
        line(meta(`${start}:00–${end}:00 weekdays in each place · the next shared hours${when}`))] };
    }
  });
}
