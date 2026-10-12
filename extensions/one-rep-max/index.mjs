// A one-rep max, as a card while it is typed, worked out on this Mac from
// a set: Epley w × (1 + reps ÷ 30) and Brzycki w × 36 ÷ (37 − reps), most
// reliable at 10 reps or fewer.
//
//   "1rm 100 kg 5 reps", "one rep max 225 lb 8 reps", "1rm 140 x 3"

export const PATTERN = '^(?:1\\s*rm|one[\\s-]+rep\\s+max|max\\s+lift)\\s+[\\d.]+\\s*(?:kg|kgs|lb|lbs)?\\s*(?:x|×|for)?\\s*\\d{1,2}(?:\\s*reps?)?$';
export function orm(said) {
  const t = String(said).toLowerCase().replace(/^(?:1\s*rm|one[\s-]+rep\s+max|max\s+lift)\s+/, '');
  const m = t.match(/^([\d.]+)\s*(kg|kgs|lb|lbs)?\s*(?:x|×|for)?\s*(\d{1,2})/); if (!m) return null;
  const w = Number(m[1]), reps = Number(m[3]), unit = /^lb/.test(m[2] ?? '') ? 'lb' : m[2] ? 'kg' : '';
  if (!(w > 0 && reps >= 1 && reps < 37)) return null;
  const epley = reps === 1 ? w : w * (1 + reps / 30), brzycki = w * 36 / (37 - reps);
  return { w, reps, unit, epley, brzycki, max: (epley + brzycki) / 2 };
}

export default function oneRepMax(jevie) {
  const { line, spread, stack, hero, chip, meta, list } = jevie.CardParts;
  jevie.registerCard({
    name: 'one-rep-max', label: 'One-rep max', symbol: 'dumbbell', match: { pattern: PATTERN }, examples: ['1rm 100 kg 5 reps'],
    async render(said) {
      const o = orm(said);
      if (!o) return { summary: 'One-rep max', complete: 0, body: [line(meta('Type a weight and reps: “1rm 100 kg 5 reps”'))] };
      const u = o.unit ? ` ${o.unit}` : '';
      const pct = [95, 90, 85, 80, 75, 70].map(p => `${p}%: ${Math.round(o.max * p / 100)}${u}`);
      return { summary: `About ${Math.round(o.max)}${u} (Epley ${Math.round(o.epley)}, Brzycki ${Math.round(o.brzycki)}) from ${o.w}${u} × ${o.reps}`, copy: `${Math.round(o.max)}${u}`, complete: 1, body: [spread(stack('leading', line(hero(`${Math.round(o.max)}${u}`)), line(chip('estimated 1RM', 'dumbbell'))), stack('trailing', line(meta(`Epley ${Math.round(o.epley)} · Brzycki ${Math.round(o.brzycki)}`)), line(meta(`from ${o.w}${u} × ${o.reps}`)))), list(pct), line(meta(o.reps > 10 ? 'over 10 reps the estimate drifts: test a heavier set' : 'an estimate: lift a true max only with a spotter'))] };
    }
  });
}
