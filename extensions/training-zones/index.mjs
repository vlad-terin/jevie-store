// Training numbers, as cards while they are typed, worked out on this Mac:
//
//   "heart rate zones age 35 resting 60", "hr zones 42"   max = 208 − 0.7 × age (Tanaka); Karvonen zones with a resting rate, % of max without
//   "ftp zones 250"                                       Coggan's seven power zones
//   "watts per kg 250w 75kg", "w/kg 300 82 kg"            power to weight

export const HR = '^(?:heart\\s+rate|hr)\\s+zones?\\s+(?:age\\s+)?\\d{1,3}(?:\\s+(?:resting|rest|rhr)\\s+\\d{2,3})?(?:\\s+max\\s+\\d{3})?$';
export const FTP = '^(?:ftp|power)\\s+zones?\\s+\\d{2,4}\\s*w?$';
export const WKG = '^(?:watts\\s+per\\s+(?:kg|kilo)|w/kg|power\\s+to\\s+weight)\\s+\\d{2,4}\\s*w?\\s+\\d{2,3}(?:\\.\\d)?\\s*(?:kg|lb|lbs)$';
export function hrZones(said) {
  const t = String(said).toLowerCase();
  const age = Number(t.match(/zones?\s+(?:age\s+)?(\d{1,3})/)?.[1]), rest = Number(t.match(/(?:resting|rest|rhr)\s+(\d{2,3})/)?.[1]) || null;
  const max = Number(t.match(/max\s+(\d{3})/)?.[1]) || Math.round(208 - 0.7 * age);
  if (!(age > 5 && age < 110)) return null;
  const bands = [[0.5, 0.6, 'recovery'], [0.6, 0.7, 'endurance'], [0.7, 0.8, 'tempo'], [0.8, 0.9, 'threshold'], [0.9, 1.0, 'maximum']];
  const at = p => Math.round(rest ? rest + p * (max - rest) : p * max);
  return { age, rest, max, zones: bands.map(([lo, hi, name], i) => ({ n: i + 1, name, lo: at(lo), hi: at(hi) })) };
}
export const COGGAN = [[0, 0.55, 'active recovery'], [0.56, 0.75, 'endurance'], [0.76, 0.9, 'tempo'], [0.91, 1.05, 'threshold'], [1.06, 1.2, 'VO2 max'], [1.21, 1.5, 'anaerobic'], [1.51, null, 'neuromuscular']];
export const ftpZones = ftp => COGGAN.map(([lo, hi, name], i) => ({ n: i + 1, name, lo: Math.round(lo * ftp), hi: hi === null ? null : Math.round(hi * ftp) }));
export function wkg(said) { const t = String(said).toLowerCase(); const w = Number(t.match(/(\d{2,4})\s*w?\s+\d/)[1]); const m = t.match(/(\d{2,3}(?:\.\d)?)\s*(kg|lb|lbs)$/); const kg = m[2] === 'kg' ? Number(m[1]) : Number(m[1]) * 0.45359237; return { w, kg, ratio: w / kg }; }

export default function trainingZones(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'hr-zones', label: 'Heart-rate zones', symbol: 'heart.circle', match: { pattern: HR }, examples: ['heart rate zones age 35 resting 60'],
    async render(said) {
      const z = hrZones(said);
      if (!z) return { summary: 'Heart-rate zones', complete: 0, body: [line(meta('Type your age (and resting rate): “heart rate zones age 35 resting 60”'))] };
      const summary = `Max ${z.max} bpm · Z2 ${z.zones[1].lo}–${z.zones[1].hi} · Z4 ${z.zones[3].lo}–${z.zones[3].hi}`;
      return { summary, copy: z.zones.map(x => `Z${x.n} ${x.name}: ${x.lo}–${x.hi} bpm`).join('\n'), complete: 1, body: [spread(stack('leading', line(hero(`${z.max} bpm`)), line(chip('max heart rate', 'heart.circle'))), stack('trailing', line(meta(z.rest ? `Karvonen, resting ${z.rest}` : '% of max')), line(meta(`age ${z.age}`)))), list(z.zones.map(x => `Z${x.n} ${x.name}: ${x.lo}–${x.hi}`)), line(meta('max by Tanaka (208 − 0.7 × age), an estimate · a lab or field test is better · not medical advice'))] };
    }
  });
  jevie.registerCard({
    name: 'ftp-zones', label: 'Power zones', symbol: 'bolt.heart', match: { pattern: FTP }, examples: ['ftp zones 250'],
    async render(said) {
      const ftp = Number(said.match(/(\d{2,4})/)[1]), z = ftpZones(ftp);
      return { summary: `FTP ${ftp} W · Z2 ${z[1].lo}–${z[1].hi} W · Z4 ${z[3].lo}–${z[3].hi} W`, copy: z.map(x => `Z${x.n} ${x.name}: ${x.lo}${x.hi ? `–${x.hi}` : '+'} W`).join('\n'), complete: 1, body: [spread(line(hero(`${ftp} W`)), chip('FTP', 'bolt.heart')), list(z.map(x => `Z${x.n} ${x.name}: ${x.lo}${x.hi ? `–${x.hi}` : '+'} W`)), line(meta('Coggan\'s power zones'))] };
    }
  });
  jevie.registerCard({
    name: 'wkg', label: 'Watts per kilo', symbol: 'bicycle', match: { pattern: WKG }, examples: ['watts per kg 250w 75kg'],
    async render(said) {
      const r = wkg(said);
      const level = r.ratio >= 5 ? 'elite' : r.ratio >= 4 ? 'very strong' : r.ratio >= 3.2 ? 'strong' : r.ratio >= 2.5 ? 'fit' : 'starting out';
      return { summary: `${r.ratio.toFixed(2)} W/kg (${r.w} W at ${r.kg.toFixed(1)} kg)`, copy: `${r.ratio.toFixed(2)} W/kg`, complete: 1, body: [spread(stack('leading', line(hero(`${r.ratio.toFixed(2)} W/kg`)), line(chip(level, 'bicycle'))), stack('trailing', line(meta(`${r.w} W`)), line(meta(`${r.kg.toFixed(1)} kg`)))), line(meta('at FTP: about 2.5 fit, 3.2 strong, 4 very strong amateur, 5+ pro'))] };
    }
  });
}
