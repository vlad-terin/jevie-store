// A PERT estimate, as a card while it is typed, worked out on this Mac:
// expected = (optimistic + 4 × likely + pessimistic) ÷ 6, spread
// (pessimistic − optimistic) ÷ 6, and the range at about 95%.
//
//   "pert 2 4 10", "pert 3 5 12 days", "three point estimate 1 2 6 weeks"

export const PATTERN = '^(?:pert|three[\\s-]point\\s+estimate)\\s+[\\d.]+\\s+[\\d.]+\\s+[\\d.]+(?:\\s+(?:hours?|h|days?|d|weeks?|w|sprints?|points?))?$';
export function pert(said) {
  const [o, m, p] = (String(said).match(/[\d.]+/g) ?? []).map(Number);
  if (![o, m, p].every(Number.isFinite) || !(o <= m && m <= p)) return null;
  const e = (o + 4 * m + p) / 6, sd = (p - o) / 6;
  return { o, m, p, e, sd, low: Math.max(o, e - 2 * sd), high: Math.min(p, e + 2 * sd), unit: String(said).toLowerCase().match(/(hours?|h|days?|d|weeks?|w|sprints?|points?)$/)?.[1] ?? '' };
}
const n = x => Number(x.toFixed(1));

export default function pertEstimate(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pert', label: 'PERT estimate', symbol: 'chart.bar.xaxis', match: { pattern: PATTERN }, examples: ['pert 2 4 10'],
    async render(said) {
      const r = pert(said);
      if (!r) return { summary: 'PERT estimate', complete: 0, body: [line(meta('Type optimistic, likely and pessimistic, in that order: “pert 2 4 10 days”'))] };
      const u = r.unit ? ` ${r.unit.replace(/^(h|d|w)$/, x => ({ h: 'hours', d: 'days', w: 'weeks' })[x])}` : '';
      const summary = `Expect ${n(r.e)}${u} (± ${n(r.sd)}); about 95% within ${n(r.low)}–${n(r.high)}${u}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${n(r.e)}${u}`)), line(chip('expected', 'chart.bar.xaxis'))), stack('trailing', line(hero(`${n(r.low)}–${n(r.high)}`, true)), line(chip('≈ 95% range')))), line(meta(`(${r.o} + 4 × ${r.m} + ${r.p}) ÷ 6 · spread (${r.p} − ${r.o}) ÷ 6 = ${n(r.sd)} · promise the top of the range, not the middle`))] };
    }
  });
}
