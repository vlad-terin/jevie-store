// Debt to income, as a card while it is typed, worked out on this Mac:
// monthly debt payments over gross monthly income (a yearly income is
// divided by 12).
//
//   "dti debts 2000 income 6500", "debt to income 1800 a month income 90k a year", "dti 2400 7000"

const N = '\\$?[\\d,.]+\\s*k?';
export const PATTERN = `^(?:dti|debt[\\s-]+to[\\s-]+income)(?:\\s+ratio)?\\s+(?:debts?\\s+)?${N}(?:\\s+(?:a|per)\\s+month)?\\s+(?:income\\s+)?${N}(?:\\s+(?:a|per)\\s+(?:month|year))?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)(k)?$/); return m ? Number(m[1]) * (m[2] ? 1000 : 1) : NaN; };
export function dti(said) {
  const t = String(said).toLowerCase().replace(/^(?:dti|debt[\s-]+to[\s-]+income)(?:\s+ratio)?\s+/, '');
  const found = [...t.matchAll(/\$?[\d,.]+\s*k?/g)].map(m => ({ v: num(m[0]), end: m.index + m[0].length })).filter(x => Number.isFinite(x.v));
  if (found.length < 2) return null;
  const debts = found[0].v; let income = found[1].v;
  const yearly = /^\s+(?:a|per)\s+year/.test(t.slice(found[1].end)) || income >= 30000;
  if (yearly) income /= 12;
  return income > 0 ? { debts, income, ratio: debts / income, yearly } : null;
}

export default function debtToIncome(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'dti', label: 'Debt to income', symbol: 'percent', match: { pattern: PATTERN }, examples: ['dti debts 2000 income 6500'],
    async render(said) {
      const d = dti(said);
      if (!d) return { summary: 'Debt to income', complete: 0, body: [line(meta('Type monthly debts and income: “dti debts 2000 income 6500”'))] };
      const band = d.ratio <= 0.36 ? 'comfortable for most lenders' : d.ratio <= 0.43 ? 'workable: under the common 43% line' : d.ratio <= 0.5 ? 'high: some loan programs go to 50%' : 'over 50%: hard to borrow';
      return { summary: `${(d.ratio * 100).toFixed(1)}% debt to income ($${Math.round(d.debts).toLocaleString('en-US')} of $${Math.round(d.income).toLocaleString('en-US')} a month)`, copy: `${(d.ratio * 100).toFixed(1)}%`, complete: 1, body: [spread(stack('leading', line(hero(`${(d.ratio * 100).toFixed(1)}%`, d.ratio > 0.43)), line(chip(band, d.ratio <= 0.43 ? 'checkmark' : 'exclamationmark.triangle'))), stack('trailing', line(meta(`$${Math.round(d.debts).toLocaleString('en-US')} debts a month`)), line(meta(`$${Math.round(d.income).toLocaleString('en-US')} gross a month${d.yearly ? ' (yearly ÷ 12)' : ''}`)))), line(meta(`room under 36%: $${Math.max(0, Math.round(d.income * 0.36 - d.debts)).toLocaleString('en-US')} a month · debts: loans, cards' minimums, the new housing payment · lenders differ`))] };
    }
  });
}
