// Bedside sums, as cards while they are typed, worked out on this Mac.
// A calculator, not advice: each card says which formula it used.
//
//   "bmi 180 cm 75 kg", "bmi 5'11 170 lb"            BMI (WHO band) and BSA (Mosteller)
//   "due date lmp 2026-03-01", "edd lmp mar 1"       Naegele's rule, the weeks along, the trimester
//   "crcl 65 years 70 kg creatinine 1.2 male"        Cockcroft-Gault, mL/min
//   "dose 15 mg/kg 20 kg in 3 doses max 500 mg"      a weight-based dose, split and capped
//   "drip 1000 ml over 8 hours 20 gtt"               mL/h, and drops a minute for a set
//   "glucose 100 mg/dl", "a1c 7"                     mg/dL ↔ mmol/L, and A1c to average glucose (ADAG)

const DAY = 864e5;
export const BMI = '^bmi\\s+.+$';
export const DUE = '^(?:due\\s+date|edd)\\s+(?:lmp\\s+|from\\s+)?.+$';
export const CRCL = '^(?:crcl|creatinine\\s+clearance)\\s+.+$';

/// "180 cm 75 kg", "1.8 m 75kg", "5'11 170 lb", "5 ft 11 in 170 lbs": { cm, kg } or null.
export function body(text) {
  const t = String(text).toLowerCase().replace(/,/g, '.');
  let cm = null, kg = null;
  let m = t.match(/(\d+(?:\.\d+)?)\s*cm\b/); if (m) cm = Number(m[1]);
  if (!cm && (m = t.match(/(\d(?:\.\d+)?)\s*m\b/))) cm = Number(m[1]) * 100;
  if (!cm && (m = t.match(/(\d)\s*(?:'|ft|feet)\s*(\d{1,2}(?:\.\d+)?)?\s*(?:"|in|inches)?/))) cm = (Number(m[1]) * 12 + Number(m[2] ?? 0)) * 2.54;
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*kg\b/))) kg = Number(m[1]);
  else if ((m = t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)\b/))) kg = Number(m[1]) * 0.45359237;
  return cm > 50 && cm < 260 && kg > 2 && kg < 400 ? { cm, kg } : null;
}
export const bmiOf = ({ cm, kg }) => kg / (cm / 100) ** 2;
export const bsaOf = ({ cm, kg }) => Math.sqrt((cm * kg) / 3600);
export const bandOf = b => b < 18.5 ? 'underweight' : b < 25 ? 'healthy weight' : b < 30 ? 'overweight' : b < 35 ? 'obesity class I' : b < 40 ? 'obesity class II' : 'obesity class III';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/// A past date: "2026-03-01", "mar 1", "1 mar 2026", "3/1". A month and day ahead of today is last year's.
export function pastDate(text, now = new Date()) {
  const t = String(text).trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, '');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const back = d => d > today ? new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()) : d;
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/); if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null; const d = new Date(y ?? today.getFullYear(), +m[1] - 1, +m[2]); return y ? d : back(d); }
  m = t.match(/([a-z]{3})[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/) ?? t.match(/(\d{1,2})\s+([a-z]{3})[a-z]*(?:\s+(\d{4}))?/);
  if (m) { const [mon, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]]; const i = MONTHS.indexOf(mon); if (i < 0) return null; const d = new Date(m[3] ? +m[3] : today.getFullYear(), i, +day); return m[3] ? d : back(d); }
  return null;
}
export function dueFrom(lmp, now = new Date()) {
  const due = new Date(lmp.getTime() + 280 * DAY);
  const along = Math.floor((now - lmp) / DAY);
  return { due, weeks: Math.floor(along / 7), days: along % 7, trimester: along < 98 ? 'first' : along < 196 ? 'second' : 'third', left: Math.ceil((due - now) / DAY) };
}
/// Cockcroft-Gault: ((140 − age) × kg) / (72 × Cr mg/dL), × 0.85 for a woman. Creatinine in µmol/L above 30 is converted.
export function crcl(text) {
  const t = String(text).toLowerCase();
  const age = Number(t.match(/(\d{1,3})\s*(?:y|yo|yrs?|years?)(?:\s+old)?\b/)?.[1] ?? t.match(/\bage\s+(\d{1,3})/)?.[1]);
  const kgText = body(`170 cm ${t}`)?.kg;
  let cr = Number(t.match(/(?:creatinine|cr|scr)\s*(\d+(?:\.\d+)?)/)?.[1]);
  const female = /\b(?:female|woman|f)\b/.test(t), male = /\b(?:male|man|m)\b/.test(t);
  if (!(age > 0) || !(kgText > 0) || !(cr > 0) || (!female && !male)) return null;
  const umol = cr > 30; if (umol) cr = cr / 88.4;
  const value = ((140 - age) * kgText) / (72 * cr) * (female ? 0.85 : 1);
  return { value, age, kg: kgText, cr, umol, sex: female ? 'female' : 'male' };
}

