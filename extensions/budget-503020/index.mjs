// Take-home pay split, as a card while it is typed, worked out on this Mac:
// 50% needs, 30% wants, 20% savings and debt - or another split named
// ("budget 60/20/20 5000").
//
//   "50/30/20 6200", "budget 50/30/20 4800 a month", "budget 70/20/10 3000"

export const PATTERN = '^(?:budget\\s+)?\\d{1,2}/\\d{1,2}/\\d{1,2}\\s+\\$?[\\d,.]+\\s*[k]?(?:\\s+a\\s+month|\\s+monthly)?$';
export function split(said) {
  const m = String(said).trim().toLowerCase().replace(/,/g, '').match(/(\d{1,2})\/(\d{1,2})\/(\d{1,2})\s+\$?([\d.]+)\s*(k)?/);
  if (!m) return null;
  const parts = [m[1], m[2], m[3]].map(Number), pay = Number(m[4]) * (m[5] ? 1000 : 1);
  if (parts.reduce((a, b) => a + b, 0) !== 100 || !(pay > 0)) return { error: `${parts.join('/')} adds up to ${parts.reduce((a, b) => a + b, 0)}%, not 100%` };
  return { parts, pay, amounts: parts.map(p => pay * p / 100) };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function budget(jevie) {
  const { line, halves, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'budget', label: 'Budget split', symbol: 'chart.pie', match: { pattern: PATTERN }, examples: ['50/30/20 6200'],
    async render(said) {
      const s = split(said);
      if (!s || s.error) return { summary: 'Budget split', complete: 0, error: Boolean(s?.error), body: [line(meta(s?.error ?? 'Type a split and take-home pay: “50/30/20 6200”'))] };
      const [needs, wants, save] = s.amounts;
      const summary = `${money(s.pay)}: needs ${money(needs)}, wants ${money(wants)}, savings ${money(save)}`;
      return { summary, copy: summary, complete: 1, body: [
        halves(stack('center', line(hero(money(needs))), line(chip(`needs ${s.parts[0]}%`, 'house'))), stack('center', line(hero(money(wants))), line(chip(`wants ${s.parts[1]}%`, 'cart'))), stack('center', line(hero(money(save))), line(chip(`savings ${s.parts[2]}%`, 'banknote')))),
        line(meta(`of ${money(s.pay)} take-home · needs: rent, bills, food, minimum debt · wants: the rest you choose · savings: saving and paying debt down faster`))] };
    }
  });
}
