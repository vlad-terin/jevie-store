// A Tailwind color, as a card while it is typed: Tailwind CSS's own default
// palette (v3.4, src/public/colors.js, read from its repository once a month
// and kept): the hex, RGB and HSL, the shades either side, the classes.
//
//   "tailwind blue-500", "tw emerald 300", "tailwind slate"

export const PATTERN = '^(?:tailwind|tw)\\s+(?:color\\s+)?[a-z]+(?:[\\s-]?\\d{2,3})?$';
const SOURCE = 'https://raw.githubusercontent.com/tailwindlabs/tailwindcss/v3.4.17/src/public/colors.js';

/// colors.js as { name: { shade: hex } } (the deprecated aliases left out).
export function palette(js) {
  const out = {};
  for (const m of String(js).matchAll(/^\s{2}(\w+):\s*\{([^}]*)\}/gm)) {
    const shades = Object.fromEntries([...m[2].matchAll(/(\d+):\s*'(#[0-9a-f]{3,8})'/gi)].map(s => [s[1], s[2].toLowerCase()]));
    if (Object.keys(shades).length) out[m[1]] = shades;
  }
  return out;
}
export const rgb = hex => { const h = hex.replace('#', ''); const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); };
export function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return [Math.round((h + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}

export default function tailwindColors(jevie, context) {
  const { line, spread, stack, hero, chip, meta, mono, title } = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Tailwind color', complete: 0, ...(error ? { error: true } : {}), body: [line(meta(t))] });
  let colors = null;
  const load = async () => {
    if (colors) return colors;
    const kept = await context.state.get('palette').catch(() => null);
    if (kept && Date.now() - kept.at < 30 * 864e5) return (colors = kept.colors);
    colors = palette(await fetch(SOURCE, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.text() : Promise.reject(new Error(`the palette answered ${r.status}`))));
    await context.state.set('palette', { at: Date.now(), colors }).catch(() => {});
    return colors;
  };
  jevie.registerCard({
    name: 'tailwind', label: 'Tailwind color', symbol: 'paintpalette', match: { pattern: PATTERN }, examples: ['tailwind blue-500', 'tw emerald 300'],
    async render(said) {
      const m = said.trim().toLowerCase().match(/^(?:tailwind|tw)\s+(?:color\s+)?([a-z]+)(?:[\s-]?(\d{2,3}))?$/);
      try {
        const all = await load();
        const name = m[1], shades = all[name];
        if (!shades) return note(`No Tailwind color “${name}” · ${Object.keys(all).slice(0, 8).join(', ')}…`, true);
        const shade = m[2] ?? '500';
        const hex = shades[shade];
        if (!hex) return note(`${name} has ${Object.keys(shades).join(', ')}`, true);
        const c = rgb(hex), [h, s, l] = hsl(c);
        const keys = Object.keys(shades), at = keys.indexOf(shade);
        const near = keys.slice(Math.max(0, at - 2), at + 3);
        const summary = `${name}-${shade}: ${hex}`;
        return { summary, copy: hex, complete: 1, body: [
          spread(stack('leading', line(title(`${name}-${shade}`)), line(mono(hex))), stack('trailing', line({ swatch: hex, size: 34 }))),
          line(...near.map(k => ({ swatch: shades[k], size: k === shade ? 22 : 16 })), meta(near.join(' · '))),
          line(mono(`rgb(${c.join(' ')})  hsl(${h} ${s}% ${l}%)`)),
          line(meta(`bg-${name}-${shade} · text-${name}-${shade} · border-${name}-${shade} · Tailwind v3 palette`))] };
      } catch (error) { return note(String(error.message).slice(0, 120), true); }
    }
  });
}
