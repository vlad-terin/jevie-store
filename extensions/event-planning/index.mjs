// Event sums, as cards while they are typed, worked out on this Mac:
//
//   "tables for 120 guests 8 per table"         tables, seats left over
//   "event 120 guests 9500 budget"              the budget per head
//   "drinks for 80 guests 4 hours"              a drink each in the first hour, then one an hour - in bottles of wine, beer and spirits

export const TABLES = '^tables?\\s+for\\s+\\d+\\s+(?:guests?|people)(?:\\s+\\d+\\s+(?:per|a|at\\s+each)\\s+table)?$';
export const BUDGET = '^(?:event|party|wedding)\\s+\\d+\\s+(?:guests?|people)\\s+\\$?[\\d,.]+\\s*[k]?\\s+budget$';
export const DRINKS = '^drinks\\s+for\\s+\\d+\\s+(?:guests?|people)\\s+[\\d.]+\\s*(?:hours?|hrs?|h)$';

export const tables = said => { const t = String(said).toLowerCase(); const g = Number(t.match(/(\d+)\s+(?:guests?|people)/)[1]), per = Number(t.match(/(\d+)\s+(?:per|a|at\s+each)\s+table/)?.[1] ?? 8); const n = Math.ceil(g / per); return { guests: g, per, tables: n, spare: n * per - g }; };
export const budget = said => { const t = String(said).toLowerCase().replace(/,/g, ''); const g = Number(t.match(/(\d+)\s+(?:guests?|people)/)[1]); const b = t.match(/\$?([\d.]+)\s*(k)?\s+budget/); const total = Number(b[1]) * (b[2] ? 1000 : 1); return { guests: g, total, perHead: total / g }; };
export function drinks(said) {
  const t = String(said).toLowerCase(); const g = Number(t.match(/(\d+)\s+(?:guests?|people)/)[1]), h = Number(t.match(/([\d.]+)\s*(?:hours?|hrs?|h)/)[1]);
  const total = Math.ceil(g * (2 + Math.max(0, h - 1)));
  // A common split: half wine, a third beer, the rest spirits; 5 glasses a bottle of wine, 16 drinks a 750 mL of spirits.
  return { guests: g, hours: h, total, wine: Math.ceil(total * 0.5 / 5), beer: Math.ceil(total / 3), spirits: Math.ceil(total * (1 / 6) / 16) };
}

export default function eventPlanning(jevie) {
  const { line, spread, halves, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'tables', label: 'Tables', symbol: 'table.furniture', match: { pattern: TABLES }, examples: ['tables for 120 guests 8 per table'],
    async render(said) {
      const t = tables(said);
      const summary = `${t.tables} tables of ${t.per} for ${t.guests} guests${t.spare ? ` (${t.spare} spare seats)` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(String(t.tables))), line(chip(`tables of ${t.per}`, 'table.furniture'))), stack('trailing', line(meta(`${t.guests} guests`)), line(meta(`${t.spare} spare seats`)))), line(meta('8 a table unless named · a 60-inch round seats 8, a 72-inch 10'))] };
    }
  });
  jevie.registerCard({
    name: 'event-budget', label: 'Budget per head', symbol: 'party.popper', match: { pattern: BUDGET }, examples: ['event 120 guests 9500 budget'],
    async render(said) {
      const b = budget(said);
      const summary = `$${b.perHead.toFixed(2)} a guest ($${b.total.toLocaleString('en-US')} for ${b.guests})`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`$${b.perHead.toFixed(2)}`)), line(chip('a guest', 'party.popper'))), stack('trailing', line(meta(`$${b.total.toLocaleString('en-US')} budget`)), line(meta(`${b.guests} guests`)))), line(meta('catering often takes 40–50% of an event budget'))] };
    }
  });
  jevie.registerCard({
    name: 'drinks', label: 'Drinks', symbol: 'wineglass', match: { pattern: DRINKS }, examples: ['drinks for 80 guests 4 hours'],
    async render(said) {
      const d = drinks(said);
      const summary = `${d.total} drinks for ${d.guests} guests over ${d.hours} h: ${d.wine} bottles of wine, ${d.beer} beers, ${d.spirits} bottles of spirits`;
      return { summary, copy: summary, complete: 1, body: [
        halves(stack('center', line(hero(String(d.wine))), line(chip('bottles of wine', 'wineglass'))), stack('center', line(hero(String(d.beer))), line(chip('beers'))), stack('center', line(hero(String(d.spirits))), line(chip('750 mL spirits')))),
        line(meta(`${d.total} drinks: two each in the first hour, one an hour after · half wine, a third beer, a sixth spirits · adjust to your crowd, and have water and soft drinks too`))] };
    }
  });
}
