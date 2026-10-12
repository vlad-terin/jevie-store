// Homebrew: "homebrew wget" searches formulae and casks, "homebrew installed"
// and "homebrew outdated" list what is on this Mac. A port of Raycast's
// Homebrew extension - its brew calls, kept; its <List>, a Jevie List.
//
// Looking is a command and reads only. Installing, upgrading and removing
// change the Mac, so they are tools Jevie asks about first: a row's return
// says "@ext-homebrew install name=wget", and the confirmation shows what
// will run before it does. A bare "brew install wget" stays the shell's.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

const BREW = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
// No self-update on every call: it is what makes brew slow, and a lookup
// said aloud should answer while the sentence is still being said.
const ENV = { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_ENV_HINTS: '1', HOMEBREW_NO_INSTALL_CLEANUP: '1' };

const path = BREW.find(existsSync) ?? 'brew';

function brew(args, { signal, timeout = 20000 } = {}) {
  return new Promise((done, fail) => execFile(path, args, { env: ENV, signal, timeout, maxBuffer: 32 * 1024 * 1024 },
    (error, out, err) => error && !out ? fail(new Error(String(err || error.message).trim().split('\n').pop())) : done(String(out))));
}

/// `brew search` output - formulae, then casks under their own heading - as names.
export function parseSearch(text) {
  const out = [];
  let cask = false;
  for (const line of String(text).split('\n')) {
    if (/^==> Casks/i.test(line)) { cask = true; continue; }
    if (/^==> Formulae/i.test(line)) { cask = false; continue; }
    for (const name of line.trim().split(/\s+/).filter(Boolean)) if (!name.startsWith('==>')) out.push({ name, cask });
  }
  return out;
}

/// `brew info --json=v2` as rows: name, what it is, version, installed or not.
export function parseInfo(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const formulae = (data.formulae ?? []).map(f => ({ name: f.name, cask: false, desc: f.desc ?? '', version: f.versions?.stable ?? '',
    installed: (f.installed ?? []).map(i => i.version).pop() ?? null, homepage: f.homepage ?? '', outdated: Boolean(f.outdated) }));
  const casks = (data.casks ?? []).map(c => ({ name: c.token, cask: true, desc: c.desc ?? (c.name ?? []).join(', '), version: c.version ?? '',
    installed: c.installed ?? null, homepage: c.homepage ?? '', outdated: Boolean(c.outdated) }));
  return [...formulae, ...casks];
}

/// `brew outdated --json=v2` as rows.
export function parseOutdated(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  return [...(data.formulae ?? []).map(f => ({ name: f.name, cask: false, from: (f.installed_versions ?? []).join(', '), to: f.current_version ?? '' })),
    ...(data.casks ?? []).map(c => ({ name: c.name, cask: true, from: (c.installed_versions ?? []).join?.(', ') ?? String(c.installed_versions ?? ''), to: c.current_version ?? '' }))];
}

/// What the words after "homebrew" ask for.
export function wanted(text) {
  const t = String(text ?? '').trim();
  if (!t || /^(?:installed|list|mine|my packages)$/i.test(t)) return { kind: 'installed' };
  if (/^(?:outdated|updates?|upgrades?|old)$/i.test(t)) return { kind: 'outdated' };
  const act = t.match(/^(install|uninstall|remove|upgrade|update|reinstall)\s+(?:the\s+)?(?:(cask)\s+)?(.+)$/i);
  if (act) return { kind: 'act', verb: { remove: 'uninstall', update: 'upgrade' }[act[1].toLowerCase()] ?? act[1].toLowerCase(), cask: Boolean(act[2]), name: act[3].trim() };
  if (/^upgrade(?: all| everything)?$/i.test(t)) return { kind: 'act', verb: 'upgrade', name: '' };
  return { kind: 'search', query: t.replace(/^(?:search|find|for)\s+/i, '') };
}

const call = (verb, row) => `@ext-homebrew ${verb} name=${row.name}${row.cask ? ' cask=true' : ''}`;

