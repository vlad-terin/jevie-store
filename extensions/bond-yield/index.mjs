// A bond, as a card while it is typed, worked out on this Mac (coupons twice
// a year, as US bonds pay):
//
//   "bond price 950 face 1000 coupon 5% 10 years"   current yield and yield to maturity
//   "bond yield 6% face 1000 coupon 5% 10 years"    the price that yield means

const N = '\\$?[\\d,.]+';
export const PATTERN = `^bond\\s+(?:price\\s+${N}|yield\\s+[\\d.]+\\s*%)\\s+(?:face\\s+${N}\\s+)?coupon\\s+[\\d.]+\\s*%\\s+(?:for\\s+)?\\d+(?:\\.\\d+)?\\s*(?:years?|yrs?|y)$`;
const num = s => Number(String(s).replace(/[$,]/g, ''));
export const priceAt = (y, face, coupon, years) => { const n = Math.round(years * 2), c = face * coupon / 2, r = y / 2; return r ? c * (1 - (1 + r) ** -n) / r + face * (1 + r) ** -n : c * n + face; };
export function ytm(price, face, coupon, years) {
  let lo = -0.5, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (priceAt(mid, face, coupon, years) > price) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
export function read(said) {
  const t = String(said).trim().toLowerCase();
  const face = num(t.match(/face\s+(\$?[\d,.]+)/)?.[1] ?? '1000'), coupon = Number(t.match(/coupon\s+([\d.]+)/)?.[1]) / 100, years = Number(t.match(/([\d.]+)\s*(?:years?|yrs?|y)$/)?.[1]);
  const price = t.match(/price\s+(\$?[\d,.]+)/) ? num(t.match(/price\s+(\$?[\d,.]+)/)[1]) : null;
  const y = t.match(/yield\s+([\d.]+)\s*%/) ? Number(t.match(/yield\s+([\d.]+)\s*%/)[1]) / 100 : null;
  if (!(face > 0 && coupon >= 0 && years > 0)) return null;
  const p = price ?? priceAt(y, face, coupon, years);
  return { face, coupon, years, price: p, ytm: y ?? ytm(p, face, coupon, years), current: face * coupon / p, solved: price === null ? 'price' : 'yield' };
}
const pct = x => `${(x * 100).toFixed(3)}%`;

export default function bondYield(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'bond', label: 'Bond', symbol: 'doc.text.below.ecg', match: { pattern: PATTERN }, examples: ['bond price 950 face 1000 coupon 5% 10 years'],
    async render(said) {
      const b = read(said);
      if (!b) return { summary: 'Bond', complete: 0, body: [line(meta('Type a price (or yield), face, coupon and years, like “bond price 950 face 1000 coupon 5% 10 years”'))] };
      const summary = b.solved === 'price' ? `price ${b.price.toFixed(2)} at ${pct(b.ytm)} yield` : `YTM ${pct(b.ytm)}, current yield ${pct(b.current)} at ${b.price.toFixed(2)}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(b.solved === 'price' ? b.price.toFixed(2) : pct(b.ytm))), line(chip(b.solved === 'price' ? 'price' : 'yield to maturity'))), icon('arrow.left.arrow.right'),
          stack('trailing', line(hero(pct(b.current), true)), line(chip('current yield')))),
        line(meta(`face ${b.face} · coupon ${(b.coupon * 100).toFixed(2)}% paid twice a year · ${b.years} years · ${b.price < b.face ? 'at a discount' : b.price > b.face ? 'at a premium' : 'at par'}`))] };
    }
  });
}
