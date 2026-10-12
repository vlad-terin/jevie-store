// Discounts one after another, as a card while they are typed, worked out on
// this Mac: each taken off what the one before left, so 20% then 10% is 28%.
// Tax after, if named.
//
//   "20% off then 10% off 80", "80 with 25% off and 15% off", "150 with 30% off then 20% off plus 8% tax"

const OFF = '\\d{1,2}(?:\\.\\d+)?\\s*%\\s*off';
export const PATTERN = `^(?:${OFF}(?:\\s+(?:then|and|plus|\\+)\\s+${OFF})+\\s+(?:on\\s+|of\\s+)?\\$?[\\d,.]+|\\$?[\\d,.]+\\s+with\\s+${OFF}(?:\\s+(?:then|and|plus|\\+)\\s+${OFF})+)(?:\\s+(?:plus|\\+|with)\\s+[\\d.]+\\s*%\\s+tax)?$`;
export function stack(said) {
  const t = String(said).toLowerCase().replace(/,/g, '');
  const offs = [...t.matchAll(/(\d{1,2}(?:\.\d+)?)\s*%\s*off/g)].map(m => Number(m[1]) / 100);
  const tax = Number(t.match(/([\d.]+)\s*%\s+tax/)?.[1] ?? 0) / 100;
  const price = Number(t.replace(/[\d.]+\s*%\s*(?:off|tax)/g, ' ').match(/\$?(\d+(?:\.\d+)?)/)?.[1]);
  if (!(price > 0) || offs.length < 2) return null;
  const factor = offs.reduce((f, o) => f * (1 - o), 1);
  const after = price * factor;
  return { price, offs, tax, factor, total: 1 - factor, after, withTax: after * (1 + tax), naive: offs.reduce((a, b) => a + b, 0) };
}

export default function discountStack(jevie) {
  const { line, pair, stack: st, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'discounts', label: 'Stacked discounts', symbol: 'tag', match: { pattern: PATTERN }, examples: ['20% off then 10% off 80'],
    async render(said) {
      const s = stack(said);
      if (!s) return { summary: 'Stacked discounts', complete: 0, body: [line(meta('Type the discounts and the price: “20% off then 10% off 80”'))] };
      const final = s.tax ? s.withTax : s.after;
      const summary = `$${final.toFixed(2)}${s.tax ? ' with tax' : ''} · ${(s.total * 100).toFixed(1)}% off in all (not ${(s.naive * 100).toFixed(0)}%)`;
      return { summary, copy: `$${final.toFixed(2)}`, complete: 1, body: [pair(st('leading', line(hero(`$${s.price.toFixed(2)}`, true)), line(chip('was'))), icon('arrow.right'), st('trailing', line(hero(`$${final.toFixed(2)}`)), line(chip(s.tax ? `with ${(s.tax * 100).toFixed(1)}% tax` : 'now', 'tag')))), line(meta(`${s.offs.map(o => `${(o * 100).toFixed(0)}%`).join(' then ')} = ${(s.total * 100).toFixed(1)}% off, each on what the last left · you save $${(s.price - s.after).toFixed(2)}`))] };
    }
  });
}
