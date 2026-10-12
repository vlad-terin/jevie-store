// A savings goal, as a card while it is typed, worked out on this Mac: the
// monthly deposit that, with what you have and interest compounded
// monthly, reaches the goal - FV = P(1+r)^n + d((1+r)^n − 1) ÷ r.
//
//   "savings goal 20000 in 3 years at 4%", "savings goal 50k in 5 years at 5% have 10k", "savings goal 8000 in 18 months"

const N = '\\$?[\\d,.]+\\s*k?';
export const PATTERN = `^(?:savings\\s+goal|save\\s+up|saving\\s+for)\\s+${N}\\s+(?:in|by|over)\\s+\\d{1,3}\\s*(?:years?|yrs?|months?|mo)(?:\\s+(?:at\\s+)?[\\d.]+\\s*%)?(?:\\s+(?:have|already|starting\\s+with|with)\\s+${N})?$`;
const num = s => { const m = String(s ?? '').replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)(k)?$/); return m ? Number(m[1]) * (m[2] ? 1000 : 1) : NaN; };
export function goal(said) {
  const t = String(said).toLowerCase();
  const target = num(t.match(new RegExp(`^(?:savings\\s+goal|save\\s+up|saving\\s+for)\\s+(${N})`))[1]);
  const p = t.match(/(\d{1,3})\s*(years?|yrs?|months?|mo)\b/); const months = Number(p[1]) * (/^y/.test(p[2]) ? 12 : 1);
  const rate = Number(t.match(/([\d.]+)\s*%/)?.[1] ?? 0) / 100, r = rate / 12;
  const have = t.match(new RegExp(`(?:have|already|starting\\s+with|with)\\s+(${N})`)) ? num(t.match(new RegExp(`(?:have|already|starting\\s+with|with)\\s+(${N})`))[1]) : 0;
  const grown = have * (1 + r) ** months, need = Math.max(0, target - grown);
  const monthly = r ? need * r / ((1 + r) ** months - 1) : need / months;
  return { target, months, rate, have, grown, monthly, deposits: monthly * months, interest: target - have - monthly * months };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function savingsGoal(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'savings-goal', label: 'Savings goal', symbol: 'target', match: { pattern: PATTERN }, examples: ['savings goal 20000 in 3 years at 4%'],
    async render(said) {
      const g = goal(said);
      if (!(g.months > 0 && g.target > 0)) return { summary: 'Savings goal', complete: 0, body: [line(meta('Type a goal and a time: “savings goal 20000 in 3 years at 4%”'))] };
      if (g.monthly === 0) return { summary: `${money(g.have)} reaches ${money(g.target)} on its own (${money(g.grown)})`, copy: '$0', complete: 1, body: [line(hero('$0 a month')), line(meta(`what you have grows to ${money(g.grown)}`))] };
      const summary = `Save ${money(g.monthly)} a month for ${g.months} months to reach ${money(g.target)}${g.rate ? ` at ${(g.rate * 100).toFixed(2)}%` : ''}`;
      return { summary, copy: money(g.monthly), complete: 1, body: [spread(stack('leading', line(hero(`${money(g.monthly)}/mo`)), line(chip(`${g.months} months`, 'target'))), stack('trailing', line(meta(`deposits ${money(g.deposits)}${g.have ? ` + ${money(g.have)} you have` : ''}`)), line(meta(`interest ${money(Math.max(0, g.interest))}`)))), line(meta(g.rate ? 'compounded monthly, deposits at each month\'s end · rates change' : 'no interest: add “at 4%” for a savings rate'))] };
    }
  });
}