export const DOSE = '^dose\\s+[\\d.]+\\s*(?:mg|mcg|µg|g|units?|ml)\\s*/\\s*kg(?:\\s*/\\s*(?:day|d))?\\s+[\\d.]+\\s*(?:kg|lb|lbs)(?:\\s+(?:in|divided|split)\\s+\\d\\s+doses?)?(?:\\s+max\\s+[\\d.]+\\s*(?:mg|mcg|g|units?))?$';
export const DRIP = '^(?:drip|infusion|iv\\s+rate)\\s+[\\d.]+\\s*ml\\s+over\\s+[\\d.]+\\s*(?:hours?|hrs?|h|min(?:utes?)?)(?:\\s+[\\d]+\\s*(?:gtt|drops?)(?:\\s*/\\s*ml)?)?$';
export const GLUCOSE = '^(?:glucose|blood\\s+sugar|bg)\\s+[\\d.]+\\s*(?:mg/dl|mmol/l|mmol)$';
export const A1C = '^(?:a1c|hba1c)\\s+[\\d.]+\\s*%?$';
/// "15 mg/kg 20 kg in 3 doses max 500 mg": { perKg, unit, kg, daily, doses, each, capped }.
export function dose(said) {
  const t = String(said).toLowerCase();
  const m = t.match(/dose\s+([\d.]+)\s*(mg|mcg|µg|g|units?|ml)\s*\/\s*kg(\s*\/\s*(?:day|d))?\s+([\d.]+)\s*(kg|lb|lbs)/);
  if (!m) return null;
  const perKg = Number(m[1]), unit = m[2].replace(/^unit$/, 'units'), kg = m[5] === 'kg' ? Number(m[4]) : Number(m[4]) * 0.45359237;
  const doses = Number(t.match(/(?:in|divided|split)\s+(\d)\s+doses?/)?.[1] ?? 1);
  const max = t.match(/max\s+([\d.]+)\s*(mg|mcg|g|units?)/);
  let total = perKg * kg, capped = false;
  if (max && Number(max[1]) < total) { total = Number(max[1]); capped = true; }
  return { perKg, unit, kg, perDay: Boolean(m[3]), total, doses, each: total / doses, capped };
}
/// "1000 ml over 8 hours 20 gtt": mL/h, and drops a minute with a drop factor.
export function drip(said) {
  const t = String(said).toLowerCase();
  const m = t.match(/([\d.]+)\s*ml\s+over\s+([\d.]+)\s*(hours?|hrs?|h|min(?:utes?)?)/);
  if (!m) return null;
  const ml = Number(m[1]), minutes = /^min/.test(m[3]) ? Number(m[2]) : Number(m[2]) * 60;
  const factor = Number(t.match(/(\d+)\s*(?:gtt|drops?)/)?.[1] ?? 0) || null;
  return { ml, minutes, perHour: ml / minutes * 60, gtt: factor ? ml * factor / minutes : null, factor };
}
export const glucose = said => { const m = String(said).toLowerCase().match(/([\d.]+)\s*(mg\/dl|mmol\/l|mmol)/); if (!m) return null; const v = Number(m[1]); return m[2] === 'mg/dl' ? { mgdl: v, mmol: v / 18.016 } : { mmol: v, mgdl: v * 18.016 }; };
/// A1c to estimated average glucose (ADAG): eAG mg/dL = 28.7 × A1c − 46.7.
export const a1c = said => { const v = Number(String(said).toLowerCase().match(/(?:hb)?a1c\s+([\d.]+)/)?.[1]); return v > 3 && v < 20 ? { a1c: v, mgdl: 28.7 * v - 46.7, mmol: (28.7 * v - 46.7) / 18.016 } : null; };

