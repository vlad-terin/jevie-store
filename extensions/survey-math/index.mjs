// Survey sums, as cards while they are typed, worked out on this Mac at the
// most cautious proportion (50%) and 95% confidence unless named:
//
//   "margin of error 400 responses", "margin of error 250 of 1200"       ± at that sample (finite population when given)
//   "responses needed 5%", "responses needed 3% population 2000 99%"    the sample for that margin

export const MOE = '^margin\\s+of\\s+error\\s+[\\d,]+(?:\\s+(?:responses|respondents|people|answers))?(?:\\s+(?:of|out\\s+of|population)\\s+[\\d,]+)?(?:\\s+(?:at\\s+)?(?:90|95|99)\\s*%)?$';
export const NEEDED = '^(?:responses|survey\\s+sample|respondents)\\s+needed\\s+(?:for\\s+)?(?:±\\s*)?[\\d.]+\\s*%(?:\\s+(?:population|of)\\s+[\\d,]+)?(?:\\s+(?:at\\s+)?(?:90|95|99)\\s*%)?$';
const Z = { 90: 1.645, 95: 1.96, 99: 2.576 };
const nums = s => String(s).replace(/,/g, '');
export function moe(said) {
  const t = nums(said).toLowerCase();
  const n = Number(t.match(/error\s+(\d+)/)[1]), N = Number(t.match(/(?:of|out\s+of|population)\s+(\d+)/)?.[1]) || null;
  const conf = Number(t.match(/(90|95|99)\s*%$/)?.[1] ?? 95);
  if (!(n > 0) || (N && n > N)) return null;
  const fpc = N && N > 1 ? Math.sqrt((N - n) / (N - 1)) : 1;
  return { n, N, conf, e: Z[conf] * Math.sqrt(0.25 / n) * fpc };
}
export function needed(said) {
  const t = nums(said).toLowerCase();
  const e = Number(t.match(/needed\s+(?:for\s+)?(?:±\s*)?([\d.]+)\s*%/)[1]) / 100;
  const N = Number(t.match(/(?:population|of)\s+(\d+)/)?.[1]) || null;
  const conf = Number(t.match(/[\d.]+\s*%.*\s(90|95|99)\s*%$/)?.[1] ?? 95);
  if (!(e > 0 && e < 1)) return null;
  const n0 = Z[conf] ** 2 * 0.25 / (e * e);
  return { e, N, conf, n0, n: Math.ceil(N ? n0 / (1 + (n0 - 1) / N) : n0) };
}

export default function surveyMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'margin-of-error', label: 'Margin of error', symbol: 'checklist', match: { pattern: MOE }, examples: ['margin of error 400 responses'],
    async render(said) {
      const m = moe(said);
      if (!m) return { summary: 'Margin of error', complete: 0, body: [line(meta('Type the responses (and the population): “margin of error 400 responses”'))] };
      const summary = `± ${(m.e * 100).toFixed(1)}% at ${m.conf}% confidence with ${m.n.toLocaleString('en-US')} responses${m.N ? ` of ${m.N.toLocaleString('en-US')}` : ''}`;
      return { summary, copy: `±${(m.e * 100).toFixed(1)}%`, complete: 1, body: [spread(stack('leading', line(hero(`± ${(m.e * 100).toFixed(1)}%`)), line(chip(`${m.conf}% confidence`, 'checklist'))), stack('trailing', line(meta(`${m.n.toLocaleString('en-US')} responses`)), line(meta(m.N ? `population ${m.N.toLocaleString('en-US')}` : 'large population')))), line(meta('at a 50% answer, the widest case · a random sample only: who chose to answer is a bias no margin covers'))] };
    }
  });
  jevie.registerCard({
    name: 'responses-needed', label: 'Responses needed', symbol: 'person.3', match: { pattern: NEEDED }, examples: ['responses needed 5% population 2000'],
    async render(said) {
      const r = needed(said);
      if (!r) return { summary: 'Responses needed', complete: 0, body: [line(meta('Type a margin: “responses needed 5%”'))] };
      const summary = `${r.n.toLocaleString('en-US')} responses for ± ${(r.e * 100).toFixed(1)}% at ${r.conf}% confidence${r.N ? ` from ${r.N.toLocaleString('en-US')}` : ''}`;
      return { summary, copy: String(r.n), complete: 1, body: [spread(stack('leading', line(hero(r.n.toLocaleString('en-US'))), line(chip('responses', 'person.3'))), stack('trailing', line(meta(`± ${(r.e * 100).toFixed(1)}% · ${r.conf}%`)), line(meta(r.N ? `population ${r.N.toLocaleString('en-US')} (${Math.ceil(r.n0)} if it were large)` : 'large population')))), line(meta('divide by the response rate you expect for how many to invite'))] };
    }
  });
}
