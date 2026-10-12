// What an npm package costs a web page, as a card while it is typed: its
// size minified and gzipped, from bundlephobia.com (no key), kept a day.
//
//   "bundle size zod", "bundle size react-dom@18.3.1", "package size date-fns"
//
// ↵ copies "zod@4.6.6: 88.9 kB min+gzip". The npm port ("npm package zod")
// is the list; this is the one number.

const WORDS = ['bundle size', 'bundlephobia', 'package size'];
const NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(?:@[\w.^~<>=-]+)?$/i;

export const kb = bytes => bytes >= 1e6 ? `${(bytes / 1e6).toFixed(2)} MB` : `${(bytes / 1e3).toFixed(1)} kB`;

/// "bundle size zod" → "zod".
export function packageIn(text) {
  const lower = String(text ?? '').trim().toLowerCase();
  const word = WORDS.find(w => lower === w || lower.startsWith(`${w} `));
  return word ? String(text).trim().slice(word.length).trim().replace(/^(?:of|for)\s+/i, '') : null;
}

/// bundlephobia's answer as the card's parts.
export function cardOf(name, info, P) {
  const { line, pair, stack, hero, chip, meta, icon } = P;
  const summary = `${info.name}@${info.version}: ${kb(info.gzip)} min+gzip`;
  return {
    summary, copy: summary, complete: 1,
    body: [
      pair(stack('leading', line(hero(kb(info.gzip))), line(chip('min + gzip', 'shippingbox'))),
        icon('arrow.left.arrow.right'),
        stack('trailing', line(hero(kb(info.size), true)), line(chip('minified')))),
      line(meta([`${info.name}@${info.version}`, `${info.dependencyCount ?? 0} ${info.dependencyCount === 1 ? 'dependency' : 'dependencies'}`,
        info.hasJSModule ? 'ES module' : 'CommonJS', info.hasSideEffects === false ? 'tree-shakeable' : null].filter(Boolean).join(' · ')))
    ]
  };
}

export default function bundleSize(jevie, context) {
  const P = jevie.CardParts;
  const note = (text, summary = 'Bundle size') => ({ summary, complete: 0, body: [P.line(P.text(text, true))] });
  jevie.registerCard({
    name: 'bundle-size', label: 'Bundle size', symbol: 'shippingbox',
    match: { words: WORDS },
    examples: ['bundle size zod', 'bundle size react-dom'],
    async render(text) {
      const name = packageIn(text);
      if (!name) return note('Type a package after it, like “bundle size zod”');
      if (!NAME.test(name)) return note(`“${name}” is not an npm package name`);
      const kept = (await context.state.get('sizes').catch(() => null)) ?? {};
      if (kept[name] && Date.now() - kept[name].at < 864e5) return cardOf(name, kept[name].info, P);
      const response = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(name)}`,
        { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Jevie/1.0 (bundle-size extension)' } }).catch(() => null);
      if (!response) return { ...note('bundlephobia did not answer · try again in a moment'), error: true };
      if (response.status === 404) return { ...note(`No package called ${name} on npm`), error: true };
      if (!response.ok) return { ...note(`bundlephobia answered ${response.status}${response.status === 429 ? ' · it is limiting requests, try in a minute' : ''}`), error: true };
      const info = await response.json().catch(() => null);
      if (!info?.gzip) return { ...note(`bundlephobia could not size ${name}`), error: true };
      const next = Object.fromEntries([...Object.entries(kept), [name, { at: Date.now(), info }]].sort((a, b) => b[1].at - a[1].at).slice(0, 200));
      await context.state.set('sizes', next).catch(() => {});
      return cardOf(name, info, P);
    }
  });
}
