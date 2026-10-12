// A company's latest annual report in numbers, as a card while it is typed:
// SEC EDGAR's XBRL company facts (no key; SEC asks every program to name a
// contact in its User-Agent, so the email in this extension's settings is
// sent to sec.gov and nowhere else). Kept a day.
//
//   "financials aapl", "revenue msft", "earnings nvda", "10-k tsla", "financials apple"

// "financials apple" by name; "revenue msft", "earnings nvda" by ticker only -
// "revenue growth", "earnings season" are sentences, not companies.
export const PATTERN = '^(?:financials|fundamentals|income\\s+statement|10-?k)\\s+(?:of\\s+|for\\s+)?[a-z.&\\- ]{1,30}$|^(?:revenue|earnings|net\\s+income|eps)\\s+(?:of\\s+|for\\s+)?\\$?[a-z]{1,5}(?:\\.[a-z])?$';
const NOT_TICKERS = new Set(['call', 'calls', 'week', 'today', 'this', 'last', 'next', 'q1', 'q2', 'q3', 'q4', 'beat', 'miss', 'date', 'dates', 'per', 'share', 'model', 'mix']);
const TAGS = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax'],
  income: ['NetIncomeLoss', 'ProfitLoss'], eps: ['EarningsPerShareDiluted', 'EarningsPerShareBasic'],
  operating: ['OperatingIncomeLoss'], cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents']
};

/// The last two full fiscal years of a fact, from 10-K filings: [{ end, val, fy }].
/// Of the tags that may hold it, the one reported most recently (a company
/// moves from one revenue tag to another, and the old one stops).
export function annual(facts, names) {
  let best = [];
  for (const name of names) {
    const units = facts?.['us-gaap']?.[name]?.units;
    if (!units) continue;
    const list = Object.values(units)[0].filter(x => x.form === '10-K' && x.fp === 'FY' && (!x.start || (Date.parse(x.end) - Date.parse(x.start)) > 300 * 864e5));
    const byEnd = new Map(); for (const x of list) byEnd.set(x.end, x);
    const years = [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
    if (years.length && (!best.length || years.at(-1).end > best.at(-1).end)) best = years;
  }
  return best.slice(-3);
}
/// The value for the fiscal year ending `end`, or nothing: never another year's.
const at = (series, end) => series.find(x => x.end === end) ?? null;

const big = n => { const a = Math.abs(n); const s = a >= 1e12 ? `${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a.toLocaleString('en-US'); return `${n < 0 ? '−' : ''}$${s}`; };

export function cardOf(company, f, P) {
  const { line, spread, stack, hero, chip, meta, title } = P;
  // Every number of the same fiscal year: the latest the company reported.
  const end = [f.revenue.at(-1)?.end, f.income.at(-1)?.end].filter(Boolean).sort().at(-1);
  const rev1 = at(f.revenue, end), inc = at(f.income, end), eps = at(f.eps, end), cash = at(f.cash, end), op = at(f.operating, end);
  const rev0 = rev1 ? f.revenue[f.revenue.indexOf(rev1) - 1] ?? null : null;
  const growth = rev0 && rev1 ? rev1.val / rev0.val - 1 : null;
  const margin = rev1 && inc ? inc.val / rev1.val : null;
  const fy = end;
  const summary = `${company.title} (${company.ticker}) FY ending ${fy}: revenue ${rev1 ? big(rev1.val) : '—'}${growth !== null ? ` (${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}%)` : ''}, net income ${inc ? big(inc.val) : '—'}${eps ? `, EPS ${eps.val}` : ''}`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(company.title)), line(meta(`${company.ticker} · fiscal year ending ${fy}`))), stack('trailing', line(hero(rev1 ? big(rev1.val) : '—')), line(chip(growth !== null ? `revenue ${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}%` : 'revenue', growth >= 0 ? 'arrow.up.right' : 'arrow.down.right')))),
    line(chip(`net income ${inc ? big(inc.val) : '—'}`), chip(`margin ${margin !== null ? `${(margin * 100).toFixed(1)}%` : '—'}`), ...(eps ? [chip(`EPS ${eps.val}`)] : [])),
    line(meta([op && `operating income ${big(op.val)}`, cash && `cash ${big(cash.val)}`, 'from its 10-K on SEC EDGAR'].filter(Boolean).join(' · ')))] };
}

export default function companyFinancials(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Company financials', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  const contact = String(context.preferences?.contact ?? '').trim();
  const agent = `Jevie company-financials extension ${contact}`;
  const get = url => fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'user-agent': agent, accept: 'application/json' } }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status === 403 ? 'SEC refused: set a contact email in “settings for company-financials”' : `SEC answered ${r.status}`)));
  let tickers = null;
  const loadTickers = async () => {
    if (tickers) return tickers;
    const kept = await context.state.get('tickers').catch(() => null);
    if (kept && Date.now() - kept.at < 7 * 864e5) return (tickers = kept.list);
    tickers = Object.values(await get('https://www.sec.gov/files/company_tickers.json')).map(c => ({ cik: c.cik_str, ticker: c.ticker, title: c.title }));
    await context.state.set('tickers', { at: Date.now(), list: tickers }).catch(() => {});
    return tickers;
  };
  jevie.registerCard({
    name: 'financials', label: 'Company financials', symbol: 'building.columns', match: { pattern: PATTERN }, examples: ['financials aapl', 'revenue msft'],
    async render(said) {
      if (!/@/.test(contact)) return note('SEC asks for a contact: set your email in “settings for company-financials” (sent only to sec.gov)');
      const byTicker = /^(?:revenue|earnings|net\s+income|eps)\s/i.test(said.trim());
      const q = said.trim().replace(/^(?:financials|revenue|earnings|net\s+income|eps|income\s+statement|10-?k|fundamentals)\s+(?:of\s+|for\s+)?/i, '').trim().toLowerCase().replace(/^\$/, '');
      if (byTicker && NOT_TICKERS.has(q)) return note(`“${said.trim()}” is not a company`);
      try {
        const list = await loadTickers();
        const company = list.find(c => c.ticker.toLowerCase() === q) ?? (byTicker ? null : list.find(c => c.title.toLowerCase() === q) ?? list.find(c => c.title.toLowerCase().startsWith(q)));
        if (!company) return note(`No US-listed company “${q}” in SEC's list`, true);
        const kept = (await context.state.get('facts').catch(() => null)) ?? {};
        let f = kept[company.cik]?.at > Date.now() - 864e5 ? kept[company.cik].f : null;
        if (!f) {
          const facts = (await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(company.cik).padStart(10, '0')}.json`)).facts;
          f = Object.fromEntries(Object.entries(TAGS).map(([k, names]) => [k, annual(facts, names)]));
          await context.state.set('facts', Object.fromEntries([...Object.entries(kept), [company.cik, { at: Date.now(), f }]].slice(-50))).catch(() => {});
        }
        if (!f.revenue.length && !f.income.length) return note(`${company.title} files no annual revenue in XBRL (a fund, a bank, or a foreign filer)`, true);
        return cardOf(company, f, P);
      } catch (error) { return note(String(error.message).slice(0, 140), true); }
    }
  });
}
