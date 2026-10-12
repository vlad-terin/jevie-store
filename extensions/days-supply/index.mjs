// A prescription's days, as a card while it is typed, worked out on this
// Mac: quantity ÷ (units a dose × doses a day), and the day it runs out.
//
//   "days supply 90 tablets 2 a day", "days supply 60 tablets 1 tablet twice daily", "days supply 30 ml 2.5 ml 3 times a day"

const U = '(?:tablets?|tabs?|capsules?|caps?|pills?|ml|units?|puffs?|patches?)';
const TIMES = '(?:once|twice|three\\s+times|four\\s+times|\\d\\s+times|\\d)\\s*(?:a|per)?\\s*(?:day|daily)|(?:once|twice)\\s+daily|daily|bid|tid|qid|qd';
export const PATTERN = `^days?\\s+supply\\s+[\\d.]+\\s*${U}?(?:\\s+[\\d.]+\\s*${U})?\\s+(?:${TIMES})$`;
const FREQ = { once: 1, twice: 2, 'three times': 3, 'four times': 4, daily: 1, qd: 1, bid: 2, tid: 3, qid: 4 };
export function supply(said, now = new Date()) {
  const t = String(said).toLowerCase().replace(/^days?\s+supply\s+/, '');
  const qty = Number(t.match(/^([\d.]+)/)[1]);
  const rest = t.replace(/^[\d.]+\s*\S*\s*/, '');
  const dose = rest.match(new RegExp(`^([\\d.]+)\\s*${U}`)); const per = dose ? Number(dose[1]) : null;
  const f = rest.match(/(once|twice|three\s+times|four\s+times|bid|tid|qid|qd)/)?.[1] ?? rest.match(/(\d)\s+times/)?.[1] ?? (per === null ? rest.match(/^(\d)\s*(?:a|per)?\s*(?:day|daily)/)?.[1] : null) ?? (/daily|day/.test(rest) ? 'daily' : null);
  const times = FREQ[f] ?? Number(f);
  const daily = per === null ? times : per * times;
  if (!(qty > 0 && daily > 0)) return null;
  const days = Math.floor(qty / daily + 1e-9);
  const out = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return { qty, daily, days, out, left: qty - days * daily };
}

export default function daysSupply(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'days-supply', label: 'Days supply', symbol: 'pills', match: { pattern: PATTERN }, examples: ['days supply 90 tablets 2 a day'],
    async render(said) {
      const s = supply(said);
      if (!s) return { summary: 'Days supply', complete: 0, body: [line(meta('Type the quantity and the dose: “days supply 90 tablets 2 a day”'))] };
      const when = s.out.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return { summary: `${s.days} days (${s.qty} at ${s.daily} a day): runs out ${when} if started today`, copy: `${s.days} days`, complete: 1, body: [spread(stack('leading', line(hero(`${s.days} days`)), line(chip(`${s.daily} a day`, 'pills'))), stack('trailing', line(meta(`out ${when}`)), line(meta(s.left > 0 ? `${Number(s.left.toFixed(2))} left over` : 'if started today')))), line(meta('refill a few days before · ask your pharmacist about early refills · not medical advice'))] };
    }
  });
}
