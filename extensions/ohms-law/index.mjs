// Circuits, as cards while they are typed, worked out on this Mac:
//
//   "ohms 12v 2a", "ohms law 12v 6 ohms", "ohms 2a 60w"     the other two of V, I, R, P from any two
//   "led resistor 5v 2v 20ma"                               (supply − LED forward voltage) ÷ current, the next E12 value up

export const OHM = '^(?:ohms?(?:\\s+law)?|ohm\'s\\s+law|circuit)\\s+(?:[\\d.]+\\s*(?:k|m)?\\s*(?:v|volts?|a|amps?|ma|ω|ohms?|w|watts?)\\s*){2}$';
export const LED = '^led\\s+resistor\\s+[\\d.]+\\s*v\\s+[\\d.]+\\s*v\\s+[\\d.]+\\s*(?:ma|a)$';
export function solve(said) {
  const t = String(said).toLowerCase().replace(/^(?:ohms?(?:\s+law)?|ohm's\s+law|circuit)\s+/, '');
  const got = {};
  for (const m of t.matchAll(/([\d.]+)\s*(k|m)?\s*(v|volts?|ma|a|amps?|ω|ohms?|w|watts?)\b/g)) {
    const scale = m[2] === 'k' ? 1e3 : m[2] === 'm' && !/^ma$/.test(m[3]) ? 1e-3 : 1;
    const v = Number(m[1]) * scale, u = m[3];
    if (/^v/.test(u)) got.V = v; else if (u === 'ma') got.I = v / 1000; else if (/^a/.test(u)) got.I = v; else if (/^(?:ω|ohm)/.test(u)) got.R = v; else if (/^w/.test(u)) got.P = v;
  }
  let { V, I, R, P } = got;
  if (V !== undefined && I !== undefined) { R = V / I; P = V * I; }
  else if (V !== undefined && R !== undefined) { I = V / R; P = V * I; }
  else if (I !== undefined && R !== undefined) { V = I * R; P = V * I; }
  else if (P !== undefined && V !== undefined) { I = P / V; R = V / I; }
  else if (P !== undefined && I !== undefined) { V = P / I; R = V / I; }
  else if (P !== undefined && R !== undefined) { I = Math.sqrt(P / R); V = I * R; }
  else return null;
  return { V, I, R, P };
}
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
export function nextE12(r) { const d = 10 ** Math.floor(Math.log10(r)); const n = r / d; const pick = E12.find(x => x >= n - 1e-9) ?? 10; return Number((pick * d).toPrecision(3)); }
export function led(said) { const [s, f, i] = (String(said).toLowerCase().match(/[\d.]+/g) ?? []).map(Number); const amps = /ma$/.test(said.trim().toLowerCase()) ? i / 1000 : i; if (!(s > f && amps > 0)) return null; const r = (s - f) / amps; return { supply: s, forward: f, amps, r, e12: nextE12(r), watts: (s - f) * amps }; }
const unit = (x, u) => Math.abs(x) >= 1e3 && u === 'Ω' ? `${Number((x / 1e3).toPrecision(4))} kΩ` : Math.abs(x) < 1 && u === 'A' ? `${Number((x * 1000).toPrecision(4))} mA` : `${Number(x.toPrecision(4))} ${u}`;

export default function ohmsLaw(jevie) {
  const { line, halves, stack, hero, chip, meta, spread } = jevie.CardParts;
  jevie.registerCard({
    name: 'ohms', label: "Ohm's law", symbol: 'bolt.circle', match: { pattern: OHM }, examples: ['ohms 12v 2a'],
    async render(said) {
      const s = solve(said);
      if (!s) return { summary: "Ohm's law", complete: 0, body: [line(meta('Type two of volts, amps, ohms and watts: “ohms 12v 2a”'))] };
      const summary = `${unit(s.V, 'V')} · ${unit(s.I, 'A')} · ${unit(s.R, 'Ω')} · ${unit(s.P, 'W')}`;
      return { summary, copy: summary, complete: 1, body: [halves(stack('center', line(hero(unit(s.V, 'V'))), line(chip('voltage'))), stack('center', line(hero(unit(s.I, 'A'))), line(chip('current'))), stack('center', line(hero(unit(s.R, 'Ω'))), line(chip('resistance')))), line(meta(`power ${unit(s.P, 'W')} · V = I × R, P = V × I`))] };
    }
  });
  jevie.registerCard({
    name: 'led-resistor', label: 'LED resistor', symbol: 'lightbulb', match: { pattern: LED }, examples: ['led resistor 5v 2v 20ma'],
    async render(said) {
      const l = led(said);
      if (!l) return { summary: 'LED resistor', complete: 0, body: [line(meta('Type supply, LED forward voltage and current: “led resistor 5v 2v 20ma”'))] };
      return { summary: `${unit(l.e12, 'Ω')} resistor (${unit(l.r, 'Ω')} exact), ${(l.watts * 1000).toFixed(0)} mW`, copy: unit(l.e12, 'Ω'), complete: 1, body: [spread(stack('leading', line(hero(unit(l.e12, 'Ω'))), line(chip('next standard value up', 'lightbulb'))), stack('trailing', line(meta(`${unit(l.r, 'Ω')} exact`)), line(meta(`${(l.watts * 1000).toFixed(0)} mW in the resistor`)))), line(meta(`(${l.supply} V − ${l.forward} V) ÷ ${unit(l.amps, 'A')} · E12 series · a ¼ W resistor covers up to 250 mW`))] };
    }
  });
}
