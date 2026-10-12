// Paying more than the minimum, as a card while it is typed, worked out on
// this Mac: the monthly payment, then what an extra amount each month saves
// in interest and in months. Jevie's own loan card has the payment alone.
//
//   "mortgage 400k 6.5% 30 years extra 500", "loan 25k 7% 5 years extra 100 a month"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:mortgage|loan|car\\s+loan|student\\s+loan)\\s+${N}\\s+(?:at\\s+)?[\\d.]+\\s*%\\s+(?:for\\s+|over\\s+)?\\d+(?:\\.\\d+)?\\s*(?:years?|yrs?|y)\\s+(?:with\\s+)?(?:extra|plus|overpay(?:ing)?)\\s+${N}(?:\\s+(?:a|per|each)\\s+month)?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

/// { payment, months, interest } paying `payment + extra` until it is gone.
export function schedule(principal, rate, payment, extra = 0) {
  const r = rate / 12;
  let left = principal, months = 0, interest = 0;
  while (left > 0.005 && months < 1200) { const i = left * r; interest += i; left = left + i - (payment + extra); months++; }
  if (left < 0) interest += left; // the last payment is smaller
  return { months, interest };
}
export function payoff(said) {
  const t = String(said).trim().toLowerCase();
  const m = t.match(new RegExp(`^(?:mortgage|loan|car\\s+loan|student\\s+loan)\\s+(${N})\\s+(?:at\\s+)?([\\d.]+)\\s*%\\s+(?:for\\s+|over\\s+)?(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?|y)\\s+(?:with\\s+)?(?:extra|plus|overpay(?:ing)?)\\s+(${N})`));
  if (!m) return null;
  const principal = num(m[1]), rate = Number(m[2]) / 100, years = Number(m[3]), extra = num(m[4]);
  if (!(principal > 0 && rate >= 0 && years > 0 && extra > 0)) return null;
  const n = Math.round(years * 12), r = rate / 12;
  const payment = r ? principal * r / (1 - (1 + r) ** -n) : principal / n;
  const base = schedule(principal, rate, payment), faster = schedule(principal, rate, payment, extra);
  return { principal, rate, years, extra, payment, base, faster, saved: base.interest - faster.interest, sooner: base.months - faster.months };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;
const span = months => { const y = Math.floor(months / 12), m = months % 12; return [y && `${y} ${y === 1 ? 'year' : 'years'}`, m && `${m} ${m === 1 ? 'month' : 'months'}`].filter(Boolean).join(' ') || '0 months'; };

export default function loanPayoff(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'loan-payoff', label: 'Loan payoff', symbol: 'house.and.flag', match: { pattern: PATTERN }, examples: ['mortgage 400k 6.5% 30 years extra 500'],
    async render(said) {
      const p = payoff(said);
      if (!p) return { summary: 'Loan payoff', complete: 0, body: [line(meta('Type the loan, the rate, the term and the extra, like “mortgage 400k 6.5% 30 years extra 500”'))] };
      const summary = `${money(p.extra)} extra a month saves ${money(p.saved)} and pays it off ${span(p.sooner)} sooner (${span(p.faster.months)} instead of ${span(p.base.months)})`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(p.saved))), line(chip('interest saved', 'banknote'))), icon('plus'), stack('trailing', line(hero(span(p.sooner))), line(chip('sooner')))),
        line(meta(`${money(p.payment)} a month + ${money(p.extra)} · paid off in ${span(p.faster.months)} instead of ${p.years} years · interest ${money(p.faster.interest)} instead of ${money(p.base.interest)}`))] };
    }
  });
}
