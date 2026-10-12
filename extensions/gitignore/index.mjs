// GitHub's .gitignore templates (github.com/github/gitignore), as a card
// while one is typed: the list of names read once a month, each template
// when asked, kept a week. Several at once join: "gitignore node macos".
//
//   "gitignore node", "gitignore python", "gitignore swift xcode macos"

export const PATTERN = '^\\.?gitignore\\s+[a-z0-9+#.\\- ]{1,60}$';
const RAW = 'https://raw.githubusercontent.com/github/gitignore/main';
// Where a template lives besides the top level.
const GLOBAL = ['macOS', 'Windows', 'Linux', 'JetBrains', 'VisualStudioCode', 'Vim', 'Emacs', 'Xcode', 'Archives', 'Backup', 'Diff', 'Patch'];
export const ALIASES = { node: 'Node', nodejs: 'Node', js: 'Node', javascript: 'Node', ts: 'Node', typescript: 'Node', react: 'Node', next: 'Nextjs', nextjs: 'Nextjs', python: 'Python', py: 'Python', swift: 'Swift', go: 'Go', golang: 'Go', rust: 'Rust', java: 'Java', kotlin: 'Kotlin',
  android: 'Android', ruby: 'Ruby', rails: 'Rails', php: 'Composer', laravel: 'Laravel', c: 'C', 'c++': 'C++', cpp: 'C++', csharp: 'VisualStudio', 'c#': 'VisualStudio', dotnet: 'VisualStudio', unity: 'Unity', unreal: 'UnrealEngine', terraform: 'Terraform',
  macos: 'macOS', mac: 'macOS', windows: 'Windows', linux: 'Linux', vscode: 'VisualStudioCode', jetbrains: 'JetBrains', idea: 'JetBrains', vim: 'Vim', emacs: 'Emacs', xcode: 'Xcode', dart: 'Dart', flutter: 'Dart', elixir: 'Elixir', haskell: 'Haskell', scala: 'Scala', r: 'R', julia: 'Julia', zig: 'Zig', deno: 'Node' };

export default function gitignore(jevie, context) {
  const { line, spread, title, mono, chip, meta } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Gitignore', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  const get = async name => {
    const kept = (await context.state.get('templates').catch(() => null)) ?? {};
    if (kept[name] && Date.now() - kept[name].at < 7 * 864e5) return kept[name].text;
    for (const path of GLOBAL.includes(name) ? [`Global/${name}.gitignore`, `${name}.gitignore`] : [`${name}.gitignore`, `Global/${name}.gitignore`]) {
      const r = await fetch(`${RAW}/${path}`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (r?.ok) { const text = await r.text(); await context.state.set('templates', Object.fromEntries([...Object.entries(kept), [name, { at: Date.now(), text }]].slice(-60))).catch(() => {}); return text; }
    }
    return null;
  };
  jevie.registerCard({
    name: 'gitignore', label: 'Gitignore', symbol: 'eye.slash', match: { pattern: PATTERN }, examples: ['gitignore node', 'gitignore python'],
    async render(said) {
      const asked = said.trim().toLowerCase().replace(/^\.?gitignore\s+/, '').split(/[\s,]+/).filter(Boolean);
      const names = [...new Set(asked.map(a => ALIASES[a] ?? a.replace(/^\w/, c => c.toUpperCase())))];
      const got = await Promise.all(names.map(async n => [n, await get(n)]));
      const missing = got.filter(([, t]) => !t).map(([n]) => n), found = got.filter(([, t]) => t);
      if (!found.length) return note(`No GitHub template for ${missing.join(', ')}`, true);
      const text = found.map(([n, t]) => `### ${n} ###\n${t.trim()}`).join('\n\n') + '\n';
      const rules = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      return { summary: `.gitignore for ${found.map(([n]) => n).join(' + ')} (${rules.length} rules)`, copy: text, complete: 1, body: [
        spread(title(`.gitignore · ${found.map(([n]) => n).join(' + ')}`), chip(`${rules.length} rules`, 'eye.slash')),
        line(mono(rules.slice(0, 6).join('   '))),
        line(meta(`${missing.length ? `no template for ${missing.join(', ')} · ` : ''}GitHub's github/gitignore · ↵ copies the whole file`))] };
    }
  });
}
