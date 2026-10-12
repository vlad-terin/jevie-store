// Chords, as a card while they are typed, worked out on this Mac:
//
//   "transpose G C D up 2", "transpose Am F C G down 3", "transpose G C D to A"   the chords in the new key
//   "capo 2 G C Em D"                                                              the shapes and what they sound as

const CHORD = '[A-G](?:#|b)?(?:maj7|maj|m7|m|7|sus2|sus4|dim|aug|add9|6|9)?(?:/[A-G](?:#|b)?)?';
export const PATTERN = `^(?:transpose\\s+(?:${CHORD}\\s+)+(?:up|down)\\s+\\d{1,2}(?:\\s+(?:semitones?|steps?|half\\s+steps?))?|transpose\\s+(?:${CHORD}\\s+)+to\\s+[A-G](?:#|b)?m?|capo\\s+\\d{1,2}\\s+(?:${CHORD}\\s*)+)$`;
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const index = n => { const i = SHARP.indexOf(n); return i >= 0 ? i : FLAT.indexOf(n); };
export function move(chord, by, flats = false) {
  return chord.replace(/[A-G](?:#|b)?/g, n => (flats ? FLAT : SHARP)[(index(n) + by % 12 + 12) % 12]);
}
export function transpose(said) {
  const t = String(said).trim();
  const capo = t.match(/^capo\s+(\d{1,2})\s+(.+)$/i);
  if (capo) { const by = Number(capo[1]); const shapes = capo[2].trim().split(/\s+/); return { capo: by, by, shapes, out: shapes.map(c => move(c, by, false)) }; }
  const m = t.match(/^transpose\s+(.+?)\s+(?:(up|down)\s+(\d{1,2})|to\s+([A-G](?:#|b)?m?))(?:\s+\S+)*$/i);
  if (!m) return null;
  const chords = m[1].split(/\s+/);
  let by;
  if (m[4]) { const root = chords[0].match(/^[A-G](?:#|b)?/)[0]; by = (index(m[4].replace(/m$/, '')) - index(root) + 12) % 12; }
  else by = Number(m[3]) * (m[2].toLowerCase() === 'down' ? -1 : 1);
  const flats = m[4] ? /b/.test(m[4]) || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(m[4]) : chords.some(c => /^[A-G]b/.test(c));
  return { by, chords, out: chords.map(c => move(c, by, flats)) };
}

export default function chordTranspose(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'transpose', label: 'Transpose', symbol: 'guitars', match: { pattern: PATTERN }, examples: ['transpose G C D up 2'],
    async render(said) {
      const r = transpose(said);
      if (!r) return { summary: 'Transpose', complete: 0, body: [line(meta('Type chords and a move: “transpose G C D up 2”'))] };
      const from = (r.shapes ?? r.chords).join(' '), to = r.out.join(' ');
      const summary = r.capo ? `Capo ${r.capo}: ${from} shapes sound as ${to}` : `${from} → ${to} (${r.by >= 0 ? '+' : ''}${r.by} semitones)`;
      return { summary, copy: to, complete: 1, body: [pair(stack('leading', line(hero(from, true)), line(chip(r.capo ? 'shapes you play' : 'from'))), icon('arrow.right'), stack('trailing', line(hero(to)), line(chip(r.capo ? `sounds as, capo ${r.capo}` : `${r.by >= 0 ? 'up' : 'down'} ${Math.abs(r.by)}`, 'guitars')))), line(meta(r.capo ? 'each fret of capo raises the shapes a semitone' : 'sharps unless the chords or the key use flats · ↵ copies the new chords'))] };
    }
  });
}
