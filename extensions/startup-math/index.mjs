// A startup's sums, as cards while they are typed, worked out on this Mac:
//
//   "runway 400k burn 35k", "runway 1.2m burn 90k revenue 20k growing 5%"
//       months until the cash is gone (net burn, revenue growing monthly if named)
//   "raise 2m at 8m pre", "raise 2m at 8m pre 10% pool own 60%"
//       post-money, the investors' share, and a holder's stake after (pool from the pre-money)

const N = '\\$?[\\d,.]+\\s*[km]?';
export const RUNWAY = `^runway\\s+${N}\\s+(?:burn|burning)\\s+${N}(?:\\s+a\\s+month)?(?:\\s+revenue\\s+${N})?(?:\\s+growing\\s+[\\d.]+\\s*%)?$`;
export const ROUND = `^raise\\s+${N}\\s+(?:at|on)\\s+${N}\\s+(?:pre|pre-money|post|post-money)(?:\\s+[\\d.]+\\s*%\\s+pool)?(?:\\s+own\\s+[\\d.]+\\s*%)?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
const money = n => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}m` : `$${Math.round(n).toLocaleString('en-US')}`;

export function runway(said) {
  const t = String(said).toLowerCase();
  const cash = num(t.match(new RegExp(`runway\\s+(${N})`))?.[1]), burn = num(t.match(new RegExp(`burn(?:ing)?\\s+(${N})`))?.[1]);
  const revenue = num(t.match(new RegExp(`revenue\\s+(${N})`))?.[1] ?? '0') || 0, growth = (Number(t.match(/growing\s+([\d.]+)\s*%/)?.[1]) || 0) / 100;
  if (!(cash > 0 && burn > 0)) return null;
  let left = cash, months = 0, rev = revenue;
  while (left > 0 && months < 600) { const net = burn - rev; if (net <= 0) return { cash, burn, revenue, growth, months: Infinity, profitableAt: months }; left -= net; rev *= 1 + growth; months++; }
  const over = left < 0 ? -left / (burn - rev / (1 + growth)) : 0;
  return { cash, burn, revenue, growth, months: months - over };
}
export function round(said) {
  const t = String(said).toLowerCase();
  const raise = num(t.match(new RegExp(`raise\\s+(${N})`))?.[1]), val = num(t.match(new RegExp(`(?:at|on)\\s+(${N})\\s+(pre|post)`))?.[1]);
  const post = /\bpost\b|post-money/.test(t) ? val : val + raise, pre = post - raise;
  const pool = (Number(t.match(/([\d.]+)\s*%\s+pool/)?.[1]) || 0) / 100, own = (Number(t.match(/own\s+([\d.]+)\s*%/)?.[1]) || 0) / 100;
  if (!(raise > 0 && pre > 0)) return null;
  const investors = raise / post;
  // A new pool carved out of the pre-money dilutes the existing holders only.
  const existingAfter = 1 - investors - pool;
  return { raise, pre, post, investors, pool, own, after: own ? own * existingAfter / 1 : null, existingAfter, price: null };
}

export default function startupMath(jevie) {
  const { line, spread, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'runway', label: 'Runway', symbol: 'flame.fill', match: { pattern: RUNWAY }, examples: ['runway 400k burn 35k'],
    async render(said) {
      const r = runway(said);
      if (!r) return { summary: 'Runway', complete: 0, body: [line(meta('Type cash and monthly burn: “runway 400k burn 35k”'))] };
      if (!Number.isFinite(r.months)) return { summary: `Revenue covers the burn in month ${r.profitableAt + 1}: the cash never runs out`, copy: 'default alive', complete: 1, body: [spread(line(hero('Default alive')), chip(`breakeven in month ${r.profitableAt + 1}`, 'checkmark.seal')), line(meta(`${money(r.cash)} cash · ${money(r.burn)} burn · revenue ${money(r.revenue)} growing ${(r.growth * 100).toFixed(1)}% a month`))] };
      const out = new Date(); out.setMonth(out.getMonth() + Math.floor(r.months));
      const summary = `${r.months.toFixed(1)} months of runway (to about ${out.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`${r.months.toFixed(1)} mo`, r.months < 12)), line(chip(r.months < 6 ? 'raise now' : r.months < 12 ? 'start raising' : 'room to build', r.months < 12 ? 'exclamationmark.triangle' : 'flame.fill'))), stack('trailing', line(meta(`out around ${out.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`)), line(meta(`${money(r.cash)} ÷ ${money(r.burn - r.revenue)} net`)))),
        line(meta(`${money(r.burn)} gross burn${r.revenue ? ` − ${money(r.revenue)} revenue${r.growth ? ` growing ${(r.growth * 100).toFixed(1)}% a month` : ''}` : ''} · fundraising takes 3–6 months`))] };
    }
  });
  jevie.registerCard({
    name: 'round', label: 'Priced round', symbol: 'chart.pie', match: { pattern: ROUND }, examples: ['raise 2m at 8m pre'],
    async render(said) {
      const r = round(said);
      if (!r) return { summary: 'Priced round', complete: 0, body: [line(meta('Type the raise and a valuation: “raise 2m at 8m pre”'))] };
      const summary = `${money(r.raise)} at ${money(r.pre)} pre = ${money(r.post)} post · investors ${(r.investors * 100).toFixed(1)}%${r.after !== null ? ` · ${(r.own * 100).toFixed(1)}% becomes ${(r.after * 100).toFixed(1)}%` : ''}`;
      return { summary, copy: summary, complete: 1, body: [
        pair(stack('leading', line(hero(money(r.post))), line(chip('post-money'))), icon('chart.pie'), stack('trailing', line(hero(`${(r.investors * 100).toFixed(1)}%`, true)), line(chip('to the new investors')))),
        line(meta(`${money(r.raise)} on ${money(r.pre)} pre${r.pool ? ` · new ${(r.pool * 100).toFixed(0)}% pool from the pre-money` : ''} · existing holders keep ${(r.existingAfter * 100).toFixed(1)}%${r.after !== null ? ` · ${(r.own * 100).toFixed(1)}% → ${(r.after * 100).toFixed(1)}%` : ''}`))] };
    }
  });
}
