// Calls: "transcribe this call" starts a task (jevie/entry/call.mjs) that
// hears both sides and writes a transcript; "stop transcribing", or the
// row's ×, ends it with a summary. "call transcripts" lists the kept ones.
// The sentences are a closed set, decided here in code; nothing is asked of
// a model to start or stop. Text only: the audio is never kept.

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repository: the package's own folder is examples/extensions/calls in
// it (Jevie runs a cached copy, so import.meta.url is no guide).
let repo = process.env.JEVIE_REPO || join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const calls = () => process.env.JEVIE_CALLS_DIR || join(homedir(), '.jevie', 'calls');

const START = /^(?:please\s+)?(?:start\s+)?(?:transcrib(?:e|ing)|record(?:ing)?(?:\s+and\s+transcribe)?)\s+(?:this\s+|the\s+|my\s+|a\s+)?(?:(.+?)\s+)?(?:call|meeting|standup|stand-up|sync|interview)\b(?:\s+(with|about)\s+(.+))?$|^(?:start\s+)?(?:transcrib(?:e|ing)|(?:a\s+)?transcription)(?:\s+now)?$/i;
const STOP = /^(?:stop|end|finish)\s+(?:the\s+)?(?:transcri(?:bing|ption|be)|recording\s+(?:the\s+)?(?:call|meeting))(?:\s+(?:the\s+|this\s+)?(?:call|meeting))?$/i;
const LIST = /^(?:show\s+(?:me\s+)?|list\s+|open\s+)?(?:my\s+)?(?:call|meeting)\s+(?:transcripts?|notes)$|^transcripts$/i;

/// What a sentence asks of calls: { op, title? } or null.
export function parse(sentence) {
  const said = String(sentence ?? '').trim().replace(/[.!?]+$/, '');
  if (STOP.test(said)) return { op: 'stop' };
  if (LIST.test(said)) return { op: 'list' };
  const m = said.match(START);
  if (!m) return null;
  const noun = said.match(/\b(call|meeting|standup|stand-up|sync|interview)\b/i)?.[1];
  const named = (m[1] ?? '').replace(/^(?:this|that|our|my)\s+/i, '').trim();
  const kind = noun && !/^(call|meeting)$/i.test(noun) ? noun : '';
  const title = [named, kind || (m[3] ? noun.toLowerCase() : ''), m[3] ? `${m[2].toLowerCase()} ${m[3]}` : ''].filter(Boolean).join(' ').trim();
  return { op: 'start', title: title ? title.replace(/^\w/, c => c.toUpperCase()) : null };
}

async function running() {
  const tasks = await import(join(repo, 'jevie/kernel/tasks.mjs'));
  return (await tasks.list()).filter(t => t.sentence === 'transcribe this call' && !t.endedAt);
}

async function start(title) {
  if ((await running()).length) return { status: 'ok', spoken: 'Already transcribing.', lines: [{ title: 'Already transcribing this call', subtitle: 'say "stop transcribing" to end it' }] };
  const child = spawn(process.execPath, [join(repo, 'jevie/entry/call.mjs'), ...(title ? ['--title', title] : [])],
    { detached: true, stdio: 'ignore', cwd: repo, env: process.env });
  child.unref();
  return { status: 'ok', spoken: 'Transcribing.', keepView: false,
    lines: [{ title: `Transcribing ${title ?? 'this call'}`, subtitle: 'you and what the Mac plays · text only · "stop transcribing" or × to end' }] };
}

async function stop() {
  const tasks = await import(join(repo, 'jevie/kernel/tasks.mjs'));
  const now = await running();
  if (!now.length) return { status: 'ok', spoken: 'Nothing is being transcribed.', lines: [{ title: 'Nothing is being transcribed' }] };
  for (const t of now) await tasks.cancel(t.id);
  return { status: 'ok', spoken: 'Stopping. The summary follows.', lines: [{ title: 'Stopping the transcript', subtitle: 'the summary follows in the job row' }] };
}

async function list(List) {
  const names = (await readdir(calls()).catch(() => [])).filter(n => n.endsWith('.md')).sort().reverse().slice(0, 30);
  const items = await Promise.all(names.map(async name => {
    const path = join(calls(), name);
    const text = await readFile(path, 'utf8').catch(() => '');
    const summary = text.match(/## Summary\n\n([\s\S]*?)\n\n## Transcript/)?.[1] ?? '';
    const first = summary.replace(/\*\*[^*]+\*\*\s*-?\s*/g, '').split('\n').find(Boolean) ?? 'no summary';
    return { title: name.replace(/\.md$/, ''), subtitle: first.slice(0, 120), icon: 'waveform', path, preview: text.slice(0, 20000) };
  }));
  return List({ title: 'Call transcripts', empty: 'No calls transcribed yet. Say "transcribe this call".', items });
}

export default function callsExtension(jevie, context = {}) {
  const { List } = jevie;
  if (context.directory) repo = join(context.directory, '..', '..', '..');
  jevie.registerSurface({
    about: { name: 'calls', what: 'transcribe a call: start, stop, list the transcripts', examples: ['transcribe this call', 'stop transcribing', 'call transcripts'] },
    propose({ head, sentence = head }) {
      const asked = parse(sentence);
      if (!asked) return [];
      const label = asked.op === 'start' ? `transcribe ${asked.title ?? 'this call'} (you and what the Mac plays)` : asked.op === 'stop' ? 'stop transcribing the call' : 'list call transcripts';
      return [{ kind: `ext-calls-${asked.op}`, exact: true, whole: true, place: false, strength: 3, matched: [], names: ['call', 'transcribe'],
        reversible: asked.op === 'list', label,
        run: () => asked.op === 'start' ? start(asked.title) : asked.op === 'stop' ? stop() : list(List) }];
    }
  });
}
