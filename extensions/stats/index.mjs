// A list of numbers, as a card while it is typed, worked out on this Mac:
// count, sum, mean, median, the sample standard deviation, quartiles (the
// linear method spreadsheets use), min and max, and outliers past 1.5 IQR.
// "stats clipboard" reads a pasted column.
//
//   "stats 3 5 7 9 11 40", "stats 1.2, 3.4, 5.6", "stats clipboard"

import { execFile } from 'node:child_process';

export const PATTERN = '^(?:stats|statistics|describe)\\s+(?:clipboard|(?:-?[\\d.]+[\\s,;]+)+-?[\\d.]+)$';
export function describe(values) {
  const v = [...values].sort((a, b) => a - b), n = v.length;
  if (!n) return null;
  const q = p => { const i = (n - 1) * p, lo = Math.floor(i); return v[lo] + (v[Math.min(n - 1, lo + 1)] - v[lo]) * (i - lo); };
  const sum = v.reduce((a, b) => a + b, 0), mean = sum / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
  return { n, sum, mean, median: q(0.5), sd, min: v[0], max: v[n - 1], q1, q3, outliers: v.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr) };
}
const f = x => Number.isInteger(x) ? x.toLocaleString('en-US') : x.toLocaleString('en-US', { maximumFractionDigits: 3 });

export default function stats(jevie) {
  const { line, halves, stack, hero, chip, meta } = jevie.CardParts;
  const clipboard = () => new Promise(done => execFile('pbpaste', [], { timeout: 2000, maxBuffer: 4 * 1024 * 1024 }, (e, out) => done(e ? '' : String(out))));
  jevie.registerCard({
    name: 'stats', label: 'Stats', symbol: 'sum', match: { pattern: PATTERN }, examples: ['stats 3 5 7 9 11 40'],
    async render(said) {
      let text = said.trim().replace(/^(?:stats|statistics|describe)\s+/i, '');
      const fromClipboard = /^clipboard$/i.test(text);
      if (fromClipboard) text = await clipboard();
      const values = (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const d = describe(values);
      if (!d) return { summary: 'Stats', complete: 0, body: [line(meta(fromClipboard ? 'No numbers on the clipboard' : 'Type numbers after it'))] };
      const summary = `n ${d.n} · mean ${f(d.mean)} · median ${f(d.median)} · sd ${f(d.sd)} · ${f(d.min)}–${f(d.max)}`;
      return { summary, copy: summary, complete: 1, body: [
        halves(stack('center', line(hero(f(d.mean))), line(chip('mean'))), stack('center', line(hero(f(d.median))), line(chip('median'))), stack('center', line(hero(f(d.sd), true)), line(chip('std dev')))),
        line(meta(`n ${d.n} · sum ${f(d.sum)} · min ${f(d.min)} · Q1 ${f(d.q1)} · Q3 ${f(d.q3)} · max ${f(d.max)}`)),
        ...(d.outliers.length ? [line(meta(`outliers past 1.5 IQR: ${d.outliers.slice(0, 6).map(f).join(', ')}`))] : []),
        ...(fromClipboard ? [line(meta('from the clipboard'))] : [])] };
    }
  });
}
