// When a product stops getting fixes, as a card while it is typed:
// endoflife.date (450 products: languages, frameworks, databases, OSes), no
// key, kept a day.
//
//   "eol python", "eol node 18", "end of life ubuntu", "eol postgresql 13"

export const PATTERN = '^(?:eol|end\\s+of\\s+life|support\\s+dates?\\s+(?:for|of))\\s+[a-z0-9.+-]{2,30}(?:\\s+[\\w.]+)?$';
export const ALIASES = { node: 'nodejs', 'node.js': 'nodejs', postgres: 'postgresql', pg: 'postgresql', mac: 'macos', osx: 'macos', k8s: 'kubernetes', rails: 'ruby-on-rails', dotnet: 'dotnet', '.net': 'dotnet', golang: 'go', java: 'oracle-jdk', jdk: 'oracle-jdk', win: 'windows', mysql: 'mysql', mongo: 'mongodb', ie: 'internet-explorer', vue: 'vue', angular: 'angular', react: 'react', django: 'django', php: 'php', ruby: 'ruby', laravel: 'laravel' };

export function askedFor(said) {
  const t = String(said).trim().toLowerCase().replace(/^(?:eol|end\s+of\s+life|support\s+dates?\s+(?:for|of))\s+/, '');
  const [name, cycle] = t.split(/\s+/);
  return { product: ALIASES[name] ?? name, cycle: cycle ?? null, said: name };
}

const DAY = 864e5;
const DISPLAY = { nodejs: 'Node.js', postgresql: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', macos: 'macOS', 'ruby-on-rails': 'Ruby on Rails', dotnet: '.NET', 'oracle-jdk': 'Oracle JDK', php: 'PHP', ios: 'iOS', 'internet-explorer': 'Internet Explorer', kubernetes: 'Kubernetes', go: 'Go' };
const isPast = v => typeof v === 'string' && Date.parse(v) < Date.now();
const until = v => v === true ? 'ended' : v === false ? 'no date set' : typeof v === 'string' ? (isPast(v) ? `ended ${v}` : `until ${v}`) : '—';

export function cardOf(product, cycles, cycle, P) {
  const { line, spread, stack, hero, chip, meta, title, list } = P;
  const name = DISPLAY[product] ?? product.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (cycle) {
    const c = cycles.find(x => String(x.cycle) === cycle || String(x.cycle).startsWith(`${cycle}.`)) ?? null;
    if (!c) return { summary: `${name} ${cycle}`, complete: 0, error: true, body: [line(title(`${name} ${cycle}`)), line(meta(`no release ${cycle} · releases: ${cycles.slice(0, 8).map(x => x.cycle).join(', ')}`))] };
    const ended = c.eol === true || isPast(c.eol);
    const left = typeof c.eol === 'string' ? Math.round((Date.parse(c.eol) - Date.now()) / DAY) : null;
    const summary = `${name} ${c.cycle}: ${c.eol === true ? 'end of life' : ended ? `end of life since ${c.eol}` : typeof c.eol === 'string' ? `supported until ${c.eol}` : 'supported, no end date set'}`;
    return { summary, copy: summary, complete: 1, body: [
      spread(stack('leading', line(title(`${name} ${c.cycle}`)), line(meta(`latest ${c.latest ?? '—'}${c.lts ? ' · LTS' : ''}`))), stack('trailing', line(hero(ended ? 'Ended' : left !== null ? `${left}d` : 'Supported', !ended)), line(chip(ended ? 'end of life' : 'supported', ended ? 'xmark.octagon' : 'checkmark.shield')))),
      line(meta(`security fixes ${until(c.eol)}${c.support !== undefined && c.support !== c.eol ? ` · active support ${until(c.support)}` : ''}${c.releaseDate ? ` · released ${c.releaseDate}` : ''}`))
    ] };
  }
  const live = cycles.filter(c => !(c.eol === true || isPast(c.eol)));
  const newest = cycles[0];
  const summary = `${name}: newest ${newest.cycle} (${newest.latest ?? ''}), ${live.length} supported`;
  return { summary, copy: [summary, ...live.map(c => `${c.cycle} ${until(c.eol)}`)].join('\n'), complete: 1, body: [
    spread(stack('leading', line(title(name)), line(meta(`newest ${newest.cycle} · ${newest.latest ?? ''}`))), stack('trailing', line(hero(String(live.length))), line(chip('supported releases', 'checkmark.shield')))),
    list(live.slice(0, 5).map(c => `${c.cycle}${c.lts ? ' LTS' : ''} · ${until(c.eol)}`)),
    line(meta('endoflife.date · type a release after it for one, like “eol node 18”'))
  ] };
}

export default function endOfLife(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'End of life', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'eol', label: 'End of life', symbol: 'calendar.badge.exclamationmark', match: { pattern: PATTERN }, examples: ['eol python', 'eol node 18'],
    async render(said) {
      const a = askedFor(said);
      const kept = (await context.state.get('products').catch(() => null)) ?? {};
      let cycles = kept[a.product]?.at > Date.now() - DAY ? kept[a.product].cycles : null;
      if (!cycles) {
        const r = await fetch(`https://endoflife.date/api/${encodeURIComponent(a.product)}.json`, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json' } }).catch(() => null);
        if (!r) return note('endoflife.date did not answer · try again in a moment', true);
        if (r.status === 404) return note(`endoflife.date has no product “${a.said}”`, true);
        cycles = await r.json().catch(() => null);
        if (!Array.isArray(cycles) || !cycles.length) return note(`No releases for ${a.said}`, true);
        await context.state.set('products', Object.fromEntries([...Object.entries(kept), [a.product, { at: Date.now(), cycles: cycles.slice(0, 40) }]].slice(-80))).catch(() => {});
      }
      return cardOf(a.product, cycles, a.cycle, P);
    }
  });
}
