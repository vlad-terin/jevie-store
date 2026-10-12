// npm's version ranges, as a card while it is typed, worked out on this Mac:
// what a range allows, and whether a version is in it.
//
//   "semver ^1.2.0", "semver ~2.1 2.1.9", "semver >=1.2 <2 1.9.0", "semver 1.x 1.5.2"

export const PATTERN = '^semver\\s+\\S+';
const V = /^v?(\d+)(?:\.(\d+|[x*]))?(?:\.(\d+|[x*]))?(?:-([\w.]+))?$/i;

export function parse(v) { const m = String(v).trim().match(V); if (!m) return null; const n = x => (x === undefined || /[x*]/i.test(x)) ? null : Number(x); return { major: Number(m[1]), minor: n(m[2]), patch: n(m[3]), pre: m[4] ?? null }; }
const cmp = (a, b) => (a.major - b.major) || ((a.minor ?? 0) - (b.minor ?? 0)) || ((a.patch ?? 0) - (b.patch ?? 0)) || (a.pre && !b.pre ? -1 : !a.pre && b.pre ? 1 : 0);
const str = v => `${v.major}.${v.minor ?? 0}.${v.patch ?? 0}${v.pre ? `-${v.pre}` : ''}`;

/// A range as [{ op, v }] bounds, and how to say it.
export function range(text) {
  const t = String(text).trim();
  let m;
  if ((m = t.match(/^\^(.+)$/))) { const v = parse(m[1]); if (!v) return null;
    const upper = v.major > 0 ? { major: v.major + 1, minor: 0, patch: 0 } : (v.minor ?? 0) > 0 ? { major: 0, minor: v.minor + 1, patch: 0 } : { major: 0, minor: 0, patch: (v.patch ?? 0) + 1 };
    return { bounds: [{ op: '>=', v: { ...v, minor: v.minor ?? 0, patch: v.patch ?? 0 } }, { op: '<', v: upper }], says: `${str(v)} up to, not including, ${str(upper)}${v.major === 0 ? ' (under 1.0 a caret holds the first non-zero part)' : ': no new major version'}` }; }
  if ((m = t.match(/^~>?(.+)$/))) { const v = parse(m[1]); if (!v) return null;
    const upper = v.minor === null ? { major: v.major + 1, minor: 0, patch: 0 } : { major: v.major, minor: v.minor + 1, patch: 0 };
    return { bounds: [{ op: '>=', v: { ...v, minor: v.minor ?? 0, patch: v.patch ?? 0 } }, { op: '<', v: upper }], says: `${str(v)} up to, not including, ${str(upper)}: patch releases only` }; }
  if ((m = t.match(/^v?(\d+)(?:\.(\d+|[x*]))?(?:\.([x*]))?$/i)) && (m[2] === undefined || /[x*]/i.test(m[2] ?? '') || /[x*]/i.test(m[3] ?? ''))) { const v = parse(t);
    const upper = v.minor === null ? { major: v.major + 1, minor: 0, patch: 0 } : { major: v.major, minor: v.minor + 1, patch: 0 };
    return { bounds: [{ op: '>=', v: { major: v.major, minor: v.minor ?? 0, patch: 0 } }, { op: '<', v: upper }], says: `any ${v.minor === null ? `${v.major}.x` : `${v.major}.${v.minor}.x`} release` }; }
  const parts = t.split(/\s+/).filter(Boolean);
  const bounds = [];
  for (const p of parts) { const b = p.match(/^(>=|<=|>|<|=)?(.+)$/); const v = parse(b[2]); if (!v) return null; bounds.push({ op: b[1] ?? '=', v: { ...v, minor: v.minor ?? 0, patch: v.patch ?? 0 } }); }
  return bounds.length ? { bounds, says: bounds.map(b => `${b.op === '=' ? 'exactly' : b.op} ${str(b.v)}`).join(' and ') } : null;
}
export const satisfies = (version, r) => r.bounds.every(({ op, v }) => { const c = cmp(version, v); return op === '>=' ? c >= 0 : op === '>' ? c > 0 : op === '<' ? c < 0 : op === '<=' ? c <= 0 : c === 0; }) && !(version.pre && !r.bounds.some(b => b.v.pre));

export function cardOf(rangeText, r, version, P) {
  const { line, spread, stack, hero, chip, meta, mono, title } = P;
  if (!version) return { summary: `${rangeText}: ${r.says}`, copy: r.says, complete: 1, body: [line(title(rangeText)), line(mono(r.bounds.map(b => `${b.op}${str(b.v)}`).join(' '))), line(meta(r.says))] };
  const ok = satisfies(version, r);
  const summary = `${str(version)} ${ok ? 'satisfies' : 'is not in'} ${rangeText}`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(rangeText)), line(meta(r.says))), stack('trailing', line(hero(ok ? 'Yes' : 'No', !ok)), line(chip(str(version), ok ? 'checkmark.circle' : 'xmark.circle')))),
    line(mono(r.bounds.map(b => `${b.op}${str(b.v)}`).join(' ')))
  ] };
}

export default function semver(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'semver', label: 'Semver', symbol: 'number.square', match: { pattern: PATTERN }, examples: ['semver ^1.2.0 1.4.5', 'semver ~2.1'],
    async render(said) {
      const words = said.trim().replace(/^semver\s+/i, '').split(/\s+/);
      // The last word is a version to test when it is one and the rest is a range.
      const last = words.length > 1 && /^v?\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(words.at(-1)) ? parse(words.at(-1)) : null;
      const rangeText = (last ? words.slice(0, -1) : words).join(' ');
      const r = range(rangeText);
      return r ? cardOf(rangeText, r, last, P) : { summary: 'Semver', complete: 0, body: [P.line(P.text('Type a range, like ^1.2.0, ~2.1, >=1 <2 or 1.x, and a version to test', true))] };
    }
  });
}
