// Wind against a runway, as a card while it is typed, worked out on this
// Mac: crosswind = speed × sin(angle), headwind = speed × cos(angle), the
// runway's heading its number × 10. Gusts give the worst case too. Use the
// wind and runway in the same reference (magnetic for ATIS and runways).
//
//   "crosswind wind 270 at 15 runway 24", "crosswind 310/18g25 runway 27", "xwind 090 12 rwy 36"

export const PATTERN = '^(?:crosswind|xwind|cross\\s+wind)\\s+(?:wind\\s+)?\\d{1,3}\\s*(?:°|deg)?\\s*(?:/|at|@|\\s)\\s*\\d{1,3}(?:\\s*(?:kt|kts|knots))?(?:\\s*g\\s*\\d{1,3})?\\s+(?:runway|rwy|rw)\\s+\\d{1,2}[lrc]?$';
export function components(said) {
  const t = String(said).toLowerCase();
  const m = t.match(/(\d{1,3})\s*(?:°|deg)?\s*(?:\/|at|@|\s)\s*(\d{1,3})(?:\s*(?:kt|kts|knots))?(?:\s*g\s*(\d{1,3}))?\s+(?:runway|rwy|rw)\s+(\d{1,2})([lrc])?/);
  if (!m) return null;
  const dir = Number(m[1]) % 360, speed = Number(m[2]), gust = m[3] ? Number(m[3]) : null, runway = Number(m[4]);
  if (runway < 1 || runway > 36) return null;
  const angle = ((dir - runway * 10 + 540) % 360) - 180;
  const rad = angle * Math.PI / 180;
  const at = s => ({ cross: s * Math.sin(rad), head: s * Math.cos(rad) });
  return { dir, speed, gust, runway: `${String(runway).padStart(2, '0')}${(m[5] ?? '').toUpperCase()}`, heading: runway * 10, angle, ...at(speed), gusty: gust ? at(gust) : null };
}

export default function crosswind(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'crosswind', label: 'Crosswind', symbol: 'wind', match: { pattern: PATTERN }, examples: ['crosswind wind 270 at 15 runway 24'],
    async render(said) {
      const c = components(said);
      if (!c) return { summary: 'Crosswind', complete: 0, body: [line(meta('Type the wind and the runway: “crosswind wind 270 at 15 runway 24”'))] };
      const side = c.cross >= 0 ? 'from the right' : 'from the left';
      const head = c.head >= 0 ? 'headwind' : 'tailwind';
      const summary = `Runway ${c.runway}: ${Math.abs(c.cross).toFixed(1)} kt crosswind ${side}, ${Math.abs(c.head).toFixed(1)} kt ${head}${c.gusty ? ` (gusts ${Math.abs(c.gusty.cross).toFixed(1)} kt cross)` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(`${Math.abs(c.cross).toFixed(1)} kt`)), line(chip(`crosswind ${side}`, 'wind'))), icon('airplane'), stack('trailing', line(hero(`${Math.abs(c.head).toFixed(1)} kt`, c.head < 0)), line(chip(head, c.head < 0 ? 'exclamationmark.triangle' : 'arrow.down')))),
        line(meta(`wind ${String(c.dir).padStart(3, '0')}° at ${c.speed}${c.gust ? `G${c.gust}` : ''} kt · runway ${c.runway} (${String(c.heading).padStart(3, '0')}°) · ${Math.abs(c.angle)}° off the nose${c.gusty ? ` · gust ${Math.abs(c.gusty.cross).toFixed(1)} kt cross` : ''} · check your aircraft's demonstrated crosswind`))] };
    }
  });
}
