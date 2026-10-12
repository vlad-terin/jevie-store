// How big a trade may be, as a card while it is typed, worked out on this
// Mac: account × risk ÷ (entry − stop) shares, never more than the account
// buys; with a target, the reward-to-risk.
//
//   "position size account 10000 risk 1% entry 50 stop 48"
//   "position size 25k risk 2% entry 120 stop 114 target 135"

const N = '\\$?[\\d,.]+[km]?';
export const PATTERN = `^position\\s+size\\s+(?:account\\s+)?${N}\\s+risk\\s+[\\d.]+\\s*%\\s+entry\\s+${N}\\s+stop\\s+${N}(?:\\s+target\\s+${N})?$`;
const num = s => { const m = String(s).replace(/[$,]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function size(said) {
  const t = String(said).trim().toLowerCase();
  const m = t.match(new RegExp(`^position\\s+size\\s+(?:account\\s+)?(${N})\\s+risk\\s+([\\d.]+)\\s*%\\s+entry\\s+(${N})\\s+stop\\s+(${N})(?:\\s+target\\s+(${N}))?$`));
  if (!m) return null;
  const account = num(m[1]), risk = Number(m[2]) / 100, entry = num(m[3]), stop = num(m[4]), target = m[5] ? num(m[5]) : null;
  const per = Math.abs(entry - stop);
  if (!(account > 0 && risk > 0 && per > 0)) return null;
  const byRisk = Math.floor(account * risk / per), byCash = Math.floor(account / entry);
  const shares = Math.min(byRisk, byCash);
  return { account, risk, entry, stop, target, shares, capped: byCash < byRisk, cost: shares * entry, atRisk: shares * per, short: stop > entry, rr: target ? Math.abs(target - entry) / per : null };
}
const money = n => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function positionSize(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'position-size', label: 'Position size', symbol: 'scope', match: { pattern: PATTERN }, examples: ['position size account 10000 risk 1% entry 50 stop 48'],
    async render(said) {
      const p = size(said);
      if (!p) return { summary: 'Position size', complete: 0, body: [line(meta('Type the account, risk %, entry and stop: “position size account 10000 risk 1% entry 50 stop 48”'))] };
      const summary = `${p.shares.toLocaleString('en-US')} shares${p.short ? ' short' : ''} · ${money(p.cost)} position · ${money(p.atRisk)} at risk${p.rr ? ` · ${p.rr.toFixed(1)}:1 reward to risk` : ''}`;
      return { summary, copy: String(p.shares), complete: 1, body: [
        spread(stack('leading', line(hero(p.shares.toLocaleString('en-US'))), line(chip(`shares${p.short ? ' (short)' : ''}`, 'scope'))), stack('trailing', line(hero(money(p.atRisk), true)), line(chip(`${(p.risk * 100).toFixed(1)}% of ${money(p.account)} at risk`)))),
        line(meta(`${money(p.cost)} position · stop ${money(Math.abs(p.entry - p.stop))} a share away${p.rr ? ` · target gives ${p.rr.toFixed(1)}:1` : ''}${p.capped ? ' · capped by what the account can buy' : ''}`))] };
    }
  });
}
