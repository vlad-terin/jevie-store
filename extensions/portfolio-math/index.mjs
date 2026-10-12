// A portfolio's numbers, as cards while they are typed, worked out on this Mac:
//
//   "sharpe 12% return 15% vol 4%"          (return − risk-free) ÷ volatility; risk-free 4% unless named
//   "expected return 60% at 8% 40% at 3%"   weights at their expected returns
//   "real return 7% inflation 3%"           Fisher: (1 + r) ÷ (1 + i) − 1

export const SHARPE = '^sharpe(?:\\s+ratio)?\\s+[\\d.]+\\s*%\\s*(?:return)?\\s+[\\d.]+\\s*%\\s*(?:vol|volatility|sd|std)(?:\\s+[\\d.]+\\s*%(?:\\s*(?:risk[\\s-]*free|rf))?)?$';
export const EXPECTED = '^expected\\s+return\\s+(?:[\\d.]+\\s*%\\s+(?:at\\s+)?[\\d.]+\\s*%\\s*)+$';
export const REAL = '^real\\s+return\\s+[\\d.]+\\s*%\\s+(?:inflation\\s+)?[\\d.]+\\s*%(?:\\s+inflation)?$';
const pcts = t => [...String(t).matchAll(/([\d.]+)\s*%/g)].map(m => Number(m[1]) / 100);

export function sharpe(said) { const [r, v, rf = 0.04] = pcts(said); return r !== undefined && v > 0 ? { r, v, rf, ratio: (r - rf) / v } : null; }
export function expected(said) {
  const p = pcts(said);
  if (p.length < 2 || p.length % 2) return null;
  const pairs = []; for (let i = 0; i < p.length; i += 2) pairs.push({ weight: p[i], ret: p[i + 1] });
  const total = pairs.reduce((a, b) => a + b.weight, 0);
  return { pairs, total, ret: pairs.reduce((a, b) => a + b.weight * b.ret, 0) / (total || 1) };
}
export function real(said) { const [r, i] = pcts(said); return r !== undefined && i !== undefined ? { r, i, real: (1 + r) / (1 + i) - 1 } : null; }
const pct = x => `${(x * 100).toFixed(2)}%`;

export default function portfolioMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const ask = t => ({ summary: 'Portfolio', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'sharpe', label: 'Sharpe ratio', symbol: 'chart.pie.fill', match: { pattern: SHARPE }, examples: ['sharpe 12% return 15% vol 4%'],
    async render(said) {
      const s = sharpe(said);
      if (!s) return ask('Type a return and a volatility: “sharpe 12% return 15% vol 4%”');
      const summary = `Sharpe ${s.ratio.toFixed(2)} (${pct(s.r)} return, ${pct(s.v)} volatility, ${pct(s.rf)} risk-free)`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(s.ratio.toFixed(2))), line(chip(s.ratio >= 1 ? 'good' : s.ratio >= 0.5 ? 'fair' : 'poor', 'chart.pie.fill'))), stack('trailing', line(meta(`(${pct(s.r)} − ${pct(s.rf)})`)), line(meta(`÷ ${pct(s.v)}`)))), line(meta('return earned over the risk-free rate, per unit of volatility · above 1 is usually good'))] };
    }
  });
  jevie.registerCard({
    name: 'expected-return', label: 'Expected return', symbol: 'percent', match: { pattern: EXPECTED }, examples: ['expected return 60% at 8% 40% at 3%'],
    async render(said) {
      const e = expected(said);
      if (!e) return ask('Type weights at returns: “expected return 60% at 8% 40% at 3%”');
      const summary = `Expected return ${pct(e.ret)} (${e.pairs.map(p => `${Math.round(p.weight * 100)}% at ${pct(p.ret)}`).join(', ')})`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(pct(e.ret))), line(chip('expected return', 'percent'))), stack('trailing', line(meta(`${e.pairs.length} holdings`)), line(meta(Math.abs(e.total - 1) > 0.001 ? `weights add to ${Math.round(e.total * 100)}%, scaled to 100` : 'weights add to 100%')))), line(meta(e.pairs.map(p => `${Math.round(p.weight * 100)}% × ${pct(p.ret)}`).join(' + ')))] };
    }
  });
  jevie.registerCard({
    name: 'real-return', label: 'Real return', symbol: 'arrow.down.forward', match: { pattern: REAL }, examples: ['real return 7% inflation 3%'],
    async render(said) {
      const r = real(said);
      if (!r) return ask('Type a return and inflation: “real return 7% inflation 3%”');
      const summary = `Real return ${pct(r.real)} (${pct(r.r)} with ${pct(r.i)} inflation)`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(pct(r.real))), line(chip('after inflation', 'arrow.down.forward'))), stack('trailing', line(meta(`${pct(r.r)} nominal`)), line(meta(`${pct(r.i)} inflation`)))), line(meta('(1 + return) ÷ (1 + inflation) − 1, the Fisher equation'))] };
    }
  });
}
