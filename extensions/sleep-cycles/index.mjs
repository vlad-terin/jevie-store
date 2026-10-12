// Sleep in whole cycles, as a card while it is typed, worked out on this Mac:
// cycles of about 90 minutes, plus about 15 to fall asleep.
//
//   "bedtime for 7am", "bedtime for 6:30"      when to be in bed to wake at the end of a cycle
//   "sleep cycles 11pm", "wake times 23:30"    when to wake after going to bed then

export const PATTERN = '^(?:bedtime\\s+(?:for|to\\s+wake\\s+at)\\s+|(?:sleep\\s+cycles?|wake\\s+times?)\\s+(?:from\\s+|at\\s+)?)\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?$';
export const minutesOf = s => { const m = String(s).toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/); if (!m) return null; let h = Number(m[1]) % 12; if (m[3] === 'pm' || (!m[3] && Number(m[1]) >= 12)) h += 12; if (!m[3] && Number(m[1]) === 12) h = 12; if (h > 23) return null; return h * 60 + Number(m[2] ?? 0); };
export const clock = min => { const t = ((min % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
export function cycles(said) {
  const t = String(said).toLowerCase(); const at = minutesOf(t); if (at === null) return null;
  const bedtime = /^bedtime/.test(t);
  const options = [6, 5, 4].map(n => ({ n, hours: n * 1.5, at: bedtime ? at - n * 90 - 15 : at + 15 + n * 90 }));
  return { bedtime, at, options };
}

export default function sleepCycles(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'sleep-cycles', label: 'Sleep cycles', symbol: 'bed.double', match: { pattern: PATTERN }, examples: ['bedtime for 7am'],
    async render(said) {
      const c = cycles(said);
      if (!c) return { summary: 'Sleep cycles', complete: 0, body: [line(meta('Type a time: “bedtime for 7am” or “sleep cycles 11pm”'))] };
      const [best, ...rest] = c.options;
      const summary = c.bedtime ? `To wake at ${clock(c.at)}: in bed by ${c.options.map(o => clock(o.at)).join(', ')}` : `In bed at ${clock(c.at)}: wake at ${c.options.map(o => clock(o.at)).join(', ')}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(clock(best.at))), line(chip(`${best.n} cycles · ${best.hours} h`, 'bed.double'))), stack('trailing', line(meta(c.bedtime ? 'in bed by' : 'wake at')), line(meta(c.bedtime ? `to wake at ${clock(c.at)}` : `after bed at ${clock(c.at)}`)))), list(rest.map(o => `${clock(o.at)} · ${o.n} cycles, ${o.hours} h`)), line(meta('cycles of about 90 minutes plus 15 to fall asleep · people vary: a rough guide, not medical advice'))] };
    }
  });
}
