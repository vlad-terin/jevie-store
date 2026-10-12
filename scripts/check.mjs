// Before a package is offered to the person: is it well made, and what does
// it reach? Run by the coding agent that wrote it, by `cli.mjs check`, and by
// Jevie before the approval card (docs/extensions.md, "Checking a package").
//
// Read, never run, for most of it: the manifest; the source scanned for the
// hosts it fetches from, the programs it starts and the files it writes;
// fetches with no timeout; anything that looks like a key in the code; npm
// install scripts and loose versions. Then one load, in a separate process
// with a deadline and a stand-in `jevie`, and each example sentence said to
// what it registered - an answer must come back, in time, as a view. Only a
// command marked reversible (it only reads) is run; the rest are matched, not
// run, so checking never changes anything.
//
//   { ok, errors[], warnings[], reaches: { hosts, programs, writes }, registered, examples[] }

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NAME = /^[a-z][a-z0-9-]{0,63}$/;
const read = async path => readFile(path, 'utf8').catch(() => null);

async function sources(root) {
  const out = [];
  const walk = async folder => {
    for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      const full = join(folder, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (['.mjs', '.js', '.cjs', '.ts'].includes(extname(entry.name))) out.push(full);
    }
  };
  await walk(root);
  return out;
}

/// What the code reaches, read from it: hosts, programs, writes; and what
/// it does carelessly.
export function scan(code, file = '') {
  const hosts = [...code.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map(m => m[1].toLowerCase());
  // A program named where it is started, or kept in a variable ("/opt/homebrew/bin/gh",
  // "gh") and started by name: the binaries a path names, and the bare
  // fallback beside it.
  const starts = /\b(?:execFile|spawn|execFileSync|spawnSync)\(/.test(code);
  const programs = [...code.matchAll(/\b(?:execFile|spawn|execFileSync|spawnSync)\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1].split('/').pop())
    .concat(starts ? [...code.matchAll(/['"`](?:\/[\w.-]+)*\/bin\/([\w.+-]+)['"`]/g)].map(m => m[1]) : []);
  if (starts && !programs.length) programs.push('(a program named at run time)');
  const writes = [...code.matchAll(/\b(?:writeFile|writeFileSync|appendFile|rm|rmSync|unlink|rename)\s*\(/g)].length;
  const problems = [];
  if (/\bexec(?:Sync)?\(\s*[`'"]/.test(code)) problems.push({ level: 'error', file, why: 'runs a shell string (exec): use execFile with arguments' });
  const fetches = [...code.matchAll(/\bfetch\(([^;]*)/g)];
  if (fetches.some(m => !/signal|timeout/i.test(m[1])) && !/AbortSignal\.timeout|signal/.test(code))
    problems.push({ level: 'warning', file, why: 'a fetch with no timeout: pass AbortSignal.timeout(…) or the context signal' });
  if (/(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|xox[abp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(code))
    problems.push({ level: 'error', file, why: 'what looks like a key or token is in the code: keep it in context.state or the Keychain' });
  if (/\beval\(|new Function\(/.test(code)) problems.push({ level: 'error', file, why: 'eval or new Function' });
  return { hosts, programs, writes, problems };
}

export async function check(folder, { timeoutMs = 20000 } = {}) {
  const root = resolve(folder);
  const errors = [], warnings = [];
  const manifest = JSON.parse(await read(join(root, 'jevie-extension.json')) ?? 'null');
  if (!manifest) return { ok: false, errors: ['no jevie-extension.json'], warnings, reaches: {}, registered: {}, examples: [] };
  if (!NAME.test(manifest.id ?? '')) errors.push(`id "${manifest.id}" must be lowercase words joined by -`);
  const { API_VERSIONS } = await import('./runtime.mjs');
  if (!API_VERSIONS.includes(manifest.apiVersion)) errors.push(`apiVersion must be one of ${API_VERSIONS.join(', ')}`);
  if (manifest.apiVersion < 2 && manifest.preferences) errors.push('preferences needs "apiVersion": 2');
  if (!manifest.description) warnings.push('no description: the card and "extensions" show it');
  if (!Array.isArray(manifest.examples) || !manifest.examples.length) errors.push('examples: the sentences someone would say, at least one');
  const entry = resolve(root, manifest.entry ?? 'index.mjs');
  if (relative(root, entry).startsWith('..') || !entry.endsWith('.mjs') || !(await stat(entry).catch(() => null))) errors.push('entry must be an .mjs file inside the package');

  const pkg = JSON.parse(await read(join(root, 'package.json')) ?? 'null');
  if (pkg) {
    if (Object.keys(pkg.scripts ?? {}).some(s => /^(?:pre|post)?install$|^prepare$/.test(s))) errors.push('package.json has an install script: none may run');
    const loose = Object.entries({ ...pkg.dependencies }).filter(([, v]) => !/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(String(v)));
    if (loose.length) errors.push(`dependencies must be exact versions: ${loose.map(([n, v]) => `${n}@${v}`).join(', ')}`);
  }

  const reaches = { hosts: new Set(), programs: new Set(), writes: 0 };
  for (const file of await sources(root)) {
    const found = scan(await read(file) ?? '', relative(root, file));
    found.hosts.forEach(h => reaches.hosts.add(h)); found.programs.forEach(p => reaches.programs.add(p)); reaches.writes += found.writes;
    for (const p of found.problems) (p.level === 'error' ? errors : warnings).push(`${p.file}: ${p.why}`);
  }

  // One load, apart from this process, with a deadline.
  let loaded = { registered: {}, examples: [], error: null };
  if (!errors.length) {
    loaded = await new Promise(done => {
      execFile(process.execPath, [fileURLToPath(import.meta.url), '--load', entry, JSON.stringify(manifest.examples ?? []), JSON.stringify({ preferences: manifest.preferences ?? [] })],
        { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, cwd: root }, (error, stdout) => {
          try { done(JSON.parse(String(stdout).trim().split('\n').at(-1))); }
          catch { done({ registered: {}, examples: [], error: error?.killed ? `loading took longer than ${timeoutMs / 1000}s` : String(error?.message ?? 'it did not load').slice(0, 300) }); }
        });
    });
    if (loaded.error) errors.push(`load: ${loaded.error}`);
    const total = Object.values(loaded.registered ?? {}).reduce((a, b) => a + b, 0);
    if (!loaded.error && !total) errors.push('it registered nothing: no surface, command, tool or MCP server');
    // A one-word name that is a program or an application is weighed against
    // it, not given the sentence (docs/porting-raycast.md, "Names").
    for (const name of (loaded.names ?? []).filter(n => !/\s/.test(n))) {
      const app = await (await import('../../platform/index.mjs')).default.installedApp(name.replace(/^./, c => c.toUpperCase())).catch(() => false);
      const program = (process.env.PATH ?? '').split(':').filter(Boolean);
      const onPath = (await Promise.all(program.map(d => stat(join(d, name)).then(s => s.isFile(), () => false)))).some(Boolean);
      if (app || onPath) warnings.push(`the name "${name}" is also ${app ? 'an application' : 'a program on PATH'}: it will be weighed against it; prefer two words, or say @ext-${manifest.id}`);
    }
    for (const ex of loaded.examples ?? []) {
      if (!ex.answered) errors.push(`example "${ex.sentence}": ${ex.why}`);
      else if (ex.skipped) warnings.push(`example "${ex.sentence}": ${ex.why}`);
      else if (ex.ms > 8000) warnings.push(`example "${ex.sentence}" took ${(ex.ms / 1000).toFixed(1)}s`);
      if (['failed', 'needs-help', 'error'].includes(ex.status)) warnings.push(`example "${ex.sentence}" answered ${ex.status}: ${ex.first}${ex.detail ? ` · ${ex.detail}` : ''}`);
    }
  }
  return { ok: errors.length === 0, id: manifest.id, errors, warnings,
    reaches: { hosts: [...reaches.hosts].sort(), programs: [...reaches.programs].sort(), writes: reaches.writes },
    registered: loaded.registered ?? {}, examples: loaded.examples ?? [] };
}

/// The child: load the entry with a stand-in `jevie` that refuses what the
/// real one refuses (runtime.mjs), then say each example.
async function loadAndTry(entry, examples, manifest = {}) {
  const { List, Detail, Form, Action, command, Secret, Answer, Row, Table, Gauge, Progress, Note, Cards } = await import('./api.mjs');
  const NAME = /^[a-z][a-z0-9_-]{0,63}$/;
  const fail = message => { throw new Error(message); };
  const surfaces = [], tools = [], names = [], counts = { surfaces: 0, commands: 0, tools: 0, mcp: 0 };
  const tool = spec => {
    if (!NAME.test(spec?.name ?? '') || typeof spec.execute !== 'function' || !spec.description) fail('A tool needs name, description, and execute');
    if (tools.some(t => t.name === spec.name)) fail(`Duplicate tool: ${spec.name}`);
    if ((spec.inputSchema?.type ?? 'object') !== 'object') fail('Tool inputSchema must have type object');
    tools.push(spec); counts.tools++;
  };
  const jevie = Object.freeze({ apiVersion: 1, List, Detail, Form, Action, command, Secret, Answer, Row, Table, Gauge, Progress, Note, Cards,
    registerTool: tool,
    registerCommand(name, spec) {
      if (typeof spec?.execute !== 'function') fail('A command needs execute');
      tool({ name, description: spec.description, readOnly: spec.readOnly, execute: (args, ctx) => spec.execute(args.text ?? '', ctx) });
      counts.commands++;
    },
    registerSurface(surface) {
      if (!surface?.about?.name || typeof surface.propose !== 'function') fail('A surface needs about.name and propose');
      surfaces.push(surface); counts.surfaces++;
      if (surface.command) { counts.commands++; names.push(...(surface.command.names ?? [])); }
    },
    registerMcpServer(name, server) {
      if (!NAME.test(name) || (!server?.url && !server?.command)) fail('An MCP server needs name and url or command');
      counts.mcp++;
    },
    on: () => {}, onRuntime: () => {}, onDispose: () => {} });
  const signal = AbortSignal.timeout(15000);
  // A version-2 package sees its declared settings at their defaults (a
  // required one unset), so a check runs without the person's values.
  const preferences = Object.freeze(Object.fromEntries((manifest.preferences ?? []).map(p => [p.name, p.default ?? ''])));
  const context = { id: 'check', directory: process.cwd(), signal, preferences, state: { get: async () => undefined, set: async () => {} } };
  const mod = await import(new URL(`file://${entry}`).href);
  if (typeof mod.default !== 'function') fail('export a default function that receives jevie');
  await mod.default(jevie, context);

  const within = (promise, ms = 15000) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error(`no answer in ${ms / 1000}s`)), ms))]);
  const tried = [];
  for (const sentence of examples) {
    const started = Date.now();
    // "@ext-<id> <tool> key=value …": a tool, called by name.
    const call = sentence.match(/^@ext-[a-z0-9-]+\s+([a-z][\w-]*)\s*(.*)$/i);
    if (call) {
      const found = tools.find(t => t.name === call[1]);
      if (!found) { tried.push({ sentence, answered: false, why: `no tool named ${call[1]}` }); continue; }
      if (!found.readOnly) { tried.push({ sentence, answered: true, skipped: true, why: 'not run: the tool is not readOnly (it may change something)' }); continue; }
      const args = Object.fromEntries([...call[2].matchAll(/(\w+)=("[^"]*"|\S+)/g)].map(([, k, v]) => [k, v.replace(/^"|"$/g, '')]));
      if (Object.values(args).some(v => /^\/(?:path|absolute)\//.test(v))) { tried.push({ sentence, answered: true, skipped: true, why: 'not run: the example names a placeholder path' }); continue; }
      try { const out = await within(Promise.resolve(found.execute(args, context))); tried.push({ sentence, answered: out != null, ms: Date.now() - started, ...(out == null ? { why: 'the tool answered nothing' } : {}) }); }
      catch (error) { tried.push({ sentence, answered: false, ms: Date.now() - started, why: String(error.message ?? error).slice(0, 200) }); }
      continue;
    }
    const candidates = (await Promise.all(surfaces.map(s => Promise.resolve(s.propose?.({ head: sentence, sentence, ctx: {} })).catch(() => [])))).flat().filter(Boolean);
    if (!candidates.length) { tried.push({ sentence, answered: false, why: 'nothing it registered answers this sentence' }); continue; }
    // A check never changes the Mac: only what says it only reads is run.
    if (!candidates[0].reversible) { tried.push({ sentence, answered: true, skipped: true, why: 'not run: not marked reversible (it may change something)' }); continue; }
    try {
      const view = await within(Promise.resolve(candidates[0].run()));
      const ok = view && typeof view === 'object' && (view.lines || view.ui || view.markdown || view.status);
      // What it said, so an error dressed as an answer is seen: its status
      // and first row ("Reddit refused: HTTP 429" is an answer, not a list).
      const first = (view?.lines ?? []).find(l => l?.kind !== 'heading') ?? view?.lines?.[0];
      tried.push({ sentence, answered: Boolean(ok), ms: Date.now() - started, ...(ok ? { shown: view.lines?.length ?? 0, status: view.status ?? 'ok', first: String(first?.title ?? '').slice(0, 120), detail: String(first?.subtitle ?? '').slice(0, 160) } : { why: 'the answer is not a view (List, Detail, Form or { status, lines })' }) });
    } catch (error) { tried.push({ sentence, answered: false, ms: Date.now() - started, why: String(error.message ?? error).slice(0, 200) }); }
  }
  return { registered: counts, names, examples: tried, error: null };
}

if (process.argv[2] === '--load') {
  loadAndTry(process.argv[3], JSON.parse(process.argv[4] ?? '[]'), JSON.parse(process.argv[5] ?? '{}'))
    .then(result => { console.log(JSON.stringify(result)); process.exit(0); })
    .catch(error => { console.log(JSON.stringify({ registered: {}, examples: [], error: String(error.message ?? error).slice(0, 300) })); process.exit(0); });
}
