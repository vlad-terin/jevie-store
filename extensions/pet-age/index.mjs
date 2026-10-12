// A pet's age in human years, as a card while it is typed, worked out on
// this Mac:
//   dogs: 15 at one, 24 at two, then 5 a year (4 for small, 6-7 for giant breeds:
//         the AVMA's rule of thumb), and 16·ln(age) + 31 from the UCSD epigenetic
//         clock (Wang et al. 2019, Labradors)
//   cats: 15 at one, 24 at two, then 4 a year (AAHA/AAFP life-stage guidelines)
//
//   "dog age 5", "large dog age 8", "cat age 12", "how old is my 3 year old dog in human years"

export const PATTERN = '^(?:(?:small|medium|large|giant)\\s+)?(?:dog|cat|puppy|kitten)\\s+age\\s+[\\d.]+(?:\\s*(?:years?|y))?$|^how\\s+old\\s+is\\s+(?:my\\s+|a\\s+)?[\\d.]+\\s*(?:years?|y)?[\\s-]*old\\s+(?:small\\s+|large\\s+|giant\\s+)?(?:dog|cat)(?:\\s+in\\s+human\\s+years)?\\??$';
const STEP = { small: 4, medium: 5, large: 6, giant: 7 };
export function human(said) {
  const t = String(said).toLowerCase();
  const age = Number(t.match(/([\d.]+)/)?.[1]);
  const cat = /\b(?:cat|kitten)\b/.test(t);
  const size = Object.keys(STEP).find(s => t.includes(s)) ?? 'medium';
  if (!(age > 0 && age < 40)) return null;
  const rule = (step) => age <= 1 ? 15 * age : age <= 2 ? 15 + 9 * (age - 1) : 24 + step * (age - 2);
  return cat ? { cat, age, years: rule(4) } : { cat, age, size, years: rule(STEP[size]), clock: age >= 1 ? 16 * Math.log(age) + 31 : null };
}

export default function petAge(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pet-age', label: 'Pet age', symbol: 'pawprint', match: { pattern: PATTERN }, examples: ['dog age 5', 'cat age 8'],
    async render(said) {
      const h = human(said);
      if (!h) return { summary: 'Pet age', complete: 0, body: [line(meta('Type the animal and its age: “dog age 5”, “cat age 8”'))] };
      const kind = h.cat ? 'cat' : `${h.size} dog`;
      // "An 8-year-old", "an 11-year-old", "an 18-year-old": by how the number is said.
      const an = /^(?:8|11|18|8\d)(?:\.|$)/.test(String(h.age)) ? 'An' : 'A';
      const summary = `${an} ${h.age}-year-old ${kind} is about ${Math.round(h.years)} in human years${h.clock ? ` (${Math.round(h.clock)} by the epigenetic clock)` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(String(Math.round(h.years)))), line(chip('human years', 'pawprint'))), stack('trailing', line(hero(h.clock ? String(Math.round(h.clock)) : '—', true)), line(chip(h.clock ? 'epigenetic clock' : h.cat ? 'AAHA/AAFP' : 'under a year')))),
        line(meta(h.cat ? '15 at one, 24 at two, then 4 a year' : `15 at one, 24 at two, then ${STEP[h.size]} a year (${h.size}) · clock: 16 × ln(age) + 31 (Wang et al. 2019)`))] };
    }
  });
}
