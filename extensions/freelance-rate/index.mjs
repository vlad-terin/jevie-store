// A freelancer's rate, as a card while it is typed, worked out on this Mac:
// the yearly take-home wanted, grossed up for tax and for business costs,
// over the hours that can actually be billed (1,200 a year unless named -
// about 60% of a working year, after admin, sales, holidays and gaps).
//
//   "freelance rate 120k", "freelance rate 150k 1000 billable hours 20% overhead 30% tax"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:freelance|consulting|contractor|hourly)\\s+rate\\s+(?:for\\s+)?${N}(?:\\s+(?:a\\s+year|take[\\s-]?home|net))?(?:\\s+\\d+\\s+(?:billable\\s+)?hours?)?(?:\\s+[\\d.]+\\s*%\\s+(?:overhead|expenses|costs))?(?:\\s+[\\d.]+\\s*%\\s+tax)?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function rate(said) {
  const t = String(said).trim().toLowerCase();
  const target = num(t.match(new RegExp(`rate\\s+(?:for\\s+)?(${N})`))?.[1]);
  if (!(target > 0)) return null;
  const hours = Number(t.match(/(\d+)\s+(?:billable\s+)?hours?/)?.[1]) || 1200;
  const overhead = (Number(t.match(/([\d.]+)\s*%\s+(?:overhead|expenses|costs)/)?.[1]) || 20) / 100;
  const tax = (Number(t.match(/([\d.]+)\s*%\s+tax/)?.[1]) || 30) / 100;
  const beforeTax = target / (1 - tax);
  const revenue = beforeTax / (1 - overhead);
  return { target, hours, overhead, tax, revenue, hourly: revenue / hours, day: revenue / hours * 8 };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function freelanceRate(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'freelance-rate', label: 'Freelance rate', symbol: 'person.badge.clock', match: { pattern: PATTERN }, examples: ['freelance rate 120k'],
    async render(said) {
      const r = rate(said);
      if (!r) return { summary: 'Freelance rate', complete: 0, body: [line(meta('Type the yearly take-home you want: “freelance rate 120k”'))] };
      const summary = `${money(r.hourly)}/hour (${money(r.day)}/day) to take home ${money(r.target)} a year`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(`${money(r.hourly)}/h`)), line(chip('hourly', 'person.badge.clock'))), icon('multiply'), stack('trailing', line(hero(`${money(r.day)}/day`, true)), line(chip('8 hours')))),
        line(meta(`${money(r.revenue)} to bill a year over ${r.hours.toLocaleString('en-US')} billable hours · ${Math.round(r.overhead * 100)}% overhead · ${Math.round(r.tax * 100)}% tax · take-home ${money(r.target)}`))] };
    }
  });
}
