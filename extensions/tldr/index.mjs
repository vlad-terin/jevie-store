// tldr pages: "tldr tar" lists tar's examples; return copies the command.
// A port of Raycast's TLDR extension - its page parsing, kept; its <List>,
// a Jevie List.

const RAW = 'https://raw.githubusercontent.com/tldr-pages/tldr/main/pages';
const PLATFORMS = ['osx', 'common', 'linux'];   // the Mac's own page first

/// A page's name: "git log" is git-log.md.
export const pageName = text => String(text).trim().toLowerCase().replace(/\s+/g, '-');

/// A tldr page's Markdown as its summary and examples.
export function parsePage(markdown) {
  const lines = String(markdown).split('\n');
  const summary = lines.filter(l => l.startsWith('> ') && !/More information:/i.test(l)).map(l => l.slice(2).trim()).join(' ');
  const more = lines.find(l => /More information:/i.test(l))?.match(/<([^>]+)>/)?.[1] ?? '';
  const examples = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('- ')) continue;
    const code = lines.slice(i + 1).find(l => l.startsWith('`'))?.replace(/^`|`$/g, '');
    // [c]reate is tldr's mnemonic mark; {{path}} a placeholder.
    if (code) examples.push({ what: lines[i].slice(2).replace(/:$/, '').replace(/\[(\w)\]/g, '$1'), command: code.replace(/\{\{(.*?)\}\}/g, '$1') });
  }
  return { summary, more, examples };
}

async function page(name, signal) {
  for (const platform of PLATFORMS) {
    const response = await fetch(`${RAW}/${platform}/${encodeURIComponent(name)}.md`, { signal });
    if (response.ok) return { platform, ...parsePage(await response.text()) };
  }
  return null;
}

export default function tldr(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['tldr'],
    what: 'command-line examples from tldr pages',
    examples: ['tldr tar', 'tldr git log'],
    reversible: true,
    async run(text) {
      const name = pageName(text);
      if (!name) return { status: 'ok', spoken: 'Which command?', lines: [{ title: 'Say tldr and a command', subtitle: 'tldr tar · tldr git log · tldr ffmpeg' }] };
      const found = await page(name, AbortSignal.timeout(8000));
      if (!found) return { status: 'ok', spoken: `No tldr page for ${text}.`, lines: [{ title: `No tldr page for ${text}`, subtitle: 'tldr-pages has no page by that name' }] };
      return List({
        title: `${name} · ${found.summary}`.slice(0, 120),
        spoken: `${found.examples.length} examples for ${text}.`,
        items: found.examples.map(e => ({ title: e.what, subtitle: e.command, icon: 'terminal',
          actions: [Action.CopyToClipboard(e.command)] }))
      });
    }
  }));
}
