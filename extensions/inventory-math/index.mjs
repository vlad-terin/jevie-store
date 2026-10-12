// Stock sums, as cards while they are typed, worked out on this Mac:
//
//   "reorder point 20 a day lead 7 days safety 50"    use × lead time + safety stock
//   "eoq demand 1200 order cost 50 holding 2"         √(2 × annual demand × cost an order ÷ holding a unit a year)

export const ROP = '^reorder\\s+point\\s+[\\d.]+\\s*(?:a|per|/)\\s*day\\s+lead(?:\\s+time)?\\s+[\\d.]+\\s*days?(?:\\s+safety(?:\\s+stock)?\\s+[\\d.]+)?$';
export const EOQ = '^(?:eoq|economic\\s+order\\s+quantity)\\s+(?:demand\\s+)?[\\d,.]+(?:\\s*(?:a|per|/)\\s*year)?\\s+(?:order(?:ing)?\\s+cost|setup)\\s+\\$?[\\d.]+\\s+(?:holding|carrying)(?:\\s+cost)?\\s+\\$?[\\d.]+$';
export function rop(said) { const t = String(said).toLowerCase(); const use = Number(t.match(/point\s+([\d.]+)/)[1]), lead = Number(t.match(/lead(?:\s+time)?\s+([\d.]+)/)[1]), safety = Number(t.match(/safety(?:\s+stock)?\s+([\d.]+)/)?.[1] ?? 0); return { use, lead, safety, point: Math.ceil(use * lead + safety) }; }
export function eoq(said) { const t = String(said).toLowerCase().replace(/,/g, ''); const D = Number(t.match(/(?:eoq|quantity)\s+(?:demand\s+)?([\d.]+)/)[1]), S = Number(t.match(/(?:order(?:ing)?\s+cost|setup)\s+\$?([\d.]+)/)[1]), H = Number(t.match(/(?:holding|carrying)(?:\s+cost)?\s+\$?([\d.]+)/)[1]); if (!(D > 0 && S > 0 && H > 0)) return null; const q = Math.sqrt(2 * D * S / H); return { D, S, H, q, orders: D / q, cost: (D / q) * S + (q / 2) * H }; }

export default function inventoryMath(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'reorder-point', label: 'Reorder point', symbol: 'shippingbox', match: { pattern: ROP }, examples: ['reorder point 20 a day lead 7 days safety 50'],
    async render(said) {
      const r = rop(said);
      const summary = `Reorder at ${r.point} units (${r.use} a day × ${r.lead} days${r.safety ? ` + ${r.safety} safety` : ''})`;
      return { summary, copy: String(r.point), complete: 1, body: [spread(stack('leading', line(hero(String(r.point))), line(chip('reorder at', 'shippingbox'))), stack('trailing', line(meta(`${r.use * r.lead} used in the lead time`)), line(meta(r.safety ? `+ ${r.safety} safety stock` : 'no safety stock')))), line(meta('order when stock on hand falls to this · safety stock covers a slow delivery or a busy week'))] };
    }
  });
  jevie.registerCard({
    name: 'eoq', label: 'Order quantity', symbol: 'cart', match: { pattern: EOQ }, examples: ['eoq demand 1200 order cost 50 holding 2'],
    async render(said) {
      const e = eoq(said);
      if (!e) return { summary: 'Order quantity', complete: 0, body: [line(meta('Type yearly demand, cost an order and holding cost a unit: “eoq demand 1200 order cost 50 holding 2”'))] };
      const summary = `Order ${Math.round(e.q)} at a time, ${e.orders.toFixed(1)} orders a year, $${e.cost.toFixed(0)} a year in ordering and holding`;
      return { summary, copy: String(Math.round(e.q)), complete: 1, body: [spread(stack('leading', line(hero(String(Math.round(e.q)))), line(chip('units an order', 'cart'))), stack('trailing', line(meta(`${e.orders.toFixed(1)} orders a year`)), line(meta(`$${e.cost.toFixed(0)} a year`)))), line(meta(`√(2 × ${e.D} × ${e.S} ÷ ${e.H}) · holding is the cost to keep one unit a year`))] };
    }
  });
}
