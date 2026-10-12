// Bedside sums, as cards while they are typed, worked out on this Mac. For
// clinicians checking arithmetic, not for diagnosis; local ranges differ.
//
//   "qtc 400 hr 75", "qtc 440 ms rr 0.8"                     Bazett, Fridericia and Framingham
//   "anion gap na 140 cl 104 hco3 24 albumin 2.5"           Na − (Cl + HCO3), albumin-corrected when given (g/dL)
//   "map 120/80", "mean arterial pressure 90/60"            DBP + (SBP − DBP) ÷ 3
//   "corrected calcium 8.0 albumin 2.5"                     Ca + 0.8 × (4 − albumin), mg/dL and g/dL
//   "maintenance fluids 25 kg"                               Holliday-Segar 4-2-1 (mL/h) and 100-50-20 (mL/day)

export const QTC = '^qtc\\s+\\d{3}\\s*(?:ms)?\\s+(?:hr\\s+\\d{2,3}|rr\\s+[\\d.]+\\s*s?|\\d{2,3}\\s*bpm)$';
export const GAP = '^anion\\s+gap\\s+(?:na\\s+)?\\d{3}\\s+(?:cl\\s+)?\\d{2,3}\\s+(?:hco3|bicarb|co2)?\\s*\\d{1,2}(?:\\.\\d)?(?:\\s+(?:albumin|alb)\\s+[\\d.]+)?$';
export const MAP = '^(?:map|mean\\s+arterial\\s+pressure)\\s+\\d{2,3}\\s*/\\s*\\d{2,3}$';
export const CA = '^corrected\\s+(?:calcium|ca)\\s+[\\d.]+\\s+(?:albumin|alb)\\s+[\\d.]+$';
export const FLUIDS = '^(?:maintenance\\s+fluids?|maintenance\\s+rate|4-2-1)\\s+[\\d.]+\\s*kg$';
const nums = s => (String(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
export function qtc(said) {
  const t = String(said).toLowerCase(); const qt = Number(t.match(/qtc\s+(\d{3})/)[1]);
  const hr = Number(t.match(/(?:hr\s+(\d{2,3})|(\d{2,3})\s*bpm)/)?.slice(1).find(Boolean)); const rr = hr ? 60 / hr : Number(t.match(/rr\s+([\d.]+)/)[1]);
  return { qt, rr, hr: hr || 60 / rr, bazett: qt / Math.sqrt(rr), fridericia: qt / Math.cbrt(rr), framingham: qt + 154 * (1 - rr) };
}
// The labels off first: "hco3" and "co2" carry digits of their own.
export function gap(said) { const n = nums(String(said).toLowerCase().replace(/hco3|co2|bicarb/g, ' ')); const [na, cl, hco3] = n; const alb = /alb/.test(String(said).toLowerCase()) ? n[3] : null; const ag = na - (cl + hco3); return { na, cl, hco3, ag, alb, corrected: alb !== null ? ag + 2.5 * (4 - alb) : null }; }
export function map(said) { const [s, d] = nums(said); return { s, d, map: d + (s - d) / 3 }; }
export function calcium(said) { const [ca, alb] = nums(said); return { ca, alb, corrected: ca + 0.8 * (4 - alb) }; }
export function fluids(said) { const kg = nums(said)[0]; const hour = kg <= 10 ? 4 * kg : kg <= 20 ? 40 + 2 * (kg - 10) : 60 + (kg - 20); const day = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20); return { kg, hour, day }; }
const NOTE = 'for checking arithmetic, not diagnosis · your lab and protocols decide';

export default function bedsideMath(jevie) {
  const { line, spread, stack, hero, chip, meta, halves } = jevie.CardParts;
  jevie.registerCard({
    name: 'qtc', label: 'QTc', symbol: 'waveform.path.ecg', match: { pattern: QTC }, examples: ['qtc 400 hr 75'],
    async render(said) {
      const q = qtc(said);
      const flag = q.bazett >= 500 ? 'over 500: high risk' : q.bazett > 470 ? 'long (over 470)' : q.bazett > 450 ? 'borderline in men (over 450)' : 'normal range';
      return { summary: `QTc ${Math.round(q.bazett)} ms Bazett, ${Math.round(q.fridericia)} Fridericia (QT ${q.qt}, HR ${Math.round(q.hr)})`, copy: `QTc ${Math.round(q.bazett)} ms`, complete: 1, body: [halves(stack('center', line(hero(`${Math.round(q.bazett)}`, q.bazett <= 450)), line(chip('Bazett'))), stack('center', line(hero(`${Math.round(q.fridericia)}`, true)), line(chip('Fridericia'))), stack('center', line(hero(`${Math.round(q.framingham)}`, true)), line(chip('Framingham')))), line(meta(`ms · QT ${q.qt}, HR ${Math.round(q.hr)}, RR ${q.rr.toFixed(2)} s · ${flag} · Bazett overcorrects above 100 bpm`)), line(meta(NOTE))] };
    }
  });
  jevie.registerCard({
    name: 'anion-gap', label: 'Anion gap', symbol: 'drop.triangle', match: { pattern: GAP }, examples: ['anion gap na 140 cl 104 hco3 24'],
    async render(said) {
      const g = gap(said); const shown = g.corrected ?? g.ag;
      return { summary: `Anion gap ${g.ag}${g.corrected !== null ? `, ${g.corrected.toFixed(1)} corrected for albumin ${g.alb}` : ''}`, copy: String(Number(shown.toFixed(1))), complete: 1, body: [spread(stack('leading', line(hero(String(Number(shown.toFixed(1))), shown <= 12)), line(chip(g.corrected !== null ? 'albumin-corrected' : 'anion gap', 'drop.triangle'))), stack('trailing', line(meta(`${g.na} − (${g.cl} + ${g.hco3}) = ${g.ag}`)), line(meta(shown > 12 ? 'raised (usual about 8–12)' : 'usual range about 8–12')))), line(meta(`mEq/L, potassium left out · albumin correction + 2.5 × (4 − albumin g/dL) · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'map', label: 'Mean arterial pressure', symbol: 'heart.text.square', match: { pattern: MAP }, examples: ['map 120/80'],
    async render(said) {
      const m = map(said);
      return { summary: `MAP ${Math.round(m.map)} mmHg (${m.s}/${m.d})`, copy: `MAP ${Math.round(m.map)}`, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(m.map)} mmHg`, m.map >= 65)), line(chip('mean arterial pressure', 'heart.text.square'))), stack('trailing', line(meta(`${m.d} + (${m.s} − ${m.d}) ÷ 3`)), line(meta(m.map < 65 ? 'under 65: below the usual target' : 'at least 65')))), line(meta(NOTE))] };
    }
  });
  jevie.registerCard({
    name: 'corrected-calcium', label: 'Corrected calcium', symbol: 'drop', match: { pattern: CA }, examples: ['corrected calcium 8.0 albumin 2.5'],
    async render(said) {
      const c = calcium(said);
      return { summary: `Corrected calcium ${c.corrected.toFixed(1)} mg/dL (measured ${c.ca}, albumin ${c.alb})`, copy: c.corrected.toFixed(1), complete: 1, body: [spread(stack('leading', line(hero(`${c.corrected.toFixed(1)} mg/dL`)), line(chip('corrected calcium', 'drop'))), stack('trailing', line(meta(`${c.ca} + 0.8 × (4 − ${c.alb})`)), line(meta('usual about 8.5–10.5 mg/dL')))), line(meta(`Payne's formula, mg/dL and g/dL · an ionised calcium is better when it matters · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'maintenance-fluids', label: 'Maintenance fluids', symbol: 'drop.fill', match: { pattern: FLUIDS }, examples: ['maintenance fluids 25 kg'],
    async render(said) {
      const f = fluids(said);
      return { summary: `${Math.round(f.hour)} mL/h (${Math.round(f.day)} mL a day) for ${f.kg} kg`, copy: `${Math.round(f.hour)} mL/h`, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(f.hour)} mL/h`)), line(chip('4-2-1 rule', 'drop.fill'))), stack('trailing', line(hero(`${Math.round(f.day)} mL`, true)), line(chip('a day (100-50-20)')))), line(meta(`Holliday-Segar · ${f.kg} kg · adjust for losses, kidneys and heart · ${NOTE}`))] };
    }
  });
}
