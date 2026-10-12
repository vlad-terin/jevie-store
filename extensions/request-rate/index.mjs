// A request rate, as a card while it is typed, worked out on this Mac:
// the count over the seconds in the period (a month as 30 days), and the
// peak at 3× the average unless another factor is named.
//
//   "rps 1m a day", "qps 50m a month", "requests per second 2.5b a month peak 5x", "1m requests a day per second"

const N = '[\\d.,]+\\s*[kmb]?';
const PERIOD = '(?:a|per|/)\\s*(?:second|minute|min|hour|hr|day|week|month|year)';
export const PATTERN = `^(?:(?:rps|qps|requests\\s+(?:per|a)\\s+second)\\s+${N}(?:\\s+(?:requests|reqs|calls|events|messages))?\\s+${PERIOD}|${N}\\s+(?:requests|reqs|calls|events|messages)\\s+${PERIOD}\\s+(?:per|a|in)\\s+(?:second|sec))(?:\\s+peak\\s+[\\d.]+\\s*x)?$`;
const SECONDS = { second: 1, minute: 60, min: 60, hour: 3600, hr: 3600, day: 86400, week: 604800, month: 2592000, year: 31536000 };
const num = s => { const m = String(s).replace(/[,\s]/g, '').toLowerCase().match(/^([\d.]+)([kmb])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] ?? 1) : NaN; };
export function rate(said) {
  const t = String(said).toLowerCase();
  // The period is the one after the count: "requests per second 50m a month" is a month.
  const m = t.match(new RegExp(`(${N})(?:\\s+(?:requests|reqs|calls|events|messages))?\\s+(?:a|per|/)\\s*(second|minute|min|hour|hr|day|week|month|year)`));
  const count = num(m[1]), period = m[2];
  const peak = Number(t.match(/peak\s+([\d.]+)\s*x/)?.[1] ?? 3);
  const rps = count / SECONDS[period];
  return Number.isFinite(rps) && rps > 0 ? { count, period, rps, peak, peakRps: rps * peak, perDay: rps * 86400 } : null;
}
const f = x => x >= 100 ? Math.round(x).toLocaleString('en-US') : Number(x.toPrecision(3)).toLocaleString('en-US');

export default function requestRate(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'request-rate', label: 'Request rate', symbol: 'speedometer', match: { pattern: PATTERN }, examples: ['rps 1m a day'],
    async render(said) {
      const r = rate(said);
      if (!r) return { summary: 'Request rate', complete: 0, body: [line(meta('Type a count and a period: “rps 1m a day”'))] };
      return { summary: `${f(r.rps)} requests a second on average, ${f(r.peakRps)} at a ${r.peak}× peak`, copy: f(r.rps), complete: 1, body: [spread(stack('leading', line(hero(`${f(r.rps)} rps`)), line(chip('average', 'speedometer'))), stack('trailing', line(hero(`${f(r.peakRps)} rps`, true)), line(chip(`peak at ${r.peak}×`)))), line(meta(`${f(r.count)} a ${r.period} · ${f(r.rps * 60)} a minute · ${f(r.perDay)} a day · traffic is rarely flat: size for the peak`))] };
    }
  });
}
