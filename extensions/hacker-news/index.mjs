// Hacker News, ported from Raycast's extension (raycast/extensions:
// extensions/hacker-news). The Raycast version is a <List> of stories whose
// ActionPanel opens the story and copies its link; here the same data code
// feeds jevie.List / jevie.Action from Jevie's extension API - handed to
// the factory, so nothing is imported. See docs/porting-raycast.md.

const API = 'https://hacker-news.firebaseio.com/v0';
const FEEDS = { top: 'topstories', new: 'newstories', best: 'beststories', ask: 'askstories', show: 'showstories' };

function ago(seconds) {
  const m = Math.round((Date.now() / 1000 - seconds) / 60);
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

async function stories(feed, signal, count = 30) {
  const ids = await (await fetch(`${API}/${FEEDS[feed]}.json`, { signal })).json();
  const items = await Promise.all(ids.slice(0, Math.max(1, Math.min(100, count))).map(id => fetch(`${API}/item/${id}.json`, { signal }).then(r => r.json()).catch(() => null)));
  return items.filter(Boolean);
}

// Its settings ("settings for hacker news"): how many stories, and the list a
// bare "hn" opens on - Raycast's preferences, as `context.preferences`.
export default function hackerNews(jevie, context) {
  const { count = 30, feed: usual = 'top' } = context?.preferences ?? {};
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['hacker news', 'hn'],
    what: 'Hacker News stories - top, new, best, ask or show',
    reversible: true,   // it only reads
    // Its own lists only: "hn best", "hn show"; "hn rust" is a search.
    accepts: rest => new RegExp(`^(?:${Object.keys(FEEDS).join('|')})\\b`, 'i').test(rest),
    async run(text) {
      const feed = Object.keys(FEEDS).find(f => text.toLowerCase().startsWith(f)) ?? usual;
      const list = await stories(feed, AbortSignal.timeout(8000), count);
      return List({
        title: `Hacker News · ${feed}`,
        spoken: `${list.length} ${feed} stories on Hacker News.`,
        items: list.map(story => {
          const page = `https://news.ycombinator.com/item?id=${story.id}`;
          return {
            title: story.title,
            subtitle: `${story.score ?? 0} points · by ${story.by} · ${story.descendants ?? 0} comments`,
            accessory: ago(story.time),
            icon: 'newspaper',
            actions: [Action.OpenInBrowser(story.url ?? page), Action.CopyToClipboard(story.url ?? page)]
          };
        })
      });
    }
  }));
}
