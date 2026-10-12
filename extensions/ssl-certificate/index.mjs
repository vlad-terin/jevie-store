// A site's certificate as a card while it is typed, read from the server
// itself with node:tls (no service in between): the issuer, the days left,
// the names it covers, and whether this Mac trusts it.
//
//   "ssl github.com", "cert example.org:8443", "tls api.stripe.com"
//
// ↵ copies "github.com · Sectigo · expires 2026-02-05 (in 116 days)".

import tls from 'node:tls';

export const PATTERN = '^(?:ssl|tls|cert|certificate)\\s+(?:[a-z0-9-]+\\.)+[a-z]{2,}(?::\\d{2,5})?$';
const DAY = 864e5;

/// The certificate the server presents: { subject, issuer, from, to, names, trusted, why, protocol }.
export function certificate(host, port = 443, { timeout = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout }, () => {
      const c = socket.getPeerCertificate();
      const out = { subject: c.subject?.CN ?? host, issuer: c.issuer?.O ?? c.issuer?.CN ?? '—', from: new Date(c.valid_from), to: new Date(c.valid_to),
        names: String(c.subjectaltname ?? '').split(/,\s*/).map(n => n.replace(/^DNS:/, '')).filter(Boolean), trusted: socket.authorized, why: socket.authorizationError ? String(socket.authorizationError) : null, protocol: socket.getProtocol() };
      socket.end(); resolve(out);
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error(`${host} did not answer in ${timeout / 1000}s`)); });
    socket.on('error', error => reject(new Error(error.code === 'ENOTFOUND' ? `no host called ${host}` : error.message)));
  });
}

export function cardOf(host, c, P, now = Date.now()) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const left = Math.floor((c.to - now) / DAY);
  const expires = c.to.toISOString().slice(0, 10);
  const summary = `${host} · ${c.issuer} · expires ${expires} (in ${left} days)`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(host)), line(meta(`issued by ${c.issuer}`))),
      stack('trailing', line(hero(`${left}d`, left > 30)), line(chip(left < 0 ? 'expired' : c.trusted ? 'trusted' : 'not trusted', c.trusted && left >= 0 ? 'checkmark.shield' : 'exclamationmark.triangle')))),
    line(text(`${c.from.toISOString().slice(0, 10)} → ${expires} · ${c.protocol ?? 'TLS'}${c.why ? ` · ${c.why}` : ''}`, true)),
    line(meta(c.names.length ? `${c.names.slice(0, 4).join(' · ')}${c.names.length > 4 ? ` +${c.names.length - 4}` : ''}` : c.subject))
  ] };
}

export default function sslCertificate(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'ssl', label: 'Certificate', symbol: 'lock.shield', match: { pattern: PATTERN }, examples: ['ssl github.com', 'cert example.org'],
    async render(said) {
      const [host, port] = said.trim().replace(/^(?:ssl|tls|cert|certificate)\s+/i, '').toLowerCase().split(':');
      try { return cardOf(host, await certificate(host, Number(port) || 443), P); }
      catch (error) { return { summary: 'Certificate', complete: 0, error: true, body: [P.line(P.text(String(error.message).slice(0, 120), true))] }; }
    }
  });
}
