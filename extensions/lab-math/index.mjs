// Bench sums, as cards while they are typed, worked out on this Mac:
//
//   "dilution 10 m to 1 m 50 ml", "dilute 1 mg/ml to 50 ug/ml 2 ml"   C1V1 = C2V2: stock volume and diluent
//   "molarity 0.5 m 250 ml mw 58.44"                                 grams to weigh for a molar solution

export const DILUTION = '^(?:dilution|dilute|c1v1)\\s+[\\d.]+\\s*(?:m|mm|um|µm|nm|mg/ml|ug/ml|µg/ml|ng/ml|%|x)\\s+(?:to|→)\\s+[\\d.]+\\s*(?:m|mm|um|µm|nm|mg/ml|ug/ml|µg/ml|ng/ml|%|x)\\s+[\\d.]+\\s*(?:l|ml|ul|µl)$';
export const MOLAR = '^(?:molarity|molar|make)\\s+[\\d.]+\\s*(?:m|mm|um|µm)\\s+[\\d.]+\\s*(?:l|ml|ul|µl)\\s+(?:mw|fw|molar\\s+mass)\\s+[\\d.]+$';
const CONC = { m: 1, mm: 1e-3, um: 1e-6, 'µm': 1e-6, nm: 1e-9, 'mg/ml': 1, 'ug/ml': 1e-3, 'µg/ml': 1e-3, 'ng/ml': 1e-6, '%': 1, x: 1 };
const VOL = { l: 1000, ml: 1, ul: 1e-3, 'µl': 1e-3 };
const family = u => /^(?:m|mm|um|µm|nm)$/.test(u) ? 'molar' : /\/ml$/.test(u) ? 'mass' : u;
const showVol = ml => ml >= 1000 ? `${Number((ml / 1000).toFixed(3))} L` : ml >= 1 ? `${Number(ml.toFixed(3))} mL` : `${Number((ml * 1000).toFixed(2))} µL`;

export function dilution(said) {
  const t = String(said).toLowerCase().replace(/μ/g, 'µ');
  const m = t.match(/([\d.]+)\s*(m|mm|um|µm|nm|mg\/ml|ug\/ml|µg\/ml|ng\/ml|%|x)\s+(?:to|→)\s+([\d.]+)\s*(m|mm|um|µm|nm|mg\/ml|ug\/ml|µg\/ml|ng\/ml|%|x)\s+([\d.]+)\s*(l|ml|ul|µl)/);
  if (!m) return null;
  if (family(m[2]) !== family(m[4])) return { error: `${m[2]} and ${m[4]} are different kinds of concentration` };
  const c1 = Number(m[1]) * CONC[m[2]], c2 = Number(m[3]) * CONC[m[4]], v2 = Number(m[5]) * VOL[m[6]];
  if (!(c1 > 0 && c2 > 0)) return null;
  if (c2 > c1) return { error: 'the final concentration is higher than the stock: that is concentrating, not diluting' };
  const v1 = c2 * v2 / c1;
  return { v1, v2, diluent: v2 - v1, factor: c1 / c2 };
}
export function molar(said) {
  const t = String(said).toLowerCase().replace(/μ/g, 'µ');
  const m = t.match(/([\d.]+)\s*(m|mm|um|µm)\s+([\d.]+)\s*(l|ml|ul|µl)\s+(?:mw|fw|molar\s+mass)\s+([\d.]+)/);
  if (!m) return null;
  const molPerL = Number(m[1]) * CONC[m[2]], liters = Number(m[3]) * VOL[m[4]] / 1000, mw = Number(m[5]);
  return { grams: molPerL * liters * mw, moles: molPerL * liters, molPerL, liters, mw };
}

export default function labMath(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'dilution', label: 'Dilution', symbol: 'testtube.2', match: { pattern: DILUTION }, examples: ['dilution 10 m to 1 m 50 ml'],
    async render(said) {
      const d = dilution(said);
      if (!d || d.error) return { summary: 'Dilution', complete: 0, error: Boolean(d?.error), body: [line(meta(d?.error ?? 'Type stock, final concentration and final volume: “dilution 10 m to 1 m 50 ml”'))] };
      const summary = `${showVol(d.v1)} of stock + ${showVol(d.diluent)} of diluent = ${showVol(d.v2)} (1:${Number(d.factor.toFixed(2))})`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(showVol(d.v1))), line(chip('of stock', 'testtube.2'))), icon('plus'), stack('trailing', line(hero(showVol(d.diluent))), line(chip('of diluent')))), line(meta(`C1V1 = C2V2 · a 1:${Number(d.factor.toFixed(2))} dilution to ${showVol(d.v2)}`))] };
    }
  });
  jevie.registerCard({
    name: 'molar', label: 'Molar solution', symbol: 'scalemass', match: { pattern: MOLAR }, examples: ['molarity 0.5 m 250 ml mw 58.44'],
    async render(said) {
      const m = molar(said);
      if (!m) return { summary: 'Molar solution', complete: 0, body: [line(meta('Type molarity, volume and molar mass: “molarity 0.5 m 250 ml mw 58.44”'))] };
      const g = m.grams >= 1 ? `${Number(m.grams.toFixed(3))} g` : `${Number((m.grams * 1000).toFixed(2))} mg`;
      const summary = `Weigh ${g} for ${showVol(m.liters * 1000)} at ${m.molPerL} M (MW ${m.mw})`;
      return { summary, copy: g, complete: 1, body: [pair(stack('leading', line(hero(g)), line(chip('to weigh', 'scalemass'))), icon('arrow.right'), stack('trailing', line(hero(showVol(m.liters * 1000), true)), line(chip(`${m.molPerL} M`)))), line(meta(`${Number(m.moles.toPrecision(4))} mol × ${m.mw} g/mol · make up to the volume, don't add to it`))] };
    }
  });
}
