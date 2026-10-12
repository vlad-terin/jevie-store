// The extension store's rules and its index - the shape of
// github.com/raycast/extensions, kept to Jevie's own:
//
//   extensions/<id>/jevie-extension.json   id, title, description, version,
//                                          categories, icon, author, requires,
//                                          examples (the sentences it answers)
//   extensions/<id>/index.mjs              the entry
//   extensions/<id>/README.md              shown beside its row in the store
//   extensions/<id>/CHANGELOG.md           "## 1.1.0 - 2026-10-11", newest first
//   extensions/<id>/assets/icon.png        optional; else `icon` names a symbol
//   registry/<id>.json                     an extension that lives in its
//                                          author's own repository: where
//                                          (repo, folder) and whose (owners)
//   store.json                             built from both (`build`), what
//                                          Jevie reads (catalogue.mjs)
//
// The store holds pointers more than code (Obsidian's and Zed's way, not
// Raycast's 19 GB monorepo): a pull request adds registry/<id>.json once,
// and every release after that is a tag in the author's repository
// (`<id>-v1.2.0`), found by the hourly crawl, checked, and pinned to its
// commit - no pull request, no wait for a review. `trust` says how far an
// entry is vouched for: official (Jevie's own), verified (a person read
// it), checked (it passed the checks).
//
// Where Raycast's store takes commands, Jevie's takes sentences: an
// extension is found by what is said to it, works by vim keys, the mouse and
// voice without asking, and is refused when Jevie already answers its
// sentences itself (`overlaps`, the porter's no-bloat rule).
//
//   node jevie/kernel/extensions/store.mjs check <folder>          one package, as the store's CI does
//   node jevie/kernel/extensions/store.mjs build <folder> [--out store.json] [--source git:host/owner/repo@ref]
//                                            (a store with registry/: the crawl too, CODEOWNERS and index.html)
//   node jevie/kernel/extensions/store.mjs check-entry <store>/registry/<id>.json   a registry pull request, as CI checks it

import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/// Raycast's categories, so a port keeps its shelf.
export const CATEGORIES = ['Applications', 'Communication', 'Data', 'Design Tools', 'Developer Tools', 'Documentation', 'Finance', 'Fun',
  'Media', 'News', 'Productivity', 'Security', 'System', 'Web', 'Other'];
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const readJSON = async (path, fallback) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; } };
const exists = path => stat(path).then(() => true, () => false);

let version = null;
/// The Jevie this is, from its package.json.
export async function jevieVersion() {
  version ??= String((await readJSON(join(REPO, 'package.json'), {})).version ?? '0.0.0');
  return version;
}

/// "1.10.0" after "1.9.2".
export function newer(a, b) {
  const pa = String(a).split(/[.-]/).map(n => Number.parseInt(n, 10) || 0), pb = String(b).split(/[.-]/).map(n => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0); }
  return false;
}

/// Null when this Jevie runs it; else the version it needs.
export function needs(entry, have) {
  const want = String(entry?.requires?.jevie ?? '').replace(/^>=?\s*/, '').trim();
  return want && newer(want, have) ? want : null;
}

