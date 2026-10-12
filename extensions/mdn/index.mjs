// MDN Web Docs: "mdn flexbox" lists the matching pages with their summaries;
// return opens one. A port of Raycast's MDN extension.

const SEARCH = 'https://developer.mozilla.org/api/v1/search';

/// MDN's search response as rows' data.
export function parseResults(json) {
  return (json?.documents ?? []).map(d => ({ title: d.title, summary: String(d.summary ?? '').replace(/\s+/g, ' ').trim(),
    url: `https://developer.mozilla.org${d.mdn_url}`, section: d.mdn_url.split('/').slice(3, 5).join(' › ') }));
}

export default function mdn(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['mdn', 'mdn docs'],
    what: 'MDN Web Docs pages',
    examples: ['mdn flexbox', 'mdn array map'],
    reversible: true,
    async run(text) {
      if (!text) return { status: 'ok', spoken: 'Search MDN for what?', lines: [{ title: 'Say mdn and what to look up', subtitle: 'mdn flexbox · mdn fetch · mdn array map' }] };
      const response = await fetch(`${SEARCH}?q=${encodeURIComponent(text)}&locale=en-US`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { status: 'needs-help', spoken: 'MDN did not answer.', lines: [{ title: 'MDN did not answer', subtitle: `HTTP ${response.status}` }] };
      const results = parseResults(await response.json()).slice(0, 15);
      return List({
        title: `MDN · ${text}`,
        empty: `Nothing on MDN for ${text}`,
        items: results.map(r => ({ title: r.title, subtitle: r.summary, accessory: r.section, icon: 'book',
          actions: [Action.OpenInBrowser(r.url), Action.CopyToClipboard(r.url)] }))
      });
    }
  }));
}
