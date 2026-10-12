// A seller's numbers, as cards while they are typed, worked out on this Mac:
//
//   "commission 85000 at 8%"                           a flat rate
//   "commission 620k at 10% quota 500k accelerator 1.5x"  the rate rises past quota
//   "quota 420k of 500k", "quota 420k of 500k 23 days left"   attainment, the gap, a day's pace

const N = '\\$?[\\d,.]+\\s*[km]?';
export const COMMISSION = `^commission\\s+(?:on\\s+)?${N}\\s+at\\s+[\\d.]+\\s*%(?:\\s+quota\\s+${N}(?:\\s+accelerator\\s+[\\d.]+\\s*x)?)?$`;
export const QUOTA = `^quota\\s+${N}\\s+(?:of|out\\s+of|/)\\s+${N}(?:\\s+\\d+\\s+(?:days?|weeks?)\\s+left)?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export function commission(said) {
  const t = String(said).toLowerCase();
  const sales = num(t.match(new RegExp(`commission\\s+(?:on\\s+)?(${N})`))?.[1]), rate = Number(t.match(/at\s+([\d.]+)\s*%/)?.[1]) / 100;
  const quota = t.match(new RegExp(`quota\\s+(${N})`)) ? num(t.match(new RegExp(`quota\\s+(${N})`))[1]) : null;
  const acc = Number(t.match(/accelerator\s+([\d.]+)\s*x/)?.[1] ?? 1);
  if (!(sales >= 0 && rate >= 0)) return null;
  if (!quota || sales <= quota) return { sales, rate, quota, acc, pay: sales * rate, base: sales * rate, above: 0 };
  const base = quota * rate, above = (sales - quota) * rate * acc;
  return { sales, rate, quota, acc, base, above, pay: base + above };
}
export function quota(said) {
  const t = String(said).toLowerCase();
  const m = t.match(new RegExp(`quota\\s+(${N})\\s+(?:of|out\\s+of|/)\\s+(${N})`));
  if (!m) return null;
  const done = num(m[1]), target = num(m[2]);
  const left = t.match(/(\d+)\s+(days?|weeks?)\s+left/);
  const days = left ? Number(left[1]) * (/^week/.test(left[2]) ? 5 : 1) : null;
  return { done, target, pct: done / target, gap: Math.max(0, target - done), days, perDay: days ? Math.max(0, target - done) / days : null };
}

export default function salesMath(jevie) {
  const { line, spread, pair, stack, hero, chip, meta, icon, bar } = jevie.CardParts;
  jevie.registerCard({
    name: 'commission', label: 'Commission', symbol: 'chart.bar.doc.horizontal', match: { pattern: COMMISSION }, examples: ['commission 85000 at 8%'],
    async render(said) {
      const c = commission(said);
      if (!c) return { summary: 'Commission', complete: 0, body: [line(meta('Type sales and a rate: “commission 85000 at 8%”'))] };
      const summary = `${money(c.pay)} commission on ${money(c.sales)}${c.above ? ` (${money(c.above)} of it past quota at ${c.acc}×)` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(c.sales), true)), line(chip('sales'))), icon('arrow.right'), stack('trailing', line(hero(money(c.pay))), line(chip(`${(c.pay / c.sales * 100 || 0).toFixed(1)}% effective`)))),
        line(meta(c.quota ? `${money(c.base)} up to quota ${money(c.quota)}${c.above ? ` + ${money(c.above)} past it at ${(c.rate * c.acc * 100).toFixed(1)}%` : ` · ${money(c.quota - c.sales)} to quota`}` : `${(c.rate * 100).toFixed(1)}% flat`))] };
    }
  });
  jevie.registerCard({
    name: 'quota', label: 'Quota', symbol: 'target', match: { pattern: QUOTA }, examples: ['quota 420k of 500k'],
    async render(said) {
      const q = quota(said);
      if (!q || !(q.target > 0)) return { summary: 'Quota', complete: 0, body: [line(meta('Type what is closed and the quota: “quota 420k of 500k”'))] };
      const summary = `${(q.pct * 100).toFixed(1)}% of quota · ${money(q.gap)} to go${q.perDay !== null ? ` · ${money(q.perDay)} a working day` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${(q.pct * 100).toFixed(1)}%`)), line(chip(q.pct >= 1 ? 'quota hit' : 'of quota', q.pct >= 1 ? 'checkmark.seal' : 'target'))), stack('trailing', line(hero(money(q.gap), q.gap === 0)), line(chip('to go')))),
        bar(Math.min(q.pct, 1)),
        line(meta(`${money(q.done)} of ${money(q.target)}${q.perDay !== null ? ` · ${money(q.perDay)} a working day for ${q.days} days` : ''}`))] };
    }
  });
}