/// The newest CHANGELOG entry: { version, date, lines }.
export function latestChange(markdown) {
  const text = String(markdown ?? '');
  const head = text.match(/^##\s+\[?(\d+\.\d+\.\d+[\w.-]*)\]?(?:\s*[-–·]\s*(\S+))?.*$/m);
  if (!head) return null;
  const rest = text.slice(head.index + head[0].length);
  const body = rest.split(/^##\s/m)[0];
  return { version: head[1], date: head[2] ?? null, lines: body.split('\n').map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean).slice(0, 6) };
}

/// What keeps a package out of the store, and what only should be better.
export function storeIssues(manifest, { readme = null, changelog = null } = {}) {
  const errors = [], warnings = [];
  const m = manifest ?? {};
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(String(m.id ?? ''))) errors.push('id: lowercase letters, digits and hyphens');
  if (!m.title) errors.push('title: the name shown in the store ("Hacker News")');
  if (!m.description) errors.push('description: one sentence saying what it does');
  else if (String(m.description).length > 200) warnings.push('description: keep it under 200 characters; the README says the rest');
  if (!SEMVER.test(String(m.version ?? ''))) errors.push('version: exact, as 1.0.0');
  if (!Array.isArray(m.examples) || !m.examples.length) errors.push('examples: at least one sentence it answers - this is how it is found, said and tried');
  const cats = Array.isArray(m.categories) ? m.categories : [];
  if (!cats.length) errors.push(`categories: one or more of ${CATEGORIES.join(', ')}`);
  for (const c of cats) if (!CATEGORIES.includes(c)) errors.push(`categories: "${c}" is not one of ${CATEGORIES.join(', ')}`);
  if (!m.author) warnings.push('author: your GitHub name, shown as "by …"');
  if (m.requires?.jevie && !SEMVER.test(String(m.requires.jevie).replace(/^>=?\s*/, ''))) errors.push('requires.jevie: an exact version, as 1.1.0');
  if (!readme) errors.push('README.md: what it does, what it needs, the sentences to try');
  if (!changelog) warnings.push('CHANGELOG.md: "## 1.0.0 - 2026-10-11" and what changed');
  else if (latestChange(changelog)?.version !== m.version) warnings.push(`CHANGELOG.md: its newest entry is not ${m.version}`);
  return { errors, warnings };
}

/// The surface of Jevie's own that already answers a sentence, exactly and
/// as a whole: { surface, label } or null. The store refuses a package whose
/// sentences are all answered so - it would only confuse the gate (the
/// speedtest port duplicated surfaces/network, 4 October 2026).
export async function nativeAnswer(sentence, { timeoutMs = 8000 } = {}) {
  const { SURFACES } = await import('../../surfaces/index.mjs');
  const input = { head: sentence, sentence, said: sentence, ctx: {}, acts: [], mentions: [], rest: '' };
  const own = new Set(['Extensions', 'Extension store']);
  const found = await Promise.all(SURFACES.filter(x => !own.has(x.about?.name)).map(async surface => {
    if (surface.available && !surface.available(input)) return null;
    // A held timer, cleared after: an unheld one let the process end when a
    // surface's proposal never settled (no answer, no error, no exit code).
    let timer;
    const offered = await Promise.race([Promise.resolve().then(() => surface.propose(input)), new Promise(done => { timer = setTimeout(() => done([]), timeoutMs); })]).catch(() => []).finally(() => clearTimeout(timer));
    const hit = (offered ?? []).find(c => c?.exact && (c.whole || (c.strength ?? 0) >= 2.5) && !String(c.kind ?? '').startsWith('ext'));
    return hit ? { surface: surface.about?.name ?? '?', label: String(hit.label ?? '') } : null;
  }));
  return found.find(Boolean) ?? null;
}

/// One package as a store entry, read and never run. With `deep`, it is
/// also checked as a draft is (check.mjs: one load, every example said),
/// and what it reaches comes from that.
export async function entryOf(folder, { source = null, deep = false } = {}) {
  const manifest = await readJSON(join(folder, 'jevie-extension.json'), null);
  if (!manifest) return { ok: false, errors: ['jevie-extension.json is missing or not JSON'], warnings: [], entry: null };
  const readme = await readFile(join(folder, 'README.md'), 'utf8').catch(() => null);
  const changelog = await readFile(join(folder, 'CHANGELOG.md'), 'utf8').catch(() => null);
  const { errors, warnings } = storeIssues(manifest, { readme, changelog });
  let reaches = null;
  if (deep) {
    const { check } = await import('./check.mjs');
    const report = await check(folder).catch(error => ({ ok: false, errors: [error.message], warnings: [] }));
    errors.push(...(report.errors ?? []));
    warnings.push(...(report.warnings ?? []));
    reaches = report.reaches ?? null;
    const answered = [];
    for (const example of manifest.examples ?? []) { const hit = await nativeAnswer(example); if (hit) answered.push(`"${example}" → ${hit.surface}`); }
    if (answered.length && answered.length === (manifest.examples ?? []).length) errors.push(`Jevie answers these already: ${answered.join('; ')}`);
    else if (answered.length) warnings.push(`Jevie answers some already, so they never reach it: ${answered.join('; ')}`);
  }
  // Read from the code when it was not loaded: shown before installing.
  if (!reaches) { const read = await reachesOf(folder).catch(() => null); if (read) reaches = { hosts: read.hosts, programs: read.programs, writes: read.writes }; }
  let iconFile = null;
  for (const name of ['assets/icon.png', 'assets/icon.svg', 'icon.png']) if (await exists(join(folder, name))) { iconFile = name; break; }
  const entry = {
    id: manifest.id, title: manifest.title ?? manifest.id, description: String(manifest.description ?? ''), version: String(manifest.version ?? ''),
    categories: manifest.categories ?? [], icon: manifest.icon ?? 'puzzlepiece.extension', ...(iconFile ? { iconFile } : {}),
    author: manifest.author ?? null, requires: manifest.requires ?? null, topics: manifest.topics ?? [], examples: manifest.examples ?? [],
    settings: (manifest.preferences ?? []).length, changes: manifest.changes ?? null, ...(reaches ? { reaches } : {}),
    readme: readme ? readme.slice(0, 6000) : null, change: latestChange(changelog),
    source: source ?? folder
  };
  return { ok: !errors.length, errors, warnings, entry };
}

