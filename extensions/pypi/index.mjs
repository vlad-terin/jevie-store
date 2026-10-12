// A Python package as a card while it is typed: PyPI's JSON API, no key,
// kept an hour.
//
//   "pypi requests", "pip package fastapi"
//
// ↵ copies "pip install requests==2.32.5".

const WORDS = ['pypi', 'pip package', 'python package'];
const NAME = /^[a-z0-9][a-z0-9._-]*$/i;

export function packageIn(said) {
  const lower = String(said ?? '').trim().toLowerCase();
  const word = WORDS.find(w => lower === w || lower.startsWith(`${w} `));
  return word ? lower.slice(word.length).trim() : null;
}

export function cardOf(info, released, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const summary = `${info.name} ${info.version}`;
  return { summary, copy: `pip install ${info.name}==${info.version}`, complete: 1, body: [
    spread(stack('leading', line(title(info.name)), line(meta(info.summary ? String(info.summary).slice(0, 90) : 'no summary'))),
      stack('trailing', line(hero(info.version)), line(chip(released ? `released ${released}` : 'latest', 'shippingbox')))),
    line(text([info.requires_python && `Python ${info.requires_python}`, info.license_expression || (info.license && info.license.length < 30 ? info.license : null), (info.requires_dist ?? []).length ? `${info.requires_dist.filter(d => !/extra ==/.test(d)).length} dependencies` : 'no dependencies'].filter(Boolean).join(' · '), true)),
    line(meta('↵ copies pip install'))
  ] };
}

export default function pypi(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'PyPI', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'pypi', label: 'PyPI', symbol: 'shippingbox.and.arrow.backward', match: { words: WORDS }, examples: ['pypi requests', 'pypi fastapi'],
    async render(said) {
      const name = packageIn(said);
      if (!name) return note('Type a package after it, like “pypi requests”');
      if (!NAME.test(name)) return note(`“${name}” is not a package name`);
      const kept = (await context.state.get('packages').catch(() => null)) ?? {};
      if (kept[name] && Date.now() - kept[name].at < 3600_000) return cardOf(kept[name].info, kept[name].released, P);
      const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (!response) return note('PyPI did not answer · try again in a moment', true);
      if (response.status === 404) return note(`No package called ${name} on PyPI`, true);
      if (!response.ok) return note(`PyPI answered ${response.status}`, true);
      const body = await response.json();
      const files = body.releases?.[body.info.version] ?? body.urls ?? [];
      const released = files[0]?.upload_time?.slice(0, 10) ?? null;
      const info = { name: body.info.name, version: body.info.version, summary: body.info.summary, requires_python: body.info.requires_python,
        license: body.info.license, license_expression: body.info.license_expression, requires_dist: body.info.requires_dist ?? [] };
      await context.state.set('packages', Object.fromEntries([...Object.entries(kept), [name, { at: Date.now(), info, released }]].slice(-200))).catch(() => {});
      return cardOf(info, released, P);
    }
  });
}
