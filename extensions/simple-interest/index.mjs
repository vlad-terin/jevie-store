// Interest for some days, as a card while it is typed, worked out on this
// Mac - an overdue invoice, statutory interest, a bridge loan. Actual/365
// unless "360" is said (actual/360, as banks and money markets count).
//
//   "interest 5000 at 8% for 45 days", "late fee 2500 at 1.5% a month for 60 days",
//   "interest 1m at 5.3% for 30 days 360"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:interest|late\\s+fee|late\\s+interest|simple\\s+interest)\\s+(?:on\\s+)?${N}\\s+at\\s+[\\d.]+\\s*%(?:\\s+(?:a|per)\\s+(?:year|month|day))?\\s+for\\s+\\d+\\s*days?(?:\\s+(?:act/)?(?:360|365))?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function interest(said) {
  const t = String(said).trim().toLowerCase();
  const m = t.match(new RegExp(`(${N})\\s+at\\s+([\\d.]+)\\s*%(?:\\s+(?:a|per)\\s+(year|month|day))?\\s+for\\s+(\\d+)\\s*days?(?:\\s+(?:act/)?(360|365))?$`));
  if (!m) return null;
  const principal = num(m[1]), pct = Number(m[2]) / 100, per = m[3] ?? 'year', days = Number(m[4]), basis = Number(m[5] ?? 365);
  const yearly = per === 'month' ? pct * 12 : per === 'day' ? pct * basis : pct;
  const amount = principal * yearly * days / basis;
  return { principal, yearly, per, pct, days, basis, amount, daily: principal * yearly / basis, total: principal + amount };
}
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function simpleInterest(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'simple-interest', label: 'Interest', symbol: 'calendar.badge.clock', match: { pattern: PATTERN }, examples: ['interest 5000 at 8% for 45 days'],
    async render(said) {
      const i = interest(said);
      if (!i) return { summary: 'Interest', complete: 0, body: [line(meta('Type an amount, a rate and days: “interest 5000 at 8% for 45 days”'))] };
      const summary = `${money(i.amount)} interest on ${money(i.principal)} at ${(i.yearly * 100).toFixed(2)}% a year for ${i.days} days (${money(i.total)} in all)`;
      return { summary, copy: money(i.amount), complete: 1, body: [
        pair(stack('leading', line(hero(money(i.amount))), line(chip(`${i.days} days`, 'calendar.badge.clock'))), icon('plus'), stack('trailing', line(hero(money(i.total), true)), line(chip('owed in all')))),
        line(meta(`${money(i.daily)} a day · ${(i.yearly * 100).toFixed(2)}% a year${i.per !== 'year' ? ` (${(i.pct * 100).toFixed(2)}% a ${i.per})` : ''} · simple interest, actual/${i.basis}`))] };
    }
  });
}