/// Each package of a store folder, as `store.json`: { built, jevie, extensions }.
/// `source` (git:host/owner/repo@ref) pins every entry to that ref and its
/// own folder; without it each entry's source is its folder on this disk.
export async function build(root, { source = null, deep = false, sub = 'extensions' } = {}) {
  const base = await exists(join(root, sub)) ? join(root, sub) : root;
  const out = [], refused = [];
  for (const d of (await readdir(base, { withFileTypes: true }).catch(() => [])).filter(d => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const folder = join(base, d.name);
    const pinned = source ? `${source}#${base === root ? d.name : `${sub}/${d.name}`}` : null;
    // "store": false - a sample or an experiment, kept in Jevie, not listed.
    if ((await readJSON(join(folder, 'jevie-extension.json'), {})).store === false) continue;
    const report = await entryOf(folder, { source: pinned, deep });
    if (!report.entry) continue;
    if (report.ok) out.push(report.entry); else refused.push({ id: d.name, errors: report.errors });
  }
  return { store: { built: new Date().toISOString(), jevie: await jevieVersion(), extensions: out }, refused };
}

/// What a package's code reaches, read and never run: { hosts, programs, writes }.
export async function reachesOf(folder) {
  const { scan } = await import('./check.mjs').catch(() => ({ scan: null }));
  if (!scan) return null;
  const out = { hosts: new Set(), programs: new Set(), writes: 0, problems: [] };
  const walk = async dir => {
    for (const d of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (['node_modules', '.git'].includes(d.name)) continue;
      const full = join(dir, d.name);
      if (d.isDirectory()) await walk(full);
      else if (/\.(?:mjs|js|cjs)$/.test(d.name)) {
        const found = scan(await readFile(full, 'utf8').catch(() => ''), d.name);
        found.hosts.forEach(h => out.hosts.add(h)); found.programs.forEach(p => out.programs.add(p)); out.writes += found.writes; out.problems.push(...found.problems);
      }
    }
  };
  await walk(folder);
  return { hosts: [...out.hosts].sort(), programs: [...out.programs].sort(), writes: out.writes, problems: out.problems };
}

// ── The registry ─────────────────────────────────────────────────────────

const REPO_NAME = /^github\.com\/[\w.-]+\/[\w.-]+$/;
const TRUST = ['official', 'verified', 'checked'];

/// What keeps a registry entry out: { errors }.
export function registryIssues(entry, file = '') {
  const errors = [];
  const e = entry ?? {};
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(String(e.id ?? ''))) errors.push('id: lowercase letters, digits and hyphens');
  if (file && basename(file, '.json') !== e.id) errors.push(`the file is registry/${e.id}.json`);
  if (!REPO_NAME.test(String(e.repo ?? ''))) errors.push('repo: github.com/owner/name');
  if (e.folder !== undefined && !/^[\w.-]+(?:\/[\w.-]+)*$/.test(String(e.folder))) errors.push('folder: a path inside the repository, no ".."');
  if (String(e.folder ?? '').split('/').includes('..')) errors.push('folder: a path inside the repository, no ".."');
  if (!Array.isArray(e.owners) || !e.owners.length || e.owners.some(o => !/^[\w-]+$/.test(String(o)))) errors.push('owners: GitHub names, the author first');
  if (e.trust !== undefined && !TRUST.includes(e.trust)) errors.push(`trust: one of ${TRUST.join(', ')} (set by the store's maintainers)`);
  return { errors };
}

