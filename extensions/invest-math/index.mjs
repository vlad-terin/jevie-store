// Investing sums, as cards while they are typed, worked out on this Mac:
//
//   "rule of 72 8%", "doubling time 6.5%"                    72 ÷ rate, and ln 2 ÷ ln(1 + rate)
//   "dividend yield 2.40 price 80", "dividend 0.60 quarterly price 80"   a year's dividend over the price
//   "tax equivalent yield 3% 32%", "tax equivalent yield 3% 32% state 5%"   a tax-free yield ÷ (1 − tax rate)

export const DOUBLE = '^(?:rule\\s+of\\s+72|doubling\\s+time|double\\s+my\\s+money\\s+at)\\s+(?:at\\s+)?[\\d.]+\\s*%$';
export const DIVIDEND = '^dividend(?:\\s+yield)?\\s+\\$?[\\d.]+(?:\\s+(?:a\\s+)?(?:quarter|quarterly|monthly|month|year|yearly|annual|annually))?\\s+(?:price|at|share\\s+price)\\s+\\$?[\\d.]+$';
export const TEY = '^(?:tax[\\s-]+equivalent\\s+yield|tey)\\s+[\\d.]+\\s*%\\s+(?:bracket\\s+|tax\\s+)?[\\d.]+\\s*%(?:\\s+state\\s+[\\d.]+\\s*%)?$';
const nums = s => (String(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
export function doubling(said) { const r = nums(said.replace(/rule\s+of\s+72/i, '')).at(-1); return r > 0 ? { rate: r, rule: 72 / r, exact: Math.log(2) / Math.log(1 + r / 100) } : null; }
export function dividend(said) { const t = String(said).toLowerCase(); const [d, price] = nums(t); const per = /quarter/.test(t) ? 4 : /month/.test(t) ? 12 : 1; return price > 0 ? { d, per, annual: d * per, price, yield: d * per / price } : null; }
export function tey(said) { const [y, fed, state] = nums(said); const f = fed / 100, s = (state ?? 0) / 100; const rate = 1 - (1 - f) * (1 - s); return rate < 1 ? { y, fed, state: state ?? null, rate, equivalent: y / (1 - rate) } : null; }

export default function investMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'rule-of-72', label: 'Doubling time', symbol: 'chart.line.uptrend.xyaxis', match: { pattern: DOUBLE }, examples: ['rule of 72 8%'],
    async render(said) {
      const d = doubling(said);
      if (!d) return { summary: 'Doubling time', complete: 0, body: [line(meta('Type a yearly rate: “rule of 72 8%”'))] };
      return { summary: `Doubles in about ${d.rule.toFixed(1)} years at ${d.rate}% (exactly ${d.exact.toFixed(2)})`, copy: `${d.exact.toFixed(2)} years`, complete: 1, body: [spread(stack('leading', line(hero(`${d.rule.toFixed(1)} yr`)), line(chip('rule of 72', 'chart.line.uptrend.xyaxis'))), stack('trailing', line(hero(`${d.exact.toFixed(2)} yr`, true)), line(chip('exact, compounded yearly')))), line(meta(`72 ÷ ${d.rate} · ln 2 ÷ ln(1 + ${d.rate}%) · ×4 in ${(d.exact * 2).toFixed(1)} years`))] };
    }
  });
  jevie.registerCard({
    name: 'dividend-yield', label: 'Dividend yield', symbol: 'banknote', match: { pattern: DIVIDEND }, examples: ['dividend yield 2.40 price 80'],
    async render(said) {
      const d = dividend(said);
      if (!d) return { summary: 'Dividend yield', complete: 0, body: [line(meta('Type the dividend and the price: “dividend yield 2.40 price 80”'))] };
      return { summary: `${(d.yield * 100).toFixed(2)}% yield ($${d.annual.toFixed(2)} a year on $${d.price})`, copy: `${(d.yield * 100).toFixed(2)}%`, complete: 1, body: [spread(stack('leading', line(hero(`${(d.yield * 100).toFixed(2)}%`)), line(chip('dividend yield', 'banknote'))), stack('trailing', line(meta(`$${d.annual.toFixed(2)} a year`)), line(meta(d.per > 1 ? `$${d.d} × ${d.per}` : 'a year\'s dividend')))), line(meta(`÷ $${d.price} · income on $10,000: $${(10000 * d.yield).toFixed(0)} a year before tax`))] };
    }
  });
  jevie.registerCard({
    name: 'tax-equivalent-yield', label: 'Tax-equivalent yield', symbol: 'building.columns', match: { pattern: TEY }, examples: ['tax equivalent yield 3% 32%'],
    async render(said) {
      const t = tey(said);
      if (!t) return { summary: 'Tax-equivalent yield', complete: 0, body: [line(meta('Type the tax-free yield and your bracket: “tax equivalent yield 3% 32%”'))] };
      return { summary: `${t.y}% tax-free equals ${t.equivalent.toFixed(2)}% taxable at ${t.fed}%${t.state !== null ? ` federal and ${t.state}% state` : ''}`, copy: `${t.equivalent.toFixed(2)}%`, complete: 1, body: [spread(stack('leading', line(hero(`${t.equivalent.toFixed(2)}%`)), line(chip('taxable equivalent', 'building.columns'))), stack('trailing', line(meta(`${t.y}% tax-free`)), line(meta(`${(t.rate * 100).toFixed(1)}% combined tax`)))), line(meta(`${t.y}% ÷ (1 − ${(t.rate * 100).toFixed(1)}%)${t.state !== null ? ' · state counts when the bond is free of it too (usually in-state)' : ''} · not tax advice`))] };
    }
  });
}
