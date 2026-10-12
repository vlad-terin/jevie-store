// A recipe scaled, as a card while it is typed, worked out on this Mac:
// each amount × the factor, shown to the nearest eighth.
//
//   "scale recipe 4 to 6: 2 cups flour, 1 tsp salt, 3 eggs", "scale 8 to 2 servings 1 cup milk, 1/2 cup butter"
//   "double 1 1/2 cups sugar, 2 eggs", "halve 3/4 cup oil, 3 eggs", "triple recipe 2 tbsp honey"

const AMOUNT = '(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|[½⅓⅔¼¾⅛])';
export const PATTERN = `^(?:scale(?:\\s+(?:the\\s+)?recipe)?\\s+(?:from\\s+)?\\d{1,3}\\s+to\\s+\\d{1,3}(?:\\s+(?:servings|people|portions))?|(?:double|triple|halve|half|quarter)(?:\\s+(?:the\\s+|a\\s+)?recipe)?)\\s*[:,]?\\s+${AMOUNT}\\s*[a-z].*$`;
const UNICODE = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };
export const amount = s => { s = s.trim(); if (UNICODE[s]) return UNICODE[s]; let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return +m[1] + +m[2] / +m[3]; m = s.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2]; return Number(s); };
export function kitchen(x) {
  const eighths = Math.round(x * 8); if (eighths === 0) return x.toFixed(2);
  const whole = Math.floor(eighths / 8), rest = eighths % 8;
  const frac = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'][rest];
  return [whole || '', frac].filter(Boolean).join(' ');
}
export function scale(said) {
  const t = String(said).trim();
  const m = t.match(/^(?:scale(?:\s+(?:the\s+)?recipe)?\s+(?:from\s+)?(\d{1,3})\s+to\s+(\d{1,3})(?:\s+(?:servings|people|portions))?|(double|triple|halve|half|quarter)(?:\s+(?:the\s+|a\s+)?recipe)?)\s*[:,]?\s+(.+)$/i);
  if (!m) return null;
  const factor = m[1] ? Number(m[2]) / Number(m[1]) : { double: 2, triple: 3, halve: 0.5, half: 0.5, quarter: 0.25 }[m[3].toLowerCase()];
  if (!(factor > 0)) return null;
  const items = m[4].split(/\s*(?:,|;|\band\b)\s*/).filter(Boolean).map(part => {
    const a = part.match(new RegExp(`^(${AMOUNT})\\s*(.*)$`));
    if (!a) return { text: part };
    const before = amount(a[1]), after = before * factor;
    return { before, after, rest: a[2], text: `${kitchen(after)} ${a[2]}`.trim() };
  });
  return { factor, items };
}

export default function recipeScale(jevie) {
  const { line, spread, title, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'recipe-scale', label: 'Recipe scale', symbol: 'frying.pan', match: { pattern: PATTERN }, examples: ['scale recipe 4 to 6: 2 cups flour, 1 tsp salt, 3 eggs'],
    async render(said) {
      const r = scale(said);
      if (!r) return { summary: 'Recipe scale', complete: 0, body: [line(meta('Type servings and ingredients: “scale recipe 4 to 6: 2 cups flour, 1 tsp salt”'))] };
      const out = r.items.map(i => i.text);
      return { summary: `× ${Number(r.factor.toFixed(3))}: ${out.join(', ')}`, copy: out.join('\n'), complete: 1, body: [spread(title(`× ${Number(r.factor.toFixed(3))}`), chip(`${r.items.length} ingredients`, 'frying.pan')), list(out), line(meta('to the nearest 1/8 · eggs: round, or beat and measure · baking times and pan sizes do not scale the same way'))] };
    }
  });
}
