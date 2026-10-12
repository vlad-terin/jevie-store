// A legal deadline, as a card while it is typed, worked out on this Mac the
// way FRCP 6(a)(1) counts a period in days: leave out the trigger day, count
// every day (weekends too), and when the last day is a Saturday, Sunday or
// legal holiday, run to the next day that is none of them. US federal
// holidays (observed). State and local rules differ - check yours.
//
//   "deadline 21 days from oct 1", "court deadline 30 days from 2026-12-01", "deadline 14 days after nov 20"

export const PATTERN = '^(?:court\\s+|filing\\s+|response\\s+|legal\\s+)?deadline\\s+\\d{1,3}\\s+(?:calendar\\s+)?days?\\s+(?:from|after)\\s+.+$';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY = 864e5;
const at = (y, m, d) => new Date(y, m, d);
export function dateIn(text, now = new Date()) {
  const t = String(text).trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, '');
  const today = at(now.getFullYear(), now.getMonth(), now.getDate());
  if (t === 'today') return today;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return at(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); if (m) return at(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getFullYear(), +m[1] - 1, +m[2]);
  m = t.match(/^([a-z]{3})[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?$/) ?? t.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*(?:\s+(\d{4}))?$/);
  if (m) { const [mon, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]]; const i = MONTHS.indexOf(mon); return i < 0 ? null : at(m[3] ? +m[3] : today.getFullYear(), i, +day); }
  return null;
}
export function usHolidays(year) {
  const nth = (month, weekday, n) => { const first = at(year, month, 1); return at(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7); };
  const last = (month, weekday) => { const end = at(year, month + 1, 0); return at(year, month, end.getDate() - ((end.getDay() - weekday + 7) % 7)); };
  const observed = d => d.getDay() === 6 ? new Date(d.getTime() - DAY) : d.getDay() === 0 ? new Date(d.getTime() + DAY) : d;
  return [[observed(at(year, 0, 1)), "New Year's Day"], [nth(0, 1, 3), 'Martin Luther King Jr. Day'], [nth(1, 1, 3), "Washington's Birthday"], [last(4, 1), 'Memorial Day'], [observed(at(year, 5, 19)), 'Juneteenth'],
    [observed(at(year, 6, 4)), 'Independence Day'], [nth(8, 1, 1), 'Labor Day'], [nth(9, 1, 2), 'Columbus Day'], [observed(at(year, 10, 11)), 'Veterans Day'], [nth(10, 4, 4), 'Thanksgiving'], [observed(at(year, 11, 25)), 'Christmas Day']];
}
const key = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export function deadline(said, { now = new Date() } = {}) {
  const t = String(said).trim().toLowerCase();
  const m = t.match(/(\d{1,3})\s+(?:calendar\s+)?days?\s+(?:from|after)\s+(.+)$/);
  if (!m) return null;
  const trigger = dateIn(m[2], now); if (!trigger) return null;
  const days = Number(m[1]);
  const raw = new Date(trigger.getFullYear(), trigger.getMonth(), trigger.getDate() + days);
  const holidays = new Map([...usHolidays(raw.getFullYear()), ...usHolidays(raw.getFullYear() + 1)].map(([d, n]) => [key(d), n]));
  let due = raw; const skipped = [];
  while (due.getDay() === 0 || due.getDay() === 6 || holidays.has(key(due))) { skipped.push(holidays.get(key(due)) ?? (due.getDay() === 6 ? 'Saturday' : 'Sunday')); due = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1); }
  return { trigger, days, raw, due, skipped };
}
const show = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function courtDeadline(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'deadline', label: 'Court deadline', symbol: 'building.columns', match: { pattern: PATTERN }, examples: ['deadline 21 days from oct 1'],
    async render(said) {
      const d = deadline(said);
      if (!d) return { summary: 'Court deadline', complete: 0, body: [line(meta('Type days and the trigger date: “deadline 21 days from oct 1”'))] };
      const summary = `Due ${show(d.due)} (${d.days} days from ${show(d.trigger)}${d.skipped.length ? `, moved past ${d.skipped.join(', ')}` : ''})`;
      return { summary, copy: show(d.due), complete: 1, body: [
        spread(stack('leading', line(hero(d.due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))), line(chip(String(d.due.getFullYear()), 'building.columns'))), stack('trailing', line(meta(`${d.days} days from ${d.trigger.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)), line(meta(d.skipped.length ? `day ${d.days} was a ${d.skipped[0]}: moved` : 'lands on a business day')))),
        line(meta('FRCP 6(a)(1): exclude the trigger day, count every day, roll past weekends and US federal holidays · state and local rules, service by mail and court closures differ · not legal advice'))] };
    }
  });
}
