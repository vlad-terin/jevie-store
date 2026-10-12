// Can I Use: "can i use container queries" lists the matching features with
// the first version of each main browser that supports them; return opens
// caniuse.com. A port of Raycast's Can I Use extension, which reads the same
// data file. It is ~5 MB, so it is kept on disk and refreshed weekly.

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA = 'https://raw.githubusercontent.com/Fyrd/caniuse/main/fulldata-json/data-2.0.json';
const WEEK = 7 * 24 * 3600 * 1000;
export const BROWSERS = [['chrome', 'Chrome'], ['safari', 'Safari'], ['firefox', 'Firefox'], ['edge', 'Edge'], ['ios_saf', 'iOS']];

/// The first version a browser supports a feature in, fully ("y") or with a
/// prefix or partly ("a", "x"), or null when it never has.
export function firstSupport(stats) {
  const versions = Object.entries(stats ?? {}).filter(([, flag]) => /^[yax]/.test(flag))
    .sort(([a], [b]) => parseFloat(a) - parseFloat(b));
  if (!versions.length) return null;
  const [version, flag] = versions[0];
  return { version: version.split('-')[0], partial: !flag.startsWith('y') };
}

/// Features whose title, id or keywords carry every word asked, the closest
/// first: the title said whole, then the id ("has" is css-has, not
/// hashchange), then every word whole in the title, then any mention; ties
/// go to the feature more people's browsers support.
export function search(data, text) {
  const words = String(text).toLowerCase().split(/\s+/).filter(Boolean);
  const said = words.join(' ');
  const whole = (hay, w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, '\\$&')}($|[^a-z0-9])`).test(hay);
  return Object.entries(data.data ?? {}).map(([id, f]) => {
    const title = f.title.toLowerCase();
    const hay = `${id} ${title} ${f.keywords ?? ''}`.toLowerCase();
    if (!words.every(w => hay.includes(w))) return null;
    const rank = title === said ? 0 : id.split('-').filter(p => !['css', 'js', 'html'].includes(p)).join('-') === words.join('-') ? 1
      : words.every(w => whole(title, w)) ? 2 : words.every(w => whole(hay, w)) ? 3 : 4;
    return { id, feature: f, rank, usage: f.usage_perc_y ?? 0 };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank || b.usage - a.usage).map(({ id, feature }) => ({ id, feature }));
}

export const supportLine = feature => BROWSERS.map(([key, name]) => {
  const first = firstSupport(feature.stats?.[key]);
  return `${name} ${first ? `${first.version}${first.partial ? '*' : ''}` : '✗'}`;
}).join(' · ');

let memory = null;
async function data(signal) {
  if (memory) return memory;
  const dir = join(homedir(), '.jevie', 'extension-state');
  const file = join(dir, 'can-i-use-data.json');
  const info = await stat(file).catch(() => null);
  if (info && Date.now() - info.mtimeMs < WEEK) return memory = JSON.parse(await readFile(file, 'utf8'));
  const response = await fetch(DATA, { signal });
  if (!response.ok) { if (info) return memory = JSON.parse(await readFile(file, 'utf8')); throw new Error(`caniuse data: HTTP ${response.status}`); }
  const text = await response.text();
  await mkdir(dir, { recursive: true });
  await writeFile(file, text);
  return memory = JSON.parse(text);
}

export default function canIUse(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['can i use', 'caniuse'],
    what: 'browser support for a web feature',
    examples: ['can i use container queries', 'caniuse has'],
    reversible: true,
    async run(text) {
      if (!text) return { status: 'ok', spoken: 'Which feature?', lines: [{ title: 'Say can i use and a feature', subtitle: 'can i use container queries · caniuse webgpu' }] };
      const found = search(await data(AbortSignal.timeout(30000)), text).slice(0, 12);
      return List({
        title: `Can I Use · ${text}`,
        spoken: found.length ? `${found[0].feature.title}: ${supportLine(found[0].feature).replace(/\*/g, ' partly').replace(/✗/g, 'no')}.` : undefined,
        empty: `No feature called ${text}`,
        items: found.map(({ id, feature }) => ({ title: feature.title, subtitle: supportLine(feature),
          accessory: feature.usage_perc_y ? `${Math.round(feature.usage_perc_y)}% of users` : '', icon: 'globe',
          actions: [Action.OpenInBrowser(`https://caniuse.com/${id}`), Action.CopyToClipboard(`https://caniuse.com/${id}`)] }))
      });
    }
  }));
}
