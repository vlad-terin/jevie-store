// Caffeine left, as a card while it is typed, worked out on this Mac at a
// half-life of 5 hours (it runs about 2 to 10 for different people):
//
//   "caffeine 200mg at 9am bedtime 11pm", "caffeine 95mg 8am 95mg 2pm bedtime 10:30pm", "caffeine 2 coffees 9am bedtime 11pm"

const T = '\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)';
const DOSE = `(?:\\d{1,4}\\s*mg|\\d\\s+(?:coffees?|espressos?|shots?|cups?|teas?|colas?|energy\\s+drinks?))\\s+(?:at\\s+)?${T}`;
export const PATTERN = `^caffeine\\s+${DOSE}(?:\\s*(?:,|and|\\+)?\\s*${DOSE})*\\s+(?:bedtime|bed|sleep)\\s+(?:at\\s+)?${T}$`;
export const MG = { coffee: 95, espresso: 63, shot: 63, cup: 95, tea: 47, cola: 34, 'energy drink': 80 };
export const minutes = s => { const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/); let h = Number(m[1]) % 12; if (m[3] === 'pm') h += 12; return h * 60 + Number(m[2] ?? 0); };
export function left(said, halfLife = 5) {
  const t = String(said).toLowerCase();
  const bed = minutes(t.match(new RegExp(`(?:bedtime|bed|sleep)\\s+(?:at\\s+)?(${T})$`))[1]);
  const doses = [...t.matchAll(new RegExp(`(\\d{1,4})\\s*(mg|coffees?|espressos?|shots?|cups?|teas?|colas?|energy\\s+drinks?)\\s+(?:at\\s+)?(${T})`, 'g'))].map(m => {
    const kind = m[2].replace(/s$/, '').replace(/drinks$/, 'drink'); const mg = kind === 'mg' ? Number(m[1]) : Number(m[1]) * (MG[kind] ?? 95);
    let at = minutes(m[3]); let hours = (bed - at) / 60; if (hours < 0) hours += 24;
    return { mg, at, hours, left: mg * 0.5 ** (hours / halfLife) };
  });
  const total = doses.reduce((a, d) => a + d.mg, 0), remaining = doses.reduce((a, d) => a + d.left, 0);
  return { bed, doses, total, remaining };
}
const clock = m => { const h = Math.floor(m / 60) % 24, x = m % 60; return `${h % 12 || 12}${x ? `:${String(x).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`; };

export default function caffeine(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'caffeine', label: 'Caffeine', symbol: 'cup.and.saucer.fill', match: { pattern: PATTERN }, examples: ['caffeine 200mg at 9am bedtime 11pm'],
    async render(said) {
      const c = left(said);
      if (!c.doses.length) return { summary: 'Caffeine', complete: 0, body: [line(meta('Type what you had and bedtime: “caffeine 200mg at 9am bedtime 11pm”'))] };
      const summary = `About ${Math.round(c.remaining)} mg still in you at ${clock(c.bed)}, of ${Math.round(c.total)} mg`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(c.remaining)} mg`, c.remaining < 50)), line(chip(`at ${clock(c.bed)}`, 'bed.double'))), stack('trailing', line(meta(`${Math.round(c.total)} mg in all`)), line(meta(c.remaining >= 50 ? 'enough to cost some sleep for many' : 'little left')))), line(meta(`half-life about 5 h (2–10 for different people) · a coffee ≈ 95 mg, an espresso 63, tea 47, cola 34 · not medical advice`))] };
    }
  });
}
