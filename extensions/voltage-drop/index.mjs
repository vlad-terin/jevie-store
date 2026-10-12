// A run's voltage drop, as a card while it is typed, worked out on this Mac:
// drop = 2 × length × amps × resistance (ohms a foot), the 2 for out and
// back; resistance of solid copper by AWG (NEC Chapter 9, Table 8, at 75 °C,
// coated), aluminium about 1.64 × copper. DC or single-phase AC.
//
//   "voltage drop 12v 20a 30 ft 10 awg", "voltage drop 120v 15a 100 ft 12 awg aluminum"

/// Ohms per 1000 ft, copper, NEC Chapter 9 Table 8 (uncoated stranded, 75 °C).
export const OHMS_KFT = { 18: 7.95, 16: 4.99, 14: 3.14, 12: 1.98, 10: 1.24, 8: 0.778, 6: 0.491, 4: 0.308, 3: 0.245, 2: 0.194, 1: 0.154, '1/0': 0.122, '2/0': 0.0967, '3/0': 0.0766, '4/0': 0.0608 };
const ORDER = [18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1, '1/0', '2/0', '3/0', '4/0'].map(String);
export const PATTERN = '^voltage\\s+drop\\s+[\\d.]+\\s*v\\s+[\\d.]+\\s*a\\s+[\\d.]+\\s*(?:ft|feet|m)\\s+(?:\\d{1,2}|[1-4]/0)\\s*(?:awg|gauge|ga)(?:\\s+(?:copper|cu|aluminum|aluminium|al))?$';
export function drop(said) {
  const t = String(said).toLowerCase();
  const V = Number(t.match(/([\d.]+)\s*v\b/)[1]), A = Number(t.match(/([\d.]+)\s*a\b/)[1]);
  const L = t.match(/([\d.]+)\s*(ft|feet|m)\b/); const feet = Number(L[1]) * (L[2] === 'm' ? 3.28084 : 1);
  const g = t.match(/(\d{1,2}|[1-4]\/0)\s*(?:awg|gauge|ga)/)[1];
  const al = /alumin|\bal\b/.test(t);
  const per = gauge => (OHMS_KFT[gauge] ?? NaN) / 1000 * (al ? 1.64 : 1);
  const at = gauge => 2 * feet * A * per(gauge);
  if (!Number.isFinite(per(g))) return null;
  const v = at(g);
  const fits = ORDER.find(x => at(x) / V <= 0.03) ?? null;
  return { V, A, feet, gauge: g, al, drop: v, pct: v / V, end: V - v, fits };
}

export default function voltageDrop(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'voltage-drop', label: 'Voltage drop', symbol: 'cable.connector', match: { pattern: PATTERN }, examples: ['voltage drop 12v 20a 30 ft 10 awg'],
    async render(said) {
      const d = drop(said);
      if (!d) return { summary: 'Voltage drop', complete: 0, error: true, body: [line(meta('That gauge is not in the table: 18 to 4/0 AWG'))] };
      const ok = d.pct <= 0.03;
      const summary = `${d.drop.toFixed(2)} V drop (${(d.pct * 100).toFixed(1)}%), ${d.end.toFixed(1)} V at the end, on ${d.gauge} AWG ${d.al ? 'aluminium' : 'copper'}${ok ? '' : `; ${d.fits ?? 'nothing up to 4/0'} AWG keeps it under 3%`}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${(d.pct * 100).toFixed(1)}%`, !ok)), line(chip(`${d.drop.toFixed(2)} V drop`, 'cable.connector'))), stack('trailing', line(hero(`${d.end.toFixed(1)} V`, true)), line(chip(ok ? 'under 3%' : `${d.fits ?? '—'} AWG for 3%`, ok ? 'checkmark' : 'exclamationmark.triangle')))), line(meta(`${Math.round(d.feet)} ft one way · ${d.A} A · ${d.gauge} AWG ${d.al ? 'aluminium' : 'copper'} · NEC Ch. 9 Table 8 · ampacity is a separate check: ask an electrician`))] };
    }
  });
}
