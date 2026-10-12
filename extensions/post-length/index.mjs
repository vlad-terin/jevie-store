// Where a post fits, as a card while it is typed, worked out on this Mac: each
// platform's limit, and the part that shows before the feed cuts it off.
// X counts a link as 23 and an emoji as 2, as it does.
//
//   "post length <text>", "fits <text>", "post length clipboard"

import { execFile } from 'node:child_process';

// Never a bare word that begins other sentences ("fits in my bag", "subject to change").
export const WORDS = ['post length', 'char limit', 'character limit'];
/// [name, limit, shown before "see more" or null].
export const PLATFORMS = [['X', 280, null], ['Threads', 500, null], ['Bluesky', 300, null], ['LinkedIn', 3000, 210], ['Instagram', 2200, 125], ['Facebook', 63206, 125],
  ['Meta description', 160, null], ['Title tag', 60, null], ['Google Ads headline', 30, null], ['SMS', 160, null]];

/// X's count: links are 23, emoji and CJK 2, the rest 1.
export function xLength(text) {
  const links = String(text).match(/https?:\/\/\S+/g) ?? [];
  const rest = String(text).replace(/https?:\/\/\S+/g, '');
  let n = links.length * 23;
  for (const ch of rest) n += /[ᄀ-￿]/.test(ch) && !/[ -⁯]/.test(ch) || ch.codePointAt(0) > 0xFFFF ? 2 : 1;
  return n;
}
export const plainLength = text => [...String(text)].length;

export function fits(text) {
  return PLATFORMS.map(([name, limit, shown]) => { const n = name === 'X' ? xLength(text) : plainLength(text); return { name, limit, shown, n, over: n - limit, cut: shown && n > shown }; });
}

export default function postLength(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  const clipboard = () => new Promise(done => execFile('pbpaste', [], { timeout: 2000, maxBuffer: 1024 * 1024 }, (e, out) => done(e ? '' : String(out))));
  jevie.registerCard({
    name: 'post-length', label: 'Post length', symbol: 'character.cursor.ibeam', match: { words: WORDS }, examples: ["post length Launching our new AI launcher today", "char limit Launching our new AI launcher today"],
    async render(said) {
      let text = said.trim().replace(/^(?:post\s+length|char(?:acter)?\s+limit)\s*/i, '');
      if (/^(?:the\s+)?clipboard$/i.test(text)) text = await clipboard();
      if (!text.trim()) return { summary: 'Post length', complete: 0, body: [line(meta('Type or paste the post after it, or say “post length clipboard”'))] };
      const all = fits(text), x = all[0];
      const over = all.filter(p => p.over > 0).map(p => `${p.name} by ${p.over}`);
      const ok = all.filter(p => p.over <= 0);
      const summary = `${plainLength(text)} characters (X counts ${x.n}) · fits ${ok.map(p => p.name).join(', ') || 'none'}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(String(x.n))), line(chip(`of 280 on X${x.over > 0 ? ` · ${x.over} over` : ''}`, x.over > 0 ? 'xmark.circle' : 'checkmark.circle'))),
          stack('trailing', line(hero(String(plainLength(text)), true)), line(chip(`${String(text).trim().split(/\s+/).length} words`)))),
        line(...ok.slice(0, 6).map(p => chip(p.cut ? `${p.name} · “see more” after ${p.shown}` : p.name, 'checkmark'))),
        ...(over.length ? [line(meta(`too long for ${over.join(', ')}`))] : [])
      ] };
    }
  });
}
