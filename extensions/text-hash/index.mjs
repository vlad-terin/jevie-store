// A text's hash, as a card while it is typed, computed on this Mac with
// node:crypto (UTF-8, hex). Nothing is sent anywhere.
//
//   "sha256 hello", "md5 hello world", "sha1 abc", "sha512 …"
//   (never a bare "hash": "hash browns recipe" is a sentence)

import { createHash } from 'node:crypto';

export const PATTERN = '^(?:sha-?256|sha-?1|sha-?512|md5)\\s+\\S.*$';
export function hash(said) {
  const m = String(said).match(/^(sha-?256|sha-?1|sha-?512|md5)\s+(.+)$/i);
  if (!m) return null;
  const algo = m[1].toLowerCase().replace('-', '');
  const text = m[2].replace(/^["“'](.*)["”']$/, '$1');
  return { algo, text, hex: createHash(algo).update(text, 'utf8').digest('hex') };
}

export default function textHash(jevie) {
  const { line, spread, title, chip, meta, mono } = jevie.CardParts;
  jevie.registerCard({
    name: 'hash', label: 'Hash', symbol: 'number.square', match: { pattern: PATTERN }, examples: ['sha256 hello'],
    async render(said) {
      const h = hash(said);
      if (!h) return { summary: 'Hash', complete: 0, body: [line(meta('Type an algorithm and text: “sha256 hello”'))] };
      return { summary: `${h.algo.toUpperCase()}: ${h.hex}`, copy: h.hex, complete: 1, body: [spread(title(h.algo.toUpperCase()), chip(`${h.text.length} characters`, 'number.square')), line(mono(h.hex.length > 64 ? `${h.hex.slice(0, 64)}…` : h.hex)), line(meta(`UTF-8, hex · computed on this Mac${/md5|sha1/.test(h.algo) ? ' · broken for security: use SHA-256' : ''} · ↵ copies the whole hash`))] };
    }
  });
}
