// Building sums, as cards while they are typed, worked out on this Mac:
//
//   "roof pitch 6/12 run 12 ft", "pitch 8/12"        the angle, and the rafter length for a run (before overhang)
//   "stairs 108 inches rise", "stairs 9 ft rise"      risers no taller than 7¾" and treads of 10" (IRC R311.7)

export const PITCH = '^(?:roof\\s+)?pitch\\s+\\d{1,2}(?:\\.\\d+)?\\s*/\\s*12(?:\\s+run\\s+[\\d.]+\\s*(?:ft|feet|\'|in|inches|"))?$';
export const STAIRS = '^stairs?\\s+(?:total\\s+)?[\\d.]+\\s*(?:in|inches|"|ft|feet|\'|cm)\\s+(?:total\\s+)?rise$';
export function pitch(said) {
  const t = String(said).toLowerCase(); const p = Number(t.match(/(\d{1,2}(?:\.\d+)?)\s*\/\s*12/)[1]);
  const run = t.match(/run\s+([\d.]+)\s*(ft|feet|'|in|inches|")/); const runFt = run ? Number(run[1]) / (/^(?:in|inches|")$/.test(run[2]) ? 12 : 1) : null;
  const slope = p / 12;
  return { p, angle: Math.atan(slope) * 180 / Math.PI, factor: Math.sqrt(1 + slope * slope), runFt, rafter: runFt ? runFt * Math.sqrt(1 + slope * slope) : null, rise: runFt ? runFt * slope : null };
}
export function stairs(said) {
  const t = String(said).toLowerCase(); const m = t.match(/([\d.]+)\s*(in|inches|"|ft|feet|'|cm)/);
  const inches = Number(m[1]) * (/^(?:ft|feet|')$/.test(m[2]) ? 12 : m[2] === 'cm' ? 1 / 2.54 : 1);
  if (!(inches > 7)) return null;
  const risers = Math.ceil(inches / 7.75), riser = inches / risers, treads = risers - 1;
  return { inches, risers, riser, treads, run: treads * 10, angle: Math.atan(riser / 10) * 180 / Math.PI };
}
const ftin = ft => { const total = Math.round(ft * 12 * 8) / 8; const f = Math.floor(total / 12), i = total - f * 12; return `${f}′ ${Number(i.toFixed(3))}″`; };

export default function constructionMath(jevie) {
  const { line, spread, stack, hero, chip, meta, pair, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'roof-pitch', label: 'Roof pitch', symbol: 'house.lodge', match: { pattern: PITCH }, examples: ['roof pitch 6/12 run 12 ft'],
    async render(said) {
      const p = pitch(said);
      const summary = `${p.p}/12 is ${p.angle.toFixed(1)}°${p.rafter ? `; a ${p.runFt} ft run needs a ${ftin(p.rafter)} rafter (rise ${ftin(p.rise)})` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${p.angle.toFixed(1)}°`)), line(chip(`${p.p}/12 pitch`, 'house.lodge'))), stack('trailing', line(hero(p.rafter ? ftin(p.rafter) : `× ${p.factor.toFixed(3)}`, true)), line(chip(p.rafter ? 'rafter, before overhang' : 'rafter per foot of run')))), line(meta(p.rafter ? `run ${p.runFt} ft × ${p.factor.toFixed(3)} · rise ${ftin(p.rise)}` : 'add “run 12 ft” for the rafter length'))] };
    }
  });
  jevie.registerCard({
    name: 'stairs', label: 'Stairs', symbol: 'stairs', match: { pattern: STAIRS }, examples: ['stairs 108 inches rise'],
    async render(said) {
      const s = stairs(said);
      if (!s) return { summary: 'Stairs', complete: 0, body: [line(meta('Type the total rise, floor to floor: “stairs 108 inches rise”'))] };
      const summary = `${s.risers} risers of ${s.riser.toFixed(2)}″ and ${s.treads} treads of 10″ (${(s.run / 12).toFixed(1)} ft of run)`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${s.risers} × ${s.riser.toFixed(2)}″`)), line(chip('risers', 'stairs'))), icon('arrow.up.right'), stack('trailing', line(hero(`${s.treads} × 10″`, true)), line(chip(`${(s.run / 12).toFixed(1)} ft run`)))), line(meta(`${s.inches.toFixed(1)}″ total rise · ${s.angle.toFixed(1)}° · IRC R311.7: risers ≤ 7¾″, treads ≥ 10″ · check your local code`))] };
    }
  });
}
