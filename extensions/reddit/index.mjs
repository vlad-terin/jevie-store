// Reddit: "subreddit programming" lists its hot posts, "subreddit macapps top"
// the week's top; return opens the thread, ⌘C copies the link it points to.
// A port of Raycast's Reddit extension. Reddit refuses its JSON API without
// an account, so this reads the public Atom feed - which Reddit rate-limits;
// a refusal is said as one, not as an empty subreddit.
//
// "reddit" alone is a site, and is left to open reddit.com.

const SORTS = { hot: 'hot', new: 'new', top: 'top', rising: 'rising' };

const decode = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#32;/g, ' ').replace(/&amp;/g, '&');

/// A subreddit's Atom feed as posts.
export function parseFeed(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const content = decode(entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? '');
    return {
      title: decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      author: entry.match(/<author><name>([^<]+)<\/name>/)?.[1] ?? '',
      thread: entry.match(/<link href="([^"]+)"/)?.[1] ?? '',
      link: decode(content).match(/<a href="([^"]+)">\[link\]<\/a>/)?.[1] ?? '',
      published: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? ''
    };
  }).filter(p => p.title && p.thread);
}

export const ago = iso => {
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1440)}d`;
};

/// "programming top" as the subreddit and the sort.
export function askedFor(text) {
  const words = String(text).trim().replace(/^r\//i, '').split(/\s+/).filter(Boolean);
  const sort = SORTS[words.at(-1)?.toLowerCase()] && words.length > 1 ? SORTS[words.pop().toLowerCase()] : 'hot';
  return { subreddit: words.join(''), sort };
}

export default function reddit(jevie, context) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['subreddit', 'reddit posts'],
    what: "a subreddit's posts",
    examples: ['subreddit programming', 'subreddit macapps top'],
    reversible: true,
    async run(text) {
      const { subreddit, sort } = askedFor(text);
      if (!/^\w{2,21}$/.test(subreddit)) return { status: 'ok', spoken: 'Which subreddit?', lines: [{ title: 'Say subreddit and its name', subtitle: 'subreddit programming · subreddit macapps top' }] };
      // Reddit lets a reader without an account about one request every
      // several seconds, and waiting does not clear it (11 October 2026):
      // each list is kept ten minutes, and a refusal shows the kept one.
      const key = `${subreddit.toLowerCase()}/${sort}`;
      const kept = (await context?.state?.get('lists').catch(() => null)) ?? {};
      const show = (posts, at = null) => List({
        title: `r/${subreddit} · ${sort}${at ? ` · as of ${ago(new Date(at).toISOString())} ago` : ''}`,
        empty: `Nothing in r/${subreddit}`,
        items: posts.map(post => ({ title: post.title, subtitle: post.author, accessory: post.published ? ago(post.published) : '',
          icon: 'bubble.left.and.bubble.right', actions: [Action.OpenInBrowser(post.thread), Action.CopyToClipboard(post.link || post.thread)] }))
      });
      if (kept[key] && Date.now() - kept[key].at < 10 * 60000) return show(kept[key].posts);
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/${sort}.rss?limit=25${sort === 'top' ? '&t=week' : ''}`,
        { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Jevie/1.0' } }).catch(() => null);
      if (!response || response.status === 429 || response.status === 403) {
        if (kept[key]) return show(kept[key].posts, kept[key].at);
        return { status: 'needs-help', spoken: 'Reddit is limiting requests right now.',
          lines: [{ title: 'Reddit is limiting requests right now', subtitle: `${response ? `HTTP ${response.status}` : 'no answer'} · it allows few without an account · ↵ opens r/${subreddit} in the browser`, says: `https://www.reddit.com/r/${subreddit}/${sort}` }] };
      }
      if (!response.ok) return { status: 'needs-help', spoken: `No subreddit ${subreddit}.`, lines: [{ title: `r/${subreddit} did not answer`, subtitle: `HTTP ${response.status}` }] };
      const posts = parseFeed(await response.text());
      // At most thirty lists kept, the newest.
      const next = Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), posts }]].sort((a, b) => b[1].at - a[1].at).slice(0, 30));
      await context?.state?.set('lists', next).catch(() => {});
      return show(posts);
    }
  }));
}
