// An age from a date, as a card while it is typed, worked out on this Mac:
//
//   "age born 1990-05-04", "age 4/5/1990", "how old born may 4 1990"   years, months, days, next birthday
//   "baby age born mar 3 2026", "age born 2026-08-01"                  weeks and days too, under two

export const PATTERN = '^(?:baby\\s+)?(?:age|how\\s+old)\\s+(?:am\\s+i\\s+|is\\s+someone\\s+)?(?:born\\s+(?:on\\s+)?)?(?:\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}/\\d{1,2}/\\d{4}|[a-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\s+[a-z]{3,9}\\s+\\d{4})$';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function born(text) {
  const t = String(text).toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, '');
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  m = t.match(/([a-z]{3})[a-z]*\s+(\d{1,2})\s+(\d{4})$/); if (m && MONTHS.includes(m[1])) return new Date(+m[3], MONTHS.indexOf(m[1]), +m[2]);
  m = t.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})$/); if (m && MONTHS.includes(m[2])) return new Date(+m[3], MONTHS.indexOf(m[2]), +m[1]);
  return null;
}
export function age(said, now = new Date()) {
  const b = born(said); if (!b || b > now) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let y = today.getFullYear() - b.getFullYear(), mo = today.getMonth() - b.getMonth(), d = today.getDate() - b.getDate();
  if (d < 0) { mo -= 1; d += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (mo < 0) { y -= 1; mo += 12; }
  const days = Math.round((today - b) / 864e5);
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate()); if (next < today) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  return { b, y, mo, d, days, weeks: Math.floor(days / 7), weekDays: days % 7, untilNext: Math.round((next - today) / 864e5), turning: next.getFullYear() - b.getFullYear() };
}

export default function ageCalc(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'age', label: 'Age', symbol: 'birthday.cake.fill', match: { pattern: PATTERN }, examples: ['age born 1990-05-04'],
    async render(said) {
      const a = age(said);
      if (!a) return { summary: 'Age', complete: 0, body: [line(meta('Type a birth date in the past: “age born 1990-05-04”'))] };
      const baby = a.y < 2;
      const words = baby ? `${a.weeks} weeks${a.weekDays ? ` ${a.weekDays} days` : ''} (${a.y * 12 + a.mo} months ${a.d} days)` : `${a.y} years, ${a.mo} months, ${a.d} days`;
      const summary = `${words} · ${a.untilNext === 0 ? `${a.turning} today` : `turns ${a.turning} in ${a.untilNext} days`}`;
      return { summary, copy: words, complete: 1, body: [spread(stack('leading', line(hero(baby ? `${a.weeks} wk` : `${a.y}`)), line(chip(baby ? `${a.y * 12 + a.mo} months` : 'years old', 'birthday.cake.fill'))), stack('trailing', line(meta(words)), line(meta(a.untilNext === 0 ? `🎂 ${a.turning} today` : `turns ${a.turning} in ${a.untilNext} days`)))), line(meta(`born ${a.b.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${a.days.toLocaleString('en-US')} days`))] };
    }
  });
}
