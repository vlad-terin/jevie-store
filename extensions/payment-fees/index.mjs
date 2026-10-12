// A card payment's fee, as a card while it is typed, worked out on this Mac:
// what the processor takes, what lands, and what to charge so a round amount
// lands. Stripe's standard US online rate (2.9% + $0.30) unless a rate is
// typed - processors change their rates, and many have negotiated ones.
//
//   "stripe fee 100", "fee 250 at 3.49% + 0.49", "charge to receive 500"

export const STRIPE = { pct: 0.029, fixed: 0.30, name: 'Stripe standard (2.9% + 30¢)' };
const N = '\\$?[\\d,.]+';
export const PATTERN = `^(?:stripe\\s+fee|card\\s+fee|processing\\s+fee|payment\\s+fee|fee)\\s+${N}(?:\\s+at\\s+[\\d.]+\\s*%(?:\\s*\\+\\s*\\$?[\\d.]+)?)?$|^charge\\s+to\\s+(?:receive|get|net)\\s+${N}(?:\\s+at\\s+[\\d.]+\\s*%(?:\\s*\\+\\s*\\$?[\\d.]+)?)?$`;
const num = s => Number(String(s).replace(/[$,]/g, ''));

export function fees(said) {
  const t = String(said).trim().toLowerCase();
  const custom = t.match(/at\s+([\d.]+)\s*%(?:\s*\+\s*\$?([\d.]+))?/);
  const rate = custom ? { pct: Number(custom[1]) / 100, fixed: Number(custom[2] ?? 0), name: `${custom[1]}%${custom[2] ? ` + $${Number(custom[2]).toFixed(2)}` : ''}` } : STRIPE;
  const amount = num(t.match(new RegExp(`(${N})`))?.[1]);
  if (!(amount > 0)) return null;
  const gross = /^charge\s+to/.test(t);
  if (gross) { const charge = (amount + rate.fixed) / (1 - rate.pct); return { rate, charge, fee: charge - amount, net: amount, solved: 'charge' }; }
  const fee = amount * rate.pct + rate.fixed;
  return { rate, charge: amount, fee, net: amount - fee, toNet: (amount + rate.fixed) / (1 - rate.pct) };
}
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function paymentFees(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'payment-fee', label: 'Payment fee', symbol: 'creditcard', match: { pattern: PATTERN }, examples: ['stripe fee 100', 'fee 250 at 3.49% + 0.49'],
    async render(said) {
      const f = fees(said);
      if (!f) return { summary: 'Payment fee', complete: 0, body: [line(meta('Type an amount: “stripe fee 100”, or a rate: “fee 250 at 3.49% + 0.49”'))] };
      const summary = f.solved === 'charge' ? `Charge ${money(f.charge)} to receive ${money(f.net)} (${money(f.fee)} fee)` : `${money(f.charge)} → ${money(f.net)} after ${money(f.fee)} fee`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(f.charge), f.solved !== 'charge')), line(chip('charged'))), icon('arrow.right'), stack('trailing', line(hero(money(f.net), f.solved === 'charge')), line(chip('you receive')))),
        line(meta(`${money(f.fee)} fee (${(f.fee / f.charge * 100).toFixed(2)}%) · ${f.rate.name}${f.toNet ? ` · charge ${money(f.toNet)} to receive ${money(f.charge)}` : ''}`))] };
    }
  });
}
