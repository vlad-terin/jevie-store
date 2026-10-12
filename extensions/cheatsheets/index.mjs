// Cheatsheets: "cheatsheet git" shows devhints.io's sheet; "cheatsheet react"
// with several close lists them, and return shows one. A port of Raycast's
// Cheatsheets extension, which reads the same repository.

const REPO = 'rstacruz/cheatsheets';
const DAY = 24 * 3600 * 1000;

/// The sheet names in the repository's tree: its top-level Markdown files.
export const namesIn = tree => (tree?.tree ?? []).filter(e => e.type === 'blob' && /^[^/_.][^/]*\.md$/.test(e.path) && !/^(README|CONTRIBUTING|CHANGELOG)\.md$/i.test(e.path))
  .map(e => e.path.replace(/\.md$/, ''));

/// A sheet's Markdown without its front matter, kramdown's `{: .class}`
/// marks or Liquid's `{% raw %}` tags, and its title.
export function clean(markdown) {
  const text = String(markdown);
  const front = text.match(/^---\n([\s\S]*?)\n---\n/);
  const title = front?.[1].match(/^title:\s*(.+)$/m)?.[1].replace(/^["']|["']$/g, '') ?? '';
  const body = (front ? text.slice(front[0].length) : text).replace(/^\{:.*\}\s*$/gm, '').replace(/\{%-?\s*(?:end)?raw\s*-?%\}/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { title, markdown: body };
}

/// Sheets that carry every word asked, the exact name first.
export function match(names, text) {
  const q = String(text).toLowerCase().trim().replace(/\s+/g, '-');
  if (!q) return names;
  const words = q.split('-');
  return names.filter(n => words.every(w => n.toLowerCase().includes(w)))
    .sort((a, b) => (a === q ? -1 : b === q ? 1 : 0) || (a.startsWith(q) ? -1 : b.startsWith(q) ? 1 : 0) || a.length - b.length);
}

export default function cheatsheets(jevie, context) {
  const { List, Detail, Action, command } = jevie;
  // GitHub allows sixty unauthenticated calls an hour; the list changes
  // rarely, so it is kept a day.
  async function names(signal) {
    const kept = await context.state.get('names');
    if (kept?.at && Date.now() - kept.at < DAY) return kept.list;
    const response = await fetch(`https://api.github.com/repos/${REPO}/git/trees/master`, { signal, headers: { accept: 'application/vnd.github+json' } });
    if (!response.ok) { if (kept?.list) return kept.list; throw new Error(`GitHub: HTTP ${response.status}`); }
    const list = namesIn(await response.json());
    await context.state.set('names', { at: Date.now(), list });
    return list;
  }
  async function sheet(name, signal) {
    const response = await fetch(`https://raw.githubusercontent.com/${REPO}/master/${encodeURIComponent(name)}.md`, { signal });
    return response.ok ? clean(await response.text()) : null;
  }
  jevie.registerSurface(command({
    names: ['cheatsheet', 'cheatsheets', 'cheat sheet'],
    what: 'developer cheat sheets from devhints.io',
    examples: ['cheatsheet git', 'cheatsheet bash', 'cheatsheets'],
    reversible: true,
    async run(text) {
      const signal = AbortSignal.timeout(10000);
      const found = match(await names(signal), text);
      const exact = found[0] === text.toLowerCase().trim().replace(/\s+/g, '-') ? found[0] : found.length === 1 ? found[0] : null;
      if (text && exact) {
        const page = await sheet(exact, signal);
        if (page) return Detail({ title: page.title || exact, markdown: `# ${page.title || exact}\n\n${page.markdown}\n\n[devhints.io/${exact}](https://devhints.io/${exact})` });
      }
      return List({
        title: text ? `Cheatsheets · ${text}` : 'Cheatsheets',
        empty: `No cheat sheet for ${text}`,
        items: found.slice(0, 200).map(name => ({ title: name, subtitle: `devhints.io/${name}`, icon: 'doc.text',
          actions: [Action.Run(`cheatsheet ${name}`), Action.CopyToClipboard(`https://devhints.io/${name}`)] }))
      });
    }
  }));
}
