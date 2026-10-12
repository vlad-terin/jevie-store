// The numbers a campaign is judged by, as cards while they are typed, worked
// out on this Mac. Words may name each number, or the order is as shown:
//
//   "roas revenue 5000 spend 1200"        return on ad spend
//   "cac spend 12000 customers 300"       cost to get a customer
//   "ctr 120 clicks 8000 impressions"     click-through rate
//   "cpc spend 900 clicks 1500"           cost per click
//   "cpm spend 1200 impressions 400k"     cost per thousand impressions
//   "conversion 45 of 1200"               conversion rate
//   "ltv 50 a month 24 months 70% margin" lifetime value (and against a CAC: "… cac 300")

const num = s => { const m = String(s).toLowerCase().replace(/[$€£,]/g, '').match(/^(\d*\.?\d+)([kmb])?$/); return m ? Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] ?? 1) : NaN; };
const N = '[$€£]?\\d[\\d,]*\\.?\\d*[kmb]?';
export const PATTERN = `^(?:roas|cac|ctr|cpc|cpm|cpa|conversion(?:\\s+rate)?|cvr|ltv|clv)\\b.*${N}.*$`;
const money = n => n >= 100 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`;

/// The numbers in order, and the ones named ("spend 1200").
export function numbers(said) {
  const t = String(said).toLowerCase();
  const named = {};
  for (const m of t.matchAll(new RegExp(`(revenue|spend|cost|customers|clicks|impressions|views|conversions|visitors|margin|cac|months?|a\\s+month|monthly|per\\s+month)\\s*(${N})|(${N})\\s*%?\\s*(revenue|spend|customers|clicks|impressions|views|conversions|visitors|margin|months?|a\\s+month|monthly|per\\s+month)`, 'g'))) {
    const key = (m[1] ?? m[4]).replace(/\s+/g, ' ').replace(/^months?$/, 'months').replace(/^(?:a month|monthly|per month)$/, 'monthly');
    named[key] = num(m[2] ?? m[3]);
  }
  const all = [...t.matchAll(new RegExp(N, 'g'))].map(m => num(m[0])).filter(Number.isFinite);
  return { named, all, of: t.match(new RegExp(`(${N})\\s+(?:of|out\\s+of|/)\\s+(${N})`))?.slice(1).map(num) ?? null };
}

export function metric(said) {
  const kind = String(said).trim().toLowerCase().match(/^(roas|cac|ctr|cpc|cpm|cpa|conversion(?:\s+rate)?|cvr|ltv|clv)/)?.[1].replace(/\s+rate$/, '');
  const { named: n, all, of } = numbers(said);
  const pick = (key, i) => n[key] ?? all[i];
  switch (kind) {
    case 'roas': { const rev = pick('revenue', 0), spend = pick('spend', 1) ?? n.cost; if (!(rev > 0 && spend > 0)) return null; const r = rev / spend; return { kind: 'ROAS', value: `${r.toFixed(2)}×`, sub: `${money(rev)} back on ${money(spend)} · ${r >= 4 ? 'strong' : r >= 2 ? 'healthy for many' : r >= 1 ? 'breaking even before costs' : 'losing money'}`, copy: `ROAS ${r.toFixed(2)}×` }; }
    case 'cac': case 'cpa': { const spend = pick('spend', 0) ?? n.cost, customers = n.customers ?? n.conversions ?? all[1]; if (!(spend > 0 && customers > 0)) return null; const c = spend / customers; return { kind: kind.toUpperCase(), value: money(c), sub: `${money(spend)} for ${customers.toLocaleString('en-US')} ${kind === 'cac' ? 'customers' : 'conversions'}`, copy: `${kind.toUpperCase()} ${money(c)}` }; }
    case 'ctr': { const clicks = n.clicks ?? all[0], imp = n.impressions ?? n.views ?? all[1]; if (!(clicks >= 0 && imp > 0)) return null; const r = clicks / imp; return { kind: 'CTR', value: `${(r * 100).toFixed(2)}%`, sub: `${clicks.toLocaleString('en-US')} clicks of ${imp.toLocaleString('en-US')} impressions`, copy: `CTR ${(r * 100).toFixed(2)}%` }; }
    case 'cpc': { const spend = pick('spend', 0), clicks = n.clicks ?? all[1]; if (!(spend > 0 && clicks > 0)) return null; return { kind: 'CPC', value: money(spend / clicks), sub: `${money(spend)} for ${clicks.toLocaleString('en-US')} clicks`, copy: `CPC ${money(spend / clicks)}` }; }
    case 'cpm': { const spend = pick('spend', 0), imp = n.impressions ?? n.views ?? all[1]; if (!(spend > 0 && imp > 0)) return null; return { kind: 'CPM', value: money(spend / imp * 1000), sub: `${money(spend)} for ${imp.toLocaleString('en-US')} impressions`, copy: `CPM ${money(spend / imp * 1000)}` }; }
    case 'conversion': case 'cvr': { const [a, b] = of ?? [n.conversions ?? all[0], n.visitors ?? n.clicks ?? all[1]]; if (!(a >= 0 && b > 0)) return null; return { kind: 'Conversion', value: `${(a / b * 100).toFixed(2)}%`, sub: `${a.toLocaleString('en-US')} of ${b.toLocaleString('en-US')}`, copy: `Conversion ${(a / b * 100).toFixed(2)}%` }; }
    case 'ltv': case 'clv': { const monthly = n.monthly ?? all[0], months = n.months ?? all[1], margin = (n.margin ?? 100) / 100, cac = n.cac ?? null; if (!(monthly > 0 && months > 0)) return null; const v = monthly * months * margin; return { kind: 'LTV', value: money(v), sub: `${money(monthly)} a month × ${months} months × ${Math.round(margin * 100)}% margin${cac ? ` · LTV:CAC ${(v / cac).toFixed(1)}:1 ${v / cac >= 3 ? '(healthy)' : '(under 3:1)'}` : ''}`, copy: `LTV ${money(v)}${cac ? `, LTV:CAC ${(v / cac).toFixed(1)}:1` : ''}` }; }
  }
  return null;
}

export default function adMetrics(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'ad-metric', label: 'Ad metric', symbol: 'chart.bar.xaxis', match: { pattern: PATTERN }, examples: ['roas revenue 5000 spend 1200', 'ctr 120 clicks 8000 impressions'],
    async render(said) {
      const m = metric(said);
      if (!m) return { summary: 'Ad metric', complete: 0, body: [line(meta('Name the numbers, like “roas revenue 5000 spend 1200” or “cac spend 12000 customers 300”'))] };
      return { summary: `${m.kind} ${m.value}`, copy: m.copy, complete: 1, body: [spread(stack('leading', line(hero(m.value))), stack('trailing', line(chip(m.kind, 'chart.bar.xaxis')))), line(meta(m.sub))] };
    }
  });
}
