import { spawn } from 'node:child_process';
import { access, realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

// Keep the upstream evidence intact. Its text output is not a stable structured
// source-card API; do not infer paths or line ranges by parsing source text.
export async function search({ query, directory }, { cli, signal, timeoutMs = 120000, maxBytes = 2 * 1024 * 1024 } = {}) {
  signal?.throwIfAborted();
  if (typeof query !== 'string' || !query.trim() || query.length > 2000) throw new Error('Provide a code-search question.');
  if (['auth', 'doctor', 'skill', 'cache'].includes(query.trim())) throw new Error('Provide a full code-search question, not a jevgrep management command.');
  if (typeof directory !== 'string' || !isAbsolute(directory)) throw new Error('Choose an absolute repository directory.');
  const root = await realpath(directory);
  if (!(await stat(root)).isDirectory()) throw new Error('The search scope must be a directory.');
  await access(cli).catch(() => { throw new Error('Install this extension’s pinned dependency with npm ci --ignore-scripts in its package directory.'); });
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--concurrency', '4', '--max-source-bytes', '24000', '--', query.trim(), root], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '', bytes = 0, stopped, hardStop;
    const stop = reason => {
      if (stopped) return;
      stopped = reason;
      child.kill('SIGINT');
      hardStop = setTimeout(() => child.kill('SIGKILL'), 2000);
      hardStop.unref();
    };
    const abort = () => stop('cancelled');
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    const cleanup = () => { clearTimeout(timer); clearTimeout(hardStop); signal?.removeEventListener('abort', abort); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) stop('output-limit');
      else output += chunk;
    });
    // Diagnostics can contain provider data. Only expose upstream stdout evidence;
    // drain stderr without retaining it or placing it in Jevie's result history.
    child.stderr.resume();
    child.on('error', () => { cleanup(); reject(new Error('Could not start jevgrep.')); });
    child.on('close', code => {
      cleanup();
      if (signal?.aborted || stopped === 'cancelled') return reject(signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
      const status = stopped ?? (code === 0 ? 'complete' : code === 2 ? 'incomplete' : code === 130 ? 'interrupted' : 'failed');
      const heading = status === 'complete' ? 'Code search' : `Code search — ${status}`;
      resolve({
        content: [{ type: 'text', text: `# ${heading}\n\n${output.trim() || 'No source evidence returned. Check jevgrep authentication with its doctor command.'}` }],
        isError: ['failed', 'timeout', 'output-limit'].includes(status),
        _meta: { experimental: true, status, directory: root }
      });
    });
  });
}
