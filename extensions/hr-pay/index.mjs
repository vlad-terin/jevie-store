// Pay and leave, as cards while they are typed, worked out on this Mac:
//
//   "overtime 32/h 46 hours", "overtime $28 an hour 52 hours double after 50"
//       time and a half past 40 hours a week (the US federal rule), double time past a named line
//   "pto 15 days a year 3 months", "pto 120 hours a year biweekly", "pto 20 days 18 weeks"
//       what has accrued, or what each pay period adds

export const OVERTIME = '^(?:overtime|ot|weekly\\s+pay)\\s+\\$?[\\d.]+\\s*(?:/\\s*h(?:our|r)?|an?\\s+hour|per\\s+hour|hourly)\\s+[\\d.]+\\s*(?:hours?|hrs?|h)(?:\\s+double\\s+(?:after|past)\\s+\\d+)?$';
export const PTO = '^(?:pto|paid\\s+time\\s+off|vacation|leave)\\s+[\\d.]+\\s*(?:days?|hours?|hrs?)\\s*(?:a|per)?\\s*(?:year)?\\s*(?:[\\d.]+\\s*(?:months?|weeks?)|biweekly|weekly|monthly|semimonthly)$';

export function overtime(said) {
  const t = String(said).toLowerCase();
  const rate = Number(t.match(/\$?([\d.]+)\s*(?:\/\s*h|an?\s+hour|per\s+hour|hourly)/)?.[1]);
  const hours = Number(t.match(/([\d.]+)\s*(?:hours?|hrs?|h)(?:\s+double|$)/)?.[1]);
  const doubleAfter = Number(t.match(/double\s+(?:after|past)\s+(\d+)/)?.[1] ?? Infinity);
  if (!(rate > 0 && hours >= 0)) return null;
  const regular = Math.min(hours, 40), ot = Math.max(0, Math.min(hours, doubleAfter) - 40), dt = Math.max(0, hours - doubleAfter);
  return { rate, hours, regular, ot, dt, pay: regular * rate + ot * rate * 1.5 + dt * rate * 2 };
}
const PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
export function pto(said) {
  const t = String(said).toLowerCase();
  const m = t.match(/([\d.]+)\s*(days?|hours?|hrs?)/);
  if (!m) return null;
  const yearly = Number(m[1]), unit = /^d/.test(m[2]) ? 'days' : 'hours';
  const period = Object.keys(PERIODS).find(p => new RegExp(`\\b${p}\\b`).test(t));
  if (period) return { yearly, unit, period, each: yearly / PERIODS[period] };
  const span = t.match(/([\d.]+)\s*(months?|weeks?)\s*$/);
  if (!span) return null;
  const share = /^m/.test(span[2]) ? Number(span[1]) / 12 : Number(span[1]) / 52;
  return { yearly, unit, span: `${span[1]} ${span[2]}`, accrued: yearly * share };
}
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = n => Number(n.toFixed(2)).toLocaleString('en-US');

export default function hrPay(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'overtime', label: 'Overtime pay', symbol: 'clock.badge.exclamationmark', match: { pattern: OVERTIME }, examples: ['overtime 32/h 46 hours'],
    async render(said) {
      const o = overtime(said);
      if (!o) return { summary: 'Overtime pay', complete: 0, body: [line(meta('Type an hourly rate and the week\'s hours: “overtime 32/h 46 hours”'))] };
      const summary = `${money(o.pay)} for ${hrs(o.hours)} hours at ${money(o.rate)}/h (${hrs(o.ot)} h at 1.5×${o.dt ? `, ${hrs(o.dt)} h at 2×` : ''})`;
      return { summary, copy: money(o.pay), complete: 1, body: [
        spread(stack('leading', line(hero(money(o.pay))), line(chip('the week\'s pay', 'clock.badge.exclamationmark'))), stack('trailing', line(meta(`${hrs(o.regular)} h × ${money(o.rate)}`)), line(meta(`${hrs(o.ot)} h × ${money(o.rate * 1.5)}${o.dt ? ` · ${hrs(o.dt)} h × ${money(o.rate * 2)}` : ''}`)))),
        line(meta('time and a half past 40 hours a week (US federal rule); some states also count by the day · before tax'))] };
    }
  });
  jevie.registerCard({
    name: 'pto', label: 'PTO accrual', symbol: 'beach.umbrella', match: { pattern: PTO }, examples: ['pto 15 days a year 3 months'],
    async render(said) {
      const p = pto(said);
      if (!p) return { summary: 'PTO accrual', complete: 0, body: [line(meta('Type a yearly allowance and a time worked or a pay period: “pto 15 days a year 3 months”'))] };
      const value = p.period ? p.each : p.accrued;
      const summary = p.period ? `${hrs(value)} ${p.unit} of PTO each ${p.period} pay period (${p.yearly} ${p.unit} a year)` : `${hrs(value)} ${p.unit} of PTO accrued after ${p.span} (${p.yearly} ${p.unit} a year)`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${hrs(value)} ${p.unit}`)), line(chip(p.period ? `each ${p.period} period` : `after ${p.span}`, 'beach.umbrella'))), stack('trailing', line(meta(`${p.yearly} ${p.unit} a year`)), line(meta(p.unit === 'days' ? `${hrs(value * 8)} hours at 8 a day` : `${hrs(value / 8)} days at 8 hours`)))), line(meta('accrued evenly across the year; carry-over and caps are your employer\'s'))] };
    }
  });
}
