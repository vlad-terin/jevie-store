// A campaign link, as a card while it is typed. Words after the address are
// source, medium and campaign in that order; or name them (source=… medium=…
// campaign=… term=… content=…). Built on this Mac.
//
//   "utm https://jevie.app twitter social launch"
//   "utm jevie.app source=newsletter campaign=october"

export const PATTERN = '^utm\\s+\\S+';
const FIELDS = ['source', 'medium', 'campaign', 'term', 'content'];

export function build(said) {
  const parts = String(said).trim().replace(/^utm\s+/i, '').split(/\s+/);
  let address = parts.shift() ?? '';
  if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
  let url;
  try { url = new URL(address); } catch { return null; }
  if (!/\./.test(url.hostname)) return null;
  const given = {}, loose = [];
  for (const p of parts) { const m = p.match(/^(?:utm_)?(source|medium|campaign|term|content)=(.+)$/i); if (m) given[m[1].toLowerCase()] = m[2]; else loose.push(p); }
  for (const f of FIELDS) if (!given[f] && loose.length) given[f] = loose.shift();
  for (const f of FIELDS) if (given[f]) url.searchParams.set(`utm_${f}`, given[f].toLowerCase().replace(/\s+/g, '_'));
  return { url: url.toString(), given, missing: ['source', 'medium', 'campaign'].filter(f => !given[f]) };
}

export function cardOf(b, P) {
  const { line, mono, chip, meta } = P;
  return { summary: b.url, copy: b.url, complete: b.missing.length ? 0.6 : 1, body: [
    line(mono(b.url.length > 110 ? `${b.url.slice(0, 108)}…` : b.url)),
    line(...FIELDS.filter(f => b.given[f]).map(f => chip(`${f}: ${b.given[f]}`))),
    line(meta(b.missing.length ? `add ${b.missing.join(', ')} after the address, or name them (${b.missing[0]}=…)` : '↵ copies the link'))
  ] };
}

export default function utmBuilder(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'utm', label: 'UTM link', symbol: 'link.badge.plus', match: { pattern: PATTERN }, examples: ['utm https://jevie.app twitter social launch', 'utm jevie.app source=newsletter campaign=october'],
    async render(said) {
      const b = build(said);
      return b ? cardOf(b, P) : { summary: 'UTM link', complete: 0, body: [P.line(P.text('Type an address after it, then source, medium and campaign', true))] };
    }
  });
}
