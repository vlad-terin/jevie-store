// Photography sums, as cards while they are typed, worked out on this Mac:
//
//   "dof 50mm f/1.8 3m", "depth of field 85mm f2 2m aps-c"    near and far limits, total, hyperfocal
//       circle of confusion 0.03 mm full frame, 0.02 APS-C, 0.015 Micro Four Thirds
//   "exposure f/8 1/125 iso 100 to f/4", "exposure f/8 1/125 iso 100 to iso 400"
//       the shutter that keeps the same exposure, and EV at ISO 100

export const DOF = '^(?:dof|depth\\s+of\\s+field)\\s+\\d{1,4}\\s*mm\\s+f\\s*/?\\s*\\d{1,2}(?:\\.\\d)?\\s+[\\d.]+\\s*(?:m|ft|feet|cm)(?:\\s+(?:full\\s*frame|ff|aps-?c|crop|m43|mft|micro\\s+four\\s+thirds))?$';
export const EXPOSURE = '^(?:exposure|equivalent\\s+exposure|ev)\\s+f\\s*/?\\s*\\d{1,2}(?:\\.\\d)?\\s+(?:1/\\d{1,5}|[\\d.]+\\s*s?)\\s+iso\\s+\\d{2,6}(?:\\s+to\\s+(?:f\\s*/?\\s*\\d{1,2}(?:\\.\\d)?|iso\\s+\\d{2,6})(?:\\s+(?:and\\s+)?(?:f\\s*/?\\s*\\d{1,2}(?:\\.\\d)?|iso\\s+\\d{2,6}))?)?$';
export function dof(said) {
  const t = String(said).toLowerCase();
  const f = Number(t.match(/(\d{1,4})\s*mm/)[1]), N = Number(t.match(/\sf\s*\/?\s*(\d{1,2}(?:\.\d)?)/)[1]);
  const d = t.match(/([\d.]+)\s*(m|ft|feet|cm)(?:\s|$)/); const s = Number(d[1]) * (d[2] === 'cm' ? 10 : /^f/.test(d[2]) ? 304.8 : 1000);
  const c = /aps|crop/.test(t) ? 0.02 : /m43|mft|micro/.test(t) ? 0.015 : 0.03;
  const H = f * f / (N * c) + f;
  const near = s * (H - f) / (H + s - 2 * f), far = s < H ? s * (H - f) / (H - s) : Infinity;
  return { f, N, s, c, H, near, far, total: far - near, feet: /^f/.test(d[2]) };
}
const STOPS = [30, 15, 8, 4, 2, 1, 1 / 2, 1 / 4, 1 / 8, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000, 1 / 2000, 1 / 4000, 1 / 8000];
export const shutterText = t => t >= 1 ? `${Number(t.toPrecision(3))}s` : `1/${Math.round(1 / t)}`;
export function exposure(said) {
  const t = String(said).toLowerCase(); const [before, after = ''] = t.split(/\s+to\s+/);
  const N1 = Number(before.match(/\sf\s*\/?\s*(\d{1,2}(?:\.\d)?)/)[1]); const sh = before.match(/\s(1\/\d{1,5}|[\d.]+)\s*s?\s+iso/)[1];
  const t1 = sh.startsWith('1/') ? 1 / Number(sh.slice(2)) : Number(sh); const iso1 = Number(before.match(/iso\s+(\d{2,6})/)[1]);
  const N2 = Number(` ${after}`.match(/\sf\s*\/?\s*(\d{1,2}(?:\.\d)?)/)?.[1] ?? N1), iso2 = Number(after.match(/iso\s+(\d{2,6})/)?.[1] ?? iso1);
  const t2 = t1 * (N2 / N1) ** 2 * (iso1 / iso2);
  const ev100 = Math.log2(N1 * N1 / t1) - Math.log2(iso1 / 100);
  const nearest = STOPS.reduce((a, b) => Math.abs(Math.log2(b / t2)) < Math.abs(Math.log2(a / t2)) ? b : a);
  return { N1, t1, iso1, N2, t2, iso2, ev100, nearest, changed: Boolean(after) };
}
const dist = (mm, feet) => !Number.isFinite(mm) ? '∞' : feet ? `${(mm / 304.8).toFixed(mm < 3048 ? 2 : 1)} ft` : mm < 1000 ? `${(mm / 10).toFixed(1)} cm` : `${(mm / 1000).toFixed(2)} m`;

export default function photoMath(jevie) {
  const { line, pair, spread, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'dof', label: 'Depth of field', symbol: 'camera.aperture', match: { pattern: DOF }, examples: ['dof 50mm f/1.8 3m'],
    async render(said) {
      const d = dof(said);
      const summary = `${d.f}mm f/${d.N} at ${dist(d.s, d.feet)}: sharp from ${dist(d.near, d.feet)} to ${dist(d.far, d.feet)} (${dist(d.total, d.feet)})`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(dist(d.near, d.feet))), line(chip('near'))), icon('arrow.left.and.right'), stack('trailing', line(hero(dist(d.far, d.feet))), line(chip('far')))),
        line(meta(`${dist(d.total, d.feet)} in focus · hyperfocal ${dist(d.H, d.feet)} · circle of confusion ${d.c} mm (${d.c === 0.03 ? 'full frame' : d.c === 0.02 ? 'APS-C' : 'Micro Four Thirds'})`))] };
    }
  });
  jevie.registerCard({
    name: 'exposure', label: 'Exposure', symbol: 'camera', match: { pattern: EXPOSURE }, examples: ['exposure f/8 1/125 iso 100 to f/4'],
    async render(said) {
      const e = exposure(said);
      if (!e.changed) return { summary: `EV ${e.ev100.toFixed(1)} at ISO 100 (f/${e.N1}, ${shutterText(e.t1)}, ISO ${e.iso1})`, copy: `EV ${e.ev100.toFixed(1)}`, complete: 1, body: [spread(line(hero(`EV ${e.ev100.toFixed(1)}`)), chip('at ISO 100', 'camera')), line(meta('add “to f/4” or “to iso 400” for the equivalent shutter'))] };
      const summary = `f/${e.N2}, ISO ${e.iso2}: ${shutterText(e.t2)} (nearest ${shutterText(e.nearest)}) gives the exposure of f/${e.N1}, ${shutterText(e.t1)}, ISO ${e.iso1}`;
      return { summary, copy: shutterText(e.nearest), complete: 1, body: [
        pair(stack('leading', line(hero(`f/${e.N1} · ${shutterText(e.t1)}`, true)), line(chip(`ISO ${e.iso1}`))), icon('equal'), stack('trailing', line(hero(`f/${e.N2} · ${shutterText(e.nearest)}`)), line(chip(`ISO ${e.iso2}`, 'camera')))),
        line(meta(`exact ${shutterText(e.t2)} · EV ${e.ev100.toFixed(1)} at ISO 100 · shutter × (new f ÷ old f)² × (old ISO ÷ new ISO)`))] };
    }
  });
}
