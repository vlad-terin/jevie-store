// A room's cooling, as a card while it is typed, worked out on this Mac from
// ENERGY STAR's room air conditioner chart, then: shady −10%, sunny +10%,
// 600 BTU for each person over two, 4,000 for a kitchen.
//
//   "btu 400 sq ft", "ac size 300 sq ft sunny kitchen 4 people", "btu 12x15 room", "ac size 35 m2"

export const PATTERN = '^(?:btu|ac\\s+size|air\\s+conditioner\\s+(?:size|for))\\s+(?:for\\s+)?(?:[\\d,.]+\\s*(?:sq\\.?\\s*ft|square\\s+feet|ft2|sqft|m2|m²|sq\\s*m)|\\d+\\s*x\\s*\\d+(?:\\s*(?:ft|feet))?(?:\\s+room)?)(?:\\s+(?:sunny|shady|shaded|kitchen|\\d+\\s+people))*$';
const CHART = [[150, 5000], [250, 6000], [300, 7000], [350, 8000], [400, 9000], [450, 10000], [550, 12000], [700, 14000], [1000, 18000], [1200, 21000], [1400, 23000], [1500, 24000], [2000, 30000], [2500, 34000]];
export function size(said) {
  const t = String(said).toLowerCase().replace(/,/g, '');
  const box = t.match(/(\d+)\s*x\s*(\d+)/); const m = t.match(/([\d.]+)\s*(sq\.?\s*ft|square\s+feet|ft2|sqft|m2|m²|sq\s*m)/);
  const sqft = box ? Number(box[1]) * Number(box[2]) : /m2|m²|sq\s*m/.test(m[2]) ? Number(m[1]) * 10.7639 : Number(m[1]);
  if (!(sqft >= 100 && sqft <= 2500)) return { sqft, out: true };
  let btu = CHART.find(([max]) => sqft <= max)[1];
  const notes = [];
  if (/shad/.test(t)) { btu *= 0.9; notes.push('shady −10%'); }
  if (/sunny/.test(t)) { btu *= 1.1; notes.push('sunny +10%'); }
  const people = Number(t.match(/(\d+)\s+people/)?.[1] ?? 2); if (people > 2) { btu += (people - 2) * 600; notes.push(`${people} people +${(people - 2) * 600}`); }
  if (/kitchen/.test(t)) { btu += 4000; notes.push('kitchen +4,000'); }
  return { sqft, btu: Math.round(btu / 100) * 100, notes };
}

export default function acSize(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'ac-size', label: 'AC size', symbol: 'snowflake', match: { pattern: PATTERN }, examples: ['btu 400 sq ft'],
    async render(said) {
      const s = size(said);
      if (s.out) return { summary: 'AC size', complete: 0, error: true, body: [line(meta('The room chart covers 100 to 2,500 sq ft: larger is central air, sized by a Manual J load'))] };
      const summary = `${s.btu.toLocaleString('en-US')} BTU for ${Math.round(s.sqft)} sq ft${s.notes.length ? ` (${s.notes.join(', ')})` : ''}`;
      return { summary, copy: `${s.btu} BTU`, complete: 1, body: [spread(stack('leading', line(hero(`${s.btu.toLocaleString('en-US')} BTU`)), line(chip(`${(s.btu / 12000).toFixed(1)} tons`, 'snowflake'))), stack('trailing', line(meta(`${Math.round(s.sqft)} sq ft`)), line(meta(s.notes.join(' · ') || 'average sun, two people')))), line(meta('ENERGY STAR room chart · too big cools fast but leaves it damp'))] };
    }
  });
}