const sh = (cmd, args, opts = {}) => import('node:child_process').then(({ execFile }) => new Promise((done, fail) =>
  execFile(cmd, args, { timeout: 120000, maxBuffer: 32 * 1024 * 1024, ...opts }, (error, out) => error ? fail(error) : done(String(out)))));

/// The tags that release an extension: `<id>-v1.2.0` (any repository), or
/// `v1.2.0` when the repository is that one extension. Newest first, each
/// with its commit: [{ version, tag, commit }].
export function releasesIn(lsRemote, id, { whole = false } = {}) {
  const tags = new Map();
  for (const line of String(lsRemote).split('\n')) {
    const m = line.match(/^([0-9a-f]{40})\s+refs\/tags\/(.+?)(\^\{\})?$/);
    if (!m) continue;
    const name = m[2];
    const v = name.startsWith(`${id}-v`) ? name.slice(id.length + 2) : whole && /^v\d/.test(name) ? name.slice(1) : null;
    if (!v || !SEMVER.test(v)) continue;
    // An annotated tag's commit is the peeled (^{}) line's.
    if (m[3] || !tags.has(name)) tags.set(name, { version: v, tag: name, commit: m[1] });
  }
  return [...tags.values()].sort((a, b) => newer(a.version, b.version) ? -1 : newer(b.version, a.version) ? 1 : 0);
}

