// Garden sums, as cards while they are typed, worked out on this Mac:
//
//   "mulch 10x12 ft 3 inches", "soil 4x8 ft 10 inches", "compost 3x6 2 in"     cubic feet, cubic yards, 2 cu ft bags
//   "plants 4x8 ft 12 inch spacing", "plants 10x3 ft 18 in apart"               how many fit, in a square grid

export const FILL = '^(?:mulch|soil|topsoil|compost|gravel|sand|bark)\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?(?:\\s*(?:ft|feet))?\\s+\\d+(?:\\.\\d+)?\\s*(?:in|inches|"|inch)(?:\\s+deep)?$';
export const PLANTS = '^plants?\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?(?:\\s*(?:ft|feet))?\\s+\\d+(?:\\.\\d+)?\\s*(?:in|inches|"|inch)\\s+(?:spacing|apart)$';
const dims = t => { const m = String(t).toLowerCase().match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*(?:ft|feet))?\s+(\d+(?:\.\d+)?)/); return m ? m.slice(1, 4).map(Number) : null; };
export function fill(said) { const d = dims(said); if (!d) return null; const [w, l, inches] = d; const cuft = w * l * inches / 12; return { what: String(said).trim().split(/\s+/)[0].toLowerCase(), w, l, inches, cuft, cuyd: cuft / 27, bags: Math.ceil(cuft / 2) }; }
export function plants(said) { const d = dims(said); if (!d) return null; const [w, l, sp] = d; const across = Math.floor(w * 12 / sp), down = Math.floor(l * 12 / sp); return { w, l, sp, across, down, count: across * down }; }

export default function gardenMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'garden-fill', label: 'Mulch & soil', symbol: 'leaf', match: { pattern: FILL }, examples: ['mulch 10x12 ft 3 inches'],
    async render(said) {
      const f = fill(said);
      if (!f) return { summary: 'Mulch & soil', complete: 0, body: [line(meta('Type the bed and the depth: “mulch 10x12 ft 3 inches”'))] };
      const summary = `${f.cuyd.toFixed(2)} cu yd (${f.cuft.toFixed(1)} cu ft) of ${f.what}, or ${f.bags} bags of 2 cu ft`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${f.cuyd.toFixed(2)} yd³`)), line(chip(f.what, 'leaf'))), stack('trailing', line(hero(`${f.bags} bags`, true)), line(chip('2 cu ft each')))), line(meta(`${f.w} × ${f.l} ft × ${f.inches}″ = ${f.cuft.toFixed(1)} cu ft · soil settles: add about 10–20% for a new bed`))] };
    }
  });
  jevie.registerCard({
    name: 'plant-spacing', label: 'Plant spacing', symbol: 'camera.macro', match: { pattern: PLANTS }, examples: ['plants 4x8 ft 12 inch spacing'],
    async render(said) {
      const p = plants(said);
      if (!p || !p.count) return { summary: 'Plant spacing', complete: 0, body: [line(meta('Type the bed and the spacing: “plants 4x8 ft 12 inch spacing”'))] };
      const summary = `${p.count} plants (${p.across} × ${p.down}) in ${p.w} × ${p.l} ft at ${p.sp}″`;
      return { summary, copy: String(p.count), complete: 1, body: [spread(stack('leading', line(hero(String(p.count))), line(chip('plants', 'camera.macro'))), stack('trailing', line(meta(`${p.across} across × ${p.down} down`)), line(meta(`${p.sp}″ apart`)))), line(meta('a square grid, edge to edge · offset rows fit about 15% more'))] };
    }
  });
}
