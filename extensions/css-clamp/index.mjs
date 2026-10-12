// Fluid sizes, as cards while they are typed, worked out on this Mac:
//
//   "clamp 16px 24px 320 1280", "fluid 1rem 1.5rem 360px 1440px"   min and max size between two viewport widths
//   "24px to vw at 1440", "5vw at 390"                            a fixed size as vw, or vw as pixels

export const CLAMP = '^(?:clamp|fluid)\\s+[\\d.]+\\s*(?:px|rem)\\s+[\\d.]+\\s*(?:px|rem)\\s+[\\d.]+\\s*(?:px)?\\s+[\\d.]+\\s*(?:px)?(?:\\s+base\\s+\\d+)?$';
export const VW = '^[\\d.]+\\s*px\\s+(?:to|in)\\s+vw\\s+(?:at|for)\\s+[\\d.]+(?:\\s*px)?$|^[\\d.]+\\s*vw\\s+(?:at|for|on)\\s+[\\d.]+(?:\\s*px)?$';
const r4 = x => Number(x.toFixed(4));
export function clamp(said) {
  const t = String(said).toLowerCase();
  const sizes = [...t.matchAll(/([\d.]+)\s*(px|rem)/g)].slice(0, 2), base = Number(t.match(/base\s+(\d+)/)?.[1] ?? 16);
  const widths = t.replace(/[\d.]+\s*(?:px|rem)\s+[\d.]+\s*(?:px|rem)/, '').match(/[\d.]+/g)?.map(Number).filter(n => n >= 100) ?? [];
  if (sizes.length < 2 || widths.length < 2) return null;
  const px = ([, v, u]) => u === 'rem' ? Number(v) * base : Number(v);
  const [minPx, maxPx] = sizes.map(px), [minW, maxW] = widths;
  if (!(maxW > minW)) return null;
  const slope = (maxPx - minPx) / (maxW - minW), intercept = minPx - slope * minW;
  const css = `clamp(${r4(minPx / base)}rem, ${r4(intercept / base)}rem + ${r4(slope * 100)}vw, ${r4(maxPx / base)}rem)`;
  return { minPx, maxPx, minW, maxW, slope, intercept, css, base };
}

export default function cssClamp(jevie) {
  const { line, spread, stack, hero, chip, meta, mono } = jevie.CardParts;
  jevie.registerCard({
    name: 'clamp', label: 'CSS clamp', symbol: 'arrow.left.and.right.text.vertical', match: { pattern: CLAMP }, examples: ['clamp 16px 24px 320 1280'],
    async render(said) {
      const c = clamp(said);
      if (!c) return { summary: 'CSS clamp', complete: 0, body: [line(meta('Type min and max sizes and two viewport widths: “clamp 16px 24px 320 1280”'))] };
      return { summary: c.css, copy: c.css, complete: 1, body: [line(mono(c.css)), spread(chip(`${c.minPx}px at ${c.minW}px`), chip(`${c.maxPx}px at ${c.maxW}px`)), line(meta(`grows ${r4(c.slope * 100)}px for every 100px of width · rem at a ${c.base}px root, so it follows the reader's zoom · ↵ copies it`))] };
    }
  });
  jevie.registerCard({
    name: 'vw', label: 'px ↔ vw', symbol: 'rectangle.expand.vertical', match: { pattern: VW }, examples: ['24px to vw at 1440'],
    async render(said) {
      const t = said.toLowerCase(), width = Number(t.match(/(?:at|for|on)\s+([\d.]+)/)[1]);
      const px = t.match(/([\d.]+)\s*px\s+(?:to|in)\s+vw/), vw = t.match(/([\d.]+)\s*vw/);
      const out = px ? `${r4(Number(px[1]) / width * 100)}vw` : `${r4(Number(vw[1]) * width / 100)}px`;
      return { summary: `${px ? `${px[1]}px` : `${vw[1]}vw`} = ${out} at ${width}px wide`, copy: out, complete: 1, body: [spread(stack('leading', line(hero(out)), line(chip(`at ${width}px wide`)))), line(meta('1vw is 1% of the viewport\'s width'))] };
    }
  });
}
