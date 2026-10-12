// A curl command as fetch(), as a card while it is typed, converted on this
// Mac (nothing is requested): -X, -H, -d/--data/--data-raw/--json, -u, -A,
// -b, -L, --compressed. "curl to fetch" first, so a curl typed to be run
// stays the shell's.
//
//   "curl to fetch curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '{"a":1}'"

export const PATTERN = '^(?:curl\\s+to\\s+fetch|to\\s+fetch)\\s+curl\\s+.+$';
/// Shell words, with single and double quotes and backslash escapes.
export function words(cmd) {
  const out = []; let cur = '', q = null, any = false;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === q) q = null; else if (c === '\\' && q === '"' && i + 1 < cmd.length) cur += cmd[++i]; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; any = true; continue; }
    if (c === '\\' && cmd[i + 1] === '\n') { i++; continue; }
    if (c === '\\' && i + 1 < cmd.length) { cur += cmd[++i]; any = true; continue; }
    if (/\s/.test(c)) { if (cur || any) out.push(cur); cur = ''; any = false; continue; }
    cur += c; any = true;
  }
  if (cur || any) out.push(cur);
  return out;
}
export function convert(said) {
  const w = words(String(said).replace(/^(?:curl\s+to\s+fetch|to\s+fetch)\s+/i, '')).slice(1);
  let url = null, method = null, body = null; const headers = {}, notes = [];
  for (let i = 0; i < w.length; i++) {
    const a = w[i], next = () => w[++i];
    if (a === '-X' || a === '--request') method = next().toUpperCase();
    else if (a === '-H' || a === '--header') { const h = next(); const at = h.indexOf(':'); if (at > 0) headers[h.slice(0, at).trim()] = h.slice(at + 1).trim(); }
    else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii'].includes(a)) { const d = next(); body = body ? `${body}&${d}` : d; }
    else if (a === '--json') { body = next(); headers['Content-Type'] ??= 'application/json'; headers.Accept ??= 'application/json'; }
    else if (a === '-u' || a === '--user') headers.Authorization = `Basic ${Buffer.from(next()).toString('base64')}`;
    else if (a === '-A' || a === '--user-agent') headers['User-Agent'] = next();
    else if (a === '-b' || a === '--cookie') headers.Cookie = next();
    else if (a === '-e' || a === '--referer') headers.Referer = next();
    else if (a === '-L' || a === '--location') notes.push('fetch follows redirects by default');
    else if (a === '--compressed') notes.push('fetch asks for compression on its own');
    else if (['-s', '--silent', '-S', '-i', '-v', '-k', '--insecure', '-f', '--fail'].includes(a)) { if (a === '-k' || a === '--insecure') notes.push('-k (insecure TLS) has no fetch equivalent'); }
    else if (/^-/.test(a)) notes.push(`${a} not converted`);
    else url ??= a;
  }
  if (!url) return null;
  method ??= body ? 'POST' : 'GET';
  if (body && !Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  // A timeout too: a fetch without one can wait forever.
  const opts = [];
  if (method !== 'GET') opts.push(`  method: '${method}'`);
  if (Object.keys(headers).length) opts.push(`  headers: {\n${Object.entries(headers).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n  }`);
  opts.push('  signal: AbortSignal.timeout(10000)');
  if (body) { let shown = JSON.stringify(body); try { const parsed = JSON.parse(body); shown = `JSON.stringify(${JSON.stringify(parsed)})`; } catch { /* a string body */ } opts.push(`  body: ${shown}`); }
  const code = `const response = await fetch(${JSON.stringify(url)}, {\n${opts.join(',\n')}\n});\nconst data = await response.${/json/i.test(headers.Accept ?? '') || /json/i.test(headers['Content-Type'] ?? '') ? 'json' : 'text'}();`;
  return { url, method, headers, body, code, notes };
}

export default function curlToFetch(jevie) {
  const { line, spread, title, mono, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'curl-to-fetch', label: 'Curl to fetch', symbol: 'arrow.triangle.2.circlepath', match: { pattern: PATTERN }, examples: ['curl to fetch curl -X POST https://api.example.com/items -d \'{"name":"a"}\''],
    async render(said) {
      const c = convert(said);
      if (!c) return { summary: 'Curl to fetch', complete: 0, body: [line(meta('Paste a curl command after “curl to fetch”'))] };
      return { summary: `fetch ${c.method} ${c.url}`, copy: c.code, complete: 1, body: [spread(title(`${c.method} ${c.url.slice(0, 60)}`), chip(`${Object.keys(c.headers).length} headers${c.body ? ' · body' : ''}`, 'arrow.triangle.2.circlepath')), line(mono(c.code.split('\n').slice(0, 3).join('  '))), line(meta(`${c.notes.length ? `${c.notes.join(' · ')} · ` : ''}↵ copies the code`))] };
    }
  });
}
