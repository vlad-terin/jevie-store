// A card under Jevie's field while a line is typed: "nato hello" spells a
// word in the NATO alphabet. Replace the words, the render and the manifest.
const NATO = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu'.split(' ');

export default function natoCard(jevie) {
  const { line, title, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'nato', label: 'NATO alphabet', symbol: 'textformat.abc',
    match: { words: ['nato', 'spell nato'] },   // decided in code, on every keystroke
    examples: ['nato hello'],
    async render(text) {                        // when typing pauses
      const word = text.replace(/^(?:spell\s+)?nato\s*/i, '').trim();
      if (!word) return { summary: 'NATO alphabet', complete: 0, body: [line(meta('Type a word after it'))] };
      const spelled = [...word.toUpperCase()].map(c => NATO[c.charCodeAt(0) - 65] ?? c).join(' ');
      return { summary: `${word}: ${spelled}`, copy: spelled, complete: 1, body: [line(title(spelled)), line(meta(word))] };
    }
  });
}
