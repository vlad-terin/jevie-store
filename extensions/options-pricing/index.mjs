// A European option by Black-Scholes, as a card while it is typed, worked
// out on this Mac: the fair price, delta, gamma, theta (a day), vega (a
// point of volatility), and the breakeven at expiry.
//
//   "call 100 strike 105 30 days 25% vol", "put 50 strike 45 60 days 40% vol 4% rate"
//   (spot first; rate 4% unless named; dividends not counted)

const N = '\\$?[\\d,.]+';
export const PATTERN = `^(call|put)\\s+(?:spot\\s+)?${N}\\s+strike\\s+${N}\\s+\\d+(?:\\.\\d+)?\\s*(?:days?|d)\\s+[\\d.]+\\s*%\\s*(?:vol|iv|volatility)(?:\\s+[\\d.]+\\s*%\\s*rate)?$`;
const cdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const pdf = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

export function blackScholes({ type, S, K, T, sigma, r }) {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T)), d2 = d1 - sigma * Math.sqrt(T);
  const call = type === 'call';
  const price = call ? S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2) : K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1);
  const delta = call ? cdf(d1) : cdf(d1) - 1;
  const gamma = pdf(d1) / (S * sigma * Math.sqrt(T));
  const theta = (-(S * pdf(d1) * sigma) / (2 * Math.sqrt(T)) + (call ? -1 : 1) * r * K * Math.exp(-r * T) * cdf(call ? d2 : -d2)) / 365;
  const vega = S * pdf(d1) * Math.sqrt(T) / 100;
  return { price, delta, gamma, theta, vega, breakeven: call ? K + price : K - price, itm: call ? S > K : S < K };
}
export function read(said) {
  const t = String(said).trim().toLowerCase().replace(/[$,]/g, '');
  const m = t.match(/^(call|put)\s+(?:spot\s+)?([\d.]+)\s+strike\s+([\d.]+)\s+([\d.]+)\s*(?:days?|d)\s+([\d.]+)\s*%\s*(?:vol|iv|volatility)(?:\s+([\d.]+)\s*%\s*rate)?$/);
  if (!m) return null;
  const o = { type: m[1], S: Number(m[2]), K: Number(m[3]), T: Number(m[4]) / 365, sigma: Number(m[5]) / 100, r: (m[6] ? Number(m[6]) : 4) / 100, days: Number(m[4]) };
  return o.S > 0 && o.K > 0 && o.T > 0 && o.sigma > 0 ? o : null;
}

export default function optionsPricing(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'option', label: 'Option price', symbol: 'chart.xyaxis.line', match: { pattern: PATTERN }, examples: ['call 100 strike 105 30 days 25% vol'],
    async render(said) {
      const o = read(said);
      if (!o) return { summary: 'Option price', complete: 0, body: [line(meta('Type call or put, spot, strike, days and volatility: “call 100 strike 105 30 days 25% vol”'))] };
      const g = blackScholes(o);
      const summary = `${o.type} ${o.K} (spot ${o.S}, ${o.days}d, ${(o.sigma * 100).toFixed(0)}% vol): $${g.price.toFixed(2)} · delta ${g.delta.toFixed(2)}`;
      return { summary, copy: summary, complete: 1, body: [
        spread(stack('leading', line(hero(`$${g.price.toFixed(2)}`)), line(chip(`${o.type} · ${g.itm ? 'in the money' : 'out of the money'}`, 'chart.xyaxis.line'))), stack('trailing', line(hero(`Δ ${g.delta.toFixed(2)}`, true)), line(chip(`breakeven ${g.breakeven.toFixed(2)}`)))),
        line(chip(`Γ ${g.gamma.toFixed(4)}`), chip(`Θ ${g.theta.toFixed(3)}/day`), chip(`vega ${g.vega.toFixed(3)}`)),
        line(meta(`Black-Scholes · European · ${(o.r * 100).toFixed(1)}% rate · no dividends · a model price, not a quote`))] };
    }
  });
}
