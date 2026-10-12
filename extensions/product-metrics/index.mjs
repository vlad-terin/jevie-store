// Product sums, as cards while they are typed, worked out on this Mac:
//
//   "rice reach 2000 impact 2 confidence 80% effort 3"   reach × impact × confidence ÷ effort
//   "nps 120 promoters 40 passives 30 detractors"        % promoters − % detractors
//   "churn 40 of 1200", "churn 40 of 1200 monthly"       the rate, retention, and the year it implies
//   "capacity 5 people 10 days 70%"                      person-days at a focus factor, less days off

const N = '[\\d,.]+\\s*[km]?';
export const RICE = `^rice\\s+(?:reach\\s+)?${N}\\s+(?:impact\\s+)?[\\d.]+\\s+(?:confidence\\s+)?[\\d.]+\\s*%?\\s+(?:effort\\s+)?[\\d.]+(?:\\s*(?:person[\\s-]?)?(?:months?|weeks?|pm))?$`;
export const NPS = '^nps\\s+\\d+\\s+promoters?\\s+\\d+\\s+passives?\\s+\\d+\\s+detractors?$|^nps\\s+\\d+\\s*%?\\s+promoters?\\s+\\d+\\s*%?\\s+detractors?$';
export const CHURN = `^churn\\s+${N}\\s+(?:of|out\\s+of|/)\\s+${N}(?:\\s+(?:a\\s+)?(?:month|monthly|year|yearly|annually|quarter|quarterly))?$`;
export const CAPACITY = '^(?:sprint\\s+)?capacity\\s+\\d+\\s+(?:people|devs?|engineers?|members?)\\s+\\d+\\s+days?(?:\\s+\\d+\\s*%)?(?:\\s+\\d+\\s+days?\\s+off)?$';
const num = s => { const m = String(s).replace(/[,\s]/g, '').toLowerCase().match(/^([\d.]+)([km])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] ?? 1) : NaN; };

export function rice(said) {
  const nums = [...String(said).toLowerCase().matchAll(new RegExp(N, 'g'))].map(m => num(m[0])).filter(Number.isFinite);
  if (nums.length < 4) return null;
  const [reach, impact, conf, effort] = nums; const confidence = conf > 1 ? conf / 100 : conf;
  return effort > 0 ? { reach, impact, confidence, effort, score: reach * impact * confidence / effort } : null;
}
export function nps(said) {
  const t = String(said).toLowerCase();
  if (/passives?/.test(t)) { const [p, pa, d] = (t.match(/\d+/g) ?? []).map(Number); const n = p + pa + d; return n ? { promoters: p / n, passives: pa / n, detractors: d / n, n, score: Math.round((p - d) / n * 100) } : null; }
  const [p, d] = (t.match(/\d+/g) ?? []).map(Number); return { promoters: p / 100, detractors: d / 100, score: Math.round(p - d) };
}
export function churn(said) {
  const t = String(said).toLowerCase();
  const m = t.match(new RegExp(`(${N})\\s+(?:of|out\\s+of|/)\\s+(${N})`)); if (!m) return null;
  const lost = num(m[1]), base = num(m[2]); if (!(base > 0)) return null;
  const rate = lost / base;
  const period = /quarter/.test(t) ? 'quarter' : /year|annual/.test(t) ? 'year' : 'month';
  const perYear = period === 'month' ? 12 : period === 'quarter' ? 4 : 1;
  return { lost, base, rate, retention: 1 - rate, period, yearly: 1 - (1 - rate) ** perYear, lifetime: rate ? 1 / rate : Infinity };
}
export function capacity(said) {
  const t = String(said).toLowerCase();
  const people = Number(t.match(/(\d+)\s+(?:people|devs?|engineers?|members?)/)?.[1]), days = Number(t.match(/(\d+)\s+days?(?!\s+off)/)?.[1]);
  const focus = Number(t.match(/(\d+)\s*%/)?.[1] ?? 70) / 100, off = Number(t.match(/(\d+)\s+days?\s+off/)?.[1] ?? 0);
  if (!(people > 0 && days > 0)) return null;
  const raw = people * days - off;
  return { people, days, focus, off, raw, effective: raw * focus };
}
const pct = x => `${(x * 100).toFixed(1)}%`;

