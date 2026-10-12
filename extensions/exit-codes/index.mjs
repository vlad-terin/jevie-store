// An exit status or a signal, as a card while it is typed, from the shell's
// conventions: 128 + n is "killed by signal n". Signals numbered the same
// on Linux and macOS only.
//
//   "exit code 137", "exit status 127", "exited with 139", "signal 9", "sigterm"

export const PATTERN = '^(?:(?:exit|exited)\\s+(?:code|status|with)\\s+\\d{1,3}|(?:exit|return)\\s+code\\s+\\d{1,3}|signal\\s+\\d{1,2}|sig(?:hup|int|quit|ill|abrt|fpe|kill|segv|pipe|alrm|term))$';
export const SIGNALS = { 1: ['SIGHUP', 'the terminal closed, or asked to reload its config'], 2: ['SIGINT', 'interrupted: Ctrl-C'], 3: ['SIGQUIT', 'quit with a core dump: Ctrl-\\'], 4: ['SIGILL', 'an illegal instruction'], 6: ['SIGABRT', 'aborted itself: a failed assertion or abort()'], 8: ['SIGFPE', 'an arithmetic error, such as dividing by zero'], 9: ['SIGKILL', 'killed outright; it could not clean up. In a container, usually the out-of-memory killer'], 11: ['SIGSEGV', 'a segmentation fault: it touched memory it does not own'], 13: ['SIGPIPE', 'wrote to a pipe nobody reads'], 14: ['SIGALRM', 'a timer ran out'], 15: ['SIGTERM', 'asked to stop: kill, docker stop, a shutdown'] };
const CODES = { 0: 'success', 1: 'a general error: see its output', 2: 'misused a shell builtin, or a bad argument', 126: 'found but not executable: check its permissions (chmod +x)', 127: 'command not found: check the name and PATH', 128: 'an invalid argument to exit', 255: 'out of range: exit was given a number over 255 or a negative one' };
export function explain(said) {
  const t = String(said).toLowerCase().trim();
  const name = t.match(/^sig([a-z]+)$/)?.[1];
  if (name) { const n = Object.keys(SIGNALS).find(k => SIGNALS[k][0] === `SIG${name.toUpperCase()}`); return n ? { kind: 'signal', n: Number(n), name: SIGNALS[n][0], meaning: SIGNALS[n][1], code: 128 + Number(n) } : null; }
  const sig = t.match(/^signal\s+(\d{1,2})$/);
  if (sig) { const n = Number(sig[1]); return SIGNALS[n] ? { kind: 'signal', n, name: SIGNALS[n][0], meaning: SIGNALS[n][1], code: 128 + n } : { kind: 'signal', n, name: `signal ${n}`, meaning: 'numbered differently on Linux and macOS: see kill -l', code: 128 + n }; }
  const code = Number(t.match(/(\d{1,3})$/)[1]);
  if (code > 255) return { kind: 'code', code, meaning: 'exit codes run 0 to 255: this is not one' };
  if (CODES[code]) return { kind: 'code', code, meaning: CODES[code] };
  if (code > 128 && code < 160) { const n = code - 128; return { kind: 'code', code, n, name: SIGNALS[n]?.[0] ?? `signal ${n}`, meaning: SIGNALS[n] ? `killed by a signal: ${SIGNALS[n][1]}` : `killed by signal ${n}, numbered differently on Linux and macOS: see kill -l` }; }
  return { kind: 'code', code, meaning: 'the program\'s own: see its documentation (sysexits.h uses 64–78)' };
}

export default function exitCodes(jevie) {
  const { line, spread, title, chip, meta, text } = jevie.CardParts;
  jevie.registerCard({
    name: 'exit-code', label: 'Exit code', symbol: 'xmark.octagon', match: { pattern: PATTERN }, examples: ['exit code 137'],
    async render(said) {
      const e = explain(said);
      if (!e) return { summary: 'Exit code', complete: 0, body: [line(meta('Type a code or a signal: “exit code 137”, “signal 9”'))] };
      const head = e.kind === 'signal' ? `${e.name} (${e.n})` : `Exit ${e.code}${e.name ? ` = ${e.name}` : ''}`;
      return { summary: `${head}: ${e.meaning}`, copy: `${head}: ${e.meaning}`, complete: 1, body: [spread(title(head), chip(e.kind === 'signal' ? `exit ${e.code}` : e.code === 0 ? 'success' : 'failure', e.code === 0 ? 'checkmark' : 'xmark.octagon')), line(text(e.meaning)), line(meta('128 + n is killed by signal n · shells and programs follow this by convention'))] };
    }
  });
}
