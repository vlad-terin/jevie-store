// School sums, as cards while they are typed, worked out on this Mac:
//
//   "grade needed current 78 target 82 final 30%"   the final-exam score that reaches the target
//   "gpa A B+ A- B", "gpa 4 3.7 3.3", "gpa A 4 B+ 3"  a GPA (4.0 scale), credits after a grade weight it

export const NEEDED = '^(?:grade|score)\\s+needed\\s+(?:current\\s+)?[\\d.]+\\s*%?\\s+(?:target|want|goal)\\s+[\\d.]+\\s*%?\\s+(?:final|exam)\\s+(?:is\\s+|weight\\s+)?[\\d.]+\\s*%$';
export const GPA = '^gpa\\s+(?:(?:[abcdf][+-]?|[0-4](?:\\.\\d+)?)(?:\\s+\\d+(?:\\.\\d+)?\\s*(?:cr|credits?|hrs?)?)?[\\s,]+)*(?:[abcdf][+-]?|[0-4](?:\\.\\d+)?)(?:\\s+\\d+(?:\\.\\d+)?\\s*(?:cr|credits?|hrs?)?)?$';
export const POINTS = { 'a+': 4, a: 4, 'a-': 3.7, 'b+': 3.3, b: 3, 'b-': 2.7, 'c+': 2.3, c: 2, 'c-': 1.7, 'd+': 1.3, d: 1, 'd-': 0.7, f: 0 };

export function needed(said) {
  const n = String(said).match(/[\d.]+/g).map(Number);
  const [current, target, weight] = n.slice(-3); const w = weight / 100;
  if (!(w > 0 && w <= 1)) return null;
  return { current, target, weight: w, needed: (target - current * (1 - w)) / w };
}
export function gpa(said) {
  const words = String(said).toLowerCase().replace(/^gpa\s+/, '').replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const items = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const points = POINTS[w] ?? (/^[0-4](?:\.\d+)?$/.test(w) ? Number(w) : null);
    if (points === null) continue;
    const next = words[i + 1];
    // A number after a letter grade is its credits; after a number grade, credits only with "cr".
    let credits = 1;
    if (next && /^\d+(?:\.\d+)?$/.test(next) && POINTS[w] !== undefined) { credits = Number(next); i++; }
    else if (next && /^\d+(?:\.\d+)?(?:cr|credits?|hrs?)$/.test(next)) { credits = parseFloat(next); i++; }
    if (words[i + 1] && /^(?:cr|credits?|hrs?)$/.test(words[i + 1])) i++;
    items.push({ grade: w, points, credits });
  }
  const credits = items.reduce((a, b) => a + b.credits, 0);
  return items.length ? { items, credits, gpa: items.reduce((a, b) => a + b.points * b.credits, 0) / credits } : null;
}

export default function gradeCalculator(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'grade-needed', label: 'Grade needed', symbol: 'graduationcap', match: { pattern: NEEDED }, examples: ['grade needed current 78 target 82 final 30%'],
    async render(said) {
      const g = needed(said);
      if (!g) return { summary: 'Grade needed', complete: 0, body: [line(meta('Type the current grade, the target and the final\'s weight'))] };
      const reachable = g.needed <= 100;
      const summary = `${g.needed.toFixed(1)}% needed on the final (${Math.round(g.weight * 100)}% of the grade) to go from ${g.current} to ${g.target}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${Math.max(0, g.needed).toFixed(1)}%`, !reachable)), line(chip(reachable ? (g.needed <= 0 ? 'already there' : 'needed on the final') : 'not reachable', 'graduationcap'))), stack('trailing', line(meta(`now ${g.current}%`)), line(meta(`target ${g.target}%`)))),
        line(meta(`final is ${Math.round(g.weight * 100)}% of the grade · (target − current × ${(1 - g.weight).toFixed(2)}) ÷ ${g.weight.toFixed(2)}${reachable ? '' : ' · even 100% on it falls short'}`))] };
    }
  });
  jevie.registerCard({
    name: 'gpa', label: 'GPA', symbol: 'list.number', match: { pattern: GPA }, examples: ['gpa A B+ A- B'],
    async render(said) {
      const g = gpa(said);
      if (!g) return { summary: 'GPA', complete: 0, body: [line(meta('Type letter or number grades, credits after each if they differ: “gpa A 4 B+ 3”'))] };
      const summary = `GPA ${g.gpa.toFixed(2)} over ${g.credits} credit${g.credits === 1 ? '' : 's'}`;
      return { summary, copy: g.gpa.toFixed(2), complete: 1, body: [
        spread(stack('leading', line(hero(g.gpa.toFixed(2))), line(chip('GPA (4.0 scale)', 'list.number'))), stack('trailing', line(meta(`${g.items.length} grades`)), line(meta(`${g.credits} credits`)))),
        line(meta(g.items.map(i => `${i.grade.toUpperCase()}${i.credits !== 1 ? `×${i.credits}` : ''}`).join(' · ')))] };
    }
  });
}
