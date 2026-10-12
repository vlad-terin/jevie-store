// A text's size in tokens, as a card while it is typed, worked out on this
// Mac: about 4 characters (or 0.75 English words) a token, the rule of thumb
// of the common tokenizers - an estimate, not any model's exact count.
//
//   "tokens 2000 words", "tokens 15k words", "tokens <text>", "tokens clipboard"

import { execFile } from 'node:child_process';

// "tokens" (or "token count") and a word count, the clipboard, or a real
// stretch of text: "tokens of appreciation" is a phrase, not a question.
export const PATTERN = '^(?:tokens|token\\s+count)\\s+(?:in\\s+|for\\s+)?(?:[\\d,.]+\\s*k?\\s+words?|(?:the\\s+)?clipboard|(?!of\\s).{24,})$';
export const WINDOWS = [[8_192, '8k'], [32_768, '32k'], [128_000, '128k'], [200_000, '200k'], [1_000_000, '1M']];
export function estimate(text) {
  const words = (String(text).match(/\S+/g) ?? []).length, chars = String(text).length;
  return Math.round(Math.max(chars / 4, words / 0.75));
}

export default function llmTokens(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const clipboard = () => new Promise(done => execFile('pbpaste', [], { timeout: 2000, maxBuffer: 16 * 1024 * 1024 }, (e, out) => done(e ? '' : String(out))));
  jevie.registerCard({
    name: 'tokens', label: 'Tokens', symbol: 'text.word.spacing', match: { pattern: PATTERN }, examples: ['tokens 2000 words'],
    async render(said) {
      const rest = said.trim().replace(/^(?:tokens|token\s+count)\s+(?:in\s+|for\s+)?/i, '');
      let tokens, from;
      const count = rest.toLowerCase().match(/^([\d,.]+)\s*(k)?\s+words?$/);
      if (count) { const w = Number(count[1].replace(/,/g, '')) * (count[2] ? 1000 : 1); tokens = Math.round(w / 0.75); from = `${w.toLocaleString('en-US')} words`; }
      else if (/^(?:the\s+)?clipboard$/i.test(rest)) { const text = await clipboard(); tokens = estimate(text); from = `the clipboard, ${text.length.toLocaleString('en-US')} characters`; }
      else { tokens = estimate(rest); from = `${rest.length.toLocaleString('en-US')} characters`; }
      if (!tokens) return { summary: 'Tokens', complete: 0, body: [line(meta('Type text, a word count (“2000 words”) or “clipboard”'))] };
      const fits = WINDOWS.filter(([n]) => tokens <= n).map(([, l]) => l);
      const summary = `≈ ${tokens.toLocaleString('en-US')} tokens (${from}) · fits ${fits.length ? fits.join(', ') : 'no common window'}`;
      return { summary, copy: String(tokens), complete: 1, body: [spread(stack('leading', line(hero(`≈ ${tokens.toLocaleString('en-US')}`)), line(chip('tokens', 'text.word.spacing'))), stack('trailing', line(meta(from)), line(meta(fits.length ? `fits a ${fits[0]} window` : 'over 1M tokens')))), line(...WINDOWS.map(([n, l]) => chip(l, tokens <= n ? 'checkmark' : 'xmark'))), line(meta('≈ 4 characters or 0.75 words a token, an estimate; each model\'s tokenizer differs, more so for code and other languages'))] };
    }
  });
}
