// Where an IP address is and whose network it is, as a card while it is
// typed: ipwho.is, no key, kept a day. Your own address is Jevie's
// ("what is my ip").
//
//   "ip 8.8.8.8", "ip 2606:4700:4700::1111", "whois ip 1.1.1.1"
//
// ↵ copies "8.8.8.8 · Google LLC (AS15169) · Mountain View, US".

import { isIP } from 'node:net';

export const PATTERN = '^(?:whois\\s+)?ip\\s+[0-9a-f:.]{3,45}$';
export const PRIVATE = /^(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fe80:|fc|fd)/i;

export function cardOf(ip, d, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const network = d.connection?.org || d.connection?.isp || 'unknown network';
  const where = [d.city, d.region !== d.city ? d.region : null, d.country_code].filter(Boolean).join(', ');
  const summary = `${ip} · ${network}${d.connection?.asn ? ` (AS${d.connection.asn})` : ''} · ${where}`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(ip)), line(meta(network))), stack('trailing', line(hero(d.flag?.emoji ?? d.country_code ?? '')), line(chip(d.country ?? '—', 'mappin')))),
    line(text([where, d.timezone?.id, d.connection?.asn ? `AS${d.connection.asn}` : null].filter(Boolean).join(' · '), true)),
    line(meta(`${d.type ?? ''} · ${d.connection?.domain ?? ''}`.replace(/^ · | · $/g, '')))
  ] };
}

export default function ipInfo(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'IP info', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'ip', label: 'IP info', symbol: 'mappin.and.ellipse', match: { pattern: PATTERN }, examples: ['ip 8.8.8.8', 'ip 1.1.1.1'],
    async render(said) {
      const ip = said.trim().replace(/^(?:whois\s+)?ip\s+/i, '');
      if (!isIP(ip)) return note(`“${ip}” is not an IP address yet`);
      if (PRIVATE.test(ip)) return note(`${ip} is a private address: it is on a local network, not the internet`);
      const kept = (await context.state.get('ips').catch(() => null)) ?? {};
      if (kept[ip] && Date.now() - kept[ip].at < 864e5) return cardOf(ip, kept[ip].d, P);
      const d = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null);
      if (!d) return note('ipwho.is did not answer · try again in a moment', true);
      if (!d.success) return note(`ipwho.is: ${d.message ?? 'no answer for that address'}`, true);
      await context.state.set('ips', Object.fromEntries([...Object.entries(kept), [ip, { at: Date.now(), d }]].slice(-300))).catch(() => {});
      return cardOf(ip, d, P);
    }
  });
}
