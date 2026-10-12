// A list from a web service: the shape most extensions take.
export default function myExtension(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['my things'],
    what: 'my things, newest first; words after the name search them',
    reversible: true, // it only reads
    async run(text) {
      const url = `https://example.com/api/things?q=${encodeURIComponent(text)}`;
      const things = await fetch(url, { signal: AbortSignal.timeout(8000) }).then(r => r.json());
      return List({
        title: text ? `My things · ${text}` : 'My things',
        items: things.map(t => ({
          title: t.name,
          subtitle: t.summary,
          icon: 'doc',
          actions: [Action.OpenInBrowser(t.url), Action.CopyToClipboard(t.url)]
        }))
      });
    }
  }));
}
