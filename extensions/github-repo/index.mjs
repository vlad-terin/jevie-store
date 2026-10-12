// A repository at a glance, as a card while it is typed: GitHub's API (no
// key; GITHUB_TOKEN or GH_TOKEN raises the limit, and past it the gh CLI
// you are signed into answers), kept ten minutes.
// "github repo <words>" searches (the GitHub extension); this is one repo by
// its owner/name.
//
//   "repo vercel/next.js", "gh repo sqlite/sqlite"
//
// ↵ copies its address.

// Not a github.com address: that is typed to be opened, and Return goes to a card.
import { execFile } from 'node:child_process';

export const PATTERN = '^(?:gh\\s+)?repo\\s+[\\w.-]+/[\\w.-]+/?$';
const short = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(n);
const ago = iso => { const d = Math.round((Date.now() - Date.parse(iso)) / 864e5); return d < 1 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago`; };

export function cardOf(r, release, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const summary = `${r.full_name} · ★ ${short(r.stargazers_count)}${release ? ` · ${release.tag_name}` : ''}`;
  return { summary, copy: r.html_url, complete: 1, body: [
    spread(stack('leading', line(title(r.full_name)), line(meta(String(r.description ?? 'no description').slice(0, 90)))),
      stack('trailing', line(hero(`★ ${short(r.stargazers_count)}`)), line(chip(r.language ?? '—', 'chevron.left.forwardslash.chevron.right')))),
    line(chip(release ? `${release.tag_name} · ${ago(release.published_at)}` : 'no releases', 'tag'), chip(`pushed ${ago(r.pushed_at)}`, 'arrow.up.circle')),
    line(text([`⑂ ${short(r.forks_count)}`, `${short(r.open_issues_count)} open issues`, r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : 'no licence', r.archived ? 'archived' : null].filter(Boolean).join(' · '), true))
  ] };
}

export default function githubRepo(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'GitHub repo', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const viaFetch = url => fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/vnd.github+json', 'user-agent': 'Jevie/1.0', ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  // Limited without a token (60 an hour): the gh CLI the person is signed
  // into answers instead, at their own limit. Shaped as a fetch response.
  const viaGh = url => new Promise(done => execFile('gh', ['api', url.replace('https://api.github.com/', '')], { timeout: 8000, maxBuffer: 4 * 1024 * 1024 }, (error, out, err) => {
    const notFound = /HTTP 404|Not Found/.test(String(err));
    done(error ? { ok: false, status: notFound ? 404 : 403, json: async () => null } : { ok: true, status: 200, json: async () => JSON.parse(out) });
  }));
  const get = async url => {
    const r = await viaFetch(url).catch(() => null);
    return r && r.status !== 403 && r.status !== 429 ? r : viaGh(url);
  };
  jevie.registerCard({
    name: 'repo', label: 'GitHub repo', symbol: 'star.circle', match: { pattern: PATTERN }, examples: ['repo vercel/next.js', 'repo sqlite/sqlite'],
    async render(said) {
      const name = said.trim().replace(/^(?:gh\s+)?repo\s+/i, '').replace(/\/$/, '').replace(/\.git$/, '');
      const kept = (await context.state.get('repos').catch(() => null)) ?? {};
      const key = name.toLowerCase();
      if (kept[key] && Date.now() - kept[key].at < 600_000) return cardOf(kept[key].r, kept[key].release, P);
      const response = await get(`https://api.github.com/repos/${name}`).catch(() => null);
      if (!response) return note('GitHub did not answer · try again in a moment', true);
      if (response.status === 404) return note(`No repository ${name}, or it is private`, true);
      if (response.status === 403 || response.status === 429) return note('GitHub is limiting requests · sign in with gh, or set GITHUB_TOKEN', true);
      if (!response.ok) return note(`GitHub answered ${response.status}`, true);
      const r = await response.json();
      const release = await get(`https://api.github.com/repos/${r.full_name}/releases/latest`).then(x => x.ok ? x.json() : null).catch(() => null);
      const kept_r = { full_name: r.full_name, description: r.description, stargazers_count: r.stargazers_count, forks_count: r.forks_count, open_issues_count: r.open_issues_count,
        language: r.language, license: r.license ? { spdx_id: r.license.spdx_id } : null, pushed_at: r.pushed_at, archived: r.archived, html_url: r.html_url };
      const rel = release ? { tag_name: release.tag_name, published_at: release.published_at } : null;
      await context.state.set('repos', Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), r: kept_r, release: rel }]].slice(-200))).catch(() => {});
      return cardOf(kept_r, rel, P);
    }
  });
}
