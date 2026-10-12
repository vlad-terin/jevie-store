// A pool's water, as a card while it is typed, worked out on this Mac in
// US gallons (7.48 a cubic foot) and litres, the depth averaged from
// shallow to deep:
//
//   "pool volume 16x32 ft 3 to 6 ft deep"     rectangle
//   "pool volume round 24 ft 4 ft deep"       a circle by its diameter
//   "pool volume oval 15x30 ft 4 ft deep"     an oval (π ÷ 4 of the rectangle)

export const PATTERN = '^(?:pool|hot\\s+tub|spa)\\s+(?:volume|gallons|size|water)\\s+(?:(?:round|circle|circular)\\s+[\\d.]+\\s*(?:ft|feet)?|(?:oval\\s+)?[\\d.]+\\s*x\\s*[\\d.]+\\s*(?:ft|feet)?)\\s+[\\d.]+(?:\\s*(?:ft|feet))?(?:\\s*(?:to|-)\\s*[\\d.]+)?\\s*(?:ft|feet)?\\s*(?:deep)?$';
export function volume(said) {
  const t = String(said).toLowerCase();
  const round = /round|circle|circular/.test(t), oval = /oval/.test(t);
  const dims = t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/); const dia = round ? Number(t.match(/(?:round|circle|circular)\s+([\d.]+)/)[1]) : null;
  const depthPart = t.replace(/^.*?(?:\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?|(?:round|circle|circular)\s+[\d.]+)\s*(?:ft|feet)?\s+/, '');
  const d = depthPart.match(/([\d.]+)(?:\s*(?:ft|feet))?(?:\s*(?:to|-)\s*([\d.]+))?/); const avg = d[2] ? (Number(d[1]) + Number(d[2])) / 2 : Number(d[1]);
  const area = round ? Math.PI * (dia / 2) ** 2 : dims ? Number(dims[1]) * Number(dims[2]) * (oval ? Math.PI / 4 : 1) : NaN;
  const cuft = area * avg;
  return { shape: round ? 'round' : oval ? 'oval' : 'rectangular', area, avg, cuft, gallons: cuft * 7.48052, litres: cuft * 28.3168 };
}

export default function poolVolume(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pool-volume', label: 'Pool volume', symbol: 'figure.pool.swim', match: { pattern: PATTERN }, examples: ['pool volume 16x32 ft 3 to 6 ft deep'],
    async render(said) {
      const v = volume(said);
      if (!(v.cuft > 0)) return { summary: 'Pool volume', complete: 0, body: [line(meta('Type the size and depth: “pool volume 16x32 ft 3 to 6 ft deep”'))] };
      return { summary: `About ${Math.round(v.gallons).toLocaleString('en-US')} gallons (${Math.round(v.litres).toLocaleString('en-US')} L) in a ${v.shape} pool, ${v.avg} ft average depth`, copy: `${Math.round(v.gallons)} gallons`, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(v.gallons).toLocaleString('en-US')} gal`)), line(chip(v.shape, 'figure.pool.swim'))), stack('trailing', line(hero(`${Math.round(v.litres / 1000).toLocaleString('en-US')} m³`, true)), line(chip(`${Math.round(v.litres).toLocaleString('en-US')} L`)))), line(meta(`${Math.round(v.area)} sq ft × ${v.avg} ft average · 7.48 gallons a cubic foot · chemical doses go by this number`))] };
    }
  });
}
