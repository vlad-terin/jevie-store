// What a parcel is billed at, as a card while it is typed, worked out on this
// Mac: dimensional weight (L × W × H ÷ divisor) against the actual weight,
// whichever is more, rounded up as carriers round.
//
//   "dim weight 20x16x12 in 18 lb"      ÷ 139 (UPS and FedEx daily rates; USPS uses 166)
//   "volumetric 50x40x30 cm 8 kg"       ÷ 5000 (international express)

export const PATTERN = '^(?:dim(?:ensional)?\\s+weight|volumetric(?:\\s+weight)?|shipping\\s+weight)\\s+\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?\\s*(?:in|inches|cm)?(?:\\s+[\\d.]+\\s*(?:lb|lbs|kg))?(?:\\s+(?:usps|divisor\\s+\\d+))?$';
export function dim(said) {
  const t = String(said).toLowerCase();
  const d = t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(in|inches|cm)?/);
  if (!d) return null;
  const metric = d[4] === 'cm' || /\bkg\b/.test(t);
  const divisor = Number(t.match(/divisor\s+(\d+)/)?.[1]) || (metric ? 5000 : /usps/.test(t) ? 166 : 139);
  const volume = Number(d[1]) * Number(d[2]) * Number(d[3]);
  const dimWeight = volume / divisor;
  const actual = Number(t.match(/([\d.]+)\s*(?:lb|lbs|kg)/)?.[1] ?? NaN);
  const billed = Math.ceil(Number.isFinite(actual) ? Math.max(dimWeight, actual) : dimWeight);
  return { dims: [d[1], d[2], d[3]].map(Number), unit: metric ? 'kg' : 'lb', lengthUnit: metric ? 'cm' : 'in', divisor, dimWeight, actual: Number.isFinite(actual) ? actual : null, billed };
}

export default function shippingWeight(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'dim-weight', label: 'Shipping weight', symbol: 'shippingbox', match: { pattern: PATTERN }, examples: ['dim weight 20x16x12 in 18 lb'],
    async render(said) {
      const d = dim(said);
      if (!d) return { summary: 'Shipping weight', complete: 0, body: [line(meta('Type the box and its weight: “dim weight 20x16x12 in 18 lb”'))] };
      const byDim = d.actual === null || d.dimWeight > d.actual;
      const summary = `Billed at ${d.billed} ${d.unit} (dimensional ${d.dimWeight.toFixed(1)} ${d.unit}${d.actual !== null ? `, actual ${d.actual} ${d.unit}` : ''})`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${d.dimWeight.toFixed(1)} ${d.unit}`, !byDim)), line(chip('dimensional'))), icon('arrow.right'), stack('trailing', line(hero(`${d.billed} ${d.unit}`)), line(chip(byDim ? 'billed by size' : 'billed by weight', 'shippingbox')))), line(meta(`${d.dims.join(' × ')} ${d.lengthUnit} ÷ ${d.divisor}${d.actual !== null ? ` · actual ${d.actual} ${d.unit}` : ' · add the actual weight to compare'} · rounded up`))] };
    }
  });
}
