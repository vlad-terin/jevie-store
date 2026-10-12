// Words for a word, as a card while it is typed: Datamuse, no key, kept a
// day. A definition is Jevie's ("define …").
//
//   "rhymes with orange", "synonyms for happy", "antonyms of brave",
//   "sounds like knight", "words like bright"

export const PATTERN = '^(?:rhymes?\\s+(?:with|for)|synonyms?\\s+(?:for|of)|antonyms?\\s+(?:for|of)|sounds?\\s+like|words?\\s+like)\\s+[a-z][a-z\'-]{1,30}$';
const KINDS = [[/^rhymes?/i, 'rel_rhy', 'Rhymes with'], [/^synonyms?/i, 'rel_syn', 'Synonyms for'], [/^antonyms?/i, 'rel_ant', 'Opposites of'], [/^sounds?/i, 'sl', 'Sounds like'], [/^words?/i, 'ml', 'Means like']];

export function askedFor(said) {
  const t = String(said).trim();
  const [, param, label] = KINDS.find(([re]) => re.test(t)) ?? [];
  const word = t.split(/\s+/).at(-1).toLowerCase();
  return param ? { param, label, word } : null;
}

export function cardOf(a, words, P) {
  const { line, title, meta, chip, spread, text } = P;
  const shown = words.filter(w => w.word !== a.word).slice(0, 18).map(w => w.word);
  const summary = `${a.label.toLowerCase()} ${a.word}: ${shown.slice(0, 8).join(', ')}`;
  return { summary, copy: shown.join(', '), complete: 1, body: [
    spread(title(a.word), chip(a.label, 'textformat.alt')),
    line(text(shown.join(' · '))),
    line(meta(`${shown.length} words · Datamuse · ↵ copies them`))
  ] };
}

export default function rhymes(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Words', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'words', label: 'Words', symbol: 'textformat.alt', match: { pattern: PATTERN }, examples: ['rhymes with light', 'synonyms for happy'],
    async render(said) {
      const a = askedFor(said);
      const key = `${a.param}:${a.word}`;
      const kept = (await context.state.get('words').catch(() => null)) ?? {};
      let words = kept[key]?.at > Date.now() - 864e5 ? kept[key].words : null;
      if (!words) {
        words = await fetch(`https://api.datamuse.com/words?${a.param}=${encodeURIComponent(a.word)}&max=30`, { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (!words) return note('Datamuse did not answer · try again in a moment', true);
        await context.state.set('words', Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), words }]].slice(-300))).catch(() => {});
      }
      return words.length ? cardOf(a, words, P) : note(`No words found: ${a.label.toLowerCase()} ${a.word}`, true);
    }
  });
}
