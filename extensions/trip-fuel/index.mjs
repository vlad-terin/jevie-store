// A drive's fuel, as a card while it is typed, worked out on this Mac:
//
//   "fuel cost 300 miles at 30 mpg 3.50", "gas cost 300 mi 25 mpg $3.89 round trip"
//   "trip cost 450 km 7 l/100km 1.80 split 3", "fuel 600 km 18 km/l 1.75"

export const PATTERN = '^(?:fuel|gas|petrol|trip|drive)(?:\\s+cost)?\\s+[\\d,.]+\\s*(?:miles?|mi|km|kilometres?|kilometers?)\\s+(?:at\\s+)?[\\d.]+\\s*(?:mpg|l/100\\s*km|l/100km|km/l)\\s+(?:at\\s+)?[$€£]?[\\d.]+(?:\\s*(?:a|per|/)\\s*(?:gallon|gal|litre|liter|l))?(?:\\s+(?:round\\s+trip|both\\s+ways|return))?(?:\\s+split\\s+\\d{1,2}(?:\\s+ways)?)?$';
export function trip(said) {
  const t = String(said).toLowerCase().replace(/,/g, '');
  const d = t.match(/([\d.]+)\s*(miles?|mi|km|kilometres?|kilometers?)/);
  const e = t.match(/([\d.]+)\s*(mpg|l\/100\s*km|l\/100km|km\/l)/);
  const after = t.slice(e.index + e[0].length).match(/([$€£])?([\d.]+)/);
  const price = Number(after?.[2]);
  // The currency as typed; with miles and mpg, dollars; otherwise none assumed.
  const cur = after?.[1] ?? (/^k/.test(d?.[2] ?? '') ? '' : '$');
  if (!d || !e || !(price > 0)) return null;
  let dist = Number(d[1]); const metric = /^k/.test(d[2]);
  if (/round\s+trip|both\s+ways|return/.test(t)) dist *= 2;
  const people = Number(t.match(/split\s+(\d{1,2})/)?.[1] ?? 1);
  const eff = Number(e[1]);
  // Fuel in the unit the price is in: gallons for mpg, litres otherwise.
  const fuel = e[2] === 'mpg' ? (metric ? dist / 1.609344 : dist) / eff : e[2] === 'km/l' ? (metric ? dist : dist * 1.609344) / eff : (metric ? dist : dist * 1.609344) * eff / 100;
  const unit = e[2] === 'mpg' ? 'gal' : 'L';
  const cost = fuel * price;
  return { cur, dist, metric, eff, effUnit: e[2].replace(/\s+/g, ''), fuel, unit, price, cost, people, each: cost / people };
}

export default function tripFuel(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'trip-fuel', label: 'Trip fuel', symbol: 'fuelpump', match: { pattern: PATTERN }, examples: ['fuel cost 300 miles at 30 mpg 3.50'],
    async render(said) {
      const r = trip(said);
      if (!r) return { summary: 'Trip fuel', complete: 0, body: [line(meta('Type distance, economy and price: “fuel cost 300 miles at 30 mpg 3.50”'))] };
      const summary = `${r.cur}${r.cost.toFixed(2)} for ${r.dist} ${r.metric ? 'km' : 'mi'} (${r.fuel.toFixed(1)} ${r.unit})${r.people > 1 ? `, ${r.cur}${r.each.toFixed(2)} each for ${r.people}` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${r.cur}${r.cost.toFixed(2)}`)), line(chip(`${r.fuel.toFixed(1)} ${r.unit}`, 'fuelpump'))), stack('trailing', line(hero(r.people > 1 ? `${r.cur}${r.each.toFixed(2)}` : `${r.dist} ${r.metric ? 'km' : 'mi'}`, true)), line(chip(r.people > 1 ? `each of ${r.people}` : 'distance')))), line(meta(`${r.eff} ${r.effUnit} at ${r.cur}${r.price} a ${r.unit === 'gal' ? 'gallon' : 'litre'} · fuel only: tolls, parking and wear are on top`))] };
    }
  });
}
