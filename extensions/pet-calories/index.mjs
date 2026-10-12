// A pet's daily calories, as a card while it is typed, worked out on this
// Mac: resting energy 70 × kg^0.75, times the usual life-stage factor.
//
//   "dog calories 20 kg neutered", "dog calories 45 lb active", "puppy calories 8 kg", "cat calories 10 lb weight loss"

const STAGES = 'neutered|spayed|fixed|intact|weight\\s+loss|lose\\s+weight|active|working|senior|inactive|lazy';
export const PATTERN = `^(?:dog|puppy|cat|kitten)\\s+(?:calories|kcal|food|energy)\\s+[\\d.]+\\s*(?:kg|kgs|lb|lbs)(?:\\s+(?:${STAGES}))?$`;
const FACTOR = { dog: { neutered: 1.6, intact: 1.8, loss: 1.0, active: 3.0, senior: 1.4, inactive: 1.2, young: 2.5 }, cat: { neutered: 1.2, intact: 1.4, loss: 0.8, active: 1.6, senior: 1.1, inactive: 1.0, young: 2.5 } };
export function pet(said) {
  const t = String(said).toLowerCase();
  const kind = /^(?:cat|kitten)/.test(t) ? 'cat' : 'dog', young = /^(?:puppy|kitten)/.test(t);
  const m = t.match(/([\d.]+)\s*(kg|kgs|lb|lbs)/); const kg = Number(m[1]) * (/^lb/.test(m[2]) ? 0.45359237 : 1);
  const stage = young ? 'young' : /weight\s+loss|lose/.test(t) ? 'loss' : /intact/.test(t) ? 'intact' : /active|working/.test(t) ? 'active' : /senior/.test(t) ? 'senior' : /inactive|lazy/.test(t) ? 'inactive' : 'neutered';
  const rer = 70 * kg ** 0.75, factor = FACTOR[kind][stage];
  return { kind, kg, stage, rer, factor, kcal: rer * factor };
}
const LABEL = { neutered: 'neutered adult', intact: 'intact adult', loss: 'for weight loss', active: 'active or working', senior: 'senior', inactive: 'inactive', young: 'growing' };

export default function petCalories(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pet-calories', label: 'Pet calories', symbol: 'pawprint', match: { pattern: PATTERN }, examples: ['dog calories 20 kg neutered'],
    async render(said) {
      const p = pet(said);
      return { summary: `About ${Math.round(p.kcal)} kcal a day for a ${p.kg.toFixed(1)} kg ${p.kind} (${LABEL[p.stage]})`, copy: `${Math.round(p.kcal)} kcal`, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(p.kcal)} kcal`)), line(chip(`a day · ${LABEL[p.stage]}`, 'pawprint'))), stack('trailing', line(meta(`resting ${Math.round(p.rer)} kcal`)), line(meta(`× ${p.factor}`)))), line(meta(`70 × ${p.kg.toFixed(1)} kg^0.75 · the food's label gives kcal a cup · a starting point: adjust by body condition, and ask your vet`))] };
    }
  });
}
