// npm: "npm package zod" lists packages; return opens the package page, ⌘C
// copies its install line. A port of Raycast's npm extension.
//
// "npm" alone is also the program on your PATH, so "npm install zod" stays
// the shell's: this answers to "npm package" and "npm search", and to
// "@npm-search" (docs/porting-raycast.md, "Names").

const SEARCH = 'https://registry.npmjs.org/-/v1/search';

export const compact = n => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n ?? 0);

/// The registry's search response as rows' data.
export function parseResults(json) {
  return (json?.objects ?? []).map(({ package: p, downloads }) => ({ name: p.name, version: p.version, description: p.description ?? '',
    weekly: downloads?.weekly ?? 0, url: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`, repository: p.links?.repository ?? '' }));
}

export default function npm(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['npm package', 'npm packages', 'npm search'],
    what: 'npm packages',
    examples: ['npm package zod', 'npm search date picker'],
    reversible: true,
    async run(text) {
      if (!text) return { status: 'ok', spoken: 'Which package?', lines: [{ title: 'Say npm package and a name', subtitle: 'npm package zod · npm search date picker' }] };
      const response = await fetch(`${SEARCH}?text=${encodeURIComponent(text)}&size=15`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { status: 'needs-help', spoken: 'The npm registry did not answer.', lines: [{ title: 'The npm registry did not answer', subtitle: `HTTP ${response.status}` }] };
      return List({
        title: `npm · ${text}`,
        empty: `No npm package for ${text}`,
        items: parseResults(await response.json()).map(p => ({ title: `${p.name} ${p.version}`, subtitle: p.description,
          accessory: `${compact(p.weekly)}/wk`, icon: 'shippingbox',
          actions: [Action.OpenInBrowser(p.url), Action.CopyToClipboard(`npm install ${p.name}`)] }))
      });
    }
  }));
}
