// The moon, worked out on this Mac (no service): its age in the synodic
// month from a known new moon, its phase and how lit it is, and the next
// full and new moons. Within about a day, which is what a glance needs.
//
//   "moon", "moon phase", "next full moon", "moon on 2026-12-25"

const SYNODIC = 29.530588853;          // days
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14); // a new moon
const DAY = 864e5;
export const PATTERN = '^(?:moon(?:\\s+phase)?(?:\\s+on\\s+\\d{4}-\\d{2}-\\d{2})?|next\\s+(?:full|new)\\s+moon|when\\s+is\\s+the\\s+next\\s+(?:full|new)\\s+moon\\??)$';
const PHASES = [[1.84, 'New moon', 'moonphase.new.moon'], [5.53, 'Waxing crescent', 'moonphase.waxing.crescent'], [9.22, 'First quarter', 'moonphase.first.quarter'],
  [12.91, 'Waxing gibbous', 'moonphase.waxing.gibbous'], [16.61, 'Full moon', 'moonphase.full.moon'], [20.30, 'Waning gibbous', 'moonphase.waning.gibbous'],
  [23.99, 'Last quarter', 'moonphase.last.quarter'], [27.68, 'Waning crescent', 'moonphase.waning.crescent'], [Infinity, 'New moon', 'moonphase.new.moon']];

/// { age (days), name, symbol, lit (0-1), nextFull, nextNew } for a moment.
export function moonAt(when) {
  const age = (((when - KNOWN_NEW) / DAY) % SYNODIC + SYNODIC) % SYNODIC;
  const [, name, symbol] = PHASES.find(([top]) => age < top);
  const lit = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
  const toFull = ((SYNODIC / 2 - age) + SYNODIC) % SYNODIC, toNew = SYNODIC - age;
  return { age, name, symbol, lit, nextFull: new Date(when + toFull * DAY), nextNew: new Date(when + toNew * DAY) };
}

const day = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function cardOf(m, P, { on = null } = {}) {
  const { line, spread, stack, hero, chip, meta, icon, bar } = P;
  const summary = `${on ? `${on}: ` : ''}${m.name}, ${Math.round(m.lit * 100)}% lit · full ${day(m.nextFull)} · new ${day(m.nextNew)}`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(hero(m.name)), line(chip(`${Math.round(m.lit * 100)}% lit`, m.symbol))), icon(m.symbol, true)),
    bar(m.lit),
    line(meta(`${on ? `On ${on} · ` : ''}day ${m.age.toFixed(1)} of ${SYNODIC.toFixed(1)} · next full ${day(m.nextFull)} · next new ${day(m.nextNew)}`))
  ] };
}

export default function moonPhase(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'moon', label: 'Moon', symbol: 'moonphase.waxing.gibbous', match: { pattern: PATTERN }, examples: ['moon phase', 'next full moon'],
    async render(said) {
      const on = said.match(/on\s+(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      const when = on ? Date.parse(`${on}T21:00:00`) : Date.now();
      return cardOf(moonAt(when), P, { on });
    }
  });
}
