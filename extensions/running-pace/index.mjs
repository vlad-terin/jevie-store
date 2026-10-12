// Running sums, as cards while they are typed, worked out on this Mac:
//
//   "pace 5k in 25 min", "pace 10 miles in 1:25:00", "half marathon in 1:45"    the pace a km and a mile
//   "marathon at 5:30 per km", "10k at 8:00 per mile"                          the finish time

const RACES = { '5k': 5, '10k': 10, 'half marathon': 21.0975, half: 21.0975, marathon: 42.195 };
const DIST = '(?:\\d+(?:\\.\\d+)?\\s*(?:k|km|mi|miles?)|5k|10k|half(?:\\s+marathon)?|marathon)';
const TIME = '(?:\\d{1,2}:\\d{2}(?::\\d{2})?|\\d+(?:\\.\\d+)?\\s*(?:min|mins|minutes|h|hr|hours))';
export const PATTERN = `^(?:(?:pace|race\\s+pace)\\s+(?:for\\s+)?)?${DIST}\\s+(?:in|at)\\s+(?:${TIME}|\\d{1,2}:\\d{2}\\s*(?:/|per|a)\\s*(?:km|kilometre|kilometer|mi|mile))$`;
export const km = s => { const t = s.trim().toLowerCase(); if (RACES[t]) return RACES[t]; const m = t.match(/^(\d+(?:\.\d+)?)\s*(k|km|mi|miles?)$/); return m ? Number(m[1]) * (/^m/.test(m[2]) ? 1.609344 : 1) : NaN; };
export const seconds = s => { const t = s.trim().toLowerCase(); const c = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/); if (c) return c[3] ? +c[1] * 3600 + +c[2] * 60 + +c[3] : +c[1] * 60 + +c[2]; const m = t.match(/^([\d.]+)\s*(min|mins|minutes|h|hr|hours)$/); return m ? Number(m[1]) * (/^h/.test(m[2]) ? 3600 : 60) : NaN; };
export const clock = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
export function run(said) {
  const t = String(said).toLowerCase().replace(/^(?:race\s+)?pace\s+(?:for\s+)?/, '');
  const m = t.match(new RegExp(`^(${DIST})\\s+(?:in|at)\\s+(.+)$`)); if (!m) return null;
  const d = km(m[1]); if (!(d > 0)) return null;
  const per = m[2].match(/^(\d{1,2}:\d{2})\s*(?:\/|per|a)\s*(km|kilometre|kilometer|mi|mile)$/);
  if (per) { const p = seconds(per[1]) / (/^m/.test(per[2]) ? 1.609344 : 1); return { km: d, total: p * d, perKm: p, solved: 'time' }; }
  let total = seconds(m[2]); if (!(total > 0)) return null;
  // "half marathon in 1:45" is an hour and three quarters: as minutes it
  // would be faster than any person has run (about 2:50 a km).
  if (/^\d{1,2}:\d{2}$/.test(m[2].trim()) && total / d < 150) total *= 60;
  return { km: d, total, perKm: total / d, solved: 'pace' };
}

export default function runningPace(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pace', label: 'Running pace', symbol: 'figure.run', match: { pattern: PATTERN }, examples: ['pace 5k in 25 min'],
    async render(said) {
      const r = run(said);
      if (!r) return { summary: 'Running pace', complete: 0, body: [line(meta('Type a distance and a time or pace: “pace 5k in 25 min”'))] };
      const perMi = r.perKm * 1.609344, speed = r.km / (r.total / 3600);
      const summary = r.solved === 'pace' ? `${clock(r.perKm)} per km (${clock(perMi)} per mile) for ${Number(r.km.toFixed(2))} km in ${clock(r.total)}` : `${clock(r.total)} for ${Number(r.km.toFixed(2))} km at ${clock(r.perKm)} per km`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(r.solved === 'pace' ? `${clock(r.perKm)} /km` : clock(r.total))), line(chip(r.solved === 'pace' ? 'pace' : 'finish time', 'figure.run'))), stack('trailing', line(hero(r.solved === 'pace' ? `${clock(perMi)} /mi` : `${clock(r.perKm)} /km`, true)), line(chip(`${speed.toFixed(1)} km/h`)))), line(meta(`${Number(r.km.toFixed(3))} km (${(r.km / 1.609344).toFixed(2)} mi) · 5k ${clock(r.perKm * 5)} · 10k ${clock(r.perKm * 10)} · half ${clock(r.perKm * 21.0975)} · marathon ${clock(r.perKm * 42.195)} at this pace`))] };
    }
  });
}
