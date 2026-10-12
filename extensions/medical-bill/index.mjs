// A bill after insurance, as a card while it is typed, worked out on this
// Mac the usual US way: the deductible first, then coinsurance on the rest,
// a copay on top, all capped at the out-of-pocket maximum. The deductible is
// what is left of it this year.
//
//   "medical bill 5000 deductible 1500 coinsurance 20%"
//   "medical bill 12000 deductible 2000 coinsurance 30% oop max 6000 copay 50"

const N = '\\$?[\\d,.]+\\s*k?';
export const PATTERN = `^(?:medical\\s+bill|hospital\\s+bill|insurance\\s+cost|what\\s+will\\s+i\\s+pay)\\s+${N}(?:\\s+deductible\\s+${N}(?:\\s+left)?|\\s+(?:coinsurance|coins)\\s+[\\d.]+\\s*%|\\s+(?:oop|out[\\s-]+of[\\s-]+pocket)(?:\\s+max(?:imum)?)?\\s+${N}(?:\\s+left)?|\\s+copay\\s+${N})+$`;
const num = s => { const m = String(s ?? '').replace(/[$,\s]/g, '').toLowerCase().match(/^([\d.]+)(k)?$/); return m ? Number(m[1]) * (m[2] ? 1000 : 1) : NaN; };
const pick = (t, re) => { const m = t.match(re); return m ? num(m[1]) : null; };
export function bill(said) {
  const t = String(said).toLowerCase();
  const total = pick(t, new RegExp(`^(?:medical\\s+bill|hospital\\s+bill|insurance\\s+cost|what\\s+will\\s+i\\s+pay)\\s+(${N})`)) ?? NaN;
  const ded = pick(t, new RegExp(`deductible\\s+(${N})`)) ?? 0, coins = Number(t.match(/(?:coinsurance|coins)\s+([\d.]+)/)?.[1] ?? 0) / 100;
  const oop = pick(t, new RegExp(`(?:oop|out[\\s-]+of[\\s-]+pocket)(?:\\s+max(?:imum)?)?\\s+(${N})`)), copay = pick(t, new RegExp(`copay\\s+(${N})`)) ?? 0;
  if (!(total > 0)) return null;
  const towardDed = Math.min(total, ded), coinsPart = (total - towardDed) * coins;
  const raw = towardDed + coinsPart + copay, you = oop !== null ? Math.min(raw, oop) : raw;
  return { total, ded, coins, oop, copay, towardDed, coinsPart, you, insurer: total - Math.min(you, total), capped: oop !== null && raw > oop };
}
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;

export default function medicalBill(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'medical-bill', label: 'Medical bill', symbol: 'cross.case', match: { pattern: PATTERN }, examples: ['medical bill 5000 deductible 1500 coinsurance 20%'],
    async render(said) {
      const b = bill(said);
      if (!b) return { summary: 'Medical bill', complete: 0, body: [line(meta('Type the bill and your plan: “medical bill 5000 deductible 1500 coinsurance 20%”'))] };
      const parts = [`deductible ${money(b.towardDed)}`, b.coins && `${Math.round(b.coins * 100)}% of ${money(b.total - b.towardDed)} = ${money(b.coinsPart)}`, b.copay && `copay ${money(b.copay)}`].filter(Boolean);
      return { summary: `You pay about ${money(b.you)} of ${money(b.total)}; insurance ${money(b.insurer)}${b.capped ? ' (capped at your out-of-pocket max)' : ''}`, copy: money(b.you), complete: 1, body: [spread(stack('leading', line(hero(money(b.you))), line(chip('you pay', 'cross.case'))), stack('trailing', line(hero(money(b.insurer), true)), line(chip('insurance pays')))), line(meta(`${parts.join(' + ')}${b.capped ? ` · capped at ${money(b.oop)}` : ''}`)), line(meta('on the allowed amount, in network · your plan\'s explanation of benefits is the real answer'))] };
    }
  });
}
