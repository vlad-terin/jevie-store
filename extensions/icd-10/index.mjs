// ICD-10-CM, as a card while it is typed: the National Library of
// Medicine's Clinical Tables API, no key, kept a week. A code finds its
// name; words find the codes.
//
//   "icd10 asthma", "icd-10 type 2 diabetes", "icd J45.909"

export const PATTERN = '^(?:icd|icd10|icd-10|icd 10)(?:-?cm)?\\s+\\S.*$';
export const isCode = t => /^[a-z]\d{2}(?:\.\w{1,4})?$/i.test(t.trim());

export function cardOf(q, rows, total, P) {
  const { line, spread, title, mono, meta, chip, list } = P;
  const [code, name] = rows[0];
  const summary = `${code} ${name}`;
  return { summary, copy: code, complete: 1, body: [
    spread(title(name.length > 70 ? `${name.slice(0, 68)}…` : name), chip(code, 'list.clipboard')),
    ...(rows.length > 1 ? [list(rows.slice(1, 6).map(([c, n]) => `${c}  ${n}`))] : []),
    line(meta(`${total > rows.length ? `${total} codes match · ` : ''}ICD-10-CM via NLM · ↵ copies ${code}`))
  ] };
}

export default function icd10(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'ICD-10', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'icd10', label: 'ICD-10', symbol: 'list.clipboard', match: { pattern: PATTERN }, examples: ['icd10 asthma', 'icd J45.909'],
    async render(said) {
      const q = said.trim().replace(/^(?:icd|icd10|icd-10|icd 10)(?:-?cm)?\s+/i, '');
      const key = q.toLowerCase();
      const kept = (await context.state.get('codes').catch(() => null)) ?? {};
      let hit = kept[key]?.at > Date.now() - 7 * 864e5 ? kept[key] : null;
      if (!hit) {
        const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=${isCode(q) ? 'code' : 'code,name'}&terms=${encodeURIComponent(q)}&maxList=6`;
        const body = await fetch(url, { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (!body) return note('The NLM did not answer · try again in a moment', true);
        hit = { at: Date.now(), total: body[0], rows: body[3] ?? [] };
        await context.state.set('codes', Object.fromEntries([...Object.entries(kept), [key, hit]].slice(-300))).catch(() => {});
      }
      return hit.rows.length ? cardOf(q, hit.rows, hit.total, P) : note(`No ICD-10-CM code for “${q}”`, true);
    }
  });
}
