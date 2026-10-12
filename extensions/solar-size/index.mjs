// A solar system's size, as a card while it is typed, worked out on this
// Mac: daily use ÷ peak sun hours ÷ 0.8 (wiring, inverter, heat and dust
// losses), and panels at 400 W unless named. Sun hours 4.5 unless named:
// the US runs about 3.5 (north-west) to 6 (south-west).
//
//   "solar 900 kwh a month", "solar 12000 kwh a year 5 sun hours 430w panels"

export const PATTERN = '^solar\\s+(?:for\\s+)?[\\d,.]+\\s*kwh\\s+(?:a|per|/)\\s*(?:month|year|day)(?:\\s+[\\d.]+\\s+(?:peak\\s+)?sun\\s+hours|\\s+\\d{3}\\s*w(?:att)?\\s+panels?)*$';
export function size(said) {
  const t = String(said).toLowerCase().replace(/,/g, '');
  const kwh = Number(t.match(/([\d.]+)\s*kwh/)[1]), per = t.match(/kwh\s+(?:a|per|\/)\s*(month|year|day)/)[1];
  const daily = per === 'day' ? kwh : per === 'month' ? kwh * 12 / 365 : kwh / 365;
  const sun = Number(t.match(/([\d.]+)\s+(?:peak\s+)?sun\s+hours/)?.[1] ?? 4.5), watts = Number(t.match(/(\d{3})\s*w(?:att)?\s+panel/)?.[1] ?? 400);
  const kw = daily / sun / 0.8, panels = Math.ceil(kw * 1000 / watts);
  return { daily, sun, watts, kw, panels, area: panels * 21.5, yearly: daily * 365 };
}

export default function solarSize(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'solar-size', label: 'Solar size', symbol: 'sun.max', match: { pattern: PATTERN }, examples: ['solar 900 kwh a month'],
    async render(said) {
      const s = size(said);
      return { summary: `About ${s.kw.toFixed(1)} kW: ${s.panels} panels of ${s.watts} W for ${s.daily.toFixed(1)} kWh a day at ${s.sun} sun hours`, copy: `${s.kw.toFixed(1)} kW, ${s.panels} panels`, complete: 1, body: [spread(stack('leading', line(hero(`${s.kw.toFixed(1)} kW`)), line(chip('system size', 'sun.max'))), stack('trailing', line(hero(`${s.panels} panels`, true)), line(chip(`${s.watts} W each`)))), line(meta(`${s.daily.toFixed(1)} kWh a day ÷ ${s.sun} sun hours ÷ 0.8 losses · about ${Math.round(s.area)} sq ft of roof · a site survey decides shade and tilt`))] };
    }
  });
}
