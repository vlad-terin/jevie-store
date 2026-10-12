// A book from its ISBN, as a card while it is typed: Open Library's books API
// (no key), kept a month. The check digit is checked first (ISBN-10 and -13).
//
//   "isbn 9780262033848", "isbn 0-262-03384-4"

export const PATTERN = '^isbn(?:-1[03])?\\s+[\\d\\s-]{9,17}[\\dxX]$';
export function valid(isbn) {
  const d = isbn.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(d)) return [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0 ? d : null;
  if (/^\d{9}[\dX]$/.test(d)) return [...d].reduce((s, c, i) => s + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 === 0 ? d : null;
  return null;
}

export default function isbnLookup(jevie, context) {
  const { line, spread, stack, title, chip, meta, text } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'ISBN', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  jevie.registerCard({
    name: 'isbn', label: 'Book', symbol: 'books.vertical', match: { pattern: PATTERN }, examples: ['isbn 9780262033848'],
    async render(said) {
      const isbn = valid(said.replace(/^isbn(?:-1[03])?\s+/i, ''));
      if (!isbn) return note('That is not a valid ISBN: its check digit does not add up', true);
      const kept = (await context.state.get('books').catch(() => null)) ?? {};
      let b = kept[isbn]?.at > Date.now() - 30 * 864e5 ? kept[isbn].b : undefined;
      if (b === undefined) {
        const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, { signal: AbortSignal.timeout(8000) }).then(x => x.ok ? x.json() : null).catch(() => null);
        if (!r) return note('Open Library did not answer · try again in a moment', true);
        const d = r[`ISBN:${isbn}`];
        b = d ? { title: d.title, subtitle: d.subtitle ?? null, authors: (d.authors ?? []).map(a => a.name), publisher: d.publishers?.[0]?.name ?? null, year: String(d.publish_date ?? '').match(/\d{4}/)?.[0] ?? null, pages: d.number_of_pages ?? null, url: d.url } : null;
        await context.state.set('books', Object.fromEntries([...Object.entries(kept), [isbn, { at: Date.now(), b }]].slice(-300))).catch(() => {});
      }
      if (!b) return note(`Open Library has no book with ISBN ${isbn}`, true);
      const authors = b.authors.length > 2 ? `${b.authors[0]} et al.` : b.authors.join(' & ');
      const cite = `${authors || 'Unknown'}${b.year ? ` (${b.year})` : ''}. ${b.title}${b.subtitle ? `: ${b.subtitle}` : ''}. ${b.publisher ?? ''}`.trim();
      return { summary: `${b.title}${authors ? `, ${authors}` : ''}${b.year ? ` (${b.year})` : ''}`, copy: cite, complete: 1, body: [
        spread(stack('leading', line(title(b.title)), line(meta(b.authors.join(', ') || 'author not given'))), chip(b.year ?? '—', 'books.vertical')),
        line(text([b.publisher, b.pages && `${b.pages} pages`, `ISBN ${isbn}`].filter(Boolean).join(' · '), true)),
        line(meta('Open Library · ↵ copies a simple citation'))] };
    }
  });
}
