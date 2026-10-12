// Kitchen sums, as cards while they are typed, worked out on this Mac:
//
//   "food cost 4.50 price 16"                    the plate's food-cost percentage and gross margin
//   "menu price cost 4.50 at 30% food cost"      the price that gives that food cost

export const COST = '^(?:food\\s+cost|plate\\s+cost)\\s+\\$?[\\d.]+\\s+(?:price|menu\\s+price|sells?\\s+(?:at|for))\\s+\\$?[\\d.]+$';
export const PRICE = '^(?:menu\\s+price|price\\s+for)\\s+(?:cost\\s+|plate\\s+cost\\s+)?\\$?[\\d.]+\\s+at\\s+[\\d.]+\\s*%(?:\\s+food\\s+cost)?$';
const money = n => `$${n.toFixed(2)}`;
export const costOf = said => { const [cost, price] = (String(said).match(/[\d.]+/g) ?? []).map(Number); return cost > 0 && price > 0 ? { cost, price, pct: cost / price, margin: price - cost } : null; };
export const priceOf = said => { const t = String(said); const cost = Number(t.match(/\$?([\d.]+)\s+at/)?.[1]); const pct = Number(t.match(/at\s+([\d.]+)\s*%/)?.[1]) / 100; return cost > 0 && pct > 0 && pct < 1 ? { cost, pct, price: cost / pct, rounded: Math.ceil(cost / pct * 2) / 2 - 0.01 } : null; };

export default function restaurantMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'food-cost', label: 'Food cost', symbol: 'fork.knife', match: { pattern: COST }, examples: ['food cost 4.50 price 16'],
    async render(said) {
      const c = costOf(said);
      if (!c) return { summary: 'Food cost', complete: 0, body: [line(meta('Type the plate cost and the price: “food cost 4.50 price 16”'))] };
      const verdict = c.pct <= 0.28 ? 'lean' : c.pct <= 0.35 ? 'in the usual range' : 'high';
      return { summary: `${(c.pct * 100).toFixed(1)}% food cost (${money(c.cost)} on ${money(c.price)}), ${money(c.margin)} left a plate`, copy: `${(c.pct * 100).toFixed(1)}%`, complete: 1, body: [spread(stack('leading', line(hero(`${(c.pct * 100).toFixed(1)}%`, c.pct > 0.35)), line(chip(`food cost · ${verdict}`, 'fork.knife'))), stack('trailing', line(hero(money(c.margin), true)), line(chip('left a plate')))), line(meta('most restaurants aim for 28–35% food cost; labour and rent come out of what is left'))] };
    }
  });
  jevie.registerCard({
    name: 'menu-price', label: 'Menu price', symbol: 'menucard', match: { pattern: PRICE }, examples: ['menu price cost 4.50 at 30% food cost'],
    async render(said) {
      const p = priceOf(said);
      if (!p) return { summary: 'Menu price', complete: 0, body: [line(meta('Type the plate cost and a target: “menu price cost 4.50 at 30% food cost”'))] };
      return { summary: `Price ${money(p.price)} (≈ ${money(p.rounded)} on the menu) for ${(p.pct * 100).toFixed(0)}% food cost on ${money(p.cost)}`, copy: money(p.rounded), complete: 1, body: [spread(stack('leading', line(hero(money(p.price))), line(chip(`at ${(p.pct * 100).toFixed(0)}% food cost`, 'menucard'))), stack('trailing', line(hero(money(p.rounded), true)), line(chip('on the menu')))), line(meta(`${money(p.cost)} ÷ ${(p.pct * 100).toFixed(0)}% · rounded up to the next .49 or .99`))] };
    }
  });
}
