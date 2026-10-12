// A subject line, as a card while it is typed, worked out on this Mac: how
// much of it a phone shows (about 40 characters) and a desktop inbox (60),
// words spam filters and readers flinch at, capitals and exclamation marks,
// and a personal touch.
//
//   "subject line <text>", "subject <text>"

// Never a bare word that begins other sentences ("fits in my bag", "subject to change").
export const WORDS = ['subject line', 'email subject'];
export const SPAMMY = ['free', 'act now', 'limited time', 'urgent', 'guarantee', 'guaranteed', 'winner', 'congratulations', '100%', 'risk-free', 'no cost', 'cash', 'click here',
  'buy now', 'order now', 'once in a lifetime', 'double your', 'earn money', 'extra income', 'cheap', 'best price', 'lowest price', 'miracle', 'no obligation', "don't miss", 'last chance', 'final notice', 'expires'];

export function rate(subject) {
  const s = String(subject).trim();
  const lower = s.toLowerCase();
  const words = s.split(/\s+/).filter(Boolean);
  const spam = SPAMMY.filter(w => new RegExp(`(?:^|\\W)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\W|$)`, 'i').test(lower));
  const caps = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  const bangs = (s.match(/!/g) ?? []).length;
  const emoji = [...s].filter(c => c.codePointAt(0) > 0x2600).length;
  const length = [...s].length;
  const notes = [];
  if (length > 60) notes.push(`${length} characters: cut on most inboxes`); else if (length > 40) notes.push(`${length} characters: cut on a phone after ~40`); else if (length < 10) notes.push('very short');
  if (spam.length) notes.push(`spam-trigger words: ${spam.join(', ')}`);
  if (caps) notes.push(`${caps} word${caps > 1 ? 's' : ''} in capitals`);
  if (bangs > 1) notes.push(`${bangs} exclamation marks`);
  if (emoji > 2) notes.push(`${emoji} emoji`);
  const score = Math.max(0, 100 - (length > 60 ? 20 : length > 40 ? 8 : 0) - spam.length * 15 - caps * 10 - Math.max(0, bangs - 1) * 10 - Math.max(0, emoji - 2) * 5 - (length < 10 ? 10 : 0));
  return { s, length, words: words.length, spam, caps, bangs, emoji, notes, score, phone: length > 40 ? `${[...s].slice(0, 38).join('')}…` : s };
}

export default function emailSubject(jevie) {
  const { line, spread, stack, hero, chip, meta, text } = jevie.CardParts;
  jevie.registerCard({
    name: 'subject', label: 'Subject line', symbol: 'envelope.badge', match: { words: WORDS }, examples: ["subject line Last chance: 50% off ends tonight", "email subject Your October update"],
    async render(said) {
      const subject = said.trim().replace(/^(?:subject\s+line|email\s+subject)\s*:?\s*/i, '');
      if (!subject) return { summary: 'Subject line', complete: 0, body: [line(meta('Type the subject after it'))] };
      const r = rate(subject);
      const summary = `“${r.s}”: ${r.score}/100${r.notes.length ? ` · ${r.notes[0]}` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${r.score}`, r.score < 70)), line(chip(r.score >= 85 ? 'reads well' : r.score >= 70 ? 'could be better' : 'likely to suffer', r.score >= 85 ? 'checkmark.circle' : 'exclamationmark.circle'))),
          stack('trailing', line(text(`📱 ${r.phone}`)), line(meta(`${r.length} characters · ${r.words} words`)))),
        line(meta(r.notes.length ? r.notes.join(' · ') : 'no spam words, no shouting, short enough for a phone'))] };
    }
  });
}
