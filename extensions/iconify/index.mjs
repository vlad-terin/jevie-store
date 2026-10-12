// Iconify: "iconify home" lists icons across the open sets; ⌘C copies the
// icon's SVG, return opens its page. A port of Raycast's Iconify extension.

const API = 'https://api.iconify.design';

/// "mdi:home" as its set and name, and the set's title from the response.
export function parseIcons(json) {
  return (json?.icons ?? []).map(full => {
    const [prefix, name] = full.split(':');
    const set = json.collections?.[prefix];
    return { full, prefix, name, set: set?.name ?? prefix, license: set?.license?.spdx ?? '' };
  });
}

export default function iconify(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['iconify', 'icon search'],
    what: 'open icons as SVG',
    examples: ['iconify home', 'iconify arrow right'],
    reversible: true,
    async run(text) {
      if (!text) return { status: 'ok', spoken: 'Which icon?', lines: [{ title: 'Say iconify and an icon', subtitle: 'iconify home · iconify arrow right' }] };
      const signal = AbortSignal.timeout(8000);
      const response = await fetch(`${API}/search?query=${encodeURIComponent(text)}&limit=32`, { signal });
      if (!response.ok) return { status: 'needs-help', spoken: 'Iconify did not answer.', lines: [{ title: 'Iconify did not answer', subtitle: `HTTP ${response.status}` }] };
      const icons = parseIcons(await response.json()).slice(0, 20);
      const svgs = await Promise.all(icons.map(i => fetch(`${API}/${i.prefix}/${i.name}.svg`, { signal }).then(r => r.ok ? r.text() : '').catch(() => '')));
      return List({
        title: `Iconify · ${text}`,
        empty: `No icon for ${text}`,
        items: icons.map((icon, i) => ({ title: icon.name, subtitle: icon.set, accessory: icon.license, icon: 'star.square',
          actions: [...(svgs[i] ? [Action.CopyToClipboard(svgs[i])] : [Action.CopyToClipboard(icon.full)]),
            Action.OpenInBrowser(`https://icon-sets.iconify.design/${icon.prefix}/${icon.name}/`)] }))
      });
    }
  }));
}
