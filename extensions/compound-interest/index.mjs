// What money grows to, as a card while it is typed, worked out on this Mac:
// monthly compounding; contributions at the end of each month.
//
//   "compound 10000 at 5% for 20 years", "save 500 a month at 7% for 10 years",
//   "invest 10k plus 300 a month at 6% for 25 years"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:compound|invest|save|savings)\\s+${N}(?:\\s+(?:a|per|each)\\s+month)?(?:\\s+(?:plus|and|\\+)\\s+${N}\\s+(?:a|per|each)\\s+month)?\\s+(?:at\\s+)?[\\d.]+\\s*%\\s+(?:for|over)\\s+\\d+(?:\\.\\d+)?\\s*(?:years?|yrs?|y)$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function grow(said) {
  const t = String(said).trim().toLowerCase();
  const rate = Number(t.match(/([\d.]+)\s*%/)?.[1]) / 100, years = Number(t.match(/(?:for|over)\s+(\d+(?:\.\d+)?)/)?.[1]);
  const monthlyOnly = t.match(new RegExp(`^(?:compound|invest|save|savings)\\s+(${N})\\s+(?:a|per|each)\\s+month`));
  const lump = monthlyOnly ? 0 : num(t.match(new RegExp(`^(?:compound|invest|save|savings)\\s+(${N})`))?.[1]);
  const monthly = monthlyOnly ? num(monthlyOnly[1]) : num(t.match(new RegExp(`(?:plus|and|\\+)\\s+(${N})\\s+(?:a|per|each)\\s+month`))?.[1] ?? '0');
  if (!(rate >= 0) || !(years > 0) || !(lump >= 0) || !(monthly >= 0) || (!lump && !monthly)) return null;
  const r = rate / 12, n = Math.round(years * 12);
  const growth = (1 + r) ** n;
  const value = lump * growth + (r ? monthly * (growth - 1) / r : monthly * n);
  const paid = lump + monthly * n;
  return { lump, monthly, rate, years, value, paid, interest: value - paid };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function compoundInterest(jevie) {
  const { line, pair, stack, hero, chip, meta, icon, bar } = jevie.CardParts;
  jevie.registerCard({
    name: 'compound', label: 'Compound interest', symbol: 'chart.line.uptrend.xyaxis.circle', match: { pattern: PATTERN }, examples: ['save 500 a month at 7% for 10 years', 'compound 10000 at 5% for 20 years'],
    async render(said) {
      const g = grow(said);
      if (!g) return { summary: 'Compound interest', complete: 0, body: [line(meta('Type an amount, a rate and years, like “save 500 a month at 7% for 10 years”'))] };
      const put = [g.lump && money(g.lump), g.monthly && `${money(g.monthly)} a month`].filter(Boolean).join(' + ');
      const summary = `${put} at ${(g.rate * 100).toFixed(2).replace(/\.00$/, '')}% for ${g.years} years: ${money(g.value)} (${money(g.interest)} interest)`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(g.paid), true)), line(chip('put in'))), icon('arrow.right'), stack('trailing', line(hero(money(g.value))), line(chip(`after ${g.years} years`)))),
        bar(g.interest, g.value),
        line(meta(`${money(g.interest)} of it interest (${Math.round(g.interest / g.value * 100)}%) · compounded monthly · before tax and inflation`))] };
    }
  });
}
