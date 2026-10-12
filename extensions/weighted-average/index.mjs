// A weighted average, as a card while it is typed, worked out on this Mac:
// Σ value × weight ÷ Σ weight, the weights as given (percentages need not
// add to 100).
//
//   "weighted average 90 30% 80 70%", "weighted average 88 at 20% 92 at 30% 75 at 50%", "weighted average 4.5 x 120 3.9 x 40"

const PAIR = '-?[\\d.]+\\s*(?:at|x|×|\\*|@|weight)?\\s*[\\d.]+\\s*%?';
export const PATTERN = `^weighted\\s+(?:average|mean|avg)\\s+(?:of\\s+)?${PAIR}(?:[\\s,;]+${PAIR})+$`;
export function weighted(said) {
  const t = String(said).toLowerCase().replace(/^weighted\s+(?:average|mean|avg)\s+(?:of\s+)?/, '');
  const pairs = [...t.matchAll(/(-?[\d.]+)\s*(?:at|x|×|\*|@|weight)?\s*([\d.]+)\s*(%?)/g)].map(m => ({ v: Number(m[1]), w: Number(m[2]), pct: Boolean(m[3]) }));
  const sum = pairs.reduce((a, p) => a + p.w, 0);
  if (pairs.length < 2 || !(sum > 0)) return null;
  return { pairs, sum, avg: pairs.reduce((a, p) => a + p.v * p.w, 0) / sum, plain: pairs.reduce((a, p) => a + p.v, 0) / pairs.length, pct: pairs.every(p => p.pct) };
}

export default function weightedAverage(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'weighted-average', label: 'Weighted average', symbol: 'scalemass', match: { pattern: PATTERN }, examples: ['weighted average 90 30% 80 70%'],
    async render(said) {
      const w = weighted(said);
      if (!w) return { summary: 'Weighted average', complete: 0, body: [line(meta('Type values and weights: “weighted average 90 30% 80 70%”'))] };
      const n = x => Number(x.toFixed(3));
      return { summary: `Weighted average ${n(w.avg)} (plain average ${n(w.plain)})`, copy: String(n(w.avg)), complete: 1, body: [spread(stack('leading', line(hero(String(n(w.avg)))), line(chip('weighted', 'scalemass'))), stack('trailing', line(hero(String(n(w.plain)), true)), line(chip('unweighted')))), line(meta(`${w.pairs.map(p => `${p.v} × ${p.w}${p.pct ? '%' : ''}`).join(' + ')} ÷ ${n(w.sum)}${w.pct && Math.abs(w.sum - 100) > 1e-9 ? ` · the weights add to ${n(w.sum)}%, not 100%` : ''}`))] };
    }
  });
}
