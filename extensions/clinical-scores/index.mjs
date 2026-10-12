// Clinical scores, as cards while they are typed, worked out on this Mac.
// For checking arithmetic, not diagnosis.
//
//   "egfr creatinine 1.1 age 60 female"   CKD-EPI 2021 (race-free), mL/min/1.73 m², and the KDIGO G stage
//   "pack years 20 a day 30 years", "pack years 1.5 packs 20 years"   packs a day × years (20 cigarettes a pack)
//   "gcs e4 v5 m6", "gcs 3 4 5"                                        eye + verbal + motor

export const EGFR = '^(?:egfr|gfr|ckd[\\s-]?epi)\\s+(?:creatinine|cr|scr)?\\s*[\\d.]+\\s*(?:mg/dl)?\\s+(?:age\\s+)?\\d{2,3}(?:\\s*(?:y|yo|years?))?\\s+(?:male|female|man|woman|m|f)$';
export const PACKS = '^pack[\\s-]+years?\\s+[\\d.]+\\s*(?:packs?|cigarettes?|cigs?)?\\s*(?:a|per)?\\s*(?:day)?\\s+(?:for\\s+)?[\\d.]+\\s*(?:years?|yrs?)$';
export const GCS = '^(?:gcs|glasgow(?:\\s+coma\\s+scale)?)\\s+(?:e\\s*[1-4]\\s*,?\\s*v\\s*[1-5]\\s*,?\\s*m\\s*[1-6]|[1-4]\\s+[1-5]\\s+[1-6])$';
export function egfr(said) {
  const t = String(said).toLowerCase(); const [scr, age] = (t.match(/[\d.]+/g) ?? []).map(Number);
  const female = /\b(?:female|woman|f)\b/.test(t); const k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302;
  const v = 142 * Math.min(scr / k, 1) ** a * Math.max(scr / k, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
  const stage = v >= 90 ? 'G1' : v >= 60 ? 'G2' : v >= 45 ? 'G3a' : v >= 30 ? 'G3b' : v >= 15 ? 'G4' : 'G5';
  return { scr, age, female, egfr: v, stage };
}
export function packYears(said) { const t = String(said).toLowerCase(); const [n, years] = (t.match(/[\d.]+/g) ?? []).map(Number); const packs = /cig/.test(t) || (!/pack/.test(t.replace(/^pack[\s-]+years?/, '')) && n >= 5) ? n / 20 : n; return { packs, years, py: packs * years }; }
export function gcs(said) { const [e, v, m] = (String(said).toLowerCase().replace(/^(?:gcs|glasgow(?:\s+coma\s+scale)?)\s+/, '').match(/\d/g) ?? []).map(Number); const total = e + v + m; return { e, v, m, total, band: total <= 8 ? 'severe' : total <= 12 ? 'moderate' : 'mild' }; }
const NOTE = 'for checking arithmetic, not diagnosis';
const STAGE = { G1: 'normal or high', G2: 'mildly decreased', G3a: 'mildly to moderately decreased', G3b: 'moderately to severely decreased', G4: 'severely decreased', G5: 'kidney failure range' };

export default function clinicalScores(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'egfr', label: 'eGFR', symbol: 'cross.vial', match: { pattern: EGFR }, examples: ['egfr creatinine 1.1 age 60 female'],
    async render(said) {
      const g = egfr(said);
      return { summary: `eGFR ${Math.round(g.egfr)} mL/min/1.73 m² (${g.stage}, ${STAGE[g.stage]}) · CKD-EPI 2021`, copy: `eGFR ${Math.round(g.egfr)}`, complete: 1, body: [spread(stack('leading', line(hero(String(Math.round(g.egfr)), g.egfr >= 60)), line(chip('mL/min/1.73 m²', 'cross.vial'))), stack('trailing', line(hero(g.stage, true)), line(chip(STAGE[g.stage])))), line(meta(`creatinine ${g.scr} mg/dL · ${g.age} y · ${g.female ? 'female' : 'male'} · CKD-EPI 2021, no race term · a stage needs 3 months and albuminuria · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'pack-years', label: 'Pack-years', symbol: 'smoke', match: { pattern: PACKS }, examples: ['pack years 20 a day 30 years'],
    async render(said) {
      const p = packYears(said);
      return { summary: `${Number(p.py.toFixed(1))} pack-years (${Number(p.packs.toFixed(2))} pack${p.packs === 1 ? '' : 's'} a day for ${p.years} years)`, copy: `${Number(p.py.toFixed(1))} pack-years`, complete: 1, body: [spread(stack('leading', line(hero(String(Number(p.py.toFixed(1))))), line(chip('pack-years', 'smoke'))), stack('trailing', line(meta(`${Number(p.packs.toFixed(2))} packs a day × ${p.years} years`)), line(meta(p.py >= 20 ? '20 or more: in the USPSTF lung screening range (age 50–80)' : 'under 20')))), line(meta(`a number of 5 or more without “packs” is read as cigarettes (20 a pack) · ${NOTE}`))] };
    }
  });
  jevie.registerCard({
    name: 'gcs', label: 'Glasgow Coma Scale', symbol: 'brain.head.profile', match: { pattern: GCS }, examples: ['gcs e4 v5 m6'],
    async render(said) {
      const g = gcs(said);
      return { summary: `GCS ${g.total} (E${g.e} V${g.v} M${g.m}): ${g.band}`, copy: `GCS ${g.total} (E${g.e}V${g.v}M${g.m})`, complete: 1, body: [spread(stack('leading', line(hero(`${g.total}/15`, g.total > 12)), line(chip(g.band, 'brain.head.profile'))), stack('trailing', line(meta(`E${g.e} V${g.v} M${g.m}`)), line(meta('13–15 mild · 9–12 moderate · 3–8 severe')))), line(meta(`report the parts, not just the sum · ${NOTE}`))] };
    }
  });
}
