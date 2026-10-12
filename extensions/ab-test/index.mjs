// Experiments, as cards while they are typed, worked out on this Mac:
//
//   "ab 120/2400 vs 150/2380"            conversions/visitors of A and B: the lift,
//                                       a two-sided z-test's p-value, the confidence
//   "sample size 4% baseline 10% lift"   visitors each variant needs (95% confidence, 80% power)

export const AB = '^(?:ab|a/b|ab\\s+test|split\\s+test)\\s+[\\d,]+\\s*/\\s*[\\d,]+\\s+(?:vs\\.?|v|and|,)\\s+[\\d,]+\\s*/\\s*[\\d,]+$';
export const SIZE = '^sample\\s+size\\s+[\\d.]+\\s*%\\s+(?:baseline|base|conversion)?\\s*[\\d.]+\\s*%\\s+(?:lift|mde|change|uplift)(?:\\s+relative|\\s+absolute)?$';
const n = s => Number(String(s).replace(/,/g, ''));

/// The standard normal's cumulative function (Abramowitz-Stegun 26.2.17).
export function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
export function abTest(said) {
  const m = String(said).match(/([\d,]+)\s*\/\s*([\d,]+)\s+(?:vs\.?|v|and|,)\s+([\d,]+)\s*\/\s*([\d,]+)/i);
  if (!m) return null;
  const [ca, na, cb, nb] = [m[1], m[2], m[3], m[4]].map(n);
  if (!(na > 0 && nb > 0) || ca > na || cb > nb) return null;
  const pa = ca / na, pb = cb / nb, pool = (ca + cb) / (na + nb);
  const se = Math.sqrt(pool * (1 - pool) * (1 / na + 1 / nb));
  const z = se ? (pb - pa) / se : 0;
  const p = 2 * (1 - phi(Math.abs(z)));
  return { pa, pb, lift: pa ? (pb - pa) / pa : 0, z, p, confidence: 1 - p, significant: p < 0.05, na, nb };
}
export function sampleSize(said) {
  const m = String(said).match(/([\d.]+)\s*%\s+(?:baseline|base|conversion)?\s*([\d.]+)\s*%\s+(?:lift|mde|change|uplift)(\s+absolute)?/i);
  if (!m) return null;
  const p1 = Number(m[1]) / 100, change = Number(m[2]) / 100;
  const p2 = m[3] ? p1 + change : p1 * (1 + change);
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1 && p1 !== p2)) return null;
  const za = 1.959964, zb = 0.841621, pbar = (p1 + p2) / 2;
  const each = Math.ceil(((za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2));
  return { p1, p2, each, total: each * 2, absolute: Boolean(m[3]) };
}
const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

export default function abTestCards(jevie) {
  const { line, pair, spread, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'ab-test', label: 'A/B test', symbol: 'arrow.left.arrow.right.square', match: { pattern: AB }, examples: ['ab 120/2400 vs 150/2380'],
    async render(said) {
      const r = abTest(said);
      if (!r) return { summary: 'A/B test', complete: 0, body: [line(meta('Type conversions/visitors for each, like “ab 120/2400 vs 150/2380”'))] };
      const summary = `B ${r.lift >= 0 ? '+' : ''}${pct(r.lift, 1)} vs A (${pct(r.pa)} → ${pct(r.pb)}), p = ${r.p.toFixed(3)}: ${r.significant ? 'significant at 95%' : 'not significant yet'}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(pct(r.pa), true)), line(chip(`A · ${r.na.toLocaleString('en-US')}`))), icon('arrow.right'), stack('trailing', line(hero(pct(r.pb))), line(chip(`B · ${r.nb.toLocaleString('en-US')}`)))),
        spread(chip(`${r.lift >= 0 ? '+' : ''}${pct(r.lift, 1)} lift`, r.lift >= 0 ? 'arrow.up.right' : 'arrow.down.right'), chip(r.significant ? `${pct(r.confidence, 1)} confident` : 'not significant', r.significant ? 'checkmark.seal' : 'hourglass')),
        line(meta(`two-sided z-test · p = ${r.p.toFixed(4)} · ${r.significant ? 'the difference is unlikely to be chance' : 'keep it running, or the difference may be chance'}`))] };
    }
  });
  jevie.registerCard({
    name: 'sample-size', label: 'Sample size', symbol: 'person.3.sequence', match: { pattern: SIZE }, examples: ['sample size 4% baseline 10% lift'],
    async render(said) {
      const r = sampleSize(said);
      if (!r) return { summary: 'Sample size', complete: 0, body: [line(meta('Type a baseline and a lift, like “sample size 4% baseline 10% lift”'))] };
      const summary = `${r.each.toLocaleString('en-US')} visitors per variant (${r.total.toLocaleString('en-US')} total) to see ${pct(r.p1, 1)} → ${pct(r.p2, 1)}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(r.each.toLocaleString('en-US'))), line(chip('per variant', 'person.3.sequence'))), stack('trailing', line(hero(r.total.toLocaleString('en-US'), true)), line(chip('in all')))),
        line(meta(`${pct(r.p1, 1)} → ${pct(r.p2, 1)} (${r.absolute ? 'absolute' : 'relative'} lift) · 95% confidence, 80% power, two-sided`))] };
    }
  });
}
