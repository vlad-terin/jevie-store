// Change between two numbers, as a card while it is typed, worked out on
// this Mac. Two percentages also give the change in percentage points,
// which is what people usually mean by "rates went up".
//
//   "percent change 120 to 150", "% change 80 to 60", "change 4.5% to 5.25%", "increase from 1.2m to 1.5m"

const N = '-?\\$?[\\d,.]+\\s*[kmb]?%?';
export const PATTERN = `^(?:percent(?:age)?\\s+change|%\\s*change|change|increase|decrease|growth)\\s+(?:from\\s+)?${N}\\s+(?:to|→|->)\\s+${N}$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^(-?[\d.]+)([kmb])?%?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] ?? 1) : NaN; };
export function change(said) {
  const m = String(said).toLowerCase().match(new RegExp(`(${N})\\s+(?:to|→|->)\\s+(${N})$`));
  if (!m) return null;
  const a = num(m[1]), b = num(m[2]), pct = /%/.test(m[1]) && /%/.test(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b, diff: b - a, rel: a ? (b - a) / Math.abs(a) : null, pct };
}
const f = x => Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(2)}m` : Number(x.toFixed(4)).toLocaleString('en-US');

export default function percentChange(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'percent-change', label: 'Percent change', symbol: 'percent', match: { pattern: PATTERN }, examples: ['percent change 120 to 150'],
    async render(said) {
      const c = change(said);
      if (!c) return { summary: 'Percent change', complete: 0, body: [line(meta('Type two numbers: “percent change 120 to 150”'))] };
      const rel = c.rel === null ? '—' : `${c.rel >= 0 ? '+' : '−'}${Math.abs(c.rel * 100).toFixed(2)}%`;
      const summary = c.pct ? `${c.a}% → ${c.b}%: ${c.diff >= 0 ? '+' : '−'}${Math.abs(c.diff).toFixed(2)} percentage points (${rel} relative)` : `${f(c.a)} → ${f(c.b)}: ${rel} (${c.diff >= 0 ? '+' : '−'}${f(Math.abs(c.diff))})`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(c.pct ? `${c.diff >= 0 ? '+' : '−'}${Math.abs(c.diff).toFixed(2)} pp` : rel)), line(chip(c.pct ? 'percentage points' : c.diff >= 0 ? 'increase' : 'decrease', c.diff >= 0 ? 'arrow.up.right' : 'arrow.down.right'))), icon('equal'), stack('trailing', line(hero(c.pct ? rel : `${c.diff >= 0 ? '+' : '−'}${f(Math.abs(c.diff))}`, true)), line(chip(c.pct ? 'relative change' : 'difference')))),
        line(meta(`(${f(c.b)} − ${f(c.a)}) ÷ |${f(c.a)}|${c.pct ? ' · between two rates, “points” is the plain difference' : ''}`))] };
    }
  });
}
