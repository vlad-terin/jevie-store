// Billable time, as a card while it is typed, worked out on this Mac: in
// tenths of an hour (6-minute units), any part of a unit billed as a whole
// one, as most firms record it. Quarter hours on request.
//
//   "billable 47 min", "billable 1:20 at 450", "bill 6.3 hours at 450", "billable 50 min quarters"

export const PATTERN = '^(?:billable|bill)\\s+(?:[\\d.]+\\s*(?:m|min|mins|minutes|h|hr|hrs|hours)|\\d{1,2}:\\d{2})(?:\\s+at\\s+\\$?[\\d.]+(?:\\s*(?:an?|per|/)\\s*(?:hour|hr|h))?)?(?:\\s+(?:in\\s+)?quarters?)?$';
export function bill(said) {
  const t = String(said).toLowerCase();
  const c = t.match(/(\d{1,2}):(\d{2})/); const m = t.match(/([\d.]+)\s*(m|min|mins|minutes|h|hr|hrs|hours)\b/);
  const minutes = c ? +c[1] * 60 + +c[2] : /^m/.test(m[2]) ? Number(m[1]) : Number(m[1]) * 60;
  const unit = /quarter/.test(t) ? 15 : 6;
  const units = Math.ceil(minutes / unit - 1e-9);
  const hours = units * unit / 60;
  const rate = Number(t.match(/at\s+\$?([\d.]+)/)?.[1]) || null;
  return { minutes, unit, units, hours, rate, amount: rate ? hours * rate : null };
}

export default function billableTime(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'billable', label: 'Billable time', symbol: 'clock.badge.checkmark', match: { pattern: PATTERN }, examples: ['billable 47 min'],
    async render(said) {
      const b = bill(said);
      if (!(b.minutes > 0)) return { summary: 'Billable time', complete: 0, body: [line(meta('Type the time: “billable 47 min” or “bill 6.3 hours at 450”'))] };
      const h = b.unit === 6 ? b.hours.toFixed(1) : b.hours.toFixed(2);
      const summary = `${h} h${b.amount !== null ? ` = $${b.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at $${b.rate}` : ''} (${Math.round(b.minutes)} min in ${b.unit}-minute units)`;
      return { summary, copy: b.amount !== null ? `${h} h · $${b.amount.toFixed(2)}` : h, complete: 1, body: [spread(stack('leading', line(hero(`${h} h`)), line(chip(`${b.units} × ${b.unit} min`, 'clock.badge.checkmark'))), stack('trailing', line(hero(b.amount !== null ? `$${b.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `${Math.round(b.minutes)} min`, true)), line(chip(b.amount !== null ? `at $${b.rate} an hour` : 'worked')))), line(meta(`any part of a ${b.unit}-minute unit billed whole · your engagement letter decides the increment`))] };
    }
  });
}
