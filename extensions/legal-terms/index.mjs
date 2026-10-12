// Legal terms in plain English, as a card while it is typed: a glossary kept
// in this extension (common-law usage), nothing sent anywhere. A plain
// summary, not legal advice.
//
//   "legal term res judicata", "legal force majeure", "legal mens rea"

export const TERMS = {
  'actus reus': 'The guilty act: the physical part of a crime, as opposed to the intent behind it.',
  'ad hoc': 'For this purpose only; arranged for one case or situation.',
  'affidavit': 'A written statement of facts sworn under oath, usable as evidence.',
  'amicus curiae': '"Friend of the court": someone not a party who offers a court information or argument.',
  'arbitration': 'Settling a dispute out of court before a neutral arbitrator whose decision is usually binding.',
  'bona fide': 'In good faith; genuine, without intent to deceive.',
  'breach of contract': 'Failing, without a legal excuse, to do what a contract requires.',
  'burden of proof': 'The duty to prove a claim; who carries it, and how far, depends on the case.',
  'caveat emptor': '"Let the buyer beware": the buyer must check what they buy, absent a warranty or fraud.',
  'cease and desist': 'A demand (a letter or an order) to stop an activity and not start it again.',
  'consideration': 'What each side gives or promises in a contract; without it most promises are not enforceable.',
  'de facto': 'In fact, in practice, whether or not by law.',
  'de jure': 'By law, by right, whether or not in practice.',
  'de minimis': 'Too small or trivial for the law to take into account.',
  'de novo': 'Anew: a fresh look, as if no earlier decision had been made.',
  'defendant': 'The party a lawsuit or a criminal charge is brought against.',
  'deposition': 'Sworn testimony taken outside court, before trial, recorded for later use.',
  'discovery': 'The pre-trial exchange of evidence and information between the parties.',
  'due diligence': 'The investigation a reasonable person makes before an agreement or a transaction.',
  'due process': 'Fair procedure the law owes a person before taking away life, liberty or property.',
  'estoppel': 'A rule stopping someone from going back on what they said or did when another relied on it.',
  'ex parte': 'By or for one party only, without the other present or told.',
  'ex post facto': 'After the fact; a law punishing something that was legal when it was done.',
  'fiduciary': 'Someone bound to act in another\'s best interest, such as a trustee or an agent.',
  'force majeure': 'A clause excusing performance when events beyond the parties\' control (war, disaster) prevent it.',
  'habeas corpus': '"You shall have the body": a demand that a detained person be brought before a court to test the detention.',
  'hearsay': 'An out-of-court statement offered to prove what it says; usually inadmissible, with many exceptions.',
  'in camera': 'In private, in the judge\'s chambers, without the public.',
  'in perpetuity': 'Forever; with no end date.',
  'indemnify': 'To promise to cover another\'s loss or liability arising from something.',
  'injunction': 'A court order to do, or stop doing, something.',
  'inter alia': 'Among other things.',
  'ipso facto': 'By that very fact; as a direct result.',
  'jurisdiction': 'A court\'s power to hear a case, or the area where a law applies.',
  'liquidated damages': 'An amount fixed in a contract in advance as compensation for a breach.',
  'locus standi': 'Standing: the right to bring a case, because one is affected by it.',
  'mens rea': 'The guilty mind: the intent or knowledge a crime requires.',
  'mitigation': 'Reducing a loss; a wronged party must take reasonable steps to limit its damages.',
  'motion': 'A formal request asking a court for a ruling or an order.',
  'nolo contendere': '"I do not wish to contend": a plea that accepts punishment without admitting guilt.',
  'non-compete': 'A clause stopping someone from working for or as a competitor for a time and area.',
  'non-disclosure agreement': 'A contract to keep certain information confidential (an NDA).',
  'per curiam': 'By the court as a whole, rather than an opinion signed by one judge.',
  'per se': 'In itself; by its very nature, without needing more proof.',
  'plaintiff': 'The party who brings a civil lawsuit.',
  'precedent': 'An earlier decision a court follows in a later case with similar facts.',
  'prima facie': 'At first sight: enough evidence to prove a fact unless rebutted.',
  'pro bono': 'For the public good: legal work done without charge.',
  'pro rata': 'In proportion; shared according to each one\'s part.',
  'quantum meruit': '"As much as he deserved": payment for the reasonable value of work done without a full contract.',
  'quid pro quo': 'Something given in exchange for something else.',
  'res ipsa loquitur': '"The thing speaks for itself": negligence inferred because the accident would not happen without it.',
  'res judicata': 'A matter already judged: a final decision bars the same parties from suing again on the same claim.',
  'severability': 'A clause keeping the rest of a contract in force if one part is found invalid.',
  'statute of limitations': 'The deadline for bringing a claim or a charge; after it, the claim is barred.',
  'stare decisis': '"To stand by things decided": courts follow precedent.',
  'subpoena': 'A court order to appear and testify, or to hand over documents (subpoena duces tecum).',
  'tort': 'A civil wrong causing harm (negligence, defamation, trespass) other than a breach of contract.',
  'ultra vires': '"Beyond the powers": an act outside the authority given by law or a charter.',
  'voir dire': 'Questioning potential jurors (or a witness) to decide whether they are fit to serve.',
  'waiver': 'Giving up a right knowingly and on purpose.',
  'warranty': 'A promise that a fact is true or a product will work as described.',
  'without prejudice': 'Said or offered without giving up rights; in settlement talks, not usable as an admission.'
};
export const LATIN = new Set(['actus reus', 'ad hoc', 'amicus curiae', 'bona fide', 'caveat emptor', 'de facto', 'de jure', 'de minimis', 'de novo', 'ex parte', 'ex post facto', 'habeas corpus', 'in camera', 'in perpetuity', 'inter alia', 'ipso facto', 'locus standi', 'mens rea', 'nolo contendere', 'per curiam', 'per se', 'prima facie', 'pro bono', 'pro rata', 'quantum meruit', 'quid pro quo', 'res ipsa loquitur', 'res judicata', 'stare decisis', 'subpoena', 'ultra vires']);
const NAMES = Object.keys(TERMS).sort((a, b) => b.length - a.length);
// "what does … mean" is Jevie's own Define card's; this answers to "legal …".
export const PATTERN = `^(?:legal\\s+(?:term\\s+)?|law\\s+term\\s+)(?:${NAMES.map(n => n.replace(/[-]/g, '[\\s-]')).join('|')})(?:\\s+mean)?(?:\\s+in\\s+law)?\\??$`;

export const termIn = said => { const t = String(said).toLowerCase().replace(/[?]/g, '').replace(/-/g, ' '); return NAMES.find(n => t.includes(n.replace(/-/g, ' '))) ?? null; };

export default function legalTerms(jevie) {
  const { line, spread, title, text, meta, chip } = jevie.CardParts;
  jevie.registerCard({
    name: 'legal-term', label: 'Legal term', symbol: 'building.columns.circle', match: { pattern: PATTERN }, examples: ['legal term res judicata', 'legal term force majeure'],
    async render(said) {
      const term = termIn(said);
      if (!term) return { summary: 'Legal term', complete: 0, body: [line(meta(`Knows ${NAMES.length} terms, like res judicata, force majeure, estoppel`))] };
      return { summary: `${term}: ${TERMS[term]}`, copy: `${term}: ${TERMS[term]}`, complete: 1, body: [
        spread(title(term.replace(/^\w/, c => c.toUpperCase())), chip(LATIN.has(term) ? 'Latin' : 'term of art', 'building.columns.circle')),
        line(text(TERMS[term])), line(meta('a plain summary of common-law usage, not legal advice'))] };
    }
  });
}