export default function homebrew(jevie) {
  const { List, Action, command } = jevie;

  async function info(names, signal) {
    if (!names.length) return [];
    return parseInfo(await brew(['info', '--json=v2', ...names], { signal }).catch(() => '{}'));
  }

  jevie.registerSurface(command({
    names: ['homebrew', 'brew package', 'brew formula', 'brew cask'],
    what: 'Homebrew formulae and casks: search, what is installed, what is outdated',
    examples: ['homebrew wget', 'homebrew installed', 'homebrew outdated'],
    reversible: true,
    async run(text) {
      const signal = AbortSignal.timeout(20000);
      const want = wanted(text);
      if (want.kind === 'act') {
        // Changing the Mac is the tool's, which asks first: this row says it.
        const what = want.name || 'everything outdated';
        return List({ title: `${want.verb[0].toUpperCase()}${want.verb.slice(1)} ${what}`, spoken: `${want.verb[0].toUpperCase()}${want.verb.slice(1)} ${what}? Press return to confirm.`,
          items: [{ title: `${want.verb[0].toUpperCase()}${want.verb.slice(1)} ${what}`, subtitle: `brew ${want.verb}${want.cask ? ' --cask' : ''} ${want.name}`.trim(), icon: 'shippingbox',
            actions: [Action.Run(want.name ? call(want.verb, want) : '@ext-homebrew upgrade')] }] });
      }
      if (want.kind === 'outdated') {
        const rows = parseOutdated(await brew(['outdated', '--json=v2'], { signal, timeout: 30000 }));
        return List({ title: `${rows.length} outdated`, empty: 'Everything is up to date.',
          items: [...(rows.length > 1 ? [{ title: `Upgrade all ${rows.length}`, subtitle: 'brew upgrade', icon: 'arrow.up.circle', actions: [Action.Run('@ext-homebrew upgrade')] }] : []),
            ...rows.map(r => ({ title: r.name, subtitle: `${r.from} → ${r.to}`, accessory: r.cask ? 'cask' : '', icon: 'arrow.up.circle',
              actions: [Action.Run(call('upgrade', r)), Action.CopyToClipboard(`brew upgrade ${r.name}`)] }))] });
      }
      if (want.kind === 'installed') {
        const [formulae, casks] = await Promise.all([brew(['list', '--formula', '--versions'], { signal }).catch(() => ''), brew(['list', '--cask', '--versions'], { signal }).catch(() => '')]);
        const rows = [...formulae.split('\n').filter(Boolean).map(l => ({ name: l.split(' ')[0], version: l.split(' ').slice(1).join(' '), cask: false })),
          ...casks.split('\n').filter(Boolean).map(l => ({ name: l.split(' ')[0], version: l.split(' ').slice(1).join(' '), cask: true }))];
        return List({ title: `${rows.length} installed`, empty: 'Nothing installed with Homebrew.',
          items: rows.map(r => ({ title: r.name, subtitle: r.version, accessory: r.cask ? 'cask' : 'formula', icon: r.cask ? 'macwindow' : 'terminal',
            actions: [Action.Run(`homebrew ${r.name}`), Action.CopyToClipboard(`brew uninstall ${r.cask ? '--cask ' : ''}${r.name}`)] })) });
      }
      // Search: names from brew, then what each is, for the first page of them.
      const found = parseSearch(await brew(['search', want.query], { signal }).catch(() => ''));
      const exact = found.filter(f => f.name.toLowerCase() === want.query.toLowerCase());
      const first = [...exact, ...found.filter(f => !exact.includes(f))].slice(0, 20);
      const rows = await info(first.map(f => f.name), signal);
      const byName = new Map(rows.map(r => [`${r.cask}:${r.name}`, r]));
      return List({ title: `Homebrew · ${want.query}`, empty: `Nothing in Homebrew called ${want.query}.`,
        items: first.map(f => byName.get(`${f.cask}:${f.name}`) ?? { ...f, desc: '', version: '' }).map(r => ({
          title: r.name, subtitle: [r.desc, r.version].filter(Boolean).join(' · '),
          accessory: r.installed ? 'installed' : r.cask ? 'cask' : '', icon: r.cask ? 'macwindow' : 'terminal',
          // Return installs it - Jevie asks first - or, installed, upgrades it.
          actions: [Action.Run(call(r.installed ? 'upgrade' : 'install', r)), Action.CopyToClipboard(`brew install ${r.cask ? '--cask ' : ''}${r.name}`)] })) });
    }
  }));

  // What changes the Mac: not read-only, so Jevie shows the arguments and asks.
  const change = (verb, description) => jevie.registerTool({
    name: verb,
    description,
    inputSchema: { type: 'object', properties: { name: { type: 'string', pattern: '^[A-Za-z0-9@+._/-]+$' }, cask: { type: 'boolean' } },
      required: verb === 'upgrade' ? [] : ['name'], additionalProperties: false },
    async execute({ name = '', cask = false }, context) {
      const args = [verb, ...(cask ? ['--cask'] : []), ...(name ? [name] : [])];
      const out = await brew(args, { signal: context.signal, timeout: 15 * 60 * 1000 });
      const last = out.trim().split('\n').filter(Boolean).pop() ?? '';
      const what = name || 'everything outdated';
      return { status: 'ok', spoken: `${verb === 'install' ? 'Installed' : verb === 'uninstall' ? 'Removed' : verb === 'upgrade' ? 'Upgraded' : 'Reinstalled'} ${what}.`,
        lines: [{ title: `brew ${args.join(' ')}`, subtitle: last.slice(0, 160) }] };
    }
  });
  change('install', 'Install a Homebrew formula, or a cask with cask=true.');
  change('uninstall', 'Remove a Homebrew formula or cask.');
  change('upgrade', 'Upgrade one Homebrew formula or cask, or everything outdated when no name is given.');
  change('reinstall', 'Reinstall a Homebrew formula or cask.');
}
