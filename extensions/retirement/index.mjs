// Retirement sums, as cards while they are typed, worked out on this Mac:
//
//   "fire 60k expenses", "fire number 80k a year"    the 4% rule: 25 × yearly spending
//   "retire with 1.5m at 4%", "1.5m at 3.5% withdrawal"   what a portfolio pays a year and a month
//   "fire 60k expenses saving 3k a month at 7%"       and how many years to get there

const N = '\\$?[\\d,.]+\\s*[km]?';
export const FIRE = `^(?:fire|fire\\s+number|fi\\s+number)\\s+${N}(?:\\s+(?:a\\s+year|expenses|spending|per\\s+year|yearly))*(?:\\s+(?:with\\s+)?${N}\\s+saved)?(?:\\s+saving\\s+${N}\\s+(?:a|per)\\s+month(?:\\s+at\\s+[\\d.]+\\s*%)?)?$`;
export const DRAW = `^(?:retire\\s+(?:with\\s+|on\\s+)?)?${N}\\s+(?:at\\s+)?[\\d.]+\\s*%\\s*(?:withdrawal|draw(?:down)?|swr)?$|^retire\\s+(?:with\\s+|on\\s+)?${N}\\s+at\\s+[\\d.]+\\s*%$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
const money = n => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}m` : `$${Math.round(n).toLocaleString('en-US')}`;

export function fire(said) {
  const t = String(said).trim().toLowerCase();
  const spend = num(t.match(new RegExp(`^(?:fire|fire\\s+number|fi\\s+number)\\s+(${N})`))?.[1]);
  if (!(spend > 0)) return null;
  const target = spend * 25;
  const saved = num(t.match(new RegExp(`(${N})\\s+saved`))?.[1] ?? '0') || 0;
  const monthly = num(t.match(new RegExp(`saving\\s+(${N})\\s+(?:a|per)\\s+month`))?.[1] ?? '0') || 0;
  const rate = (Number(t.match(/at\s+([\d.]+)\s*%/)?.[1]) || 7) / 100;
  let years = null;
  if (monthly > 0 || saved > 0) { let v = saved, m = 0; const r = rate / 12; while (v < target && m < 1200) { v = v * (1 + r) + monthly; m++; } years = m < 1200 ? m / 12 : null; }
  return { spend, target, saved, monthly, rate, years };
}
export function draw(said) {
  const t = String(said).trim().toLowerCase().replace(/^retire\s+(?:with\s+|on\s+)?/, '');
  const m = t.match(new RegExp(`^(${N})\\s+(?:at\\s+)?([\\d.]+)\\s*%`));
  if (!m) return null;
  const pot = num(m[1]), pct = Number(m[2]) / 100;
  if (!(pot > 0 && pct > 0 && pct < 0.2)) return null;
  return { pot, pct, yearly: pot * pct, monthly: pot * pct / 12 };
}

export default function retirement(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'fire', label: 'FIRE number', symbol: 'figure.walk.motion', match: { pattern: FIRE }, examples: ['fire 60k expenses'],
    async render(said) {
      const f = fire(said);
      if (!f) return { summary: 'FIRE number', complete: 0, body: [line(meta('Type yearly spending, like “fire 60k expenses”'))] };
      const summary = `FIRE number ${money(f.target)} for ${money(f.spend)} a year${f.years !== null ? ` · about ${f.years.toFixed(1)} years away` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(f.spend), true)), line(chip('a year'))), icon('multiply'), stack('trailing', line(hero(money(f.target))), line(chip('to be independent', 'figure.walk.motion')))),
        line(meta(f.years !== null ? `${money(f.saved)} saved + ${money(f.monthly)} a month at ${(f.rate * 100).toFixed(1)}%: about ${f.years.toFixed(1)} years · ` : '' ) , meta('25 × spending: the 4% rule (Trinity study) · before tax'))] };
    }
  });
  jevie.registerCard({
    name: 'withdrawal', label: 'Withdrawal', symbol: 'banknote', match: { pattern: DRAW }, examples: ['retire with 1.5m at 4%'],
    async render(said) {
      const d = draw(said);
      if (!d) return { summary: 'Withdrawal', complete: 0, body: [line(meta('Type savings and a rate, like “retire with 1.5m at 4%”'))] };
      const summary = `${money(d.pot)} at ${(d.pct * 100).toFixed(1)}%: ${money(d.yearly)} a year, ${money(d.monthly)} a month`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(d.yearly))), line(chip('a year'))), icon('equal'), stack('trailing', line(hero(money(d.monthly), true)), line(chip('a month')))),
        line(meta(`${money(d.pot)} × ${(d.pct * 100).toFixed(1)}% · 4% has lasted 30 years in most US historical periods; lower is safer for longer · before tax`))] };
    }
  });
}