/// One registry entry as it is now: its newest release that passes, as a
/// store entry pinned to that commit - or why there is none.
export async function crawlEntry(entry, { exec = sh, scratch = null, revoked = [] } = {}) {
  const url = `https://${entry.repo}.git`;
  const listed = await exec('git', ['ls-remote', '--tags', url]).catch(error => { throw new Error(`cannot read ${entry.repo}: ${String(error.message).split('\n')[0]}`); });
  const pulled = new Set(revoked.filter(r => r.id === entry.id).map(r => r.version));
  const releases = releasesIn(listed, entry.id, { whole: !entry.folder }).filter(r => !pulled.has(r.version));
  if (!releases.length) throw new Error(`no release tag: tag a commit ${entry.folder ? `${entry.id}-v1.0.0` : 'v1.0.0'}`);
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const failures = [];
  for (const release of releases.slice(0, 3)) {
    const dir = await mkdtemp(join(scratch ?? tmpdir(), `crawl-${entry.id}-`));
    try {
      await exec('git', ['clone', '--quiet', '--depth', '1', '--branch', release.tag, url, dir]);
      const folder = entry.folder ? join(dir, entry.folder) : dir;
      const source = `git:${entry.repo}@${release.commit}${entry.folder ? `#${entry.folder}` : ''}`;
      const report = await entryOf(folder, { source });
      if (report.entry && report.entry.id !== entry.id) report.errors.push(`its manifest's id is "${report.entry.id}", not "${entry.id}"`);
      if (report.entry && report.entry.version !== release.version) report.errors.push(`tag ${release.tag} holds version ${report.entry.version}`);
      const reaches = await reachesOf(folder);
      for (const p of reaches?.problems ?? []) if (p.level === 'error') report.errors.push(`${p.file}: ${p.why}`);
      if (report.ok && !report.errors.length) {
        const { problems, ...kept } = reaches ?? {};
        void problems;
        return { ...report.entry, reaches: reaches ? kept : null, repo: entry.repo, ...(entry.folder ? { folder: entry.folder } : {}), owners: entry.owners,
          trust: entry.trust ?? 'checked', released: release.tag, commit: release.commit, listed: entry.listed ?? null };
      }
      failures.push(`${release.tag}: ${report.errors.join('; ')}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  throw new Error(failures.join(' · '));
}

/// CODEOWNERS, generated (Raycast's way): each entry's owners own its file,
/// and an official one's folder.
export function codeowners(registry, official = []) {
  const lines = ['# Generated by scripts/store.mjs build. Do not edit.', ''];
  for (const e of [...registry].sort((a, b) => a.id.localeCompare(b.id))) lines.push(`/registry/${e.id}.json ${e.owners.map(o => `@${o}`).join(' ')}`);
  for (const e of official) if (e.author) lines.push(`/extensions/${e.id}/ @${e.author}`);
  return `${lines.join('\n')}\n`;
}

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/// The store as a page (GitHub Pages): every extension with "Open in Jevie",
/// which types its install sentence into Jevie (jevie://ask), and a link
/// shared from Jevie (#install=<source>) shown as the same button.
export function site(store, { title = 'Jevie extensions' } = {}) {
  const ask = sentence => `jevie://ask?q=${encodeURIComponent(sentence)}`;
  const cards = store.extensions.map(e => `<article id="${esc(e.id)}"><h2>${esc(e.title)}</h2><p class="meta">${esc((e.categories ?? []).join(' · '))}${e.author ? ` · by ${esc(e.author)}` : ''} · v${esc(e.version)} · ${esc(e.trust ?? 'official')}</p>
<p>${esc(e.description)}</p><p class="say">${(e.examples ?? []).slice(0, 3).map(x => `“${esc(x)}”`).join(' · ')}</p>
<a class="open" href="${esc(ask(`install the ${e.title} extension`))}">Open in Jevie</a></article>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>:root{--bg:#fafafa;--ink:#151517;--faint:#6b6b70;--card:#fff;--line:#e5e5ea;--accent:#c2486a}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--ink:#ececec;--faint:#8a8a8e;--card:#1c1c1f;--line:#2c2c30;--accent:#e58da4}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,system-ui,sans-serif}main{max-width:880px;margin:0 auto;padding:32px 16px}
h1{margin:0 0 4px}header p{color:var(--faint);margin:0 0 24px}input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}article{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
h2{font-size:16px;margin:0}.meta,.say{color:var(--faint);font-size:13px;margin:4px 0}.open{display:inline-block;margin-top:6px;padding:6px 12px;border-radius:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}
#shared{display:none;margin-bottom:20px}#shared.on{display:block}</style></head><body><main>
<header><h1>${esc(title)}</h1><p>${store.extensions.length} extensions · found by what you say to them · <a href="https://github.com/${esc(store.repo ?? '')}">add yours</a></p></header>
<article id="shared"><h2>An extension shared with you</h2><p class="meta" id="shared-source"></p><a class="open" id="shared-open" href="#">Open in Jevie</a></article>
<input id="q" placeholder="Search extensions" autocomplete="off"><div class="grid">${cards}</div></main>
<script>const h=new URLSearchParams(location.hash.slice(1)).get('install');if(h&&/^(?:git|npm):[\\w.@:/#-]+$/.test(h)){const s=document.getElementById('shared');s.classList.add('on');document.getElementById('shared-source').textContent=h;document.getElementById('shared-open').href='jevie://ask?q='+encodeURIComponent('install extension '+h)}
document.getElementById('q').addEventListener('input',e=>{const w=e.target.value.toLowerCase();for(const a of document.querySelectorAll('.grid article'))a.style.display=a.textContent.toLowerCase().includes(w)?'':'none'})</script></body></html>
`;
}

/// The whole store: official extensions in extensions/, the registry's at
/// their newest passing release; what could not be listed is said, and the
/// entry keeps its last good listing rather than vanishing.
export async function buildStore(root, { source = null, exec = sh, previous = null, repo = null } = {}) {
  const official = await build(root, { source });
  const revoked = await readJSON(join(root, 'revoked.json'), []);
  const registry = [];
  for (const f of (await readdir(join(root, 'registry')).catch(() => [])).filter(f => f.endsWith('.json')).sort()) {
    const entry = await readJSON(join(root, 'registry', f), null);
    const { errors } = registryIssues(entry, f);
    if (errors.length) { official.refused.push({ id: f, errors }); continue; }
    registry.push(entry);
  }
  const listed = [], unlisted = [];
  const kept = new Map((previous?.extensions ?? []).map(e => [e.id, e]));
  for (const entry of registry) {
    try { listed.push(await crawlEntry(entry, { exec, revoked })); }
    catch (error) {
      unlisted.push({ id: entry.id, errors: [error.message] });
      if (kept.has(entry.id) && !revoked.some(r => r.id === entry.id && r.version === kept.get(entry.id).version)) listed.push(kept.get(entry.id));
    }
  }
  const officialIds = new Set(official.store.extensions.map(e => e.id));
  const store = { ...official.store, repo, extensions: [...official.store.extensions.map(e => ({ ...e, trust: 'official' })), ...listed.filter(e => !officialIds.has(e.id))]
    .sort((a, b) => a.title.localeCompare(b.title)), revoked };
  return { store, refused: official.refused, unlisted, codeowners: codeowners(registry, official.store.extensions) };
}

// Run as a script: in a function, not at the top level, so this module has
// finished loading when the surfaces it reaches (nativeAnswer) import it
// back - awaited at the top, each waited for the other and Node quit.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exit(1); });
async function main() {
  const [verb, folder, ...rest] = process.argv.slice(2);
  const flag = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
  if (verb === 'check' && folder) {
    const report = await entryOf(resolve(folder), { deep: !rest.includes('--quick') });
    for (const e of report.errors) console.log(`✗ ${e}`);
    for (const w of report.warnings) console.log(`· ${w}`);
    console.log(report.ok ? `✓ ${basename(resolve(folder))} can go in the store` : `${basename(resolve(folder))} cannot go in the store yet`);
    process.exit(report.ok ? 0 : 1);
  } else if (verb === 'build' && folder && await exists(join(resolve(folder), 'registry'))) {
    const root = resolve(folder), target = flag('--out') ?? join(root, 'store.json');
    const previous = await readJSON(target, null);
    const { store, refused, unlisted, codeowners: owners } = await buildStore(root, { source: flag('--source'), previous, repo: flag('--repo') });
    await writeFile(target, `${JSON.stringify(store, null, 2)}\n`);
    if (!rest.includes('--no-site')) {
      await import('node:fs/promises').then(fs => fs.mkdir(join(root, '.github'), { recursive: true }));
      await writeFile(join(root, '.github', 'CODEOWNERS'), owners);
      await writeFile(join(root, 'index.html'), site(store));
    }
    for (const r of refused) console.log(`✗ ${r.id}: ${r.errors.join('; ')}`);
    for (const u of unlisted) console.log(`· ${u.id} not updated: ${u.errors.join('; ')}`);
    console.log(`${store.extensions.length} in ${target}${refused.length ? `, ${refused.length} refused` : ''}${unlisted.length ? `, ${unlisted.length} not updated` : ''}`);
    process.exit(refused.length ? 1 : 0);
  } else if (verb === 'check-entry' && folder) {
    const entry = await readJSON(resolve(folder), null);
    const { errors } = registryIssues(entry, folder);
    if (!errors.length) await crawlEntry(entry).then(e => console.log(`✓ ${e.id} ${e.version} from ${e.repo}@${e.commit.slice(0, 8)}`), error => errors.push(error.message));
    for (const e of errors) console.log(`✗ ${e}`);
    process.exit(errors.length ? 1 : 0);
  } else if (verb === 'build' && folder) {
    const { store, refused } = await build(resolve(folder), { source: flag('--source'), deep: rest.includes('--deep') });
    const target = flag('--out') ?? join(resolve(folder), 'store.json');
    await writeFile(target, `${JSON.stringify(store, null, 2)}\n`);
    for (const r of refused) console.log(`✗ ${r.id}: ${r.errors.join('; ')}`);
    console.log(`${store.extensions.length} in ${target}${refused.length ? `, ${refused.length} refused` : ''}`);
    process.exit(refused.length ? 1 : 0);
  } else {
    console.log('node jevie/kernel/extensions/store.mjs check <folder> [--quick] | build <store> [--out store.json] [--source git:host/owner/repo@ref] [--repo owner/name] [--deep] | check-entry registry/<id>.json');
    process.exit(2);
  }
}
