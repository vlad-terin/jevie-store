// How a link will look when it is shared, as a card while it is typed: the
// page's Open Graph and Twitter tags (title, description, image, card type,
// site name), and the ones it is missing. The page is read, never run.
//
//   "og github.com", "preview https://vercel.com", "open graph stripe.com/pricing"

// A web address, not a file: "preview report.pdf" is Quick Look's.
export const PATTERN = '^(?:og|open\\s+graph|preview|link\\s+preview|social\\s+card)\\s+(?:https?://\\S+|(?:[a-z0-9-]+\\.)+(?!(?:pdf|png|jpe?g|gif|heic|md|txt|docx?|xlsx?|pptx?|key|pages|numbers|mov|mp4|zip|csv|json|js|ts|swift|py)(?:$|[/?#]))[a-z]{2,24}(?:[/?#]\\S*)?)$';

const attr = (tag, name) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;
const decode = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/// The tags of a page's <head>: { title, description, image, site, type, card, url }.
export function tagsOf(html) {
  const head = String(html).split(/<\/head>/i)[0];
  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? '').toLowerCase();
    const value = attr(tag, 'content');
    if (key && value && !(key in meta)) meta[key] = decode(value);
  }
  const title = decode(head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '');
  return { title: meta['og:title'] ?? meta['twitter:title'] ?? title ?? null, description: meta['og:description'] ?? meta['twitter:description'] ?? meta.description ?? null,
    image: meta['og:image'] ?? meta['twitter:image'] ?? null, site: meta['og:site_name'] ?? null, type: meta['og:type'] ?? null, card: meta['twitter:card'] ?? null,
    hasOg: Boolean(meta['og:title']), hasOgImage: Boolean(meta['og:image']), hasTwitter: Boolean(meta['twitter:card']) };
}

export function cardOf(url, t, P) {
  const { line, spread, title, text, meta, chip } = P;
  const missing = [!t.hasOg && 'og:title', !t.hasOgImage && 'og:image', !t.description && 'description', !t.hasTwitter && 'twitter:card'].filter(Boolean);
  const host = new URL(url).hostname.replace(/^www\./, '');
  return { summary: `${host}: ${t.title ?? 'no title'}`, copy: [t.title, t.description, t.image].filter(Boolean).join('\n'), complete: 1, body: [
    spread(title(String(t.title ?? 'No title').slice(0, 80)), chip(t.site ?? host, 'globe')),
    line(text(String(t.description ?? 'No description').slice(0, 200), !t.description)),
    line(chip(t.image ? 'has an image' : 'no image', t.image ? 'photo' : 'photo.badge.exclamationmark'), chip(t.card ?? 'no twitter card'), ...(t.type ? [chip(t.type)] : [])),
    line(meta(missing.length ? `missing: ${missing.join(', ')}` : 'every tag a share card needs is there'))
  ] };
}

export default function linkPreview(jevie) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Link preview', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'og', label: 'Link preview', symbol: 'rectangle.and.text.magnifyingglass', match: { pattern: PATTERN }, examples: ['og github.com', 'preview https://vercel.com'],
    async render(said) {
      let address = said.trim().replace(/^(?:og|open\s+graph|preview|link\s+preview|social\s+card)\s+/i, '');
      if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
      const response = await fetch(address, { signal: AbortSignal.timeout(7000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; Jevie link preview; like facebookexternalhit)', accept: 'text/html' } }).catch(error => ({ failed: error }));
      if (response.failed || !response.ok) return note(response.failed ? `${new URL(address).hostname} did not answer` : `the page answered ${response.status}`, true);
      // The head is enough: read at most 512 kB.
      const reader = response.body.getReader(); let html = ''; const decoder = new TextDecoder();
      while (html.length < 512_000) { const { done, value } = await reader.read(); if (done) break; html += decoder.decode(value, { stream: true }); if (/<\/head>/i.test(html)) break; }
      reader.cancel().catch(() => {});
      return cardOf(response.url || address, tagsOf(html), P);
    }
  });
}
