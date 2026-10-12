// Ideal and adjusted body weight, as a card while it is typed, worked out
// on this Mac: Devine, 50 kg (men) or 45.5 kg (women) + 2.3 kg an inch over
// 5 feet; adjusted = IBW + 0.4 × (actual − IBW). For dosing arithmetic.
//
//   "ibw 180 cm male", "ideal body weight 5 ft 4 female 90 kg", "ibw 70 in male 120 kg"

export const PATTERN = '^(?:ibw|ideal\\s+body\\s+weight|ideal\\s+weight)\\s+(?:\\d{2,3}\\s*cm|\\d\\s*(?:ft|\')\\s*\\d{0,2}\\s*(?:in|")?|\\d{2}\\s*(?:in|inches|"))\\s+(?:male|female|man|woman|m|f)(?:\\s+(?:actual\\s+)?[\\d.]+\\s*(?:kg|lb|lbs))?$';
export function ibw(said) {
  const t = String(said).toLowerCase();
  const cm = t.match(/(\d{2,3})\s*cm/), ft = t.match(/(\d)\s*(?:ft|')\s*(\d{0,2})/), inch = t.match(/(?:^|\s)(\d{2})\s*(?:in|inches|")(?:\s|$)/);
  const inches = cm ? Number(cm[1]) / 2.54 : ft ? Number(ft[1]) * 12 + Number(ft[2] || 0) : Number(inch[1]);
  const female = /\b(?:female|woman|f)\b/.test(t);
  const ideal = (female ? 45.5 : 50) + 2.3 * (inches - 60);
  const w = t.match(/([\d.]+)\s*(kg|lb|lbs)$/); const actual = w ? Number(w[1]) * (w[2] === 'kg' ? 1 : 0.45359237) : null;
  return { inches, female, ideal, actual, adjusted: actual !== null ? ideal + 0.4 * (actual - ideal) : null, ratio: actual !== null ? actual / ideal : null, short: inches < 60 };
}

export default function idealBodyWeight(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'ibw', label: 'Ideal body weight', symbol: 'figure.stand', match: { pattern: PATTERN }, examples: ['ibw 180 cm male'],
    async render(said) {
      const b = ibw(said);
      const h = `${Math.floor(b.inches / 12)}′${Math.round(b.inches % 12)}″ (${Math.round(b.inches * 2.54)} cm)`;
      const summary = `IBW ${b.ideal.toFixed(1)} kg${b.adjusted !== null ? `, adjusted ${b.adjusted.toFixed(1)} kg (actual ${b.actual.toFixed(1)}, ${Math.round(b.ratio * 100)}% of ideal)` : ''} for ${h} ${b.female ? 'female' : 'male'}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${b.ideal.toFixed(1)} kg`)), line(chip('ideal (Devine)', 'figure.stand'))), stack('trailing', line(hero(b.adjusted !== null ? `${b.adjusted.toFixed(1)} kg` : h, true)), line(chip(b.adjusted !== null ? 'adjusted' : b.female ? 'female' : 'male')))), line(meta(`${b.female ? '45.5' : '50'} + 2.3 × inches over 60${b.short ? ' · under 5 ft Devine is unreliable' : ''}${b.ratio !== null && b.ratio < 1.2 ? ' · actual under 120% of ideal: many protocols use actual or ideal, not adjusted' : ''} · for dosing arithmetic, not diagnosis`))] };
    }
  });
}
