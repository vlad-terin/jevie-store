// Food sums, as cards while they are typed, worked out on this Mac:
//
//   "tdee 30 male 180cm 80kg moderate", "calories 28 f 5'6 140 lb active cut"
//       BMR by Mifflin-St Jeor, times activity; "cut" −500, "bulk" +300
//   "macros 2400 calories 40/30/30"   protein/carbs/fat as percentages → grams (4, 4, 9 kcal a gram)

export const TDEE = '^(?:tdee|calories|bmr|maintenance\\s+calories)\\s+\\d{1,3}\\s*(?:y|yo|years?)?\\s+(?:male|female|m|f|man|woman)\\s+.+$';
export const MACROS = '^macros\\s+\\d{3,5}\\s*(?:kcal|cal(?:ories)?)?\\s+\\d{1,2}\\s*/\\s*\\d{1,2}\\s*/\\s*\\d{1,2}$';
export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very active': 1.9, athlete: 1.9 };

export function body(text) {
  const t = String(text).toLowerCase();
  let cm = Number(t.match(/(\d+(?:\.\d+)?)\s*cm/)?.[1]) || null, kg = Number(t.match(/(\d+(?:\.\d+)?)\s*kg/)?.[1]) || null;
  const ft = t.match(/(\d)\s*(?:'|ft)\s*(\d{1,2})?/); if (!cm && ft) cm = (Number(ft[1]) * 12 + Number(ft[2] ?? 0)) * 2.54;
  const lb = t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)/); if (!kg && lb) kg = Number(lb[1]) * 0.45359237;
  return { cm, kg };
}
export function tdee(said) {
  const t = String(said).toLowerCase();
  const age = Number(t.match(/^\w+(?:\s+calories)?\s+(\d{1,3})/)?.[1]);
  const female = /\b(?:female|f|woman)\b/.test(t);
  const { cm, kg } = body(t);
  if (!(age > 0 && cm > 50 && kg > 20)) return null;
  const level = Object.keys(ACTIVITY).sort((a, b) => b.length - a.length).find(k => t.includes(k)) ?? 'sedentary';
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (female ? -161 : 5);
  const maintain = bmr * ACTIVITY[level];
  const goal = /\bcut\b|lose/.test(t) ? -500 : /\bbulk\b|gain/.test(t) ? 300 : 0;
  return { age, female, cm, kg, level, bmr, maintain, goal, target: maintain + goal };
}
export function macros(said) {
  const m = String(said).toLowerCase().match(/(\d{3,5})\s*(?:kcal|cal(?:ories)?)?\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const kcal = Number(m[1]), [p, c, f] = [m[2], m[3], m[4]].map(Number);
  if (p + c + f !== 100) return { error: `${p}/${c}/${f} adds up to ${p + c + f}%, not 100%` };
  return { kcal, split: [p, c, f], protein: kcal * p / 100 / 4, carbs: kcal * c / 100 / 4, fat: kcal * f / 100 / 9 };
}

export default function fitnessCalories(jevie) {
  const { line, halves, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'tdee', label: 'Daily calories', symbol: 'flame', match: { pattern: TDEE }, examples: ['tdee 30 male 180cm 80kg moderate'],
    async render(said) {
      const d = tdee(said);
      if (!d) return { summary: 'Daily calories', complete: 0, body: [line(meta('Type age, sex, height, weight and activity: “tdee 30 male 180cm 80kg moderate”'))] };
      const summary = `${Math.round(d.target)} kcal a day${d.goal ? ` to ${d.goal < 0 ? 'cut' : 'bulk'} (maintenance ${Math.round(d.maintain)})` : ' to maintain'} · BMR ${Math.round(d.bmr)}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${Math.round(d.target)}`)), line(chip(d.goal ? (d.goal < 0 ? 'kcal to cut' : 'kcal to bulk') : 'kcal to maintain', 'flame'))), stack('trailing', line(hero(`${Math.round(d.bmr)}`, true)), line(chip('BMR at rest')))),
        line(meta(`Mifflin-St Jeor × ${ACTIVITY[d.level]} (${d.level}) · ${Math.round(d.cm)} cm · ${d.kg.toFixed(1)} kg · an estimate; bodies differ`))] };
    }
  });
  jevie.registerCard({
    name: 'macros', label: 'Macros', symbol: 'chart.pie', match: { pattern: MACROS }, examples: ['macros 2400 calories 40/30/30'],
    async render(said) {
      const m = macros(said);
      if (!m || m.error) return { summary: 'Macros', complete: 0, error: Boolean(m?.error), body: [line(meta(m?.error ?? 'Type calories and protein/carbs/fat percentages: “macros 2400 calories 40/30/30”'))] };
      const summary = `${m.kcal} kcal: protein ${Math.round(m.protein)} g, carbs ${Math.round(m.carbs)} g, fat ${Math.round(m.fat)} g`;
      return { summary, copy: summary, complete: 1, body: [halves(stack('center', line(hero(`${Math.round(m.protein)} g`)), line(chip(`protein ${m.split[0]}%`))), stack('center', line(hero(`${Math.round(m.carbs)} g`)), line(chip(`carbs ${m.split[1]}%`))), stack('center', line(hero(`${Math.round(m.fat)} g`)), line(chip(`fat ${m.split[2]}%`)))), line(meta(`of ${m.kcal} kcal · 4 kcal a gram of protein and carbs, 9 of fat`))] };
    }
  });
}
