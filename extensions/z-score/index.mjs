// Standard scores, as cards while they are typed, worked out on this Mac
// on a normal distribution:
//
//   "z score 85 mean 70 sd 10"         z = (x − mean) ÷ sd, and the share below it
//   "percentile 90 mean 100 sd 15"     the value at that percentile

export const Z = '^(?:z[\\s-]?score|standard\\s+score)\\s+(?:of\\s+)?-?[\\d.]+\\s+mean\\s+-?[\\d.]+\\s+(?:sd|std|stdev|standard\\s+deviation)\\s+[\\d.]+$';
export const PCT = '^(?:\\d{1,2}(?:\\.\\d+)?(?:st|nd|rd|th)\\s+percentile|percentile\\s+\\d{1,2}(?:\\.\\d+)?)\\s+mean\\s+-?[\\d.]+\\s+(?:sd|std|stdev|standard\\s+deviation)\\s+[\\d.]+$';
// The normal CDF (Abramowitz & Stegun 7.1.26 via erf) and its inverse (Acklam).
export function cdf(z) { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2); return z >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
export function inv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -inv(1 - p);
  const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const nums = s => (String(s).match(/-?[\d.]+/g) ?? []).map(Number);

export default function zScore(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'z-score', label: 'Z-score', symbol: 'chart.bar.doc.horizontal', match: { pattern: Z }, examples: ['z score 85 mean 70 sd 10'],
    async render(said) {
      const [x, mean, sd] = nums(said.replace(/^z[\s-]?score/i, ''));
      if (!(sd > 0)) return { summary: 'Z-score', complete: 0, body: [line(meta('Type a value, the mean and the sd: “z score 85 mean 70 sd 10”'))] };
      const z = (x - mean) / sd, below = cdf(z);
      return { summary: `z = ${z.toFixed(2)}: higher than ${(below * 100).toFixed(1)}%`, copy: z.toFixed(2), complete: 1, body: [spread(stack('leading', line(hero(`z ${z >= 0 ? '+' : ''}${z.toFixed(2)}`)), line(chip(`${(below * 100).toFixed(1)}th percentile`, 'chart.bar.doc.horizontal'))), stack('trailing', line(meta(`${(below * 100).toFixed(1)}% below`)), line(meta(`${((1 - below) * 100).toFixed(1)}% above`)))), line(meta(`(${x} − ${mean}) ÷ ${sd} · assumes a normal distribution`))] };
    }
  });
  jevie.registerCard({
    name: 'percentile-value', label: 'Percentile', symbol: 'chart.bar.doc.horizontal', match: { pattern: PCT }, examples: ['percentile 90 mean 100 sd 15'],
    async render(said) {
      const [p, mean, sd] = nums(said);
      const z = inv(p / 100), x = mean + z * sd;
      return { summary: `The ${p}th percentile is ${x.toFixed(2)} (z = ${z.toFixed(3)})`, copy: x.toFixed(2), complete: 1, body: [spread(stack('leading', line(hero(x.toFixed(2))), line(chip(`${p}th percentile`, 'chart.bar.doc.horizontal'))), stack('trailing', line(meta(`z = ${z.toFixed(3)}`)), line(meta(`mean ${mean} · sd ${sd}`)))), line(meta('assumes a normal distribution'))] };
    }
  });
}
