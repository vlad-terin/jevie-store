// A rental's returns, as cards while they are typed, worked out on this Mac:
//
//   "cap rate noi 24000 price 400000"              net operating income over price
//   "cash on cash 30000 down 2400 cash flow"       a year's cash flow over the cash put in
//   "rental yield rent 2000 price 350000"          a year's rent over price, and the 1% rule

const N = '\\$?[\\d,.]+\\s*[km]?';
export const CAP = `^cap\\s+rate\\s+(?:noi\\s+)?${N}\\s+(?:price\\s+|value\\s+)?${N}$`;
export const COC = `^cash[\\s-]+on[\\s-]+cash\\s+${N}\\s+(?:down|invested|cash\\s+in)\\s+${N}\\s+(?:cash\\s*flow|a\\s+year|yearly)(?:\\s+a\\s+year)?$`;
export const YIELD = `^rental\\s+yield\\s+(?:rent\\s+)?${N}(?:\\s+a\\s+month)?\\s+(?:price\\s+)?${N}$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
const pair2 = (said, re) => { const nums = [...String(said).toLowerCase().matchAll(new RegExp(N, 'g'))].map(m => num(m[0])).filter(Number.isFinite); return nums.length >= 2 ? nums.slice(0, 2) : null; };
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = x => `${(x * 100).toFixed(2)}%`;

export const capRate = said => { const p = pair2(said); return p && p[1] > 0 ? { noi: p[0], price: p[1], rate: p[0] / p[1] } : null; };
export const cashOnCash = said => { const p = pair2(said); return p && p[0] > 0 ? { invested: p[0], flow: p[1], rate: p[1] / p[0] } : null; };
export const rentalYield = said => { const p = pair2(said); return p && p[1] > 0 ? { rent: p[0], price: p[1], gross: p[0] * 12 / p[1], onePercent: p[0] / p[1] } : null; };

export default function realEstate(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  const ask = t => ({ summary: 'Real estate', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'cap-rate', label: 'Cap rate', symbol: 'building.2', match: { pattern: CAP }, examples: ['cap rate noi 24000 price 400000'],
    async render(said) {
      const c = capRate(said);
      if (!c) return ask('Type net operating income and price: “cap rate noi 24000 price 400000”');
      const summary = `Cap rate ${pct(c.rate)} (${money(c.noi)} NOI on ${money(c.price)})`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(pct(c.rate))), line(chip('cap rate', 'building.2'))), stack('trailing', line(meta(`${money(c.noi)} a year NOI`)), line(meta(`on ${money(c.price)}`)))), line(meta('NOI: rent less operating costs, before the mortgage · higher is more return for the price, and usually more risk'))] };
    }
  });
  jevie.registerCard({
    name: 'cash-on-cash', label: 'Cash-on-cash', symbol: 'banknote', match: { pattern: COC }, examples: ['cash on cash 30000 down 2400 cash flow'],
    async render(said) {
      const c = cashOnCash(said);
      if (!c) return ask('Type the cash put in and a year\'s cash flow: “cash on cash 30000 down 2400 cash flow”');
      const summary = `Cash-on-cash ${pct(c.rate)} (${money(c.flow)} a year on ${money(c.invested)})`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(pct(c.rate))), line(chip('cash-on-cash', 'banknote'))), stack('trailing', line(meta(`${money(c.flow)} a year`)), line(meta(`on ${money(c.invested)} in`)))), line(meta('a year\'s cash flow after the mortgage, over the cash put in (down payment, closing, repairs)'))] };
    }
  });
  jevie.registerCard({
    name: 'rental-yield', label: 'Rental yield', symbol: 'house.lodge', match: { pattern: YIELD }, examples: ['rental yield rent 2000 price 350000'],
    async render(said) {
      const y = rentalYield(said);
      if (!y) return ask('Type monthly rent and price: “rental yield rent 2000 price 350000”');
      const summary = `Gross yield ${pct(y.gross)} · rent is ${pct(y.onePercent)} of price a month (1% rule ${y.onePercent >= 0.01 ? 'met' : 'not met'})`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(pct(y.gross))), line(chip('gross yield', 'house.lodge'))), stack('trailing', line(hero(pct(y.onePercent), y.onePercent < 0.01)), line(chip(y.onePercent >= 0.01 ? '1% rule met' : '1% rule not met', y.onePercent >= 0.01 ? 'checkmark' : 'xmark')))), line(meta(`${money(y.rent)} a month × 12 over ${money(y.price)} · before costs and vacancy`))] };
    }
  });
}
