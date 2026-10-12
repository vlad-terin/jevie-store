// Layout sums, as cards while they are typed, worked out on this Mac:
//
//   "aspect ratio 1920x1080", "ratio 1080 by 1350"      the ratio, its name, and its value
//   "1920x1080 to width 1280", "1080x1350 at height 500" the other side, kept in proportion
//   "24px to rem", "1.5rem to px", "18px to rem base 18" root font size 16 unless named

export const RATIO = '^(?:aspect\\s+ratio|ratio)\\s+\\d+\\s*(?:x|×|by|:|/)\\s*\\d+$';
export const RESIZE = '^\\d+\\s*(?:x|×)\\s*\\d+\\s+(?:to|at)\\s+(?:a\\s+)?(?:width|height|w|h)\\s+\\d+$';
export const REM = '^[\\d.]+\\s*(?:px|rem|em)\\s+(?:to|in)\\s+(?:px|rem|em)(?:\\s+(?:base|root)\\s+\\d+)?$';
const gcd = (a, b) => b ? gcd(b, a % b) : a;
export const NAMES = { '16:9': 'widescreen HD', '9:16': 'vertical video, Stories', '4:3': 'classic screen', '3:2': 'photo (35mm)', '1:1': 'square', '4:5': 'Instagram portrait', '21:9': 'ultrawide', '2:1': 'univisium', '1.91:1': 'Open Graph / link card', '3:4': 'portrait tablet', '5:4': 'large-format print', '16:10': 'laptop display' };

export function ratio(w, h) {
  const g = gcd(w, h); let label = `${w / g}:${h / g}`;
  const value = w / h;
  const near = Object.keys(NAMES).map(k => { const [a, b] = k.split(':').map(Number); return [k, Math.abs(a / b - value)]; }).sort((a, b) => a[1] - b[1])[0];
  return { w, h, exact: label, value, name: NAMES[label] ?? (near[1] < 0.01 ? `≈ ${near[0]} ${NAMES[near[0]]}` : null) };
}
export function resize(said) {
  const m = String(said).toLowerCase().match(/(\d+)\s*(?:x|×)\s*(\d+)\s+(?:to|at)\s+(?:a\s+)?(width|height|w|h)\s+(\d+)/);
  if (!m) return null;
  const [w, h, side, to] = [Number(m[1]), Number(m[2]), m[3][0], Number(m[4])];
  return side === 'w' ? { w: to, h: Math.round(h * to / w), from: [w, h] } : { w: Math.round(w * to / h), h: to, from: [w, h] };
}
export function rem(said) {
  const m = String(said).toLowerCase().match(/([\d.]+)\s*(px|rem|em)\s+(?:to|in)\s+(px|rem|em)(?:\s+(?:base|root)\s+(\d+))?/);
  if (!m) return null;
  const v = Number(m[1]), from = m[2], to = m[3], base = Number(m[4] ?? 16);
  const px = from === 'px' ? v : v * base;
  return { v, from, to, base, out: to === 'px' ? px : px / base };
}

export default function designMath(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'aspect-ratio', label: 'Aspect ratio', symbol: 'aspectratio', match: { pattern: RATIO }, examples: ['aspect ratio 1920x1080'],
    async render(said) {
      const [w, h] = said.match(/\d+/g).map(Number);
      if (!(w > 0 && h > 0)) return { summary: 'Aspect ratio', complete: 0, body: [line(meta('Type a width and a height'))] };
      const r = ratio(w, h);
      const summary = `${w}×${h} is ${r.exact}${r.name ? ` (${r.name})` : ''}`;
      return { summary, copy: r.exact, complete: 1, body: [pair(stack('leading', line(hero(`${w}×${h}`, true)), line(chip('size'))), icon('equal'), stack('trailing', line(hero(r.exact)), line(chip(r.name ?? `${r.value.toFixed(3)}:1`, 'aspectratio')))), line(meta(`${r.value.toFixed(4)} : 1`))] };
    }
  });
  jevie.registerCard({
    name: 'resize', label: 'Resize', symbol: 'arrow.up.left.and.arrow.down.right', match: { pattern: RESIZE }, examples: ['1920x1080 to width 1280'],
    async render(said) {
      const r = resize(said);
      if (!r) return { summary: 'Resize', complete: 0, body: [line(meta('Type a size and the new width or height: “1920x1080 to width 1280”'))] };
      const summary = `${r.from.join('×')} at that scale is ${r.w}×${r.h}`;
      return { summary, copy: `${r.w}×${r.h}`, complete: 1, body: [pair(stack('leading', line(hero(r.from.join('×'), true)), line(chip('from'))), icon('arrow.right'), stack('trailing', line(hero(`${r.w}×${r.h}`)), line(chip(`${Math.round(r.w / r.from[0] * 100)}%`)))), line(meta(`kept at ${ratio(...r.from).exact}`))] };
    }
  });
  jevie.registerCard({
    name: 'rem', label: 'px ↔ rem', symbol: 'textformat.size', match: { pattern: REM }, examples: ['24px to rem', '1.5rem to px'],
    async render(said) {
      const r = rem(said);
      if (!r) return { summary: 'px ↔ rem', complete: 0, body: [line(meta('Type a size and a unit: “24px to rem”'))] };
      const out = `${Number(r.out.toFixed(4))}${r.to}`;
      return { summary: `${r.v}${r.from} = ${out}`, copy: out, complete: 1, body: [pair(stack('leading', line(hero(`${r.v}${r.from}`, true)), line(chip('from'))), icon('equal'), stack('trailing', line(hero(out)), line(chip(`root ${r.base}px`)))), line(meta('rem and em at the root size (16px unless “base 18”)'))] };
    }
  });
}
