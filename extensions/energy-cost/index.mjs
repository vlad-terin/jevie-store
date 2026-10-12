// Electricity, as cards while it is typed, worked out on this Mac:
//
//   "energy 1500w 4 hours at 0.15", "energy 60 w 8 h a day at 0.30"   kWh a day, and cost a day, month and year
//   "ev charge 75 kwh at 11 kw", "ev charge 60 kwh 20% to 80% at 7.4 kw at 0.12"   hours, with charging losses

export const ENERGY = '^(?:energy|power\\s+cost|electricity|running\\s+cost)\\s+[\\d.]+\\s*(?:w|kw|watts?)\\s+[\\d.]+\\s*(?:h|hrs?|hours?)(?:\\s+a\\s+day)?(?:\\s+at\\s+\\$?[\\d.]+)?$';
export const EV = '^(?:ev\\s+charge|charge\\s+time|charging)\\s+[\\d.]+\\s*kwh(?:\\s+\\d{1,3}\\s*%\\s+to\\s+\\d{1,3}\\s*%)?\\s+at\\s+[\\d.]+\\s*kw(?:\\s+at\\s+\\$?[\\d.]+)?$';
export function energy(said) {
  const t = String(said).toLowerCase();
  const p = t.match(/([\d.]+)\s*(w|kw|watts?)\b/), h = Number(t.match(/([\d.]+)\s*(?:h|hrs?|hours?)\b/)?.[1]);
  if (!p || !(h > 0)) return null;
  const kw = Number(p[1]) / (p[2] === 'kw' ? 1 : 1000), price = Number(t.match(/at\s+\$?([\d.]+)\s*$/)?.[1]);
  const kwh = kw * h;
  return { kw, hours: h, kwh, price: Number.isFinite(price) ? price : null, day: Number.isFinite(price) ? kwh * price : null };
}
export function ev(said) {
  const t = String(said).toLowerCase();
  const pack = Number(t.match(/([\d.]+)\s*kwh/)?.[1]), kw = Number(t.match(/at\s+([\d.]+)\s*kw\b/)?.[1]);
  const span = t.match(/(\d{1,3})\s*%\s+to\s+(\d{1,3})\s*%/);
  const share = span ? Math.max(0, Number(span[2]) - Number(span[1])) / 100 : 1;
  const price = Number(t.match(/kw\s+at\s+\$?([\d.]+)\s*$/)?.[1]);
  if (!(pack > 0 && kw > 0)) return null;
  const energy = pack * share, drawn = energy / 0.9;
  return { pack, kw, share, energy, drawn, hours: drawn / kw, cost: Number.isFinite(price) ? drawn * price : null };
}
const money = n => `$${n.toFixed(2)}`;
const hm = h => `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min`;

export default function energyCost(jevie) {
  const { line, spread, stack, hero, chip, meta, halves } = jevie.CardParts;
  jevie.registerCard({
    name: 'energy', label: 'Energy cost', symbol: 'bolt', match: { pattern: ENERGY }, examples: ['energy 1500w 4 hours at 0.15'],
    async render(said) {
      const e = energy(said);
      if (!e) return { summary: 'Energy cost', complete: 0, body: [line(meta('Type watts, hours a day and a price per kWh: “energy 1500w 4 hours at 0.15”'))] };
      const summary = e.day !== null ? `${e.kwh.toFixed(2)} kWh a day · ${money(e.day)} a day, ${money(e.day * 30.4)} a month, ${money(e.day * 365)} a year` : `${e.kwh.toFixed(2)} kWh a day (add a price: “at 0.15”)`;
      return { summary, copy: summary, complete: 1, body: [
        e.day !== null ? halves(stack('center', line(hero(money(e.day))), line(chip('a day'))), stack('center', line(hero(money(e.day * 30.4))), line(chip('a month'))), stack('center', line(hero(money(e.day * 365), true)), line(chip('a year')))) : spread(line(hero(`${e.kwh.toFixed(2)} kWh`)), chip('a day', 'bolt')),
        line(meta(`${e.kw * 1000} W × ${e.hours} h = ${e.kwh.toFixed(2)} kWh a day${e.price !== null ? ` at $${e.price}/kWh` : ''}`))] };
    }
  });
  jevie.registerCard({
    name: 'ev-charge', label: 'EV charging', symbol: 'bolt.car', match: { pattern: EV }, examples: ['ev charge 75 kwh at 11 kw'],
    async render(said) {
      const c = ev(said);
      if (!c) return { summary: 'EV charging', complete: 0, body: [line(meta('Type the battery and the charger: “ev charge 75 kwh at 11 kw”'))] };
      const summary = `${hm(c.hours)} to add ${c.energy.toFixed(1)} kWh at ${c.kw} kW${c.cost !== null ? ` · ${money(c.cost)}` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(hm(c.hours))), line(chip(`at ${c.kw} kW`, 'bolt.car'))), stack('trailing', line(hero(c.cost !== null ? money(c.cost) : `${c.drawn.toFixed(1)} kWh`, true)), line(chip(c.cost !== null ? 'to charge' : 'from the wall')))), line(meta(`${Math.round(c.share * 100)}% of ${c.pack} kWh with ~10% charging losses · DC fast charging slows past about 80%`))] };
    }
  });
}
