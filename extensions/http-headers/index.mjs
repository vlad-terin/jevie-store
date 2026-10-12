// A site's response, as a card while it is typed: the status (after
// redirects), the server, caching and type, and the six security headers
// graded by how many it sends. A HEAD request, falling back to GET.
//
//   "headers github.com", "http headers https://example.org/path"

export const PATTERN = '^(?:http\\s+)?headers\\s+(?:https?://)?[a-z0-9-]+(?:\\.[a-z0-9-]+)+\\S*$';
export const SECURITY = ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
const SHORT = { 'strict-transport-security': 'HSTS', 'content-security-policy': 'CSP', 'x-content-type-options': 'nosniff', 'x-frame-options': 'frame', 'referrer-policy': 'referrer', 'permissions-policy': 'permissions' };

export function grade(headers) {
  const has = SECURITY.filter(h => headers.get(h) || (h === 'x-frame-options' && /frame-ancestors/i.test(headers.get('content-security-policy') ?? '')));
  return { has, missing: SECURITY.filter(h => !has.includes(h)), letter: ['F', 'E', 'D', 'C', 'B', 'A', 'A+'][has.length] };
}

export function cardOf(url, r, ms, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const h = r.headers, g = grade(h);
  const summary = `${new URL(url).hostname}: ${r.status} · ${h.get('server') ?? 'server not said'} · security ${g.letter}`;
  return { summary, copy: [`${r.status} ${url}`, ...[...h.entries()].map(([k, v]) => `${k}: ${v}`)].join('\n'), complete: 1, body: [
    spread(stack('leading', line(title(new URL(url).hostname)), line(meta(`${r.status} ${r.statusText} · ${ms} ms${r.redirected ? ' · after a redirect' : ''}`))), stack('trailing', line(hero(g.letter, g.has.length < 4)), line(chip(`${g.has.length}/6 security`, 'lock.shield')))),
    line(text([h.get('server') && `server ${h.get('server')}`, h.get('content-type')?.split(';')[0], h.get('cache-control') && `cache ${h.get('cache-control').slice(0, 40)}`, h.get('cf-ray') ? 'Cloudflare' : h.get('x-vercel-id') ? 'Vercel' : h.get('x-served-by')?.includes('cache') ? 'Fastly' : null].filter(Boolean).join(' · '), true)),
    line(...g.has.map(x => chip(SHORT[x], 'checkmark')), ...g.missing.slice(0, 3).map(x => chip(`no ${SHORT[x]}`, 'xmark'))),
    line(meta('↵ copies every header'))
  ] };
}

export default function httpHeaders(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'headers', label: 'HTTP headers', symbol: 'list.bullet.rectangle', match: { pattern: PATTERN }, examples: ['headers github.com', 'headers https://example.org'],
    async render(said) {
      let address = said.trim().replace(/^(?:http\s+)?headers\s+/i, '');
      if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
      const started = Date.now();
      const ask = method => fetch(address, { method, redirect: 'follow', signal: AbortSignal.timeout(7000), headers: { 'user-agent': 'Jevie/1.0 (http headers)' } });
      let r = await ask('HEAD').catch(() => null);
      if (!r || r.status === 405 || r.status === 501) r = await ask('GET').catch(error => ({ failed: error }));
      if (!r || r.failed) return { summary: 'HTTP headers', complete: 0, error: true, body: [P.line(P.text(`${new URL(address).hostname} did not answer`, true))] };
      r.body?.cancel?.().catch?.(() => {});
      return cardOf(r.url || address, r, Date.now() - started, P);
    }
  });
}
