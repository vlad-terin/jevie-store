// How easy a text is to read, as a card while it is typed, worked out on
// this Mac: Flesch reading ease, Flesch-Kincaid grade, sentences, the
// longest one, and the time to read it. "readability clipboard" reads what
// is copied.
//
//   "readability <text>", "readability clipboard"

import { execFile } from 'node:child_process';

const WORDS = ['readability', 'reading level'];
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, s?.length ?? 1);
}
export function score(text) {
  const sentences = String(text).split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => /\w/.test(s));
  const words = String(text).match(/[A-Za-z’'-]+/g) ?? [];
  if (!words.length) return null;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const perSentence = words.length / Math.max(1, sentences.length), perWord = syl / words.length;
  const ease = 206.835 - 1.015 * perSentence - 84.6 * perWord;
  const grade = 0.39 * perSentence + 11.8 * perWord - 15.59;
  const longest = sentences.map(s => ({ s, n: (s.match(/[A-Za-z’'-]+/g) ?? []).length })).sort((a, b) => b.n - a.n)[0];
  // The scale is 0-100; a very short text runs off either end.
  return { ease: Math.max(0, Math.min(100, ease)), grade: Math.max(0, grade), words: words.length, sentences: sentences.length, longest, minutes: words.length / 238 };
}
const band = e => e >= 90 ? 'very easy' : e >= 70 ? 'easy' : e >= 60 ? 'plain English' : e >= 50 ? 'fairly hard' : e >= 30 ? 'hard' : 'very hard';

export default function readability(jevie) {
  const { line, spread, stack, hero, chip, meta, text: body } = jevie.CardParts;
  const clipboard = () => new Promise(done => execFile('pbpaste', [], { timeout: 2000, maxBuffer: 2 * 1024 * 1024 }, (e, out) => done(e ? '' : String(out))));
  jevie.registerCard({
    name: 'readability', label: 'Readability', symbol: 'text.magnifyingglass', match: { words: WORDS }, examples: ['readability The quick brown fox jumps over the lazy dog.', 'readability We hold these truths to be self-evident, that all men are created equal.'],
    async render(said) {
      let text = said.trim().replace(/^(?:readability|reading level)\s*/i, '').replace(/^(?:of|for)\s+/i, '');
      const fromClipboard = /^(?:the\s+)?clipboard$/i.test(text);
      if (fromClipboard) text = await clipboard();
      const s = score(text);
      if (!s) return { summary: 'Readability', complete: 0, body: [line(meta(fromClipboard ? 'Nothing on the clipboard to read' : 'Type or paste text after it, or say “readability clipboard”'))] };
      const summary = `Readability ${Math.round(s.ease)} (${band(s.ease)}), grade ${Math.max(0, s.grade).toFixed(1)}, ${s.words} words`;
      return { summary, copy: summary, complete: s.words >= 30 ? 1 : 0.7, body: [
        spread(stack('leading', line(hero(String(Math.round(s.ease)))), line(chip(band(s.ease), 'text.magnifyingglass'))), stack('trailing', line(hero(`grade ${Math.max(0, s.grade).toFixed(1)}`, true)), line(chip(`${s.words} words · ${s.sentences} sentences`)))),
        ...(s.longest && s.longest.n > 25 ? [line(body(`Longest sentence, ${s.longest.n} words: “${s.longest.s.slice(0, 120)}${s.longest.s.length > 120 ? '…' : ''}”`, true))] : []),
        line(meta(`${s.minutes < 1 ? 'under a minute' : `${Math.round(s.minutes)} min`} to read${fromClipboard ? ' · from the clipboard' : ''}${s.words < 30 ? ' · scores steady out past about 30 words' : ''}`))] };
    }
  });
}
