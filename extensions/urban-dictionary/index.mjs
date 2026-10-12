// Slang, as a card while it is typed: Urban Dictionary's top definition
// (most thumbs up) and its example, no key, kept a day. A proper definition
// is Jevie's ("define serendipity").
//
//   "urban yeet", "urban touch grass", "slang for no cap"

// "urban <word>", as Raycast's keyword. A shop's name after it ("urban
// outfitters") finds a definition too, and then ↵ copies it: arrow down to
// the list to open the site instead.
const WORDS = ['urban dictionary', 'urban', 'slang for'];
const plain = t => String(t ?? '').replace(/\[([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim();

export function termIn(said) {
  const lower = String(said ?? '').trim().toLowerCase();
  const word = WORDS.find(w => lower === w || lower.startsWith(`${w} `));
  return word === undefined ? null : String(said).trim().slice(word.length).trim();
}

export function best(list) { return [...(list ?? [])].sort((a, b) => (b.thumbs_up - b.thumbs_down) - (a.thumbs_up - a.thumbs_down))[0] ?? null; }

export function cardOf(term, d, P) {
  const { line, spread, title, text, meta, chip } = P;
  const meaning = plain(d.definition);
  const summary = `${term}: ${meaning.slice(0, 120)}`;
  return { summary, copy: `${term}: ${meaning}`, complete: 1, body: [
    spread(title(d.word ?? term), chip(`👍 ${d.thumbs_up}`, 'hand.thumbsup')),
    line(text(meaning.length > 220 ? `${meaning.slice(0, 218)}…` : meaning)),
    ...(d.example ? [line(meta(`“${plain(d.example).slice(0, 160)}”`))] : [])
  ] };
}

export default function urbanDictionary(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Urban Dictionary', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'urban', label: 'Urban Dictionary', symbol: 'text.bubble', match: { words: WORDS }, examples: ['urban yeet', 'urban touch grass'],
    async render(said) {
      const term = termIn(said);
      if (!term) return note('Type a word after it, like “urban yeet”');
      const key = term.toLowerCase();
      const kept = (await context.state.get('terms').catch(() => null)) ?? {};
      if (kept[key] && Date.now() - kept[key].at < 864e5) return kept[key].d ? cardOf(term, kept[key].d, P) : note(`Urban Dictionary has nothing for ${term}`, true);
      const body = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`, { signal: AbortSignal.timeout(7000) }).then(r => r.ok ? r.json() : null).catch(() => null);
      if (!body) return note('Urban Dictionary did not answer · try again in a moment', true);
      const top = best(body.list);
      const d = top ? { word: top.word, definition: top.definition, example: top.example, thumbs_up: top.thumbs_up } : null;
      await context.state.set('terms', Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), d }]].slice(-300))).catch(() => {});
      return d ? cardOf(term, d, P) : note(`Urban Dictionary has nothing for ${term}`, true);
    }
  });
}
