// What markets watch, as a card while it is typed: the Federal Reserve Bank
// of St. Louis' FRED series (no key), each kept an hour.
//
//   "10 year treasury", "2 year treasury", "yield curve", "fed funds rate",
//   "sofr", "mortgage rates", "us inflation rate", "unemployment rate", "rates"

export const SERIES = {
  '10y': ['DGS10', '10-year Treasury'], '2y': ['DGS2', '2-year Treasury'], '30y': ['DGS30', '30-year Treasury'], '3m': ['DGS3MO', '3-month Treasury'], '5y': ['DGS5', '5-year Treasury'],
  fed: ['DFF', 'Fed funds (effective)'], sofr: ['SOFR', 'SOFR'], mortgage: ['MORTGAGE30US', '30-year mortgage (Freddie Mac)'], mortgage15: ['MORTGAGE15US', '15-year mortgage (Freddie Mac)'],
  unemployment: ['UNRATE', 'Unemployment rate'], cpi: ['CPIAUCSL', 'CPI, all items'], core: ['CPILFESL', 'Core CPI']
};
export const PATTERN = '^(?:(?:us\\s+)?(?:\\d{1,2}|3[\\s-]*month|three[\\s-]*month)[\\s-]*(?:year|yr|y)?[\\s-]*(?:treasury|treasuries|t-?note|t-?bill|yield|bond)(?:\\s+yield)?|yield\\s+curve|(?:the\\s+)?fed(?:eral)?\\s+funds(?:\\s+rate)?|fed\\s+rate|interest\\s+rates?|rates|sofr|(?:30|15)[\\s-]*year\\s+mortgage(?:\\s+rates?)?|mortgage\\s+rates?|(?:us\\s+)?(?:inflation|cpi)(?:\\s+rate)?|core\\s+(?:inflation|cpi)|(?:us\\s+)?unemployment(?:\\s+rate)?)$';

export function askedFor(said) {
  const t = String(said).trim().toLowerCase();
  if (/yield\s+curve/.test(t)) return { kind: 'curve' };
  if (/^(?:interest\s+rates?|rates)$/.test(t)) return { kind: 'board' };
  if (/fed/.test(t)) return { kind: 'one', key: 'fed' };
  if (/sofr/.test(t)) return { kind: 'one', key: 'sofr' };
  if (/15[\s-]*year\s+mortgage/.test(t)) return { kind: 'one', key: 'mortgage15' };
  if (/mortgage/.test(t)) return { kind: 'one', key: 'mortgage' };
  if (/core/.test(t)) return { kind: 'inflation', key: 'core' };
  if (/inflation|cpi/.test(t)) return { kind: 'inflation', key: 'cpi' };
  if (/unemployment/.test(t)) return { kind: 'one', key: 'unemployment' };
  if (/3[\s-]*month|three/.test(t)) return { kind: 'one', key: '3m' };
  const years = t.match(/(\d{1,2})/)?.[1];
  return { kind: 'one', key: { 2: '2y', 5: '5y', 10: '10y', 30: '30y' }[years] ?? '10y' };
}

/// FRED's CSV as [{ date, value }], blanks dropped.
export const rows = csv => String(csv).trim().split('\n').slice(1).map(l => l.split(',')).filter(([, v]) => v && v !== '.' && Number.isFinite(Number(v))).map(([date, v]) => ({ date, value: Number(v) }));

