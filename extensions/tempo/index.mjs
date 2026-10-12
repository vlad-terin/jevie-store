// A tempo in milliseconds, as a card while it is typed, worked out on this
// Mac: a beat is 60000 ÷ BPM, and each note value from it - straight,
// dotted (× 1.5) and triplet (× 2/3) - for delays, reverb pre-delay, LFOs.
//
//   "bpm 120", "tempo 92 bpm", "120 bpm"

export const PATTERN = '^(?:bpm\\s+\\d{2,3}(?:\\.\\d+)?|tempo\\s+\\d{2,3}(?:\\.\\d+)?(?:\\s*bpm)?|\\d{2,3}(?:\\.\\d+)?\\s*bpm)$';
export const NOTES = [['1/1', 4], ['1/2', 2], ['1/4', 1], ['1/8', 0.5], ['1/16', 0.25], ['1/32', 0.125]];
export function times(bpm) {
  const beat = 60000 / bpm;
  return NOTES.map(([name, beats]) => ({ name, straight: beat * beats, dotted: beat * beats * 1.5, triplet: beat * beats * 2 / 3 }));
}
const ms = x => `${x >= 100 ? Math.round(x) : x.toFixed(1)} ms`;

export default function tempo(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'tempo', label: 'Tempo', symbol: 'metronome', match: { pattern: PATTERN }, examples: ['bpm 120'],
    async render(said) {
      const bpm = Number(said.match(/(\d{2,3}(?:\.\d+)?)/)?.[1]);
      if (!(bpm >= 20 && bpm <= 400)) return { summary: 'Tempo', complete: 0, body: [line(meta('Type a tempo between 20 and 400 BPM'))] };
      const t = times(bpm), q = t[2];
      const summary = `${bpm} BPM: 1/4 ${ms(q.straight)}, 1/8 ${ms(t[3].straight)}, dotted 1/8 ${ms(t[3].dotted)}`;
      return { summary, copy: t.map(n => `${n.name}\t${ms(n.straight)}\tdotted ${ms(n.dotted)}\ttriplet ${ms(n.triplet)}`).join('\n'), complete: 1, body: [
        spread(stack('leading', line(hero(ms(q.straight))), line(chip('a beat (1/4)', 'metronome'))), stack('trailing', line(hero(`${(bpm / 60).toFixed(2)} Hz`, true)), line(chip(`${bpm} BPM`)))),
        list(t.slice(1, 6).map(n => `${n.name}  ${ms(n.straight)} · dotted ${ms(n.dotted)} · triplet ${ms(n.triplet)}`)),
        line(meta('60000 ÷ BPM · ↵ copies every note value'))] };
    }
  });
}
