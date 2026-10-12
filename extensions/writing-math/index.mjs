// Writing sums, as cards while they are typed, worked out on this Mac:
//
//   "pages 2500 words", "pages 80000 words manuscript"   double-spaced (250 a page), single (500), a paperback (300)
//   "translation 2500 words at 0.12", "fee 1800 words at 0.25"   the fee at a rate per word, and a day's output

export const PAGES = '^(?:pages|page\\s+count)\\s+[\\d,]+\\s*k?\\s+words(?:\\s+(?:manuscript|novel|book|essay|paper))?$';
export const FEE = '^(?:translation|translate\\s+fee|writing\\s+fee|fee|cost)\\s+[\\d,]+\\s*k?\\s+words\\s+at\\s+\\$?[\\d.]+(?:\\s*(?:a|per)\\s+word)?$';
const words = t => { const m = String(t).toLowerCase().match(/([\d,]+)\s*(k)?\s+words/); return m ? Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) : NaN; };

export default function writingMath(jevie) {
  const { line, halves, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'pages', label: 'Pages', symbol: 'doc.richtext', match: { pattern: PAGES }, examples: ['pages 2500 words'],
    async render(said) {
      const w = words(said);
      if (!(w > 0)) return { summary: 'Pages', complete: 0, body: [line(meta('Type a word count: “pages 2500 words”'))] };
      const d = Math.ceil(w / 250), s = Math.ceil(w / 500), p = Math.ceil(w / 300);
      const summary = `${w.toLocaleString('en-US')} words: ${d} pages double-spaced, ${s} single-spaced, about ${p} in a paperback`;
      return { summary, copy: summary, complete: 1, body: [halves(stack('center', line(hero(String(d))), line(chip('double-spaced'))), stack('center', line(hero(String(s))), line(chip('single-spaced'))), stack('center', line(hero(String(p), true)), line(chip('paperback')))), line(meta(`${w.toLocaleString('en-US')} words · 250, 500 and 300 words a page · ${Math.round(w / 238)} min to read`))] };
    }
  });
  jevie.registerCard({
    name: 'word-fee', label: 'Word rate', symbol: 'dollarsign.circle', match: { pattern: FEE }, examples: ['translation 2500 words at 0.12'],
    async render(said) {
      const w = words(said), rate = Number(said.match(/at\s+\$?([\d.]+)/)[1]);
      if (!(w > 0 && rate > 0)) return { summary: 'Word rate', complete: 0, body: [line(meta('Type words and a rate: “translation 2500 words at 0.12”'))] };
      const fee = w * rate, days = w / 2500;
      const summary = `$${fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${w.toLocaleString('en-US')} words at $${rate} a word`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(`$${fee.toLocaleString('en-US', { maximumFractionDigits: 2 })}`)), line(chip(`at $${rate} a word`, 'dollarsign.circle'))), stack('trailing', line(meta(`${w.toLocaleString('en-US')} words`)), line(meta(`≈ ${days < 1 ? 'under a day' : `${days.toFixed(1)} days`} at 2,500 a day`)))), line(meta('a translator often manages 2,000–3,000 words a day'))] };
    }
  });
}
