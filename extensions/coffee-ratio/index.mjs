// A brew, as a card while it is typed, worked out on this Mac (1:16 unless a
// ratio is named; 1 mL of water weighs 1 g):
//
//   "coffee 1:16 500 ml"     grams of coffee for that much water
//   "coffee 20 g at 1:15"    water for that much coffee
//   "brew ratio 30g 500g"    the ratio of a recipe

export const PATTERN = '^(?:coffee|brew(?:\\s+ratio)?)\\s+(?:(?:1\\s*:\\s*\\d{1,2}(?:\\.\\d)?\\s+)?[\\d.]+\\s*(?:ml|g|l|oz|cups?)(?:\\s+(?:water|coffee))?(?:\\s+at\\s+1\\s*:\\s*\\d{1,2}(?:\\.\\d)?)?|[\\d.]+\\s*g\\s+[\\d.]+\\s*(?:g|ml))$';
export function brew(said) {
  const t = String(said).toLowerCase();
  const ratio = Number(t.match(/1\s*:\s*(\d{1,2}(?:\.\d)?)/)?.[1] ?? 16);
  const two = t.replace(/1\s*:\s*\d{1,2}(?:\.\d)?/, '').match(/([\d.]+)\s*g\s+([\d.]+)\s*(g|ml)/);
  if (two && /ratio/.test(t)) { const c = Number(two[1]), w = Number(two[2]); return { coffee: c, water: w, ratio: w / c, solved: 'ratio' }; }
  const m = t.replace(/1\s*:\s*\d{1,2}(?:\.\d)?/, '').match(/([\d.]+)\s*(ml|g|l|oz|cups?)(?:\s+(water|coffee))?/);
  if (!m) return null;
  const v = Number(m[1]), unit = m[2];
  const coffeeGiven = unit === 'g' && m[3] !== 'water';
  if (coffeeGiven) return { coffee: v, water: v * ratio, ratio, solved: 'water' };
  const water = unit === 'l' ? v * 1000 : unit === 'oz' ? v * 29.5735 : /^cup/.test(unit) ? v * 236.6 : v;
  return { coffee: water / ratio, water, ratio, solved: 'coffee' };
}

export default function coffeeRatio(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'coffee', label: 'Coffee ratio', symbol: 'cup.and.saucer', match: { pattern: PATTERN }, examples: ['coffee 1:16 500 ml'],
    async render(said) {
      const b = brew(said);
      if (!b) return { summary: 'Coffee ratio', complete: 0, body: [line(meta('Type water or coffee, and a ratio if not 1:16: “coffee 1:16 500 ml”'))] };
      const summary = b.solved === 'ratio' ? `1:${b.ratio.toFixed(1)} (${b.coffee} g coffee, ${b.water} g water)` : `${b.coffee.toFixed(1)} g coffee to ${Math.round(b.water)} g water (1:${b.ratio})`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${b.coffee.toFixed(1)} g`)), line(chip('coffee', 'cup.and.saucer'))), icon('drop'), stack('trailing', line(hero(`${Math.round(b.water)} g`)), line(chip('water')))), line(meta(`1:${Number(b.ratio.toFixed(1))} · pour-over often 1:15–1:17, French press 1:12–1:15, cold brew 1:5–1:8 (concentrate) · 1 mL water = 1 g`))] };
    }
  });
}
