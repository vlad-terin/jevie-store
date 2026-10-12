// A domain's DNS records as a card while it is typed, asked of the Mac's own
// resolver (node:dns): addresses, mail, name servers, aliases, and how many
// TXT records - nothing leaves the Mac but the lookups themselves.
//
//   "dns github.com", "nslookup mail.google.com" ("dig" is Jevie's file finder)
//
// ↵ copies every record, one per line.

import { promises as dns } from 'node:dns';

export const PATTERN = '^(?:dns|nslookup)\\s+(?:[a-z0-9-]+\\.)+[a-z]{2,}\\.?$';
export const domainIn = text => String(text ?? '').trim().replace(/^(?:dns|nslookup)\s+/i, '').replace(/\.$/, '').toLowerCase();

const within = (promise, ms) => Promise.race([promise, new Promise(done => setTimeout(() => done(null), ms))]);
const ask = (fn, name) => within(fn(name).catch(() => null), 3000);

/// Every kind at once, each its answer or null.
export async function lookup(domain, resolver = dns) {
  const [a, aaaa, mx, ns, cname, txt] = await Promise.all([ask(n => resolver.resolve4(n), domain), ask(n => resolver.resolve6(n), domain),
    ask(n => resolver.resolveMx(n), domain), ask(n => resolver.resolveNs(n), domain), ask(n => resolver.resolveCname(n), domain), ask(n => resolver.resolveTxt(n), domain)]);
  return { a: a ?? [], aaaa: aaaa ?? [], mx: (mx ?? []).sort((x, y) => x.priority - y.priority).map(m => `${m.priority} ${m.exchange}`), ns: ns ?? [], cname: cname ?? [], txt: (txt ?? []).map(t => t.join('')) };
}

export function cardOf(domain, r, P) {
  const { line, spread, chip, mono, meta, title } = P;
  const rows = [['A', r.a], ['AAAA', r.aaaa], ['CNAME', r.cname], ['MX', r.mx], ['NS', r.ns]].filter(([, v]) => v.length);
  if (!rows.length && !r.txt.length) return { summary: `${domain}: no records`, complete: 0, error: true, body: [line(title(domain)), line(meta('No records - the name may not exist'))] };
  const summary = `${domain}: ${r.a[0] ?? r.cname[0] ?? r.aaaa[0] ?? r.mx[0] ?? 'records'}`;
  return {
    summary, complete: 1,
    copy: [...rows.flatMap(([kind, v]) => v.map(x => `${kind}\t${x}`)), ...r.txt.map(t => `TXT\t${t}`)].join('\n'),
    body: [
      line(title(domain)),
      ...rows.map(([kind, v]) => spread(chip(kind), mono(v.slice(0, 3).join('  ') + (v.length > 3 ? `  +${v.length - 3}` : '')))),
      ...(r.txt.length ? [line(meta(`${r.txt.length} TXT ${r.txt.length === 1 ? 'record' : 'records'}${r.txt.some(t => t.startsWith('v=spf1')) ? ' · SPF' : ''}${r.txt.some(t => /google-site-verification|_?domainkey/.test(t)) ? ' · verification' : ''}`))] : [])
    ]
  };
}

export default function dnsLookup(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'dns', label: 'DNS', symbol: 'network',
    // A domain after the word, or it is not this card ("dns cache" is the switch's).
    match: { pattern: PATTERN },
    examples: ['dns github.com', 'nslookup example.org'],
    async render(text) {
      const domain = domainIn(text);
      return cardOf(domain, await lookup(domain), P);
    }
  });
}
