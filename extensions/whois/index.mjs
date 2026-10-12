// Who holds a domain and until when, as a card while it is typed: RDAP
// (rdap.org finds the registry's server), no key, kept a day.
//
//   "whois github.com", "rdap example.org"
//
// ↵ copies "github.com · MarkMonitor Inc. · expires 2026-10-09 (in 362 days)".

export const PATTERN = '^(?:whois|rdap)\\s+(?:[a-z0-9-]+\\.)+[a-z]{2,}\\.?$';
const DAY = 864e5;

/// RDAP's answer as { registrar, created, expires, updated, status, servers }.
export function read(rdap) {
  const at = action => rdap.events?.find(e => e.eventAction === action)?.eventDate?.slice(0, 10) ?? null;
  const registrar = rdap.entities?.find(e => e.roles?.includes('registrar'));
  const name = registrar?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] ?? registrar?.handle ?? null;
  return { registrar: name, created: at('registration'), expires: at('expiration'), updated: at('last changed'),
    status: (rdap.status ?? []).map(s => s.replace(/^client /, '')).slice(0, 4), servers: (rdap.nameservers ?? []).map(n => String(n.ldhName).toLowerCase()).slice(0, 4) };
}

export function cardOf(domain, w, P, now = Date.now()) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const left = w.expires ? Math.round((Date.parse(w.expires) - now) / DAY) : null;
  const summary = [domain, w.registrar, w.expires ? `expires ${w.expires}${left !== null ? ` (in ${left} days)` : ''}` : null].filter(Boolean).join(' · ');
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(domain)), line(meta(w.registrar ?? 'registrar not given'))),
      stack('trailing', line(hero(left === null ? '—' : `${left}d`, left !== null && left > 60)), line(chip(left === null ? 'no expiry given' : left < 0 ? 'expired' : 'until it expires', left !== null && left < 30 ? 'exclamationmark.triangle' : 'calendar')))),
    line(text([w.created && `registered ${w.created}`, w.expires && `expires ${w.expires}`, w.updated && `changed ${w.updated}`].filter(Boolean).join(' · '), true)),
    ...(w.servers.length ? [line(meta(`${w.servers.join(' · ')}${w.status.length ? ` · ${w.status.join(', ')}` : ''}`))] : [])
  ] };
}

// "is jevie.ai available", "domain jevie" (the common endings at once).
export const AVAILABLE = '^(?:is\\s+(?:the\\s+domain\\s+)?(?:[a-z0-9-]+\\.)+[a-z]{2,}\\s+(?:available|free|taken|registered)\\??|domain\\s+(?:[a-z0-9-]+\\.)*[a-z0-9-]+(?:\\s+(?:available|free))?\\??)$';
export const ENDINGS = ['com', 'ai', 'app', 'io', 'dev', 'co'];

/// One name's registration: { domain, state: 'available'|'taken'|'unknown', w? }.
export async function lookupDomain(domain, { fetchImpl = fetch } = {}) {
  const r = await fetchImpl(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(7000), redirect: 'follow', headers: { accept: 'application/rdap+json', 'user-agent': 'Jevie/1.0 (whois extension)' } }).catch(() => null);
  if (!r) return { domain, state: 'unknown', why: 'no answer' };
  // rdap.org sends a lookup on to the registry; a 404 from the registry is a
  // name nobody holds, one from rdap.org itself an ending with no RDAP.
  const registry = !/^https?:\/\/rdap\.org\//.test(r.url ?? '');
  if (r.status === 404) return registry ? { domain, state: 'available' } : { domain, state: 'unknown', why: `no RDAP for .${domain.split('.').pop()}` };
  if (!r.ok) return { domain, state: 'unknown', why: `RDAP answered ${r.status}` };
  return { domain, state: 'taken', w: read(await r.json()) };
}

export default function whois(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Whois', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'domain', label: 'Domain available?', symbol: 'checkmark.seal', match: { pattern: AVAILABLE }, examples: ['is jevie.ai available', 'domain jevie'],
    async render(said) {
      const t = said.trim().toLowerCase().replace(/\?$/, '').replace(/^is\s+(?:the\s+domain\s+)?/, '').replace(/^domain\s+/, '').replace(/\s+(?:available|free|taken|registered)$/, '').replace(/^www\./, '');
      const names = t.includes('.') ? [t] : ENDINGS.map(e => `${t}.${e}`);
      const found = await Promise.all(names.map(d => lookupDomain(d)));
      const { line, spread, stack, hero, chip, meta, title } = P;
      const free = found.filter(f => f.state === 'available');
      if (names.length === 1) {
        const f = found[0];
        const summary = f.state === 'available' ? `${f.domain} is available` : f.state === 'taken' ? `${f.domain} is taken${f.w?.expires ? `, until ${f.w.expires}` : ''}` : `${f.domain}: can't tell (${f.why})`;
        return { summary, copy: summary, complete: f.state === 'unknown' ? 0 : 1, ...(f.state === 'unknown' ? { error: true } : {}), body: [
          spread(stack('leading', line(title(f.domain)), line(meta(f.state === 'taken' ? `${f.w?.registrar ?? 'registrar not given'}${f.w?.expires ? ` · until ${f.w.expires}` : ''}` : f.state === 'available' ? 'no one has registered it' : f.why))),
            stack('trailing', line(hero(f.state === 'available' ? 'Free' : f.state === 'taken' ? 'Taken' : '?', f.state !== 'available')), line(chip(f.state, f.state === 'available' ? 'checkmark.seal' : f.state === 'taken' ? 'xmark.seal' : 'questionmark.circle'))))] };
      }
      const summary = free.length ? `${t}: ${free.map(f => `.${f.domain.split('.').pop()}`).join(' ')} available` : `${t}: taken on every common ending`;
      return { summary, copy: free.map(f => f.domain).join('\n') || summary, complete: 1, body: [
        spread(line(title(t)), chip(`${free.length} of ${found.length} free`, free.length ? 'checkmark.seal' : 'xmark.seal')),
        line(...found.map(f => chip(`.${f.domain.split('.').pop()}`, f.state === 'available' ? 'checkmark.circle' : f.state === 'taken' ? 'xmark.circle' : 'questionmark.circle'))),
        line(meta(`${free.length ? `free: ${free.map(f => f.domain).join(', ')}` : 'all taken'} · ↵ copies the free ones`))] };
    }
  });
  jevie.registerCard({
    name: 'whois', label: 'Whois', symbol: 'globe.badge.chevron.backward', match: { pattern: PATTERN }, examples: ['whois github.com', 'whois example.org'],
    async render(said) {
      const domain = said.trim().replace(/^(?:whois|rdap)\s+/i, '').replace(/\.$/, '').toLowerCase().replace(/^www\./, '');
      const kept = (await context.state.get('domains').catch(() => null)) ?? {};
      if (kept[domain] && Date.now() - kept[domain].at < DAY) return cardOf(domain, kept[domain].w, P);
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(7000), headers: { accept: 'application/rdap+json', 'user-agent': 'Jevie/1.0 (whois extension)' } }).catch(() => null);
      if (!response) return note('RDAP did not answer · try again in a moment', true);
      if (response.status === 404) return note(`${domain} is not registered, or its registry has no RDAP`, true);
      if (!response.ok) return note(`RDAP answered ${response.status}`, true);
      const w = read(await response.json());
      await context.state.set('domains', Object.fromEntries([...Object.entries(kept), [domain, { at: Date.now(), w }]].slice(-200))).catch(() => {});
      return cardOf(domain, w, P);
    }
  });
}
