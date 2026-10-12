// Every feed the person follows, as one list: posts newest first, each with
// its feed and when, the post's own text in the preview, ↵ opens it. One
// extension instead of one per site - blogs, changelogs, YouTube channels,
// arXiv categories all publish RSS or Atom. "add feed <a page>" finds the
// page's own feed (<link rel="alternate">), so a blog's home page is enough.
// The feeds are kept in context.state; three to start, removable.

const START = [
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/' }
];

const decode = s => String(s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const tag = (block, name) => decode(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '').trim();
const plain = html => decode(String(html)).replace(/<(?:br|\/p|\/li|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();

/// An RSS or Atom document as posts: { title, url, date, text, feed }.
export function parseFeed(xml, feed = '') {
  const s = String(xml);
  const atom = /<feed[\s>]/i.test(s);
  const blocks = s.split(atom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1);
  return blocks.map(block => {
    const url = atom ? (block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ?? block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '')
      : tag(block, 'link') || block.match(/<guid[^>]*isPermaLink="true"[^>]*>([^<]+)</i)?.[1] || '';
    const when = tag(block, atom ? 'published' : 'pubDate') || tag(block, 'updated') || tag(block, 'dc:date');
    const text = plain(tag(block, 'content:encoded') || tag(block, 'content') || tag(block, 'description') || tag(block, 'summary') || tag(block, 'media:description'));
    return { title: plain(tag(block, 'title')) || '(untitled)', url: decode(url).trim(), date: when ? new Date(when) : null, text, feed };
  }).filter(post => post.url);
}

/// A page's own feed address, from <link rel="alternate" type="application/rss+xml|atom+xml">.
export function feedLinkIn(html, base) {
  const link = String(html).match(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/i)?.[0];
  const href = link?.match(/href="([^"]+)"/i)?.[1];
  return href ? new URL(decode(href), base).href : null;
}

const ago = date => {
  if (!date || Number.isNaN(date.getTime())) return '';
  const m = Math.round((Date.now() - date.getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

export default function feeds(jevie, context) {
  const { List, command } = jevie;
  const kept = async () => (await context.state.get('feeds')) ?? START;
  const get = (url, signal) => fetch(url, { signal, headers: { 'user-agent': 'Jevie feeds (+https://jevie.ai)', accept: 'application/rss+xml, application/atom+xml, text/xml, text/html' } });

  jevie.registerSurface(command({
    names: ['feeds', 'my feeds', 'news feeds', 'rss'],
    what: 'The newest posts from your RSS and Atom feeds, each post beside the list',
    examples: ['feeds', 'feeds simon'],
    reversible: true,   // it only reads
    async run(text) {
      const signal = AbortSignal.timeout(12000);
      const words = String(text).toLowerCase().trim();
      const all = await kept();
      const asked = words ? all.filter(f => f.name.toLowerCase().includes(words) || f.url.includes(words)) : all;
      const read = await Promise.all(asked.map(f => get(f.url, signal).then(r => r.ok ? r.text() : '').then(xml => parseFeed(xml, f.name)).catch(() => [])));
      const posts = read.flat().sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, 80);
      const failed = asked.filter((_, i) => !read[i].length).map(f => f.name);
      return List({
        title: words && asked.length === 1 ? asked[0].name : `Feeds · ${asked.length}`,
        spoken: posts.length ? `${posts.length} posts; the newest is ${posts[0].title}.` : 'Nothing new in your feeds.',
        empty: asked.length ? `Nothing read from ${asked.map(f => f.name).join(', ')}.` : `No feed called ${words}. Say "add feed" and a page.`,
        items: posts.map(p => ({
          title: p.title,
          subtitle: `${p.feed}${p.date ? ` · ${ago(p.date)}` : ''}`,
          accessory: ago(p.date),
          icon: 'dot.radiowaves.up.forward',
          url: p.url,
          preview: `# ${p.title}\n\n**${p.feed}**${p.date ? ` · ${p.date.toISOString().slice(0, 16).replace('T', ' ')}` : ''}\n\n${p.text.slice(0, 8000)}\n\n[Open it](${p.url})${failed.length ? `\n\n_Not read this time: ${failed.join(', ')}_` : ''}`
        }))
      });
    }
  }));

  // Following and dropping a feed change what is kept: not run on partial speech.
  jevie.registerSurface(command({
    names: ['add feed', 'follow feed', 'subscribe to'],
    what: 'Follow a feed: a feed address, or a page whose feed is found',
    examples: ['add feed https://simonwillison.net'],
    async run(text) {
      const address = String(text).trim().match(/https?:\/\/\S+/)?.[0] ?? (/^[\w.-]+\.[a-z]{2,}/i.test(text.trim()) ? `https://${text.trim()}` : null);
      if (!address) return List({ title: 'Add a feed', items: [{ title: 'Say "add feed" and a page or feed address', subtitle: 'add feed simonwillison.net' }] });
      const signal = AbortSignal.timeout(12000);
      let url = address, body = await get(url, signal).then(r => r.text()).catch(() => '');
      if (!/<(?:rss|feed)[\s>]/i.test(body)) {
        const found = feedLinkIn(body, address);
        if (!found) return List({ title: 'No feed there', items: [{ title: `${address} publishes no RSS or Atom feed`, subtitle: 'try its blog or /feed page' }] });
        url = found; body = await get(url, signal).then(r => r.text()).catch(() => '');
      }
      const name = plain(tag(body.split(/<(?:item|entry)[\s>]/i)[0], 'title')) || new URL(url).hostname;
      const all = await kept();
      if (!all.some(f => f.url === url)) await context.state.set('feeds', [...all, { name, url }]);
      return List({ title: 'Following', items: [{ title: name, subtitle: url, url, icon: 'plus' }], spoken: `Following ${name}.` });
    }
  }));
  jevie.registerSurface(command({
    names: ['remove feed', 'unfollow feed'],
    what: 'Stop following a feed, by its name',
    examples: ['remove feed github blog'],
    async run(text) {
      const words = String(text).toLowerCase().trim();
      const all = await kept();
      const gone = all.filter(f => words && (f.name.toLowerCase().includes(words) || f.url.includes(words)));
      if (!gone.length) return List({ title: 'Feeds', items: all.map(f => ({ title: f.name, subtitle: f.url })), spoken: `No feed called ${words}.` });
      await context.state.set('feeds', all.filter(f => !gone.includes(f)));
      return List({ title: 'Stopped following', items: gone.map(f => ({ title: f.name, subtitle: f.url })), spoken: `Stopped following ${gone.map(f => f.name).join(', ')}.` });
    }
  }));
}
