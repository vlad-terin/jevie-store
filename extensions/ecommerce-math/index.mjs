// Store sums, as cards while they are typed, worked out on this Mac:
//
//   "profit per order price 40 cost 12 shipping 6 fees 3%", "order profit price 40 cost 12 fees 2.9% + 0.30 ads 8"
//   "break even roas margin 40%", "break even roas price 50 cost 20"     1 ÷ margin: the ROAS where ads stop losing money

const N = '\\$?[\\d.]+';
export const PROFIT = `^(?:profit\\s+per\\s+order|order\\s+profit|unit\\s+economics)\\s+price\\s+${N}(?:\\s+(?:cost|cogs|product)\\s+${N}|\\s+shipping\\s+${N}|\\s+(?:fees?|processing)\\s+[\\d.]+\\s*%(?:\\s*\\+\\s*${N})?|\\s+(?:ads?|cac|marketing)\\s+${N}|\\s+(?:packaging|other)\\s+${N})+$`;
export const BREAKEVEN = `^break[\\s-]*even\\s+roas\\s+(?:margin\\s+[\\d.]+\\s*%|price\\s+${N}\\s+(?:cost|costs)\\s+${N})$`;
const val = (t, re) => Number(t.match(re)?.[1] ?? 0);
export function profit(said) {
  const t = String(said).toLowerCase().replace(/\$/g, '');
  const price = val(t, /price\s+([\d.]+)/), cost = val(t, /(?:cost|cogs|product)\s+([\d.]+)/), ship = val(t, /shipping\s+([\d.]+)/);
  const feePct = val(t, /(?:fees?|processing)\s+([\d.]+)\s*%/) / 100, feeFlat = val(t, /%\s*\+\s*([\d.]+)/), ads = val(t, /(?:ads?|cac|marketing)\s+([\d.]+)/), other = val(t, /(?:packaging|other)\s+([\d.]+)/);
  if (!(price > 0)) return null;
  const fees = price * feePct + feeFlat, total = cost + ship + fees + ads + other, left = price - total;
  return { price, cost, ship, fees, ads, other, total, left, margin: left / price, contribution: (price - cost - ship - fees - other) / price };
}
export function breakeven(said) {
  const t = String(said).toLowerCase().replace(/\$/g, '');
  const m = t.match(/margin\s+([\d.]+)/); let margin = m ? Number(m[1]) / 100 : null;
  if (margin === null) { const price = val(t, /price\s+([\d.]+)/), cost = val(t, /costs?\s+([\d.]+)/); margin = price > 0 ? (price - cost) / price : null; }
  return margin > 0 && margin <= 1 ? { margin, roas: 1 / margin, acos: margin } : null;
}
const money = n => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(2)}`;

export default function ecommerceMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'order-profit', label: 'Profit per order', symbol: 'cart.badge.plus', match: { pattern: PROFIT }, examples: ['profit per order price 40 cost 12 shipping 6 fees 3%'],
    async render(said) {
      const p = profit(said);
      if (!p) return { summary: 'Profit per order', complete: 0, body: [line(meta('Type the price and costs: “profit per order price 40 cost 12 shipping 6 fees 3%”'))] };
      const parts = [p.cost && `product ${money(p.cost)}`, p.ship && `shipping ${money(p.ship)}`, p.fees && `fees ${money(p.fees)}`, p.ads && `ads ${money(p.ads)}`, p.other && `other ${money(p.other)}`].filter(Boolean);
      return { summary: `${money(p.left)} profit an order (${(p.margin * 100).toFixed(1)}% of ${money(p.price)})`, copy: money(p.left), complete: 1, body: [spread(stack('leading', line(hero(money(p.left), p.left < 0)), line(chip(`${(p.margin * 100).toFixed(1)}% margin`, 'cart.badge.plus'))), stack('trailing', line(meta(`${money(p.total)} in costs`)), line(meta(parts.join(' · '))))), line(meta(p.ads ? 'after ads' : `before ads: break-even ROAS ${(1 / p.contribution).toFixed(2)}`))] };
    }
  });
  jevie.registerCard({
    name: 'break-even-roas', label: 'Break-even ROAS', symbol: 'scale.3d', match: { pattern: BREAKEVEN }, examples: ['break even roas margin 40%'],
    async render(said) {
      const b = breakeven(said);
      if (!b) return { summary: 'Break-even ROAS', complete: 0, body: [line(meta('Type a margin: “break even roas margin 40%”'))] };
      return { summary: `Break-even ROAS ${b.roas.toFixed(2)} (ACOS ${(b.acos * 100).toFixed(0)}%) at a ${(b.margin * 100).toFixed(1)}% margin`, copy: b.roas.toFixed(2), complete: 1, body: [spread(stack('leading', line(hero(`${b.roas.toFixed(2)}×`)), line(chip('break-even ROAS', 'scale.3d'))), stack('trailing', line(meta(`${(b.margin * 100).toFixed(1)}% margin`)), line(meta(`ACOS up to ${(b.acos * 100).toFixed(0)}%`)))), line(meta('1 ÷ margin: under it each sale from ads loses money (before repeat purchases)'))] };
    }
  });
}
