// Materials for a job, as cards while they are typed, worked out on this Mac:
//
//   "paint 12x14 room 8ft walls", "paint 12x14 room 9 ft 1 coat"   walls (less a door and two windows), 350 sq ft a gallon, 2 coats
//   "flooring 12x14", "tile 10x8 15% waste"                         square feet plus waste (10% unless named), boxes of 20 sq ft
//   "concrete 10x10 4 inches", "concrete 20x4 6 in"                 cubic yards, and 80 lb bags

export const PAINT = '^paint\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?\\s*(?:ft\\s+)?room\\s+\\d+(?:\\.\\d+)?\\s*(?:ft|feet|\')?(?:\\s+walls?)?(?:\\s+\\d\\s+coats?)?$';
export const FLOOR = '^(?:flooring|floor|tile|carpet|laminate)\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?(?:\\s*(?:ft|feet))?(?:\\s+\\d+\\s*%\\s+waste)?$';
export const CONCRETE = '^concrete\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?(?:\\s*(?:ft|feet))?\\s+\\d+(?:\\.\\d+)?\\s*(?:in|inches|"|inch)$';
const dims = t => { const m = String(t).match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/); return m ? [Number(m[1]), Number(m[2])] : null; };

export function paint(said) {
  const t = String(said).toLowerCase(); const d = dims(t); const height = Number(t.match(/room\s+(\d+(?:\.\d+)?)/)?.[1]);
  if (!d || !(height > 0)) return null;
  const coats = Number(t.match(/(\d)\s+coats?/)?.[1] ?? 2);
  const walls = 2 * (d[0] + d[1]) * height - 21 - 2 * 15;
  const area = Math.max(0, walls) * coats;
  return { walls: Math.max(0, walls), coats, area, gallons: area / 350, ceiling: d[0] * d[1] };
}
export function floor(said) {
  const t = String(said).toLowerCase(); const d = dims(t); if (!d) return null;
  const waste = Number(t.match(/(\d+)\s*%\s+waste/)?.[1] ?? 10) / 100;
  const area = d[0] * d[1];
  return { area, waste, needed: area * (1 + waste), boxes: Math.ceil(area * (1 + waste) / 20) };
}
export function concrete(said) {
  const t = String(said).toLowerCase(); const d = dims(t); const inches = Number(t.match(/(\d+(?:\.\d+)?)\s*(?:in|inches|"|inch)\s*$/)?.[1]);
  if (!d || !(inches > 0)) return null;
  const cubicFeet = d[0] * d[1] * inches / 12;
  return { cubicFeet, yards: cubicFeet / 27, bags80: Math.ceil(cubicFeet / 0.6), bags60: Math.ceil(cubicFeet / 0.45) };
}

export default function homeProjects(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const ask = t => ({ summary: 'Materials', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'paint', label: 'Paint', symbol: 'paintbrush', match: { pattern: PAINT }, examples: ['paint 12x14 room 8ft walls'],
    async render(said) {
      const p = paint(said); if (!p) return ask('Type the room and the wall height: “paint 12x14 room 8ft walls”');
      const summary = `${Math.ceil(p.gallons)} gallon${Math.ceil(p.gallons) === 1 ? '' : 's'} (${p.gallons.toFixed(1)}) for ${Math.round(p.walls)} sq ft of walls, ${p.coats} coat${p.coats === 1 ? '' : 's'}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${Math.ceil(p.gallons)} gal`)), line(chip(`${p.coats} coats`, 'paintbrush'))), stack('trailing', line(hero(`${Math.round(p.walls)} sq ft`, true)), line(chip('of walls')))), line(meta(`less a door and two windows · 350 sq ft a gallon · the ceiling is ${p.ceiling} sq ft more`))] };
    }
  });
  jevie.registerCard({
    name: 'flooring', label: 'Flooring', symbol: 'square.grid.3x3.fill', match: { pattern: FLOOR }, examples: ['flooring 12x14'],
    async render(said) {
      const f = floor(said); if (!f) return ask('Type the room: “flooring 12x14”');
      const summary = `${Math.ceil(f.needed)} sq ft to buy (${f.area} + ${Math.round(f.waste * 100)}% waste) · about ${f.boxes} boxes of 20 sq ft`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${Math.ceil(f.needed)} sq ft`)), line(chip(`with ${Math.round(f.waste * 100)}% waste`, 'square.grid.3x3.fill'))), stack('trailing', line(hero(`${f.boxes} boxes`, true)), line(chip('of 20 sq ft')))), line(meta(`${f.area} sq ft of floor · more waste (15%) for diagonal tile or many corners`))] };
    }
  });
  jevie.registerCard({
    name: 'concrete', label: 'Concrete', symbol: 'cube', match: { pattern: CONCRETE }, examples: ['concrete 10x10 4 inches'],
    async render(said) {
      const c = concrete(said); if (!c) return ask('Type the slab and its depth: “concrete 10x10 4 inches”');
      const summary = `${c.yards.toFixed(2)} cubic yards (${c.cubicFeet.toFixed(1)} cu ft) · ${c.bags80} bags of 80 lb`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${c.yards.toFixed(2)} yd³`)), line(chip('to order', 'cube'))), stack('trailing', line(hero(`${c.bags80} bags`, true)), line(chip('of 80 lb')))), line(meta(`${c.cubicFeet.toFixed(1)} cu ft · or ${c.bags60} bags of 60 lb · order about 10% more for spillage and uneven ground`))] };
    }
  });
}
