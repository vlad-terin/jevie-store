// A citation from a DOI, as a card while it is typed: doi.org's content
// negotiation (Crossref, DataCite and mEDRA format it; no key), kept a month.
//
//   "cite 10.1038/nature12373", "cite 10.1038/nature12373 mla", "doi 10.1145/3292500.3330701 bibtex",
//   "cite https://doi.org/10.1016/j.cell.2020.04.011 vancouver"

export const PATTERN = '^(?:cite|citation|doi)\\s+(?:https?://(?:dx\\.)?doi\\.org/)?10\\.\\d{4,9}/\\S+(?:\\s+(?:apa|mla|chicago|harvard|ieee|vancouver|bibtex|bib|ris))?$';
export const STYLES = { apa: 'apa', mla: 'modern-language-association', chicago: 'chicago-author-date', harvard: 'harvard-cite-them-right', ieee: 'ieee', vancouver: 'vancouver' };
export function askedFor(said) {
  const t = String(said).trim();
  const doi = t.match(/(10\.\d{4,9}\/\S+)/)?.[1]?.replace(/[.,;]+$/, '');
  const style = t.toLowerCase().match(/\s(apa|mla|chicago|harvard|ieee|vancouver|bibtex|bib|ris)$/)?.[1] ?? 'apa';
  return doi ? { doi, style: style === 'bib' ? 'bibtex' : style } : null;
}

export default function doiCitation(jevie, context) {
  const { line, spread, title, text, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'doi', label: 'Citation', symbol: 'quote.bubble', match: { pattern: PATTERN }, examples: ['cite 10.1038/nature12373'],
    async render(said) {
      const a = askedFor(said);
      if (!a) return { summary: 'Citation', complete: 0, body: [line(meta('Type a DOI: “cite 10.1038/nature12373”'))] };
      const key = `${a.style}:${a.doi.toLowerCase()}`;
      const kept = (await context.state.get('citations').catch(() => null)) ?? {};
      let out = kept[key]?.at > Date.now() - 30 * 864e5 ? kept[key].text : null;
      if (!out) {
        const accept = a.style === 'bibtex' ? 'application/x-bibtex' : a.style === 'ris' ? 'application/x-research-info-systems' : `text/x-bibliography; style=${STYLES[a.style]}; locale=en-US`;
        const r = await fetch(`https://doi.org/${encodeURI(a.doi)}`, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { accept, 'user-agent': 'Jevie/1.0 (doi-citation extension)' } }).catch(() => null);
        if (!r) return { summary: 'Citation', complete: 0, error: true, body: [line(meta('doi.org did not answer · try again in a moment'))] };
        if (r.status === 404) return { summary: 'Citation', complete: 0, error: true, body: [line(meta(`No DOI ${a.doi}`))] };
        out = (await r.text()).trim();
        if (!r.ok || /^<!doctype|<html/i.test(out)) return { summary: 'Citation', complete: 0, error: true, body: [line(meta(`The registry of ${a.doi} formats no ${a.style.toUpperCase()} citation`))] };
        await context.state.set('citations', Object.fromEntries([...Object.entries(kept), [key, { at: Date.now(), text: out }]].slice(-200))).catch(() => {});
      }
      return { summary: out.replace(/\s+/g, ' ').slice(0, 200), copy: out, complete: 1, body: [spread(title(a.doi), chip(a.style.toUpperCase(), 'quote.bubble')), line(text(out.replace(/\s+/g, ' ').slice(0, 300))), line(meta('formatted by doi.org · check italics and capitals against your style guide · ↵ copies it'))] };
    }
  });
}
