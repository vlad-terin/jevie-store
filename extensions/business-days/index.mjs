// Working days, as a card while it is typed, worked out on this Mac:
// weekends left out, and US federal holidays too unless the setting says
// none (a deadline "in 10 business days" for a contract, a sprint, a
// shipment).
//
//   "10 business days from today", "15 working days from mar 3",
//   "workdays until dec 15", "business days between oct 1 and nov 15"

export const PATTERN = '^(?:\\d{1,3}\\s+(?:business|working|work)\\s+days?\\s+(?:from|after|before)\\s+.+|(?:business|working|work)\\s*days\\s+(?:until|till|to|between)\\s+.+)$';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY = 864e5;
const at = (y, m, d) => new Date(y, m, d);

/// "today", "tomorrow", "dec 15", "december 15 2026", "2026-12-15", "15 dec", "3/15".
export function dateIn(text, now = new Date(), { future = true } = {}) {
  const t = String(text).trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, '');
  const today = at(now.getFullYear(), now.getMonth(), now.getDate());
  if (t === 'today' || t === 'now') return today;
  if (t === 'tomorrow') return new Date(today.getTime() + DAY);
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return at(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  // A month and day already past is next year's ("until dec 15"), except
  // in a span, where both ends are read as this year's.
  const ahead = d => future && d < today ? at(d.getFullYear() + 1, d.getMonth(), d.getDate()) : d;
  if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null; const d = at(y ?? today.getFullYear(), +m[1] - 1, +m[2]); return y ? d : ahead(d); }
  m = t.match(/^([a-z]{3})[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?$/) ?? t.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*(?:\s+(\d{4}))?$/);
  if (m) {
    const [mon, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    const i = MONTHS.indexOf(mon);
    if (i < 0) return null;
    const d = at(m[3] ? +m[3] : today.getFullYear(), i, +day);
    return m[3] ? d : ahead(d);
  }
  return null;
}

/// US federal holidays of a year, observed (Saturday's on Friday, Sunday's on Monday).
export function usHolidays(year) {
  const nth = (month, weekday, n) => { const first = at(year, month, 1); const d = 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7; return at(year, month, d); };
  const last = (month, weekday) => { const end = at(year, month + 1, 0); return at(year, month, end.getDate() - ((end.getDay() - weekday + 7) % 7)); };
  const observed = d => d.getDay() === 6 ? new Date(d.getTime() - DAY) : d.getDay() === 0 ? new Date(d.getTime() + DAY) : d;
  return [observed(at(year, 0, 1)), nth(0, 1, 3), nth(1, 1, 3), last(4, 1), observed(at(year, 5, 19)), observed(at(year, 6, 4)), nth(8, 1, 1), nth(9, 1, 2), observed(at(year, 10, 11)), nth(10, 4, 4), observed(at(year, 11, 25))];
}

export function counter(holidays) {
  const off = new Set();
  const key = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const isOff = d => { if (holidays) for (const y of [d.getFullYear()]) if (!off.has(`y${y}`)) { off.add(`y${y}`); usHolidays(y).forEach(h => off.add(key(h))); } return d.getDay() === 0 || d.getDay() === 6 || (holidays && off.has(key(d))); };
  return {
    isOff,
    /// n working days after (or before, n < 0) a date.
    add(from, n) { let d = new Date(from), left = Math.abs(n), step = n < 0 ? -1 : 1, skipped = 0; while (left > 0) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step); if (isOff(d)) skipped++; else left--; } return { date: d, skipped }; },
    /// Working days after `a` up to and including `b`.
    between(a, b) { let n = 0, d = new Date(a); const step = b >= a ? 1 : -1; while ((step > 0 ? d < b : d > b)) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step); if (!isOff(d)) n++; } return n * step; }
  };
}

const show = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export function answer(said, { holidays = true, now = new Date() } = {}) {
  const t = String(said).trim().toLowerCase().replace(/[?.!]+$/, '');
  const c = counter(holidays);
  let m = t.match(/^(\d{1,3})\s+(?:business|working|work)\s+days?\s+(from|after|before)\s+(.+)$/);
  if (m) {
    const from = dateIn(m[3], now);
    if (!from) return null;
    const n = Number(m[1]) * (m[2] === 'before' ? -1 : 1);
    const { date, skipped } = c.add(from, n);
    return { kind: 'add', n, from, date, skipped, calendar: Math.round(Math.abs(date - from) / DAY) };
  }
  m = t.match(/^(?:business|working|work)\s*days\s+(?:until|till|to)\s+(.+)$/) ?? null;
  if (m) { const to = dateIn(m[1], now); if (!to) return null; const from = dateIn('today', now); return { kind: 'count', from, to, n: c.between(from, to), calendar: Math.round((to - from) / DAY) }; }
  m = t.match(/^(?:business|working|work)\s*days\s+between\s+(.+?)\s+(?:and|to|-)\s+(.+)$/);
  if (m) { const from = dateIn(m[1], now, { future: false }), to = dateIn(m[2], now, { future: false }); if (!from || !to) return null; return { kind: 'count', from, to, n: c.between(from, to), calendar: Math.round((to - from) / DAY) }; }
  return null;
}

export function cardOf(a, holidays, P) {
  const { line, pair, stack, hero, chip, meta, icon } = P;
  const rule = holidays ? 'weekends and US federal holidays left out' : 'weekends left out';
  if (a.kind === 'add') {
    const summary = `${Math.abs(a.n)} business days ${a.n < 0 ? 'before' : 'from'} ${show(a.from)}: ${show(a.date)}`;
    return { summary, copy: show(a.date), complete: 1, body: [
      pair(stack('leading', line(hero(String(Math.abs(a.n)), true)), line(chip('business days', 'calendar.badge.clock'))), icon(a.n < 0 ? 'arrow.left' : 'arrow.right'),
        stack('trailing', line(hero(a.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))), line(chip(String(a.date.getFullYear()))))),
      line(meta(`from ${show(a.from)} · ${a.calendar} calendar days · ${a.skipped} skipped · ${rule}`))
    ] };
  }
  const summary = `${a.n} business days ${a.kind === 'count' ? `from ${show(a.from)} to ${show(a.to)}` : ''}`.trim();
  return { summary, copy: String(a.n), complete: 1, body: [
    pair(stack('leading', line(hero(String(a.n))), line(chip('business days', 'calendar.badge.clock'))), icon('equal'), stack('trailing', line(hero(String(a.calendar), true)), line(chip('calendar days')))),
    line(meta(`${show(a.from)} → ${show(a.to)} · ${rule}`))
  ] };
}

export default function businessDays(jevie, context) {
  const P = jevie.CardParts;
  const holidays = (context.preferences?.holidays ?? 'US') !== 'none';
  jevie.registerCard({
    name: 'business-days', label: 'Business days', symbol: 'calendar.badge.clock', match: { pattern: PATTERN }, examples: ['10 business days from today', 'workdays until dec 15'],
    async render(said) {
      const a = answer(said, { holidays });
      return a ? cardOf(a, holidays, P) : { summary: 'Business days', complete: 0, body: [P.line(P.text('Type a date it understands: today, dec 15, 2026-12-15, 12/15', true))] };
    }
  });
}
