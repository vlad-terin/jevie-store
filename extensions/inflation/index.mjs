// What money from one year buys in another, as a card while it is typed:
// the US consumer price index for all urban consumers (CPI-U, not seasonally
// adjusted, from FRED), annual averages, fetched once a month and kept.
//
//   "inflation $100 in 1990", "$50 in 1975 dollars", "inflation 1000 from 2000 to 2020"

export const PATTERN = '^(?:inflation\\s+\\$?[\\d,.]+[km]?\\s+(?:in|from)\\s+\\d{4}(?:\\s+(?:to|in)\\s+\\d{4})?|\\$?[\\d,.]+[km]?\\s+in\\s+\\d{4}\\s+dollars(?:\\s+(?:to|in)\\s+\\d{4})?)$';
const SERIES = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS';

/// FRED's monthly CSV as { year: average }; a year is kept only once all twelve months are in, but the latest partial year is kept too.
export function yearly(csv) {
  const sums = {};
  for (const line of String(csv).trim().split('\n').slice(1)) {
    const [date, value] = line.split(',');
    const v = Number(value); if (!Number.isFinite(v)) continue;
    const y = date.slice(0, 4); (sums[y] ??= []).push(v);
  }
  return Object.fromEntries(Object.entries(sums).map(([y, vs]) => [y, { cpi: vs.reduce((a, b) => a + b, 0) / vs.length, months: vs.length }]));
}

export function askedFor(said) {
  const t = String(said).trim().toLowerCase().replace(/,/g, '');
  const m = t.match(/^inflation\s+\$?([\d.]+)([km]?)\s+(?:in|from)\s+(\d{4})(?:\s+(?:to|in)\s+(\d{4}))?$/) ?? t.match(/^\$?([\d.]+)([km]?)\s+in\s+(\d{4})\s+dollars(?:\s+(?:to|in)\s+(\d{4}))?$/);
  return m ? { amount: Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1), from: m[3], to: m[4] ?? null } : null;
}

const money = n => `$${n.toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 0 : 2, minimumFractionDigits: n >= 100 ? 0 : 2 })}`;

export default function inflation(jevie, context) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Inflation', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  let years = null;
  const load = async () => {
    if (years) return years;
    const kept = await context.state.get('cpi').catch(() => null);
    if (kept && Date.now() - kept.at < 30 * 864e5) return (years = kept.years);
    const csv = await fetch(SERIES, { signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'Jevie/1.0 (inflation extension)' } }).then(r => r.ok ? r.text() : Promise.reject(new Error(`FRED answered ${r.status}`)));
    years = yearly(csv);
    await context.state.set('cpi', { at: Date.now(), years }).catch(() => {});
    return years;
  };
  jevie.registerCard({
    name: 'inflation', label: 'Inflation', symbol: 'dollarsign.arrow.circlepath', match: { pattern: PATTERN }, examples: ['inflation $100 in 1990', '$50 in 1975 dollars'],
    async render(said) {
      const a = askedFor(said);
      if (!a) return note('Type an amount and a year, like “inflation $100 in 1990”');
      try {
        const y = await load();
        const latest = Object.keys(y).sort().at(-1);
        const to = a.to ?? latest;
        if (!y[a.from] || !y[to]) return note(`The index runs from 1913 to ${latest}`, true);
        const worth = a.amount * y[to].cpi / y[a.from].cpi;
        const span = Number(to) - Number(a.from);
        const rate = span ? (y[to].cpi / y[a.from].cpi) ** (1 / Math.abs(span)) - 1 : 0;
        const summary = `${money(a.amount)} in ${a.from} is ${money(worth)} in ${to}${y[to].months < 12 ? ' (so far)' : ''}`;
        return { summary, copy: summary, complete: 1, body: [
          pair(stack('leading', line(hero(money(a.amount), true)), line(chip(a.from))), icon('arrow.right'), stack('trailing', line(hero(money(worth))), line(chip(`${to}${y[to].months < 12 ? ' so far' : ''}`)))),
          line(meta(`prices ×${(y[to].cpi / y[a.from].cpi).toFixed(2)} · ${(rate * 100).toFixed(1)}% a year · US CPI-U, annual averages (FRED)`))] };
      } catch (error) { return note(String(error.message).slice(0, 120), true); }
    }
  });
}
