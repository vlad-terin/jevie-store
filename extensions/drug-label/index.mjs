// A medicine's US label, as a card while it is typed: openFDA's drug label
// API (no key), the most recent label for the name, kept a day. Reference,
// not advice: the card says so and links the full label.
//
//   "drug ibuprofen", "drug lipitor", "fda label metformin"

export const PATTERN = '^(?:drug|medication|fda\\s+label|rx)\\s+[a-z][a-z0-9 -]{2,40}$';
const first = (field, n = 180) => { const t = String(Array.isArray(field) ? field[0] : field ?? '').replace(/\s+/g, ' ').replace(/^(?:\d+(?:\.\d+)?\s+)?(?:INDICATIONS(?: AND|\s*&)? USAGE|PURPOSE|USES?)\s*:?\s*/i, '').trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t; };

export function read(label) {
  const o = label.openfda ?? {};
  return { brand: (o.brand_name ?? [])[0] ?? null, generic: (o.generic_name ?? [])[0] ?? null, route: (o.route ?? []).join(', ') || null, form: (o.dosage_form ?? [])[0] ?? null,
    maker: (o.manufacturer_name ?? [])[0] ?? null, rx: (o.product_type ?? [])[0]?.includes('PRESCRIPTION') ? 'prescription' : (o.product_type ?? [])[0]?.includes('OTC') ? 'over the counter' : null,
    use: first(label.indications_and_usage ?? label.purpose ?? label.uses), boxed: Boolean(label.boxed_warning), boxedText: first(label.boxed_warning, 120), set: label.set_id ?? null };
}

export function cardOf(name, d, P) {
  const { line, spread, stack, title, text, chip, meta } = P;
  const shown = d.brand ?? d.generic ?? name;
  const both = d.generic && d.brand && d.generic.toLowerCase() !== d.brand.toLowerCase();
  const summary = `${shown}${both ? ` (${d.generic.toLowerCase()})` : ''}: ${d.use || 'no indication on the label'}`;
  return { summary: summary.slice(0, 200), copy: d.set ? `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${d.set}` : summary, complete: 1, body: [
    spread(stack('leading', line(title(shown)), line(meta(both ? d.generic : d.maker ?? ''))), stack('trailing', line(chip(d.rx ?? 'label', 'pills')), line(meta([d.form, d.route].filter(Boolean).join(' · ').toLowerCase())))),
    line(text(d.use || 'The label gives no indication.', !d.use)),
    ...(d.boxed ? [line(chip('Boxed warning', 'exclamationmark.triangle'), meta(d.boxedText))] : []),
    line(meta(`${d.maker ? `${d.maker} · ` : ''}FDA label via openFDA · reference, not medical advice · ↵ copies the DailyMed link`))
  ] };
}

export default function drugLabel(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Drug label', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'drug', label: 'Drug label', symbol: 'pills', match: { pattern: PATTERN }, examples: ['drug ibuprofen', 'drug metformin'],
    async render(said) {
      const name = said.trim().replace(/^(?:drug|medication|fda\s+label|rx)\s+/i, '').toLowerCase();
      const kept = (await context.state.get('labels').catch(() => null)) ?? {};
      if (kept[name] && Date.now() - kept[name].at < 864e5) return kept[name].d ? cardOf(name, kept[name].d, P) : note(`No US label found for ${name}`, true);
      const q = `(openfda.generic_name:"${name}"+openfda.brand_name:"${name}")`;
      const r = await fetch(`https://api.fda.gov/drug/label.json?search=${encodeURIComponent(q).replace(/%2B/g, '+')}&limit=1&sort=effective_time:desc`, { signal: AbortSignal.timeout(7000) }).catch(() => null);
      if (!r) return note('openFDA did not answer · try again in a moment', true);
      const body = r.ok ? await r.json().catch(() => null) : null;
      const d = body?.results?.[0] ? read(body.results[0]) : null;
      await context.state.set('labels', Object.fromEntries([...Object.entries(kept), [name, { at: Date.now(), d }]].slice(-200))).catch(() => {});
      return d ? cardOf(name, d, P) : note(`No US label found for ${name}`, true);
    }
  });
}
