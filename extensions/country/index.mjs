// A country at a glance, as a card while it is typed. The data is the open
// mledoze/countries dataset (no key; REST Countries now asks for one), read
// once and kept a month.
//
//   "country japan", "country de", "country of the capital ottawa"
//
// ↵ copies "Japan 🇯🇵 · Tokyo · Japanese · JPY · +81".

const DATA = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const WORDS = ['country', 'country of'];

export function find(list, said) {
  const q = String(said).trim().toLowerCase().replace(/^the\s+/, '').replace(/^capital\s+/, '');
  if (!q) return null;
  const names = c => [c.name.common, c.name.official, ...(c.altSpellings ?? []), ...Object.values(c.translations ?? {}).map(t => t.common)].map(n => String(n).toLowerCase());
  return list.find(c => c.cca2?.toLowerCase() === q || c.cca3?.toLowerCase() === q)
    ?? list.find(c => names(c).includes(q))
    ?? list.find(c => (c.capital ?? []).some(k => k.toLowerCase() === q))
    ?? list.find(c => c.name.common.toLowerCase().startsWith(q))
    ?? null;
}

export function cardOf(c, P) {
  const { line, spread, stack, hero, chip, meta, title, text } = P;
  const languages = Object.values(c.languages ?? {}).slice(0, 3);
  const currencies = Object.entries(c.currencies ?? {}).map(([code, v]) => `${code}${v.symbol ? ` ${v.symbol}` : ''}`).slice(0, 2);
  const calling = c.idd?.root ? `${c.idd.root}${(c.idd.suffixes ?? []).length === 1 ? c.idd.suffixes[0] : ''}` : null;
  const summary = [`${c.name.common} ${c.flag ?? ''}`.trim(), (c.capital ?? [])[0], languages[0], Object.keys(c.currencies ?? {})[0], calling].filter(Boolean).join(' · ');
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(c.name.common)), line(meta(c.name.official))), hero(c.flag ?? c.cca2)),
    line(chip((c.capital ?? ['no capital'])[0], 'building.columns'), chip(c.subregion ?? c.region ?? '—', 'globe'), ...(calling ? [chip(calling, 'phone')] : [])),
    line(text([languages.join(', '), currencies.join(', '), c.area ? `${Math.round(c.area).toLocaleString('en-US')} km²` : null].filter(Boolean).join(' · '), true)),
    ...(c.tld?.length ? [line(meta(`${c.tld.join(' ')} · drives on the ${c.car?.side ?? '—'}${c.landlocked ? ' · landlocked' : ''}`))] : [])
  ] };
}

export default function country(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Country', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  let list = null;
  const load = async () => {
    if (list) return list;
    const kept = await context.state.get('countries').catch(() => null);
    if (kept && Date.now() - kept.at < 30 * 864e5) return (list = kept.list);
    const response = await fetch(DATA, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`the countries list answered ${response.status}`);
    // Only what the card shows is kept.
    list = (await response.json()).map(c => ({ name: c.name, cca2: c.cca2, cca3: c.cca3, altSpellings: c.altSpellings, translations: Object.fromEntries(Object.entries(c.translations ?? {}).map(([k, v]) => [k, { common: v.common }])),
      capital: c.capital, region: c.region, subregion: c.subregion, languages: c.languages, currencies: c.currencies, idd: c.idd, flag: c.flag, area: c.area, tld: c.tld, landlocked: c.landlocked, car: c.car }));
    await context.state.set('countries', { at: Date.now(), list }).catch(() => {});
    return list;
  };
  jevie.registerCard({
    name: 'country', label: 'Country', symbol: 'flag', match: { words: WORDS }, examples: ['country japan', 'country brazil'],
    async render(said) {
      const q = said.trim().replace(/^country(?:\s+of)?\s*/i, '');
      if (!q) return note('Type a country after it, like “country japan”');
      try {
        const found = find(await load(), q);
        return found ? cardOf(found, P) : note(`No country called ${q}`, true);
      } catch (error) { return note(String(error.message).slice(0, 120), true); }
    }
  });
}