const show = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const NOTE = 'a calculator, not medical advice';

export default function clinicalCalculators(jevie) {
  const { line, pair, spread, stack, hero, chip, meta, icon } = jevie.CardParts;
  const ask = t => ({ summary: 'Calculator', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'bmi', label: 'BMI', symbol: 'figure', match: { pattern: BMI }, examples: ['bmi 180 cm 75 kg', "bmi 5'11 170 lb"],
    async render(said) {
      const b = body(said.replace(/^bmi\s+/i, ''));
      if (!b) return ask('Type a height and a weight, like “bmi 180 cm 75 kg” or “bmi 5\'11 170 lb”');
      const bmi = bmiOf(b), bsa = bsaOf(b);
      const summary = `BMI ${bmi.toFixed(1)} (${bandOf(bmi)}), BSA ${bsa.toFixed(2)} m²`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(bmi.toFixed(1))), line(chip(bandOf(bmi), 'figure'))), icon('plus'), stack('trailing', line(hero(`${bsa.toFixed(2)} m²`, true)), line(chip('BSA (Mosteller)')))),
        line(meta(`${Math.round(b.cm)} cm · ${b.kg.toFixed(1)} kg · WHO bands · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'due-date', label: 'Due date', symbol: 'calendar.badge.plus', match: { pattern: DUE }, examples: ['due date lmp 2026-03-01'],
    async render(said) {
      const lmp = pastDate(said.replace(/^(?:due\s+date|edd)\s+(?:lmp\s+|from\s+)?/i, ''));
      if (!lmp) return ask('Type the first day of the last period, like “due date lmp mar 1”');
      const d = dueFrom(lmp);
      if (d.weeks > 44) return ask(`That period was ${d.weeks} weeks ago: type its date with the year`);
      const summary = `Due ${show(d.due)} · ${d.weeks}w ${d.days}d today · ${d.trimester} trimester`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(d.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))), line(chip('estimated due date', 'calendar.badge.plus'))),
          stack('trailing', line(hero(`${d.weeks}w ${d.days}d`, true)), line(chip(`${d.trimester} trimester`)))),
        line(meta(`LMP ${show(lmp)} + 280 days (Naegele) · ${d.left > 0 ? `${d.left} days to go` : `${-d.left} days past`} · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'crcl', label: 'Creatinine clearance', symbol: 'drop', match: { pattern: CRCL }, examples: ['crcl 65 years 70 kg creatinine 1.2 male'],
    async render(said) {
      const c = crcl(said);
      if (!c) return ask('Type age, weight, creatinine and sex, like “crcl 65 years 70 kg creatinine 1.2 male”');
      const summary = `CrCl ${Math.round(c.value)} mL/min (Cockcroft-Gault)`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${Math.round(c.value)}`)), line(chip('mL/min', 'drop'))), stack('trailing', line(meta('Cockcroft-Gault')), line(meta(`${c.age} y · ${c.kg.toFixed(1)} kg · ${c.sex}`)))),
        line(meta(`creatinine ${c.cr.toFixed(2)} mg/dL${c.umol ? ' (from µmol/L)' : ''} · actual body weight · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'dose', label: 'Dose by weight', symbol: 'pills', match: { pattern: DOSE }, examples: ['dose 15 mg/kg 20 kg'],
    async render(said) {
      const d = dose(said);
      if (!d) return ask('Type a dose per kg and a weight, like “dose 15 mg/kg 20 kg in 3 doses max 500 mg”');
      const each = `${Number(d.each.toFixed(2))} ${d.unit}`;
      const summary = `${Number(d.total.toFixed(2))} ${d.unit}${d.perDay ? ' a day' : ''}${d.doses > 1 ? `, ${each} × ${d.doses}` : ''} for ${d.kg.toFixed(1)} kg${d.capped ? ' (capped at the max)' : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(`${Number(d.total.toFixed(2))} ${d.unit}`)), line(chip(d.perDay ? 'a day' : 'dose', 'pills'))), icon(d.doses > 1 ? 'divide' : 'equal'), stack('trailing', line(hero(each, d.doses === 1)), line(chip(d.doses > 1 ? `each of ${d.doses}` : 'single dose')))),
        line(meta(`${d.perKg} ${d.unit}/kg × ${d.kg.toFixed(1)} kg${d.capped ? ' · capped at the maximum named' : ''} · check against the formulary · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'drip', label: 'Infusion rate', symbol: 'drop.degreesign', match: { pattern: DRIP }, examples: ['drip 1000 ml over 8 hours 20 gtt'],
    async render(said) {
      const d = drip(said);
      if (!d) return ask('Type a volume and a time, like “drip 1000 ml over 8 hours 20 gtt”');
      const summary = `${Number(d.perHour.toFixed(1))} mL/h${d.gtt ? `, ${Math.round(d.gtt)} gtt/min at ${d.factor} gtt/mL` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(`${Number(d.perHour.toFixed(1))} mL/h`)), line(chip('pump rate', 'drop.degreesign'))), icon('equal'), stack('trailing', line(hero(d.gtt ? `${Math.round(d.gtt)} gtt/min` : '—', !d.gtt)), line(chip(d.factor ? `${d.factor} gtt/mL set` : 'add a drop factor, “20 gtt”')))),
        line(meta(`${d.ml} mL over ${d.minutes >= 60 ? `${Number((d.minutes / 60).toFixed(2))} h` : `${d.minutes} min`} · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'glucose', label: 'Glucose', symbol: 'drop', match: { pattern: GLUCOSE }, examples: ['glucose 100 mg/dl', 'glucose 7.2 mmol/l'],
    async render(said) {
      const g = glucose(said);
      if (!g) return ask('Type a value and a unit, like “glucose 100 mg/dl”');
      const summary = `${Math.round(g.mgdl)} mg/dL = ${g.mmol.toFixed(1)} mmol/L`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${Math.round(g.mgdl)}`)), line(chip('mg/dL'))), icon('equal'), stack('trailing', line(hero(g.mmol.toFixed(1))), line(chip('mmol/L')))), line(meta(`× 18.016 · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'a1c', label: 'A1c', symbol: 'drop.triangle', match: { pattern: A1C }, examples: ['a1c 7'],
    async render(said) {
      const a = a1c(said);
      if (!a) return ask('Type an A1c percentage, like “a1c 7”');
      const summary = `A1c ${a.a1c}% ≈ average glucose ${Math.round(a.mgdl)} mg/dL (${a.mmol.toFixed(1)} mmol/L)`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${a.a1c}%`)), line(chip('A1c'))), icon('arrow.right'), stack('trailing', line(hero(`${Math.round(a.mgdl)} mg/dL`)), line(chip(`${a.mmol.toFixed(1)} mmol/L`)))), line(meta(`estimated average glucose, ADAG: 28.7 × A1c − 46.7 · ${NOTE}`))] };
    }
  });
}
