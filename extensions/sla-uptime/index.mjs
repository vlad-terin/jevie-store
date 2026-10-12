// Nines, as a card while they are typed, worked out on this Mac:
//
//   "99.9% uptime", "sla 99.95%", "four nines"     the downtime allowed a year, month, week and day
//   "downtime 43 minutes this month"               the uptime that leaves, and which nines it keeps

export const NINES = '^(?:(?:sla|uptime)\\s+)?\\d{2}(?:\\.\\d{1,4})?\\s*%(?:\\s+(?:uptime|availability|sla))?$|^(?:two|three|four|five|six)\\s+nines$';
export const DOWN = '^(?:downtime|outage|down)\\s+[\\d.]+\\s*(?:minutes?|mins?|m|hours?|hrs?|h|seconds?|secs?|s)\\s+(?:this\\s+|a\\s+|per\\s+)?(?:month|year|week|day)$';
const WORDS = { two: 99, three: 99.9, four: 99.99, five: 99.999, six: 99.9999 };
const SPAN = { year: 365.25 * 864e5, month: 365.25 / 12 * 864e5, week: 7 * 864e5, day: 864e5 };
export const allowed = pct => Object.fromEntries(Object.entries(SPAN).map(([k, ms]) => [k, ms * (1 - pct / 100)]));
export function said(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
  return `${Math.floor(s / 86400)} d ${Math.round((s % 86400) / 3600)} h`;
}

export default function slaUptime(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'nines', label: 'Uptime', symbol: 'server.rack', match: { pattern: NINES }, examples: ['99.9% uptime'],
    async render(text) {
      const t = text.trim().toLowerCase();
      const pct = WORDS[t.match(/^(\w+)\s+nines$/)?.[1]] ?? Number(t.match(/(\d{2}(?:\.\d+)?)/)?.[1]);
      if (!(pct > 0 && pct < 100)) return { summary: 'Uptime', complete: 0, body: [line(meta('Type a percentage, like “99.9% uptime”'))] };
      const a = allowed(pct);
      const summary = `${pct}% allows ${said(a.year)} a year, ${said(a.month)} a month, ${said(a.week)} a week, ${said(a.day)} a day`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(said(a.month))), line(chip('down a month', 'server.rack'))), stack('trailing', line(hero(said(a.year), true)), line(chip('a year')))), line(meta(`${pct}% · a week ${said(a.week)} · a day ${said(a.day)}`))] };
    }
  });
  jevie.registerCard({
    name: 'downtime', label: 'Downtime', symbol: 'exclamationmark.icloud', match: { pattern: DOWN }, examples: ['downtime 43 minutes this month'],
    async render(text) {
      const t = text.trim().toLowerCase();
      const m = t.match(/([\d.]+)\s*(minutes?|mins?|m|hours?|hrs?|h|seconds?|secs?|s)\s+(?:this\s+|a\s+|per\s+)?(month|year|week|day)/);
      const ms = Number(m[1]) * (/^h/.test(m[2]) ? 3600e3 : /^s/.test(m[2]) ? 1e3 : 60e3);
      const up = Math.max(0, 100 - ms / SPAN[m[3]] * 100);
      const kept = [99.999, 99.99, 99.95, 99.9, 99.5, 99].find(n => up >= n);
      const summary = `${said(ms)} down in a ${m[3]} is ${up.toFixed(4)}% uptime${kept ? `, within ${kept}%` : ', below 99%'}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${up.toFixed(3)}%`)), line(chip(`uptime this ${m[3]}`, 'exclamationmark.icloud'))), stack('trailing', line(hero(kept ? `${kept}%` : '< 99%', true)), line(chip('SLA it keeps')))), line(meta(`${said(ms)} of a ${m[3]}`))] };
    }
  });
}
