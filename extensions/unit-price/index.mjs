// Which is cheaper per unit, as a card while it is typed, worked out on this
// Mac - ounces and pounds, grams and kilos, millilitres and litres, items.
//
//   "unit price 4.99 for 12 oz vs 7.49 for 20 oz", "unit price 3.20 for 500 g vs 5.50 for 1 kg",
//   "unit price 12 for 24 cans vs 8 for 12 cans"

const ITEM = '\\$?[\\d.]+\\s+for\\s+[\\d.]+\\s*(?:oz|lb|lbs|g|kg|ml|l|fl\\s*oz|items?|pack|cans?|bottles?|rolls?|pcs?|count|ct)';
export const PATTERN = `^(?:unit\\s+price|compare|better\\s+deal|which\\s+is\\s+cheaper)\\s+${ITEM}(?:\\s+(?:vs\\.?|or|versus|and)\\s+${ITEM})+$`;
const BASE = { oz: ['oz', 1], lb: ['oz', 16], lbs: ['oz', 16], g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], 'fl oz': ['ml', 29.5735], floz: ['ml', 29.5735] };
export function compare(said) {
  const items = [...String(said).toLowerCase().matchAll(/\$?([\d.]+)\s+for\s+([\d.]+)\s*(fl\s*oz|oz|lbs?|kg|g|ml|l|items?|pack|cans?|bottles?|rolls?|pcs?|count|ct)/g)].map(m => {
    const unit = m[3].replace(/\s+/g, ' '); const [base, factor] = BASE[unit] ?? ['item', 1];
    return { price: Number(m[1]), qty: Number(m[2]), unit, base, amount: Number(m[2]) * factor };
  });
  if (items.length < 2 || new Set(items.map(i => i.base)).size > 1) return items.length >= 2 ? { error: 'these are measured in different kinds of units' } : null;
  for (const i of items) i.per = i.price / i.amount;
  const best = items.reduce((a, b) => (b.per < a.per ? b : a));
  const worst = items.reduce((a, b) => (b.per > a.per ? b : a));
  return { items, best, saving: 1 - best.per / worst.per, base: items[0].base };
}
const per = (x, base) => base === 'g' ? `$${(x * 100).toFixed(2)}/100 g` : base === 'ml' ? `$${(x * 1000).toFixed(2)}/L` : base === 'oz' ? `$${x.toFixed(3)}/oz` : `$${x.toFixed(2)} each`;

export default function unitPrice(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'unit-price', label: 'Unit price', symbol: 'cart', match: { pattern: PATTERN }, examples: ['unit price 4.99 for 12 oz vs 7.49 for 20 oz'],
    async render(said) {
      const c = compare(said);
      if (!c || c.error) return { summary: 'Unit price', complete: 0, error: Boolean(c?.error), body: [line(meta(c?.error ?? 'Type two prices and sizes: “unit price 4.99 for 12 oz vs 7.49 for 20 oz”'))] };
      const label = i => `$${i.price.toFixed(2)} for ${i.qty} ${i.unit}`;
      const summary = `${label(c.best)} is cheaper: ${per(c.best.per, c.base)}, ${(c.saving * 100).toFixed(0)}% less per unit`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(per(c.best.per, c.base))), line(chip(`best: ${label(c.best)}`, 'cart'))), stack('trailing', line(hero(`${(c.saving * 100).toFixed(0)}%`, true)), line(chip('less per unit')))),
        list(c.items.map(i => `${label(i)} · ${per(i.per, c.base)}${i === c.best ? ' ✓' : ''}`))] };
    }
  });
}
