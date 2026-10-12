// GitHub: "my prs" lists your open pull requests, "prs to review" the ones
// waiting on you, "github issues" what is assigned to you, "github repo
// sqlite vector" searches repositories. Return opens the page, ⌘C copies
// its address. A lean port of Raycast's GitHub extension over the gh CLI
// you are already signed into - no token of its own, nothing written.
// Notifications and trending stay the extensions that already answer them;
// "github" alone stays the browser's (docs/porting-raycast.md, "Names").

import { execFile } from 'node:child_process';

/// What a pull-request sentence asks: your own, the ones waiting on your
/// review, or a search.
export function askedFor(text) {
  const said = String(text ?? '').trim();
  if (!said || /^(?:mine|open|my)$/i.test(said)) return { kind: 'mine' };
  if (/^(?:to|for)\s+review(?:s)?$|^review(?:s)?$|^waiting(?:\s+on\s+me)?$/i.test(said)) return { kind: 'reviews' };
  return { kind: 'search', query: said };
}

/// "3d" for a timestamp, as a row's accessory.
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`;
}

/// gh's JSON as rows' data.
export const parsePrs = (list, now) => (list ?? []).map(pr => ({
  title: `${pr.isDraft ? 'Draft · ' : ''}${pr.title}`, where: `${pr.repository?.nameWithOwner ?? ''}#${pr.number}`,
  when: ago(pr.updatedAt, now), url: pr.url }));
export const parseIssues = (list, now) => (list ?? []).map(issue => ({
  title: issue.title, where: `${issue.repository?.nameWithOwner ?? ''}#${issue.number}`, when: ago(issue.updatedAt, now), url: issue.url }));
export const parseRepos = list => (list ?? []).map(repo => ({
  title: repo.fullName, description: repo.description ?? '', stars: repo.stargazersCount ?? 0, url: repo.url }));

const gh = args => new Promise((resolve, reject) => {
  execFile('gh', args, { timeout: 12000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(new Error(String(stderr || error.message).split('\n')[0]));
    else resolve(JSON.parse(stdout || '[]'));
  });
});

export default function github(jevie) {
  const { List, Action, command } = jevie;
  const open = url => [Action.OpenInBrowser(url), Action.CopyToClipboard(url)];
  const notAnswering = why => ({ status: 'needs-help', spoken: 'gh did not answer.',
    lines: [{ title: 'gh did not answer', subtitle: /auth|login|logged/i.test(why) ? 'sign in first: gh auth login' : why.slice(0, 120) }] });
  const PR_FIELDS = 'number,title,repository,url,updatedAt,isDraft';

  jevie.registerSurface(command({
    names: ['pull requests', 'my prs', 'my pull requests', 'prs'],
    what: 'your GitHub pull requests',
    examples: ['my prs', 'prs to review'],
    reversible: true,
    async run(text) {
      const asked = askedFor(text);
      try {
        const list = await gh(['search', 'prs', '--state=open', '--limit', '20', '--json', PR_FIELDS,
          ...(asked.kind === 'reviews' ? ['--review-requested=@me'] : asked.kind === 'search' ? ['--involves=@me', asked.query] : ['--author=@me'])]);
        const title = asked.kind === 'reviews' ? 'Waiting on your review' : asked.kind === 'search' ? `Your PRs · ${asked.query}` : 'Your open pull requests';
        return List({ title, empty: 'None open.', items: parsePrs(list).map(pr => ({
          title: pr.title, subtitle: pr.where, accessory: pr.when, icon: 'arrow.triangle.pull', actions: open(pr.url) })) });
      } catch (error) { return notAnswering(error.message); }
    }
  }));

  jevie.registerSurface(command({
    names: ['github issues', 'my issues', 'github issue'],
    what: 'GitHub issues assigned to you',
    examples: ['github issues', 'github issues palette flicker'],
    reversible: true,
    async run(text) {
      try {
        const query = String(text ?? '').trim();
        const list = await gh(['search', 'issues', '--state=open', '--limit', '20', '--json', 'number,title,repository,url,updatedAt',
          ...(query ? ['--involves=@me', query] : ['--assignee=@me'])]);
        return List({ title: query ? `Your issues · ${query}` : 'Issues assigned to you', empty: 'None open.',
          items: parseIssues(list).map(issue => ({ title: issue.title, subtitle: issue.where, accessory: issue.when, icon: 'smallcircle.filled.circle', actions: open(issue.url) })) });
      } catch (error) { return notAnswering(error.message); }
    }
  }));

  jevie.registerSurface(command({
    names: ['github repo', 'github repos', 'repo search'],
    what: 'GitHub repository search',
    examples: ['github repo sqlite vector'],
    reversible: true,
    async run(text) {
      const query = String(text ?? '').trim();
      if (!query) return { status: 'ok', spoken: 'Which repos?', lines: [{ title: 'Say github repo and words', subtitle: 'github repo sqlite vector' }] };
      try {
        const list = await gh(['search', 'repos', query, '--limit', '15', '--json', 'fullName,description,stargazersCount,url']);
        return List({ title: `Repositories · ${query}`, empty: `Nothing for ${query}`,
          items: parseRepos(list).map(repo => ({ title: repo.title, subtitle: repo.description,
            accessory: `★ ${repo.stars >= 1000 ? `${Math.round(repo.stars / 100) / 10}k` : repo.stars}`, icon: 'book.closed', actions: open(repo.url) })) });
      } catch (error) { return notAnswering(error.message); }
    }
  }));
}
