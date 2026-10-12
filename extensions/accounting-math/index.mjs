// Bookkeeping sums, as cards while they are typed, worked out on this Mac:
//
//   "vat 20% on 100", "sales tax 8.25% on 59.99"      net, tax, gross
//   "remove vat 20% from 120", "net of 7% from 107"    the tax inside a gross price
//   "depreciation 50000 over 5 years", "… salvage 5000 double declining"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const ADD = `^(?:vat|gst|sales\\s+tax|tax)\\s+[\\d.]+\\s*%\\s+(?:on|to)\\s+${N}$`;
export const REMOVE = `^(?:remove|take\\s+out|extract|net\\s+of)\\s+(?:(?:vat|gst|sales\\s+tax|tax)\\s+)?[\\d.]+\\s*%(?:\\s+(?:vat|gst|tax))?\\s+(?:from|of|in)\\s+${N}$`;
export const DEPR = `^depreciation\\s+${N}\\s+over\\s+\\d+\\s*(?:years?|y)(?:\\s+salvage\\s+${N})?(?:\\s+(?:double[\\s-]declining|ddb|declining|straight[\\s-]line))?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function tax(said) {
  const t = String(said).toLowerCase();
  const rate = Number(t.match(/([\d.]+)\s*%/)?.[1]) / 100, amount = num(t.match(new RegExp(`(?:on|to|from|of|in)\\s+(${N})$`))?.[1]);
  if (!(rate >= 0 && amount >= 0)) return null;
  return /^(?:remove|take|extract|net)/.test(t) ? { rate, gross: amount, net: amount / (1 + rate), tax: amount - amount / (1 + rate), removed: true } : { rate, net: amount, tax: amount * rate, gross: amount * (1 + rate) };
}
export function depreciation(said) {
  const t = String(said).toLowerCase();
  const cost = num(t.match(new RegExp(`depreciation\\s+(${N})`))?.[1]), years = Number(t.match(/over\s+(\d+)/)?.[1]);
  const salvage = num(t.match(new RegExp(`salvage\\s+(${N})`))?.[1] ?? '0') || 0;
  if (!(cost > 0 && years > 0 && salvage < cost)) return null;
  const ddb = /double|ddb|declining/.test(t) && !/straight/.test(t);
  const rows = []; let book = cost;
  for (let y = 1; y <= years; y++) {
    let d = ddb ? book * 2 / years : (cost - salvage) / years;
    if (ddb && y === years) d = book - salvage;
    d = Math.max(0, Math.min(d, book - salvage));
    book -= d; rows.push({ year: y, d, book });
  }
  return { cost, years, salvage, method: ddb ? 'double-declining balance' : 'straight-line', rows };
}

export default function accountingMath(jevie) {
  const { line, pair, stack, hero, chip, meta, icon, list, spread } = jevie.CardParts;
  const taxCard = name => async said => {
    const r = tax(said);
    if (!r) return { summary: 'Tax', complete: 0, body: [line(meta('Type a rate and an amount: “vat 20% on 100”, “remove vat 20% from 120”'))] };
    const summary = `net ${money(r.net)} + tax ${money(r.tax)} = gross ${money(r.gross)} (${(r.rate * 100).toFixed(2).replace(/\.00$/, '')}%)`;
    return { summary, copy: money(r.removed ? r.net : r.gross), complete: 1, body: [pair(stack('leading', line(hero(money(r.net), !r.removed)), line(chip('net'))), icon('plus'), stack('trailing', line(hero(money(r.gross), Boolean(r.removed))), line(chip('gross')))), line(meta(`tax ${money(r.tax)} at ${(r.rate * 100).toFixed(2).replace(/\.00$/, '')}% · ↵ copies the ${r.removed ? 'net' : 'gross'}`))] };
  };
  jevie.registerCard({ name: 'add-tax', label: 'Add tax', symbol: 'plus.forwardslash.minus', match: { pattern: ADD }, examples: ['vat 20% on 100'], render: taxCard('add') });
  jevie.registerCard({ name: 'remove-tax', label: 'Remove tax', symbol: 'minus.circle', match: { pattern: REMOVE }, examples: ['remove vat 20% from 120'], render: taxCard('remove') });
  jevie.registerCard({
    name: 'depreciation', label: 'Depreciation', symbol: 'chart.line.downtrend.xyaxis', match: { pattern: DEPR }, examples: ['depreciation 50000 over 5 years'],
    async render(said) {
      const d = depreciation(said);
      if (!d) return { summary: 'Depreciation', complete: 0, body: [line(meta('Type a cost and years: “depreciation 50000 over 5 years salvage 5000”'))] };
      const summary = `${d.method}: ${money(d.rows[0].d)} in year 1, book ${money(d.rows.at(-1).book)} after ${d.years} years`;
      return { summary, copy: d.rows.map(r => `Year ${r.year}\t${money(r.d)}\t${money(r.book)}`).join('\n'), complete: 1, body: [
        spread(stack('leading', line(hero(money(d.rows[0].d))), line(chip('year 1', 'chart.line.downtrend.xyaxis'))), stack('trailing', line(meta(d.method)), line(meta(`${money(d.cost)} → ${money(d.salvage)} in ${d.years} years`)))),
        list(d.rows.slice(0, 8).map(r => `Year ${r.year}: ${money(r.d)} · book ${money(r.book)}`)),
        line(meta('↵ copies the schedule, one year per line'))] };
    }
  });
}
