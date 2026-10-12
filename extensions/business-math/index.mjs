// The sums a price, a plan or a pitch needs, as cards while they are typed,
// worked out on this Mac:
//
//   "margin cost 25 price 40", "price for 40% margin on 25", "markup 25 40"
//   "cagr 100 to 250 in 5 years", "growth 1.2m to 3.4m over 3 years"
//   "break even fixed 50k price 120 cost 45"

const num = s => { const m = String(s).toLowerCase().replace(/[$€£,\s]/g, '').match(/^(-?\d*\.?\d+)([kmb])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] ?? 1) : NaN; };
const N = '([$€£]?\\d[\\d,]*\\.?\\d*\\s*[kmb]?)';
export const MARGIN = `^(?:margin|markup)\\s+(?:cost\\s+)?${N}\\s+(?:price\\s+)?${N}$|^price\\s+for\\s+(\\d+(?:\\.\\d+)?)%\\s+margin\\s+on\\s+${N}$`;
export const CAGR = `^(?:cagr|growth|growth\\s+rate)\\s+${N}\\s+(?:to\\s+)?${N}\\s+(?:in|over)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?|y)$`;
export const BREAK = `^break[\\s-]?even\\s+(?:fixed\\s+)?${N}\\s+(?:price\\s+)?${N}\\s+(?:cost\\s+)?${N}$`;
const money = n => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}m` : `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const pct = n => `${(n * 100).toFixed(1)}%`;

export function margin(said) {
  const m = String(said).trim().toLowerCase().match(new RegExp(MARGIN, 'i'));
  if (!m) return null;
  if (m[3]) { const want = Number(m[3]) / 100, cost = num(m[4]); if (!(want < 1) || !Number.isFinite(cost)) return null; const price = cost / (1 - want); return { cost, price, margin: want, markup: (price - cost) / cost, profit: price - cost, solved: 'price' }; }
  const cost = num(m[1]), price = num(m[2]);
  if (!Number.isFinite(cost) || !Number.isFinite(price) || price <= 0 || cost <= 0) return null;
  return { cost, price, margin: (price - cost) / price, markup: (price - cost) / cost, profit: price - cost };
}
export function cagr(said) {
  const m = String(said).trim().toLowerCase().match(new RegExp(CAGR, 'i'));
  if (!m) return null;
  const from = num(m[1]), to = num(m[2]), years = Number(m[3]);
  if (!(from > 0) || !(to > 0) || !(years > 0)) return null;
  return { from, to, years, rate: (to / from) ** (1 / years) - 1, multiple: to / from };
}
export function breakEven(said) {
  const m = String(said).trim().toLowerCase().match(new RegExp(BREAK, 'i'));
  if (!m) return null;
  const fixed = num(m[1]), price = num(m[2]), cost = num(m[3]);
  if (!(price > cost)) return { error: 'the price has to be more than the cost of each one' };
  const units = Math.ceil(fixed / (price - cost));
  return { fixed, price, cost, units, revenue: units * price, contribution: price - cost };
}

export default function businessMath(jevie) {
  const { line, pair, stack, hero, chip, meta, icon, halves } = jevie.CardParts;
  jevie.registerCard({
    name: 'margin', label: 'Margin', symbol: 'percent', match: { pattern: MARGIN }, examples: ['margin cost 25 price 40', 'price for 40% margin on 25'],
    async render(said) {
      const r = margin(said);
      if (!r) return { summary: 'Margin', complete: 0, body: [line(meta('Type a cost and a price, like “margin cost 25 price 40”'))] };
      const summary = `cost ${money(r.cost)}, price ${money(r.price)}: margin ${pct(r.margin)}, markup ${pct(r.markup)}`;
      return { summary, copy: summary, complete: 1, body: [
        halves(stack('center', line(hero(pct(r.margin))), line(chip('margin'))), icon('arrow.left.arrow.right'), stack('center', line(hero(pct(r.markup), true)), line(chip('markup')))),
        line(meta(`${r.solved === 'price' ? `price ${money(r.price)} · ` : ''}profit ${money(r.profit)} each · margin is profit over price, markup over cost`))] };
    }
  });
  jevie.registerCard({
    name: 'cagr', label: 'Growth rate', symbol: 'chart.line.uptrend.xyaxis', match: { pattern: CAGR }, examples: ['cagr 100 to 250 in 5 years'],
    async render(said) {
      const r = cagr(said);
      if (!r) return { summary: 'Growth rate', complete: 0, body: [line(meta('Type a start, an end and years, like “cagr 100 to 250 in 5 years”'))] };
      const summary = `${r.from.toLocaleString('en-US')} → ${r.to.toLocaleString('en-US')} in ${r.years} years: ${pct(r.rate)} a year (CAGR)`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(pct(r.rate))), line(chip('a year, compounded'))), icon('chart.line.uptrend.xyaxis'), stack('trailing', line(hero(`${r.multiple.toFixed(2)}×`, true)), line(chip(`in ${r.years} years`)))),
        line(meta(`${r.from.toLocaleString('en-US')} → ${r.to.toLocaleString('en-US')} · doubling every ${r.rate > 0 ? (Math.log(2) / Math.log(1 + r.rate)).toFixed(1) : '∞'} years at this rate`))] };
    }
  });
  jevie.registerCard({
    name: 'break-even', label: 'Break-even', symbol: 'scalemass', match: { pattern: BREAK }, examples: ['break even fixed 50k price 120 cost 45'],
    async render(said) {
      const r = breakEven(said);
      if (!r || r.error) return { summary: 'Break-even', complete: 0, error: Boolean(r?.error), body: [line(meta(r?.error ?? 'Type fixed costs, a price and a cost each, like “break even fixed 50k price 120 cost 45”'))] };
      const summary = `break-even at ${r.units.toLocaleString('en-US')} units (${money(r.revenue)} revenue)`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(r.units.toLocaleString('en-US'))), line(chip('units to break even'))), icon('equal'), stack('trailing', line(hero(money(r.revenue), true)), line(chip('revenue')))),
        line(meta(`${money(r.fixed)} fixed ÷ ${money(r.contribution)} left from each sale (${money(r.price)} − ${money(r.cost)})`))] };
    }
  });
}
