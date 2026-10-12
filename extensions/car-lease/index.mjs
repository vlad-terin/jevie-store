// A lease payment, as a card while it is typed, worked out on this Mac the
// way US leases are: depreciation (capitalised cost − residual) ÷ months,
// plus a rent charge (capitalised cost + residual) × money factor, plus tax
// on the payment. The residual is a percentage of MSRP (of the price when
// no MSRP is given). APR ≈ money factor × 2400.
//
//   "lease 35000 residual 58% money factor 0.0025 36 months"
//   "lease 42000 msrp 45000 residual 60% mf 0.00175 36 months down 2000 tax 8%"

const N = '\\$?[\\d,.]+\\s*k?';
export const PATTERN = `^(?:car\\s+)?lease\\s+(?:price\\s+)?${N}(?:\\s+msrp\\s+${N})?\\s+residual\\s+[\\d.]+\\s*%\\s+(?:money\\s+factor|mf)\\s+0?\\.\\d+\\s+\\d{2}\\s*(?:months?|mo)(?:\\s+down\\s+${N}|\\s+tax\\s+[\\d.]+\\s*%)*$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)(k)?$/); return m ? Number(m[1]) * (m[2] ? 1000 : 1) : NaN; };
export function lease(said) {
  const t = String(said).toLowerCase();
  const price = num(t.match(new RegExp(`lease\\s+(?:price\\s+)?(${N})`))[1]);
  const msrp = t.match(new RegExp(`msrp\\s+(${N})`)) ? num(t.match(new RegExp(`msrp\\s+(${N})`))[1]) : price;
  const residualPct = Number(t.match(/residual\s+([\d.]+)/)[1]) / 100, mf = Number(t.match(/(?:money\s+factor|mf)\s+(0?\.\d+)/)[1]), months = Number(t.match(/(\d{2})\s*(?:months?|mo)/)[1]);
  const down = t.match(new RegExp(`down\\s+(${N})`)) ? num(t.match(new RegExp(`down\\s+(${N})`))[1]) : 0, tax = Number(t.match(/tax\s+([\d.]+)/)?.[1] ?? 0) / 100;
  const cap = price - down, residual = msrp * residualPct;
  if (!(cap > residual && months > 0)) return null;
  const depreciation = (cap - residual) / months, rent = (cap + residual) * mf, base = depreciation + rent, payment = base * (1 + tax);
  return { price, msrp, cap, residual, mf, apr: mf * 2400, months, down, tax, depreciation, rent, payment, total: payment * months + down };
}
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function carLease(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'car-lease', label: 'Lease payment', symbol: 'car.side', match: { pattern: PATTERN }, examples: ['lease 35000 residual 58% money factor 0.0025 36 months'],
    async render(said) {
      const l = lease(said);
      if (!l) return { summary: 'Lease payment', complete: 0, body: [line(meta('The price after the down payment must be over the residual'))] };
      const summary = `${money(l.payment)} a month for ${l.months} months (${l.apr.toFixed(2)}% APR equivalent), ${money(l.total)} in all`;
      return { summary, copy: money(l.payment), complete: 1, body: [spread(stack('leading', line(hero(money(l.payment))), line(chip(`a month · ${l.months} months`, 'car.side'))), stack('trailing', line(meta(`depreciation ${money(l.depreciation)} + rent ${money(l.rent)}${l.tax ? ` + tax ${(l.tax * 100).toFixed(1)}%` : ''}`)), line(meta(`MF ${l.mf} ≈ ${l.apr.toFixed(2)}% APR`)))), line(meta(`residual ${money(l.residual)} · ${money(l.total)} over the lease with ${money(l.down)} down · fees and how your state taxes leases differ`))] };
    }
  });
}
