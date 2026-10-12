// An overdue invoice's late fee, as a card while it is typed, worked out on
// this Mac as simple interest for the days late: a monthly rate over 30
// days, a yearly one over 365. Many places cap late fees: check yours.
//
//   "late fee 2000 1.5% monthly 45 days", "late fee 3500 18% a year 60 days", "late fee 1200 flat 50 plus 1% monthly 30 days"

const N = '\\$?[\\d,.]+\\s*k?';
export const PATTERN = `^(?:late\\s+fee|overdue\\s+interest|late\\s+interest)\\s+(?:on\\s+)?${N}(?:\\s+flat\\s+${N}(?:\\s+plus)?)?(?:\\s+[\\d.]+\\s*%\\s*(?:a|per|/)?\\s*(?:month|monthly|year|yearly|annual|annually))?\\s+\\d{1,4}\\s*days?(?:\\s+late)?$`;
const num = s => { const m = String(s ?? '').replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)(k)?$/); return m ? Number(m[1]) * (m[2] ? 1000 : 1) : NaN; };
export function fee(said) {
  const t = String(said).toLowerCase();
  const amount = num(t.match(new RegExp(`^(?:late\\s+fee|overdue\\s+interest|late\\s+interest)\\s+(?:on\\s+)?(${N})`))[1]);
  const flat = t.match(new RegExp(`flat\\s+(${N})`)) ? num(t.match(new RegExp(`flat\\s+(${N})`))[1]) : 0;
  const r = t.match(/([\d.]+)\s*%\s*(?:a|per|\/)?\s*(month|monthly|year|yearly|annual|annually)/);
  const days = Number(t.match(/(\d{1,4})\s*days?/)[1]);
  const monthly = r ? /^month/.test(r[2]) : null, rate = r ? Number(r[1]) / 100 : 0;
  const interest = r ? amount * rate * days / (monthly ? 30 : 365) : 0;
  return amount > 0 ? { amount, flat, rate, monthly, days, interest, fee: flat + interest, total: amount + flat + interest, apr: r ? (monthly ? rate * 12 : rate) : null } : null;
}
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function lateFee(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'late-fee', label: 'Late fee', symbol: 'clock.badge.exclamationmark', match: { pattern: PATTERN }, examples: ['late fee 2000 1.5% monthly 45 days'],
    async render(said) {
      const f = fee(said);
      if (!f) return { summary: 'Late fee', complete: 0, body: [line(meta('Type the invoice, the rate and the days: “late fee 2000 1.5% monthly 45 days”'))] };
      return { summary: `${money(f.fee)} late fee after ${f.days} days, ${money(f.total)} due`, copy: money(f.total), complete: 1, body: [spread(stack('leading', line(hero(money(f.fee))), line(chip(`${f.days} days late`, 'clock.badge.exclamationmark'))), stack('trailing', line(hero(money(f.total), true)), line(chip('now due')))), line(meta(`${money(f.amount)}${f.flat ? ` + ${money(f.flat)} flat` : ''}${f.apr !== null ? ` + ${(f.rate * 100).toFixed(2)}% ${f.monthly ? 'a month' : 'a year'} for ${f.days} days (${(f.apr * 100).toFixed(1)}% a year)` : ''} · simple interest · it must be in your terms, and many places cap it`))] };
    }
  });
}
