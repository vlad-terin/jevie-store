// Cash flows judged, as cards while they are typed, worked out on this Mac.
// The first flow is today (usually the outlay, negative), the rest one a period.
//
//   "npv 8% -10000 3000 4000 5000"     net present value at a discount rate, and the payback period
//   "irr -10000 3000 4000 5000"        internal rate of return (bisection, then Newton)

const F = '-?\\$?[\\d,.]+[km]?';
export const NPV = `^npv\\s+(?:at\\s+)?[\\d.]+\\s*%\\s+(?:${F}[\\s,]+)+${F}$`;
export const IRR = `^irr\\s+(?:${F}[\\s,]+)+${F}$`;
const num = s => { const m = String(s).replace(/[$,]/g, '').toLowerCase().match(/^(-?[\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
export const flowsIn = t => (String(t).replace(/^(?:npv|irr)\s+(?:at\s+)?(?:[\d.]+\s*%\s+)?/i, '').match(new RegExp(F, 'gi')) ?? []).map(num).filter(Number.isFinite);
export const npv = (rate, flows) => flows.reduce((sum, f, i) => sum + f / (1 + rate) ** i, 0);
export function irr(flows) {
  if (!(flows.some(f => f < 0) && flows.some(f => f > 0))) return null;
  let lo = -0.99, hi = 10;
  if (npv(lo, flows) * npv(hi, flows) > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (npv(lo, flows) * npv(mid, flows) <= 0) hi = mid; else lo = mid; if (hi - lo < 1e-10) break; }
  return (lo + hi) / 2;
}
export function payback(flows) {
  let sum = 0;
  for (let i = 0; i < flows.length; i++) { const before = sum; sum += flows[i]; if (i > 0 && before < 0 && sum >= 0) return i - 1 + (-before / flows[i]); }
  return null;
}
const money = n => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

export default function npvIrr(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const ask = t => ({ summary: 'Cash flows', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'npv', label: 'NPV', symbol: 'function', match: { pattern: NPV }, examples: ['npv 8% -10000 3000 4000 5000'],
    async render(said) {
      const rate = Number(said.match(/([\d.]+)\s*%/)?.[1]) / 100, flows = flowsIn(said);
      if (!(flows.length >= 2)) return ask('Type a rate and the cash flows, today first: “npv 8% -10000 3000 4000 5000”');
      const v = npv(rate, flows), r = irr(flows), pb = payback(flows);
      const summary = `NPV ${money(v)} at ${(rate * 100).toFixed(1)}%${r !== null ? ` · IRR ${(r * 100).toFixed(2)}%` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(money(v), v < 0)), line(chip(v >= 0 ? 'worth doing at this rate' : 'loses value at this rate', v >= 0 ? 'checkmark.circle' : 'xmark.circle'))), stack('trailing', line(hero(r !== null ? `${(r * 100).toFixed(1)}%` : '—', true)), line(chip('IRR')))),
        line(meta(`${flows.length} flows · discounted at ${(rate * 100).toFixed(1)}% a period${pb !== null ? ` · pays back in ${pb.toFixed(1)} periods` : ' · never pays back'}`))] };
    }
  });
  jevie.registerCard({
    name: 'irr', label: 'IRR', symbol: 'percent', match: { pattern: IRR }, examples: ['irr -10000 3000 4000 5000'],
    async render(said) {
      const flows = flowsIn(said), r = irr(flows), pb = payback(flows);
      if (r === null) return ask(flows.length < 2 ? 'Type the cash flows, today first: “irr -10000 3000 4000 5000”' : 'No rate of return: the flows need an outlay and a return');
      const summary = `IRR ${(r * 100).toFixed(2)}%`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${(r * 100).toFixed(2)}%`)), line(chip('internal rate of return', 'percent'))), stack('trailing', line(hero(pb !== null ? `${pb.toFixed(1)}` : '—', true)), line(chip('periods to pay back')))),
        line(meta(`the rate at which these ${flows.length} flows are worth nothing today · total ${money(flows.reduce((a, b) => a + b, 0))} undiscounted`))] };
    }
  });
}
