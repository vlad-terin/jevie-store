// An npm package's downloads, as a card while it is typed: npm's own
// downloads API (api.npmjs.org, no key), kept an hour. "vs" compares several.
//
//   "npm downloads react", "npm downloads zod vs yup vs valibot"

// "npm downloads" only: "downloads folder" is the Downloads folder, not a package.
export const PATTERN = '^npm\\s+downloads\\s+(?:@[a-z0-9][\\w.-]*\\/)?[a-z0-9][\\w.-]*(?:\\s+(?:vs\\.?|and|,)\\s+(?:@[a-z0-9][\\w.-]*\\/)?[a-z0-9][\\w.-]*){0,4}$';
const short = n => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);

export default function npmDownloads(jevie, context) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  const get = async (period, name) => {
    const kept = (await context.state.get('counts').catch(() => null)) ?? {};
    const key = `${period}:${name}`;
    if (kept[key]?.at > Date.now() - 3600_000) return kept[key].n;
    const r = await fetch(`https://api.npmjs.org/downloads/point/${period}/${name}`, { signal: AbortSignal.timeout(6000) }).then(x => x.ok ? x.json() : null).catch(() => null);
    const n = Number.isFinite(r?.downloads) ? r.downloads : null;
    await context.state.set('counts', Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), n }]].slice(-200))).catch(() => {});
    return n;
  };
  const span = days => { const end = new Date(Date.now() - 864e5), start = new Date(end - (days - 1) * 864e5); return `${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`; };
  const before = () => { const end = new Date(Date.now() - 31 * 864e5), start = new Date(end - 29 * 864e5); return `${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`; };
  jevie.registerCard({
    name: 'npm-downloads', label: 'npm downloads', symbol: 'arrow.down.circle', match: { pattern: PATTERN }, examples: ['npm downloads react', 'npm downloads zod vs yup'],
    async render(said) {
      const names = said.trim().toLowerCase().replace(/^npm\s+downloads\s+/, '').split(/\s+(?:vs\.?|and)\s+|\s*,\s*/).filter(Boolean);
      const rows = await Promise.all(names.map(async n => ({ name: n, week: await get('last-week', n), month: await get(span(30), n), prior: await get(before(), n) })));
      const ok = rows.filter(r => r.week !== null);
      if (!ok.length) return { summary: 'npm downloads', complete: 0, error: true, body: [line(meta(`No npm package ${names.join(', ')}`))] };
      if (ok.length === 1) {
        const r = ok[0], change = r.prior ? r.month / r.prior - 1 : null;
        const summary = `${r.name}: ${short(r.week)} a week, ${short(r.month)} in 30 days${change !== null ? ` (${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%)` : ''}`;
        return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(short(r.week))), line(chip('downloads a week', 'arrow.down.circle'))), stack('trailing', line(hero(short(r.month), true)), line(chip(change !== null ? `${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}% on the 30 days before` : 'last 30 days')))), line(meta(`${r.name} · npm's downloads API · CI installs count too`))] };
      }
      const sorted = [...ok].sort((a, b) => b.week - a.week);
      const summary = sorted.map(r => `${r.name} ${short(r.week)}/wk`).join(' · ');
      return { summary, copy: summary, complete: 1, body: [line(meta('downloads a week')), list(sorted.map((r, i) => `${i + 1}. ${r.name}: ${short(r.week)} a week${i ? ` (${(r.week / sorted[0].week * 100).toFixed(0)}% of ${sorted[0].name})` : ''}`)), ...(rows.length > ok.length ? [line(meta(`not on npm: ${rows.filter(r => r.week === null).map(r => r.name).join(', ')}`))] : [])] };
    }
  });
}
