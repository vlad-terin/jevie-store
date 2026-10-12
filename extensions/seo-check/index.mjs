// A page's search basics, as a card while it is typed: the title and the
// meta description against the lengths Google shows, one H1, a canonical,
// whether robots may index it, its language - and how it would read as a
// result. The page's HTML is read, never run.
//
//   "seo github.com", "seo vercel.com/pricing"

export const PATTERN = '^seo\\s+(?:https?://\\S+|(?:[a-z0-9-]+\\.)+[a-z]{2,24}(?:[/?#]\\S*)?)$';
const attr = (tag, name) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;
const decode = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

export function audit(html, headers = new Headers()) {
  const head = String(html).split(/<\/head>/i)[0];
  const metas = (head.match(/<meta\b[^>]*>/gi) ?? []).map(t => ({ key: (attr(t, 'name') ?? attr(t, 'property') ?? '').toLowerCase(), value: decode(attr(t, 'content')) }));
  const meta = k => metas.find(m => m.key === k)?.value ?? null;
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = meta('description');
  const robots = `${meta('robots') ?? ''} ${headers.get('x-robots-tag') ?? ''}`.toLowerCase();
  const canonical = (head.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) ?? [])[0];
  const h1 = (String(html).match(/<h1\b/gi) ?? []).length;
  const lang = String(html).match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? null;
  const issues = [];
  if (!title) issues.push('no title'); else if (title.length > 60) issues.push(`title ${title.length} chars, cut past ~60`); else if (title.length < 15) issues.push('title very short');
  if (!description) issues.push('no meta description'); else if (description.length > 160) issues.push(`description ${description.length} chars, cut past ~160`); else if (description.length < 50) issues.push('description short');
  if (h1 === 0) issues.push('no H1'); else if (h1 > 1) issues.push(`${h1} H1s`);
  if (!canonical) issues.push('no canonical');
  if (/noindex/.test(robots)) issues.push('noindex: kept out of search');
  if (!lang) issues.push('no lang');
  return { title, description, h1, canonical: canonical ? attr(canonical, 'href') : null, noindex: /noindex/.test(robots), lang, issues };
}

export function cardOf(url, a, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const score = Math.max(0, 6 - a.issues.length);
  const host = new URL(url).hostname.replace(/^www\./, '');
  return { summary: `${host}: ${a.issues.length ? a.issues.join(', ') : 'search basics in order'}`, copy: [`Title (${a.title.length}): ${a.title}`, `Description (${a.description?.length ?? 0}): ${a.description ?? ''}`, ...a.issues.map(i => `- ${i}`)].join('\n'), complete: 1, body: [
    line(meta(`${host} › ${new URL(url).pathname.replace(/\/$/, '') || ''}`)),
    line(title(a.title ? (a.title.length > 60 ? `${a.title.slice(0, 57)}…` : a.title) : 'No title')),
    line(text(a.description ? (a.description.length > 160 ? `${a.description.slice(0, 157)}…` : a.description) : 'No meta description: Google picks text from the page', !a.description)),
    spread(chip(`${score}/6`, a.issues.length ? 'exclamationmark.circle' : 'checkmark.seal'), meta(a.issues.length ? a.issues.slice(0, 3).join(' · ') : `${a.h1} H1 · canonical · indexable · ${a.lang}`))
  ] };
}

export default function seoCheck(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'seo', label: 'SEO check', symbol: 'magnifyingglass.circle', match: { pattern: PATTERN }, examples: ['seo github.com', 'seo vercel.com/pricing'],
    async render(said) {
      let address = said.trim().replace(/^seo\s+/i, '');
      if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
      const r = await fetch(address, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; Jevie SEO check)', accept: 'text/html' } }).catch(() => null);
      if (!r?.ok) return { summary: 'SEO check', complete: 0, error: true, body: [P.line(P.text(r ? `the page answered ${r.status}` : `${new URL(address).hostname} did not answer`, true))] };
      const html = (await r.text()).slice(0, 2_000_000);
      return cardOf(r.url || address, audit(html, r.headers), P);
    }
  });
}
