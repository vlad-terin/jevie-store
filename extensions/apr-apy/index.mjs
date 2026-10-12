// Rates, as a card while they are typed, worked out on this Mac:
// APY = (1 + APR ÷ n)^n − 1, n the compoundings a year (12 unless named).
//
//   "apr to apy 5%", "apr 5% daily", "apy 5.12% to apr", "apy to apr 4.5% quarterly"

const FREQ = '(?:daily|monthly|quarterly|yearly|annually|semiannually|weekly|continuously)';
export const PATTERN = `^(?:apr|apy)(?:\\s+to\\s+(?:apr|apy))?\\s+[\\d.]+\\s*%(?:\\s+to\\s+(?:apr|apy))?(?:\\s+(?:compounded\\s+)?${FREQ})?$`;
const N = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, semiannually: 2, yearly: 1, annually: 1 };
export function convert(said) {
  const t = String(said).toLowerCase(); const rate = Number(t.match(/([\d.]+)\s*%/)[1]) / 100;
  const freq = t.match(new RegExp(FREQ))?.[0] ?? 'monthly';
  const fromApy = /^apy/.test(t) && !/^apy\s+to\s+apy/.test(t) || /to\s+apr/.test(t);
  const cont = freq === 'continuously', n = N[freq];
  const apy = fromApy ? rate : cont ? Math.exp(rate) - 1 : (1 + rate / n) ** n - 1;
  const apr = fromApy ? (cont ? Math.log(1 + rate) : n * ((1 + rate) ** (1 / n) - 1)) : rate;
  return { fromApy, freq, apr, apy };
}

export default function aprApy(jevie) {
  const { line, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'apr-apy', label: 'APR ↔ APY', symbol: 'percent', match: { pattern: PATTERN }, examples: ['apr to apy 5%'],
    async render(said) {
      const c = convert(said);
      const p = x => `${(x * 100).toFixed(3)}%`;
      const summary = c.fromApy ? `APY ${p(c.apy)} = APR ${p(c.apr)} compounded ${c.freq}` : `APR ${p(c.apr)} compounded ${c.freq} = APY ${p(c.apy)}`;
      return { summary, copy: c.fromApy ? p(c.apr) : p(c.apy), complete: 1, body: [pair(stack('leading', line(hero(p(c.apr), !c.fromApy)), line(chip('APR'))), icon('arrow.left.arrow.right'), stack('trailing', line(hero(p(c.apy), c.fromApy)), line(chip('APY', 'percent')))), line(meta(`compounded ${c.freq} · APY = (1 + APR ÷ n)^n − 1 · savings quote APY, loans APR`))] };
    }
  });
}
