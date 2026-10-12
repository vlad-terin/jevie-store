// Svgl: "svgl github" lists brand logos; ⌘C copies the SVG itself, return
// opens it. A port of Raycast's Svgl extension.

const API = 'https://api.svgl.app';

/// A logo's SVG address for the appearance asked: `route` is one address or
/// one per appearance.
export const routeOf = (route, dark = false) => typeof route === 'string' ? route : (dark ? route?.dark : route?.light) ?? route?.light ?? '';

export default function svgl(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['svgl', 'svg logo', 'svg logos'],
    what: 'brand logos as SVG',
    examples: ['svgl github', 'svg logo vercel'],
    reversible: true,
    async run(text) {
      if (!text) return { status: 'ok', spoken: 'Which brand?', lines: [{ title: 'Say svgl and a brand', subtitle: 'svgl github · svg logo figma' }] };
      const signal = AbortSignal.timeout(8000);
      const response = await fetch(`${API}?search=${encodeURIComponent(text)}`, { signal });
      if (!response.ok) return { status: 'needs-help', spoken: 'Svgl did not answer.', lines: [{ title: 'Svgl did not answer', subtitle: `HTTP ${response.status}` }] };
      const logos = (await response.json()).slice(0, 12);
      // ⌘C copies the SVG itself, Raycast's first action - so each is
      // fetched now; they are a few kilobytes.
      const svgs = await Promise.all(logos.map(l => fetch(routeOf(l.route), { signal }).then(r => r.ok ? r.text() : '').catch(() => '')));
      return List({
        title: `Svgl · ${text}`,
        empty: `No logo for ${text}`,
        items: logos.map((logo, i) => ({ title: logo.title, subtitle: [logo.category].flat().join(', '),
          accessory: typeof logo.route === 'string' ? '' : 'light · dark', icon: 'seal',
          actions: [...(svgs[i] ? [Action.CopyToClipboard(svgs[i])] : []), Action.OpenInBrowser(routeOf(logo.route))] }))
      });
    }
  }));
}
