// What a home an income can carry, as a card while it is typed, worked out
// on this Mac by the 28/36 rule lenders use: housing at most 28% of gross
// monthly income, all debts 36%. Taxes and insurance are counted as 1.5%
// of the price a year unless named; a 30-year loan unless named.
//
//   "afford 120k income 6.5% 20% down", "afford 150k income 7% 10% down debts 600 15 years"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:afford|affordability|how\\s+much\\s+(?:house|home)\\s+can\\s+i\\s+afford(?:\\s+(?:on|with))?)\\s+${N}\\s*(?:income|salary|a\\s+year)?(?:\\s+(?:at\\s+)?[\\d.]+\\s*%)?(?:\\s+[\\d.]+\\s*%\\s+down)?(?:\\s+debts?\\s+${N}(?:\\s+a\\s+month)?)?(?:\\s+\\d+\\s*(?:years?|y))?(?:\\s+tax(?:es)?\\s+[\\d.]+\\s*%)?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function afford(said) {
  const t = String(said).trim().toLowerCase().replace(/^how\s+much\s+(?:house|home)\s+can\s+i\s+afford(?:\s+(?:on|with))?/, 'afford');
  const income = num(t.match(new RegExp(`^(?:afford|affordability)\\s+(${N})`))?.[1]);
  if (!(income > 0)) return null;
  const rate = (Number(t.match(/(?:at\s+)?([\d.]+)\s*%(?!\s+down)(?!\s*$)/)?.[1] ?? t.match(/\s([\d.]+)\s*%\s+(?=[\d.]+\s*%\s+down)/)?.[1]) || 6.5) / 100;
  const down = (Number(t.match(/([\d.]+)\s*%\s+down/)?.[1]) || 20) / 100;
  const debts = num(t.match(new RegExp(`debts?\\s+(${N})`))?.[1] ?? '0') || 0;
  const years = Number(t.match(/(\d+)\s*(?:years?|y)\b/)?.[1]) || 30;
  const taxRate = (Number(t.match(/tax(?:es)?\s+([\d.]+)\s*%/)?.[1]) || 1.5) / 100;
  const monthly = income / 12;
  const housing = Math.min(monthly * 0.28, monthly * 0.36 - debts);
  if (!(housing > 0)) return { income, debts, none: true };
  // price p: loan payment on p×(1−down) plus taxes p×taxRate/12 equals what housing allows.
  const r = rate / 12, n = years * 12;
  const perDollar = (r ? r / (1 - (1 + r) ** -n) : 1 / n) * (1 - down) + taxRate / 12;
  const price = housing / perDollar;
  return { income, rate, down, debts, years, taxRate, housing, price, downPayment: price * down, loan: price * (1 - down), payment: price * (1 - down) * (r ? r / (1 - (1 + r) ** -n) : 1 / n), limitedBy: monthly * 0.36 - debts < monthly * 0.28 ? 'debts (36%)' : 'housing (28%)' };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function homeAffordability(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'afford', label: 'Home affordability', symbol: 'house', match: { pattern: PATTERN }, examples: ['afford 120k income 6.5% 20% down'],
    async render(said) {
      const a = afford(said);
      if (!a) return { summary: 'Home affordability', complete: 0, body: [line(meta('Type an income, a rate and a down payment: “afford 120k income 6.5% 20% down”'))] };
      if (a.none) return { summary: 'Home affordability', complete: 0, error: true, body: [line(meta(`${money(a.debts)} a month of debts already takes the 36% of ${money(a.income / 12)} a month`))] };
      const summary = `About ${money(a.price)} on ${money(a.income)} a year (${money(a.downPayment)} down, ${money(a.housing)} a month)`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(money(a.price))), line(chip('home price', 'house'))), stack('trailing', line(hero(`${money(a.housing)}/mo`, true)), line(chip(`limited by ${a.limitedBy}`)))),
        line(meta(`${money(a.downPayment)} down (${Math.round(a.down * 100)}%) · loan ${money(a.loan)} at ${(a.rate * 100).toFixed(2)}% for ${a.years} years: ${money(a.payment)} + taxes and insurance ${money(a.price * a.taxRate / 12)} a month · 28/36 rule`))] };
    }
  });
}