export default function marketRates(jevie, context) {
  const { line, spread, stack, hero, chip, meta, title, list } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Market rates', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  const series = async (id, since) => {
    const kept = (await context.state.get('series').catch(() => null)) ?? {};
    if (kept[id] && Date.now() - kept[id].at < 3600_000) return kept[id].rows;
    const csv = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${since}`, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Jevie/1.0 (market rates extension)' } }).then(r => r.ok ? r.text() : Promise.reject(new Error(`FRED answered ${r.status}`)));
    const got = rows(csv);
    await context.state.set('series', { ...kept, [id]: { at: Date.now(), rows: got } }).catch(() => {});
    return got;
  };
  const since = days => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const change = (rs, days) => { const last = rs.at(-1); const then = [...rs].reverse().find(r => Date.parse(r.date) <= Date.parse(last.date) - days * 864e5); return then ? last.value - then.value : null; };
  jevie.registerCard({
    name: 'rates', label: 'Market rates', symbol: 'percent', match: { pattern: PATTERN }, examples: ['10 year treasury', 'yield curve'],
    async render(said) {
      const a = askedFor(said);
      try {
        if (a.kind === 'curve' || a.kind === 'board') {
          const keys = a.kind === 'curve' ? ['3m', '2y', '5y', '10y', '30y'] : ['fed', '2y', '10y', 'mortgage'];
          const got = await Promise.all(keys.map(k => series(SERIES[k][0], since(40)).then(rs => [k, rs.at(-1)])));
          const v = Object.fromEntries(got);
          const spread10_2 = v['10y'] && v['2y'] ? v['10y'].value - v['2y'].value : null;
          const summary = a.kind === 'curve' ? `Yield curve: ${keys.map(k => `${k} ${v[k]?.value.toFixed(2)}%`).join(' · ')} (10y−2y ${spread10_2 >= 0 ? '+' : ''}${spread10_2?.toFixed(2)})` : `Fed ${v.fed?.value.toFixed(2)}% · 2y ${v['2y']?.value.toFixed(2)}% · 10y ${v['10y']?.value.toFixed(2)}% · mortgage ${v.mortgage?.value.toFixed(2)}%`;
          return { summary, copy: summary, complete: 1, body: [
            spread(line(title(a.kind === 'curve' ? 'US Treasury yield curve' : 'US rates')), chip(spread10_2 === null ? '' : spread10_2 < 0 ? `inverted ${spread10_2.toFixed(2)}` : `10y−2y +${spread10_2.toFixed(2)}`, spread10_2 < 0 ? 'arrow.down.right' : 'arrow.up.right')),
            line(...keys.map(k => chip(`${k === 'fed' ? 'Fed' : k === 'mortgage' ? '30y mortgage' : k} ${v[k]?.value.toFixed(2)}%`))),
            line(meta(`as of ${keys.map(k => v[k]?.date).sort().at(-1)} · FRED`))] };
        }
        const [id, name] = SERIES[a.key];
        const rs = await series(id, since(a.kind === 'inflation' ? 800 : 400));
        if (!rs.length) return note('FRED has no recent value', true);
        const last = rs.at(-1);
        if (a.kind === 'inflation') {
          const year = [...rs].reverse().find(r => Date.parse(r.date) <= Date.parse(last.date) - 360 * 864e5);
          const yoy = year ? (last.value / year.value - 1) * 100 : null;
          const summary = `US ${a.key === 'core' ? 'core ' : ''}inflation ${yoy?.toFixed(1)}% over a year (${last.date.slice(0, 7)})`;
          return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${yoy?.toFixed(1)}%`)), line(chip('over the past year'))), stack('trailing', line(title(name)), line(meta(`index ${last.value} · ${last.date.slice(0, 7)}`)))), line(meta('CPI-U, seasonally adjusted · FRED'))] };
        }
        const week = change(rs, 7), yearAgo = change(rs, 365);
        const fmt = d => d === null ? '—' : `${d >= 0 ? '+' : ''}${d.toFixed(2)}`;
        const summary = `${name}: ${last.value.toFixed(2)}% (${last.date})`;
        return { summary, copy: summary, complete: 1, body: [
          spread(stack('leading', line(hero(`${last.value.toFixed(2)}%`)), line(chip(name, 'percent'))), stack('trailing', line(meta(`week ${fmt(week)}`)), line(meta(`year ${fmt(yearAgo)}`)))),
          line(meta(`as of ${last.date} · ${id} on FRED`))] };
      } catch (error) { return note(String(error.message).slice(0, 120), true); }
    }
  });
}
