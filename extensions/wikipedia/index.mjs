// Wikipedia: "wiki article einstein" lists matching pages; return opens the
// page, ⌘C copies its address. With nothing after the name, today's featured
// article; "wiki article random" draws one. A port of Raycast's wikipedia
// extension (its search-page, featured-page and random-page commands).
//
// "wikipedia" alone stays the browser's - a site's bare name opens the site
// (docs/porting-raycast.md, "Names") - so this answers to "wiki article" and
// "wiki search", and to "@ext-wikipedia".

const API = 'https://en.wikipedia.org';

/// A search snippet without its markup: Wikipedia answers HTML
/// (<span class="searchmatch">…</span>) and a few entities.
export function stripHtml(text) {
  return String(text ?? '').replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

/// A page's address from its title.
export function pageUrl(title) {
  return `${API}/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;
}

/// The search response as rows' data: [{ title, snippet, words, url }].
export function parseSearch(json) {
  return (json?.query?.search ?? []).map(page => ({
    title: page.title, snippet: stripHtml(page.snippet), words: page.wordcount ?? 0, url: pageUrl(page.title) }));
}

/// Today's featured-feed path: /api/rest_v1/feed/featured/YYYY/MM/DD.
export function featuredPath(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `/api/rest_v1/feed/featured/${date.getFullYear()}/${month}/${day}`;
}

const fetchJson = async (path, { timeout = 8000 } = {}) => {
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(timeout), headers: { 'User-Agent': 'Jevie (https://github.com/vlad-terin/jevie)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const notAnswering = { status: 'needs-help', spoken: 'Wikipedia did not answer.', lines: [{ title: 'Wikipedia did not answer', subtitle: 'try again in a moment' }] };

export default function wikipedia(jevie) {
  const { List, Action, command } = jevie;
  const row = (page, extract = page.snippet) => ({ title: page.title, subtitle: extract, icon: 'book',
    actions: [Action.OpenInBrowser(page.url ?? pageUrl(page.title)), Action.CopyToClipboard(page.url ?? pageUrl(page.title))] });

  jevie.registerSurface(command({
    names: ['wiki article', 'wikipedia article', 'wiki search', 'wikipedia search'],
    what: 'Wikipedia articles',
    examples: ['wiki article einstein', 'wiki article random'],
    reversible: true,
    async run(text) {
      try {
        // A random page, one row: its summary says whether to open it.
        if (/^random$/i.test(String(text ?? '').trim())) {
          const page = await fetchJson('/api/rest_v1/page/random/summary');
          return List({ title: 'Wikipedia · a random article',
            items: [row({ title: page.title, url: page.content_urls?.desktop?.page }, stripHtml(page.extract).slice(0, 200))] });
        }
        // Nothing asked: today's featured article, and the way to a random one.
        if (!text) {
          const feed = await fetchJson(featuredPath());
          const featured = feed.tfa;
          return List({ title: "Wikipedia · today's featured article",
            items: [...featured ? [row({ title: featured.title, url: featured.content_urls?.desktop?.page }, stripHtml(featured.extract).slice(0, 200))] : [],
              { title: 'A random article', subtitle: 'say "wiki article random"', icon: 'dice' }] });
        }
        const json = await fetchJson(`/w/api.php?action=query&list=search&format=json&srlimit=12&srsearch=${encodeURIComponent(text)}`);
        return List({ title: `Wikipedia · ${text}`, empty: `No Wikipedia page for ${text}`,
          items: parseSearch(json).map(page => ({ ...row(page), accessory: `${Math.round(page.words / 100) / 10}k words` })) });
      } catch { return notAnswering; }
    }
  }));
}
