// Baking by weight, as cards while it is typed, worked out on this Mac:
//
//   "2 cups flour in grams", "1/2 cup butter to grams", "3 tbsp cocoa in grams", "250 g sugar in cups"
//       by ingredient, from King Arthur Baking's ingredient weight chart (approximate)
//   "hydration 500g flour 350g water", "hydration 1000 flour 700 water 20 salt 10 yeast"
//       the dough's hydration and each ingredient's baker's percentage

/// Grams in one US cup (King Arthur Baking's chart).
export const CUP = { 'all-purpose flour': 120, flour: 120, 'bread flour': 120, 'whole wheat flour': 113, 'cake flour': 120, 'almond flour': 96, sugar: 198, 'granulated sugar': 198, 'brown sugar': 213,
  'powdered sugar': 113, 'icing sugar': 113, butter: 227, milk: 227, water: 227, cream: 227, honey: 336, 'maple syrup': 312, oil: 198, 'vegetable oil': 198, 'olive oil': 200, oats: 89, 'rolled oats': 89,
  rice: 198, cocoa: 84, 'cocoa powder': 84, cornstarch: 112, 'chocolate chips': 170, yogurt: 227, 'sour cream': 227, 'peanut butter': 270, raisins: 149, walnuts: 113, pecans: 113, 'shredded coconut': 85 };
const NAMES = Object.keys(CUP).sort((a, b) => b.length - a.length);
const UNIT = { cup: 1, cups: 1, c: 1, tbsp: 1 / 16, tablespoon: 1 / 16, tablespoons: 1 / 16, tsp: 1 / 48, teaspoon: 1 / 48, teaspoons: 1 / 48 };
export const CONVERT = `^(?:\\d+(?:\\.\\d+)?|\\d+\\s*/\\s*\\d+|\\d+\\s+\\d+\\s*/\\s*\\d+)\\s*(?:cups?|c|tbsp|tablespoons?|tsp|teaspoons?|g|grams?)\\s+(?:of\\s+)?(?:${NAMES.join('|')})\\s+(?:in|to)\\s+(?:grams?|g|cups?)$`;
export const HYDRATION = '^hydration\\s+[\\d.]+\\s*g?\\s+(?:of\\s+)?flour\\s+[\\d.]+\\s*g?\\s+(?:of\\s+)?water(?:\\s+[\\d.]+\\s*g?\\s+(?:of\\s+)?[a-z]+)*$';
const amount = s => { s = s.trim(); let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/); if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]); m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) return Number(m[1]) / Number(m[2]); return Number(s); };
export function convert(said) {
  const t = String(said).toLowerCase();
  const m = t.match(new RegExp(`^(\\d+(?:\\.\\d+)?|\\d+\\s*/\\s*\\d+|\\d+\\s+\\d+\\s*/\\s*\\d+)\\s*(cups?|c|tbsp|tablespoons?|tsp|teaspoons?|g|grams?)\\s+(?:of\\s+)?(${NAMES.join('|')})\\s+(?:in|to)\\s+(grams?|g|cups?)$`));
  if (!m) return null;
  const qty = amount(m[1]), unit = m[2], ingredient = m[3], per = CUP[ingredient];
  if (/^g/.test(unit)) return { qty, ingredient, grams: qty, cups: qty / per, to: 'cups' };
  const cups = qty * UNIT[unit];
  return { qty, unit, ingredient, cups, grams: cups * per, to: 'grams' };
}
export function hydration(said) {
  const items = [...String(said).toLowerCase().matchAll(/([\d.]+)\s*g?\s+(?:of\s+)?([a-z]+)/g)].map(m => ({ grams: Number(m[1]), name: m[2] }));
  const flour = items.find(i => i.name === 'flour'), water = items.find(i => i.name === 'water');
  if (!flour || !water || !(flour.grams > 0)) return null;
  return { flour: flour.grams, water: water.grams, hydration: water.grams / flour.grams, items: items.map(i => ({ ...i, pct: i.grams / flour.grams })) };
}

export default function baking(jevie) {
  const { line, pair, spread, stack, hero, chip, meta, icon, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'cups-grams', label: 'Cups ↔ grams', symbol: 'birthday.cake', match: { pattern: CONVERT }, examples: ['2 cups flour in grams'],
    async render(said) {
      const c = convert(said);
      if (!c) return { summary: 'Cups ↔ grams', complete: 0, body: [line(meta('Type an amount and an ingredient: “2 cups flour in grams”'))] };
      const out = c.to === 'grams' ? `${Math.round(c.grams)} g` : `${Number(c.cups.toFixed(2))} cups`;
      const summary = `${said.trim().replace(/\s+(?:in|to)\s+\S+$/i, '')} ≈ ${out}`;
      return { summary, copy: out, complete: 1, body: [pair(stack('leading', line(hero(c.to === 'grams' ? `${Number(c.cups.toFixed(3))} cup` : `${c.grams} g`, true)), line(chip(c.ingredient))), icon('equal'), stack('trailing', line(hero(out)), line(chip(c.to)))), line(meta(`${CUP[c.ingredient]} g a US cup · King Arthur Baking's weight chart, approximate: how it is scooped changes it`))] };
    }
  });
  jevie.registerCard({
    name: 'hydration', label: 'Hydration', symbol: 'drop', match: { pattern: HYDRATION }, examples: ['hydration 500g flour 350g water'],
    async render(said) {
      const h = hydration(said);
      if (!h) return { summary: 'Hydration', complete: 0, body: [line(meta('Type flour and water in grams: “hydration 500g flour 350g water”'))] };
      const style = h.hydration < 0.6 ? 'stiff (bagels, pretzels)' : h.hydration < 0.68 ? 'standard sandwich bread' : h.hydration < 0.75 ? 'rustic, open crumb' : 'high hydration (ciabatta, focaccia)';
      return { summary: `${(h.hydration * 100).toFixed(1)}% hydration (${style})`, copy: `${(h.hydration * 100).toFixed(1)}%`, complete: 1, body: [spread(stack('leading', line(hero(`${(h.hydration * 100).toFixed(1)}%`)), line(chip('hydration', 'drop'))), stack('trailing', line(meta(style)), line(meta(`${h.water} g water ÷ ${h.flour} g flour`)))), list(h.items.map(i => `${i.name} ${i.grams} g · ${(i.pct * 100).toFixed(1)}%`)), line(meta('baker\'s percentages: each ingredient over the flour'))] };
    }
  });
}
