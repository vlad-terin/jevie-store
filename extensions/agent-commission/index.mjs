// A sale's commission, as a card while it is typed, worked out on this Mac:
// the total at a rate, split between the listing and buying sides (50/50
// unless named), then the agent/broker split of one side (70/30 unless named).
//
//   "commission split 500000 at 6%", "commission split 750k at 5% 50/50 80/20", "realtor fee 420k at 5.5%"

const N = '\\$?[\\d,.]+\\s*[km]?';
export const PATTERN = `^(?:commission\\s+split|realtor\\s+(?:fee|commission)|agent\\s+commission)\\s+${N}\\s+at\\s+[\\d.]+\\s*%(?:\\s+\\d{1,2}/\\d{1,2})?(?:\\s+\\d{1,2}/\\d{1,2})?$`;
const num = s => { const m = String(s).replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };
export function split(said) {
  const t = String(said).toLowerCase();
  const price = num(t.match(new RegExp(`(${N})\\s+at`))?.[1]), rate = Number(t.match(/at\s+([\d.]+)\s*%/)?.[1]) / 100;
  if (!(price > 0 && rate > 0)) return null;
  const splits = [...t.matchAll(/(\d{1,2})\/(\d{1,2})/g)].map(m => [Number(m[1]) / 100, Number(m[2]) / 100]);
  const [listing, buying] = splits[0] ?? [0.5, 0.5], [agent, broker] = splits[1] ?? [0.7, 0.3];
  const total = price * rate, side = total * listing;
  return { price, rate, total, listing, buying, listingSide: side, buyingSide: total * buying, agent, broker, agentKeeps: side * agent, brokerKeeps: side * broker };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function agentCommission(jevie) {
  const { line, halves, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'agent-commission', label: 'Agent commission', symbol: 'house.and.flag.fill', match: { pattern: PATTERN }, examples: ['commission split 500000 at 6%'],
    async render(said) {
      const s = split(said);
      if (!s) return { summary: 'Agent commission', complete: 0, body: [line(meta('Type the price and the rate: “commission split 500000 at 6%”'))] };
      const summary = `${money(s.total)} total on ${money(s.price)} · ${money(s.listingSide)} a side · agent keeps ${money(s.agentKeeps)} at ${Math.round(s.agent * 100)}/${Math.round(s.broker * 100)}`;
      return { summary, copy: summary, complete: 1, body: [
        halves(stack('center', line(hero(money(s.total))), line(chip(`${(s.rate * 100).toFixed(2).replace(/\.00$/, '')}% total`))), stack('center', line(hero(money(s.listingSide))), line(chip(`a side · ${Math.round(s.listing * 100)}/${Math.round(s.buying * 100)}`))), stack('center', line(hero(money(s.agentKeeps), true)), line(chip(`agent ${Math.round(s.agent * 100)}%`)))),
        line(meta(`broker keeps ${money(s.brokerKeeps)} of the listing side · before fees, franchise cuts and tax`))] };
    }
  });
}
