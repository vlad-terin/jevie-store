// Tire sizes, as a card while they are typed, worked out on this Mac from the
// code itself (width mm / aspect % R rim in):
//
//   "tire 225/45r17"            diameter, sidewall, circumference, revolutions a mile
//   "225/45r17 vs 245/40r18"    the difference, and what the speedometer shows at 60

const SIZE = '\\d{3}\\s*/\\s*\\d{2}\\s*z?r\\s*\\d{2}';
export const PATTERN = `^(?:tires?\\s+|tyres?\\s+)?${SIZE}(?:\\s+(?:vs\\.?|to|or)\\s+${SIZE})?$`;
export function read(code) {
  const m = String(code).toLowerCase().match(/(\d{3})\s*\/\s*(\d{2})\s*z?r\s*(\d{2})/);
  if (!m) return null;
  const width = Number(m[1]), aspect = Number(m[2]) / 100, rim = Number(m[3]);
  const side = width * aspect, diameter = rim * 25.4 + 2 * side;
  return { code: `${width}/${m[2]}R${rim}`, width, aspect, rim, side, diameter, circumference: Math.PI * diameter, revs: 1609344 / (Math.PI * diameter) };
}

export default function tireSize(jevie) {
  const { line, spread, stack, hero, chip, meta, pair, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'tire', label: 'Tire size', symbol: 'car', match: { pattern: PATTERN }, examples: ['tire 225/45r17'],
    async render(said) {
      const codes = said.toLowerCase().match(/\d{3}\s*\/\s*\d{2}\s*z?r\s*\d{2}/g).map(read);
      const [a, b] = codes;
      if (!b) return { summary: `${a.code}: ${(a.diameter / 25.4).toFixed(2)}″ tall (${Math.round(a.diameter)} mm), ${Math.round(a.revs)} revolutions a mile`, copy: `${a.code}: ${(a.diameter / 25.4).toFixed(2)} in`, complete: 1, body: [spread(stack('leading', line(hero(`${(a.diameter / 25.4).toFixed(2)}″`)), line(chip(a.code, 'car'))), stack('trailing', line(meta(`${Math.round(a.diameter)} mm tall`)), line(meta(`sidewall ${Math.round(a.side)} mm (${(a.side / 25.4).toFixed(2)}″)`)))), line(meta(`${a.width} mm wide · ${Math.round(a.aspect * 100)}% sidewall · ${a.rim}″ rim · ${Math.round(a.revs)} revolutions a mile`))] };
      const diff = b.diameter / a.diameter - 1;
      return { summary: `${b.code} is ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)}% vs ${a.code}: at an indicated 60 you go ${(60 * (1 + diff)).toFixed(1)}`, copy: `${(diff * 100).toFixed(2)}%`, complete: 1, body: [pair(stack('leading', line(hero(`${(a.diameter / 25.4).toFixed(2)}″`, true)), line(chip(a.code))), icon('arrow.right'), stack('trailing', line(hero(`${(b.diameter / 25.4).toFixed(2)}″`)), line(chip(b.code, 'car')))), line(meta(`${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)}% diameter · speedometer 60 = ${(60 * (1 + diff)).toFixed(1)} · within ±3% is the usual rule for a swap`))] };
    }
  });
}