export default function productMetrics(jevie) {
  const { line, spread, stack, hero, chip, meta, halves } = jevie.CardParts;
  const ask = t => ({ summary: 'Product metric', complete: 0, body: [line(meta(t))] });
  jevie.registerCard({
    name: 'rice', label: 'RICE score', symbol: 'chart.bar.xaxis.ascending', match: { pattern: RICE }, examples: ['rice reach 2000 impact 2 confidence 80% effort 3'],
    async render(said) {
      const r = rice(said); if (!r) return ask('Type reach, impact, confidence and effort: “rice reach 2000 impact 2 confidence 80% effort 3”');
      const summary = `RICE ${Math.round(r.score).toLocaleString('en-US')} (${r.reach.toLocaleString('en-US')} × ${r.impact} × ${Math.round(r.confidence * 100)}% ÷ ${r.effort})`;
      return { summary, copy: String(Math.round(r.score)), complete: 1, body: [spread(stack('leading', line(hero(Math.round(r.score).toLocaleString('en-US'))), line(chip('RICE score', 'chart.bar.xaxis.ascending'))), stack('trailing', line(meta(`reach ${r.reach.toLocaleString('en-US')} · impact ${r.impact}`)), line(meta(`confidence ${Math.round(r.confidence * 100)}% · effort ${r.effort}`)))), line(meta('reach × impact × confidence ÷ effort · impact is usually 3, 2, 1, 0.5 or 0.25; effort in person-months'))] };
    }
  });
  jevie.registerCard({
    name: 'nps', label: 'NPS', symbol: 'hand.thumbsup', match: { pattern: NPS }, examples: ['nps 120 promoters 40 passives 30 detractors'],
    async render(said) {
      const n = nps(said); if (!n) return ask('Type promoters, passives and detractors: “nps 120 promoters 40 passives 30 detractors”');
      const summary = `NPS ${n.score > 0 ? '+' : ''}${n.score}${n.n ? ` from ${n.n} answers` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`${n.score > 0 ? '+' : ''}${n.score}`, n.score < 0)), line(chip(n.score >= 50 ? 'excellent' : n.score >= 30 ? 'great' : n.score >= 0 ? 'good' : 'needs work', 'hand.thumbsup'))), stack('trailing', line(meta(`${pct(n.promoters)} promoters`)), line(meta(`${pct(n.detractors)} detractors`)))), line(meta('% promoters (9–10) − % detractors (0–6), from −100 to +100'))] };
    }
  });
  jevie.registerCard({
    name: 'churn', label: 'Churn', symbol: 'person.crop.circle.badge.minus', match: { pattern: CHURN }, examples: ['churn 40 of 1200'],
    async render(said) {
      const c = churn(said); if (!c) return ask('Type lost and starting customers: “churn 40 of 1200”');
      const summary = `${pct(c.rate)} churn a ${c.period} (${pct(c.retention)} retained) · ${pct(c.yearly)} a year at this rate`;
      return { summary, copy: summary, complete: 1, body: [halves(stack('center', line(hero(pct(c.rate))), line(chip(`churn a ${c.period}`))), stack('center', line(hero(pct(c.retention), true)), line(chip('retained'))), stack('center', line(hero(pct(c.yearly), true)), line(chip('lost in a year')))), line(meta(`${c.lost.toLocaleString('en-US')} of ${c.base.toLocaleString('en-US')} · an average customer stays about ${Number.isFinite(c.lifetime) ? c.lifetime.toFixed(1) : '∞'} ${c.period}s`))] };
    }
  });
  jevie.registerCard({
    name: 'capacity', label: 'Sprint capacity', symbol: 'person.3.sequence', match: { pattern: CAPACITY }, examples: ['capacity 5 people 10 days 70%'],
    async render(said) {
      const c = capacity(said); if (!c) return ask('Type people and days: “capacity 5 people 10 days 70%”');
      const summary = `${Number(c.effective.toFixed(1))} focused person-days (${c.raw} available at ${Math.round(c.focus * 100)}% focus)`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(String(Number(c.effective.toFixed(1))))), line(chip('focused person-days', 'person.3.sequence'))), stack('trailing', line(meta(`${c.people} people × ${c.days} days${c.off ? ` − ${c.off} off` : ''}`)), line(meta(`× ${Math.round(c.focus * 100)}% focus`)))), line(meta('focus 70% unless named: meetings, reviews and interruptions take the rest'))] };
    }
  });
}
