// An open-source licence, as a card while it is typed: the SPDX licence
// list's text (github.com/spdx/license-list-data), the year and the holder
// filled in (the name from your git config, read on this Mac), kept a month.
//
//   "license mit", "license apache 2.0", "license gpl-3.0", "license bsd 3"

export const PATTERN = '^(?:license|licence)\\s+(?:mit|isc|apache(?:[\\s-]*2(?:\\.0)?)?|gpl(?:[\\s-]*[23](?:\\.0)?)?|lgpl(?:[\\s-]*[23](?:\\.\\d)?)?|agpl(?:[\\s-]*3(?:\\.0)?)?|mpl(?:[\\s-]*2(?:\\.0)?)?|bsd(?:[\\s-]*[23](?:[\\s-]*clause)?)?|unlicense|cc0|0bsd|zlib|epl(?:[\\s-]*2(?:\\.0)?)?|bsl(?:[\\s-]*1(?:\\.0)?)?)$';
export const SPDX = { mit: 'MIT', isc: 'ISC', apache: 'Apache-2.0', gpl2: 'GPL-2.0-only', gpl: 'GPL-3.0-only', gpl3: 'GPL-3.0-only', lgpl: 'LGPL-3.0-only', lgpl2: 'LGPL-2.1-only', lgpl3: 'LGPL-3.0-only', agpl: 'AGPL-3.0-only', mpl: 'MPL-2.0',
  bsd: 'BSD-3-Clause', bsd2: 'BSD-2-Clause', bsd3: 'BSD-3-Clause', unlicense: 'Unlicense', cc0: 'CC0-1.0', '0bsd': '0BSD', zlib: 'Zlib', epl: 'EPL-2.0', bsl: 'BSL-1.0' };
export const ABOUT = { MIT: 'permissive: do anything, keep the notice', ISC: 'permissive, like MIT, shorter', 'Apache-2.0': 'permissive, with a patent grant and change notices', 'GPL-3.0-only': 'copyleft: shared changes stay GPL', 'GPL-2.0-only': 'copyleft, the older version', 'LGPL-3.0-only': 'weak copyleft: linking is free',
  'LGPL-2.1-only': 'weak copyleft, the older version', 'AGPL-3.0-only': 'strong copyleft, network use counts as distribution', 'MPL-2.0': 'file-level copyleft', 'BSD-3-Clause': 'permissive, no endorsement by name', 'BSD-2-Clause': 'permissive, simplified', Unlicense: 'public domain dedication', 'CC0-1.0': 'public domain dedication', '0BSD': 'permissive, no notice needed', Zlib: 'permissive, for libraries', 'EPL-2.0': 'weak copyleft (Eclipse)', 'BSL-1.0': 'permissive (Boost)' };
export function idOf(said) {
  const t = said.trim().toLowerCase().replace(/^(?:license|licence)\s+/, '').replace(/[\s-]*clause/, '').replace(/[\s.-]+/g, '');
  const key = t.replace(/^(gpl|lgpl|agpl|mpl|apache|epl|bsl)(\d)0?$/, '$1$2').replace(/^(apache|mpl|epl|bsl)\d$/, '$1').replace(/^lgpl21$/, 'lgpl2').replace(/^agpl3$/, 'agpl');
  return SPDX[key] ?? SPDX[key.replace(/\d+$/, '')] ?? null;
}

import { execFile } from 'node:child_process';
const gitName = () => new Promise(done => execFile('git', ['config', '--global', 'user.name'], { timeout: 2000 }, (e, out) => done(e ? '' : String(out).trim())));

export default function licenseText(jevie, context) {
  const { line, spread, title, text, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'license', label: 'License', symbol: 'doc.text.fill', match: { pattern: PATTERN }, examples: ['license mit', 'license apache-2.0'],
    async render(said) {
      const id = idOf(said);
      if (!id) return { summary: 'License', complete: 0, body: [line(meta('Type a licence: mit, apache-2.0, gpl-3.0, bsd-3-clause, mpl-2.0…'))] };
      const kept = (await context.state.get('licenses').catch(() => null)) ?? {};
      let body = kept[id]?.at > Date.now() - 30 * 864e5 ? kept[id].text : null;
      if (!body) {
        body = await fetch(`https://raw.githubusercontent.com/spdx/license-list-data/main/text/${id}.txt`, { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.text() : null).catch(() => null);
        if (!body) return { summary: 'License', complete: 0, error: true, body: [line(meta(`The SPDX text for ${id} did not come`))] };
        await context.state.set('licenses', { ...kept, [id]: { at: Date.now(), text: body } }).catch(() => {});
      }
      const year = String(new Date().getFullYear()), holder = await gitName() || '<copyright holders>';
      const filled = body.replace(/<\s*year\s*>|\[yyyy\]|\[year\]/gi, year).replace(/<\s*copyright holders?\s*>|\[name of copyright owner\]|\[fullname\]|<\s*owner\s*>/gi, holder);
      return { summary: `${id}: ${ABOUT[id] ?? ''}`, copy: filled, complete: 1, body: [spread(title(id), chip(ABOUT[id] ?? 'licence', 'doc.text.fill')), line(text(filled.trim().split('\n').find(l => l.trim()).slice(0, 140), true)), line(meta(`${filled.split(/\s+/).length.toLocaleString('en-US')} words · ${year}, ${holder} filled in · SPDX licence list · ↵ copies the text`))] };
    }
  });
}
