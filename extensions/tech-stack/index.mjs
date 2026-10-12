// What a site is built with, as a card while it is typed - BuiltWith's
// question, answered with the open fingerprints of webappanalyzer
// (github.com/enthec/webappanalyzer, GPL-3.0, Wappalyzer's open
// successor): its headers, cookies, HTML, script addresses and meta tags
// matched against ~5,500 technologies, with the distinctive names of the
// globals a page sets up (__NEXT_DATA__) looked for in its HTML. The fingerprints are fetched once a
// week and kept; the page is read, never run.
//
//   "built with vercel.com", "tech stack github.com", "what is stripe.com built with"

export const PATTERN = '^(?:built\\s+with|tech\\s+stack|stack\\s+of|wappalyzer|builtwith)\\s+(?:https?://)?[a-z0-9-]+(?:\\.[a-z0-9-]+)+\\S*$|^what\\s+is\\s+(?:https?://)?[a-z0-9-]+(?:\\.[a-z0-9-]+)+\\S*\\s+built\\s+(?:with|on)\\??$';
const BASE = 'https://raw.githubusercontent.com/enthec/webappanalyzer/main/src';
const FILES = ['_', ...'abcdefghijklmnopqrstuvwxyz'];
const WEEK = 7 * 864e5;

/// A fingerprint's pattern: "^Next\\.js ?([0-9.]+)?\;version:\\1" → { re, version }.
const compiled = new Map();
export function pattern(text) {
  if (compiled.has(text)) return compiled.get(text);
  const made = compile(text);
  compiled.set(text, made);
  return made;
}
/// A word the pattern cannot match without ("wp-content" in
/// "/wp-content/themes/"), lower-cased: a quick includes() before the regex.
/// None when the pattern has alternatives or is too loose to have one.
// Words every page has: no help in telling one technology from another.
const COMMON = new Set(['script', 'link', 'meta', 'href', 'src=', 'class', 'content', 'http', 'https', 'https:', 'http:', 'type', 'text', 'name', 'data-', 'style', 'html', 'body', 'head', 'rel=', 'span', 'div>']);
export function literalOf(source) {
  if (/(?<!\\)\|/.test(source)) return null;
  const plain = source.replace(/\\([.\/\-_:?=&#])/g, '$1').replace(/\((?:\?:)?[^()]*\)[?*]?|\[[^\]]*\][?*+]?|\\[a-zA-Z]|[.^$*+?{}]/g, ' ');
  const runs = plain.split(/[^A-Za-z0-9_\-\/.:=]+/).filter(r => r.length >= 4 && !COMMON.has(r.toLowerCase())).sort((a, b) => b.length - a.length);
  return runs[0]?.toLowerCase() ?? null;
}
function compile(text) {
  const [source, ...tags] = String(text ?? '').split('\\;');
  const version = tags.find(t => t.startsWith('version:'))?.slice(8) ?? null;
  try { return { re: new RegExp(source || '.', 'i'), version, literal: literalOf(source) }; } catch { return null; }
}
const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const versionOf = (p, match) => p.version && match ? p.version.replace(/\\(\d)/g, (_, i) => match[Number(i)] ?? '').replace(/\?:.*$/, '').trim() || null : null;

/// Only what can be seen without running the page.
export function compact(technologies) {
  const out = {};
  for (const [name, t] of Object.entries(technologies)) {
    const f = { cats: t.cats ?? [] };
    if (t.headers) f.headers = t.headers;
    if (t.cookies) f.cookies = t.cookies;
    if (t.meta) f.meta = t.meta;
    if (t.html) f.html = list(t.html);
    if (t.scriptSrc) f.scriptSrc = list(t.scriptSrc);
    if (t.url) f.url = list(t.url);
    if (t.implies) f.implies = list(t.implies).map(i => String(i).split('\\;')[0]);
    // A global a page sets up (__NEXT_DATA__, Shopify): its name is in the
    // HTML too when it is long and distinctive enough to stand on its own.
    const globals = Object.keys(t.js ?? {}).filter(k => /^[A-Za-z_$][\w$]*$/.test(k) && k.length >= 8 && /[_A-Z$]/.test(k.slice(1)));
    if (globals.length) f.globals = globals;
    if (t.scripts) f.scripts = list(t.scripts);
    if (Object.keys(f).length > 1) out[name] = f;
  }
  return out;
}

/// The technologies a response shows: [{ name, version, cats }].
export function detect(fingerprints, { url, headers, html }) {
  const head = Object.fromEntries([...headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
  const cookies = String(head['set-cookie'] ?? '').split(/,(?=\s*[^;,=\s]+=)/).map(c => c.split('=')[0].trim().toLowerCase()).filter(Boolean);
  const metas = Object.fromEntries((html.match(/<meta\b[^>]*>/gi) ?? []).map(t => [String(t.match(/(?:name|property)\s*=\s*["']([^"']+)/i)?.[1] ?? '').toLowerCase(), t.match(/content\s*=\s*["']([^"']*)/i)?.[1] ?? '']).filter(([k]) => k));
  const scripts = (html.match(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)/gi) ?? []).map(s => s.replace(/^.*src\s*=\s*["']/i, ''));
  const sources = scripts.join('\n').toLowerCase();
  const lower = html.toLowerCase();
  const may = p => !p.literal || lower.includes(p.literal);
  // Once each: the page's long identifiers, its inline scripts, its script addresses.
  const words = new Set(html.match(/[A-Za-z_$][\w$]{7,}/g) ?? []);
  const inline = (html.match(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) ?? []).join('\n');
  const inlineLower = inline.toLowerCase();
  const found = new Map();
  const hit = (name, f, version) => { if (!found.has(name) || (!found.get(name).version && version)) found.set(name, { name, version: version ?? found.get(name)?.version ?? null, cats: f.cats }); };
  for (const [name, f] of Object.entries(fingerprints)) {
    for (const [k, v] of Object.entries(f.headers ?? {})) { const h = head[k.toLowerCase()]; if (h === undefined) continue; const p = pattern(v); const m = p && h.match(p.re); if (m) hit(name, f, versionOf(p, m)); }
    for (const k of Object.keys(f.cookies ?? {})) if (cookies.includes(k.toLowerCase())) hit(name, f, null);
    for (const [k, v] of Object.entries(f.meta ?? {})) { const c = metas[k.toLowerCase()]; if (c === undefined) continue; for (const one of list(v)) { const p = pattern(one); const m = p && c.match(p.re); if (m) hit(name, f, versionOf(p, m)); } }
    for (const s of f.scriptSrc ?? []) { const p = pattern(s); if (!p || (p.literal && !sources.includes(p.literal))) continue; for (const src of scripts) { const m = src.match(p.re); if (m) { hit(name, f, versionOf(p, m)); break; } } }
    for (const s of f.html ?? []) { const p = pattern(s); const m = p && may(p) && html.match(p.re); if (m) hit(name, f, versionOf(p, m)); }
    for (const g of f.globals ?? []) if (words.has(g)) { hit(name, f, null); break; }
    for (const s of f.scripts ?? []) { const p = pattern(s); const m = p && inline && (!p.literal || inlineLower.includes(p.literal)) && inline.match(p.re); if (m) hit(name, f, versionOf(p, m)); }
    for (const s of f.url ?? []) { const p = pattern(s); const m = p && url.match(p.re); if (m) hit(name, f, versionOf(p, m)); }
  }
  // What the found imply (Next.js → React), once.
  for (const t of [...found.values()]) for (const i of fingerprints[t.name]?.implies ?? []) if (!found.has(i) && fingerprints[i]) found.set(i, { name: i, version: null, cats: fingerprints[i].cats, implied: true });
  return [...found.values()];
}

export function cardOf(host, techs, categories, P) {
  const { line, spread, stack, hero, chip, meta, title } = P;
  const groups = new Map();
  for (const t of techs) { const cat = categories[t.cats[0]]?.name ?? 'Other'; groups.set(cat, [...(groups.get(cat) ?? []), t]); }
  const order = ['JavaScript frameworks', 'Web frameworks', 'CMS', 'Ecommerce', 'PaaS', 'Hosting', 'CDN', 'Web servers', 'Analytics', 'Tag managers', 'Marketing automation', 'Live chat', 'Advertising', 'Payment processors', 'JavaScript libraries', 'UI frameworks', 'Security'];
  const sorted = [...groups].sort((a, b) => ((order.indexOf(a[0]) + 1) || 99) - ((order.indexOf(b[0]) + 1) || 99));
  const named = t => `${t.name}${t.version ? ` ${t.version}` : ''}`;
  const lead = sorted.flatMap(([, ts]) => ts).filter(t => !t.implied).slice(0, 4).map(named);
  const summary = `${host}: ${lead.join(', ') || 'nothing recognised'}`;
  return { summary, copy: sorted.map(([cat, ts]) => `${cat}: ${ts.map(named).join(', ')}`).join('\n'), complete: techs.length ? 1 : 0.5, body: [
    spread(stack('leading', line(title(host)), line(meta(lead.join(' · ') || 'nothing recognised in what it sends'))), stack('trailing', line(hero(String(techs.length))), line(chip('technologies', 'square.stack.3d.up')))),
    ...sorted.slice(0, 5).map(([cat, ts]) => line(chip(cat), meta(ts.slice(0, 4).map(named).join(' · ')))),
    line(meta(`${sorted.length > 5 ? `+${sorted.length - 5} more groups · ` : ''}webappanalyzer fingerprints · ↵ copies them all`))
  ] };
}

export default function techStack(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Tech stack', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  let data = null;
  const load = async () => {
    if (data) return data;
    const kept = await context.state.get('fingerprints').catch(() => null);
    if (kept && Date.now() - kept.at < WEEK) return (data = kept);
    const get = path => fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(15000) }).then(r => r.ok ? r.json() : Promise.reject(new Error(`the fingerprints answered ${r.status}`)));
    const [categories, ...parts] = await Promise.all([get('categories.json'), ...FILES.map(f => get(`technologies/${f}.json`))]);
    data = { at: Date.now(), categories: Object.fromEntries(Object.entries(categories).map(([id, c]) => [id, { name: c.name }])), fingerprints: compact(Object.assign({}, ...parts)) };
    await context.state.set('fingerprints', data).catch(() => {});
    return data;
  };
  jevie.registerCard({
    name: 'tech-stack', label: 'Tech stack', symbol: 'square.stack.3d.up', match: { pattern: PATTERN }, examples: ['built with vercel.com', 'tech stack github.com'],
    async render(said) {
      let address = said.trim().replace(/^(?:built\s+with|tech\s+stack|stack\s+of|wappalyzer|builtwith)\s+/i, '').replace(/^what\s+is\s+/i, '').replace(/\s+built\s+(?:with|on)\??$/i, '');
      if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
      try {
        const [d, r] = await Promise.all([load(), fetch(address, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', accept: 'text/html' } })]);
        if (!r.ok) return note(`the site answered ${r.status}`, true);
        const html = (await r.text()).slice(0, 600_000);
        const url = r.url || address;
        return cardOf(new URL(url).hostname.replace(/^www\./, ''), detect(d.fingerprints, { url, headers: r.headers, html }), d.categories, P);
      } catch (error) { return note(String(error.message).slice(0, 120), true); }
    }
  });
}
