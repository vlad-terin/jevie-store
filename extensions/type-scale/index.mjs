// Proportions, as cards while they are typed, worked out on this Mac:
//
//   "type scale 16 1.25", "type scale 18 perfect fourth", "modular scale 16 golden"   sizes two steps down to six up
//   "golden ratio 960"                                                                 960 split 593 : 367, and 960 × φ

export const RATIOS = { 'minor second': 1.067, 'major second': 1.125, 'minor third': 1.2, 'major third': 1.25, 'perfect fourth': 1.333, 'augmented fourth': 1.414, 'perfect fifth': 1.5, golden: 1.618, 'golden ratio': 1.618 };
export const SCALE = `^(?:type|modular)\\s+scale\\s+[\\d.]+\\s*(?:px|pt|rem)?\\s+(?:[\\d.]+|${Object.keys(RATIOS).join('|')})$`;
export const GOLDEN = '^golden\\s+(?:ratio|section|split)\\s+(?:of\\s+)?[\\d.]+\\s*(?:px|pt)?$';
const PHI = (1 + Math.sqrt(5)) / 2;
export function scale(said) {
  const t = String(said).toLowerCase(); const base = Number(t.match(/scale\s+([\d.]+)/)[1]);
  const unit = t.match(/scale\s+[\d.]+\s*(px|pt|rem)/)?.[1] ?? 'px';
  const named = Object.keys(RATIOS).find(n => t.endsWith(n)); const ratio = named ? RATIOS[named] : Number(t.match(/([\d.]+)$/)[1]);
  if (!(base > 0 && ratio > 1)) return null;
  return { base, unit, ratio, named, steps: [-2, -1, 0, 1, 2, 3, 4, 5, 6].map(n => ({ n, size: base * ratio ** n })) };
}
export const golden = said => { const w = Number(String(said).match(/([\d.]+)/)[1]); return { w, major: w / PHI, minor: w - w / PHI, longer: w * PHI }; };
const r = x => Number(x.toFixed(2));

export default function typeScale(jevie) {
  const { line, spread, title, chip, meta, list, stack, hero } = jevie.CardParts;
  jevie.registerCard({
    name: 'type-scale', label: 'Type scale', symbol: 'textformat.size', match: { pattern: SCALE }, examples: ['type scale 16 1.25'],
    async render(said) {
      const s = scale(said);
      if (!s) return { summary: 'Type scale', complete: 0, body: [line(meta('Type a base and a ratio over 1: “type scale 16 1.25”'))] };
      const rows = s.steps.slice().reverse().map(x => `${x.n > 0 ? `+${x.n}` : x.n}  ${r(x.size)}${s.unit}${x.n === 0 ? '  (base)' : ''}`);
      return { summary: `${s.base}${s.unit} × ${s.ratio}: ${s.steps.filter(x => x.n >= 0).map(x => r(x.size)).join(', ')}`, copy: s.steps.map(x => `${r(x.size)}${s.unit}`).join(', '), complete: 1, body: [spread(title(`${s.base}${s.unit} × ${s.ratio}`), chip(s.named ?? 'ratio', 'textformat.size')), list(rows), line(meta('round to whole pixels for small text · ↵ copies the sizes'))] };
    }
  });
  jevie.registerCard({
    name: 'golden-ratio', label: 'Golden ratio', symbol: 'rectangle.split.2x1', match: { pattern: GOLDEN }, examples: ['golden ratio 960'],
    async render(said) {
      const g = golden(said);
      return { summary: `${g.w} split ${r(g.major)} : ${r(g.minor)}; × φ = ${r(g.longer)}`, copy: `${r(g.major)} / ${r(g.minor)}`, complete: 1, body: [spread(stack('leading', line(hero(`${r(g.major)} : ${r(g.minor)}`)), line(chip('golden split', 'rectangle.split.2x1'))), stack('trailing', line(hero(String(r(g.longer)), true)), line(chip('× φ')))), line(meta(`φ ≈ 1.618 · ${g.w} ÷ φ and the rest`))] };
    }
  });
}
