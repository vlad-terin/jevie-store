// Obsidian: "obsidian note networking" finds notes in your vault - by name
// first, then by what they say - and shows each beside the list; return
// opens it in Obsidian, ⌘C copies its path. Read-only: nothing in the vault
// is written. A lean port of Raycast's Obsidian extension; the vault comes
// from Obsidian's own list (~/Library/Application Support/obsidian), or the
// extension's settings. "obsidian" alone stays the application's.

import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, relative, basename } from 'node:path';

/// The vault Obsidian lists first, from its own config.
export async function vaultFromConfig(read = readFile, home = homedir()) {
  const raw = await read(join(home, 'Library', 'Application Support', 'obsidian', 'obsidian.json'), 'utf8').catch(() => null);
  const vaults = raw ? Object.values(JSON.parse(raw).vaults ?? {}) : [];
  return (vaults.find(v => v.open) ?? vaults[0])?.path ?? null;
}

/// Obsidian's own URL for a note, which opens it there.
export function noteUrl(vaultPath, file) {
  return `obsidian://open?vault=${encodeURIComponent(basename(vaultPath))}&file=${encodeURIComponent(file.replace(/\.md$/, ''))}`;
}

/// Notes ranked for a query: name hits first, then content hits, newest
/// first within each; without a query, the newest notes.
export function rank(notes, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const newest = (a, b) => b.mtime - a.mtime;
  if (!words.length) return [...notes].sort(newest).slice(0, 15);
  const inName = notes.filter(n => words.every(w => n.name.toLowerCase().includes(w)));
  const inText = notes.filter(n => !inName.includes(n) && words.every(w => n.text.toLowerCase().includes(w)));
  return [...inName.sort(newest), ...inText.sort(newest)].slice(0, 15);
}

const SKIP = new Set(['.obsidian', '.trash', 'attachments', 'node_modules', '.git']);
async function notesIn(vault, { most = 400 } = {}) {
  const out = [];
  const walk = async folder => {
    for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
      if (out.length >= most) return;
      if (entry.isDirectory()) { if (!SKIP.has(entry.name) && !entry.name.startsWith('.')) await walk(join(folder, entry.name)); continue; }
      if (!entry.name.endsWith('.md')) continue;
      const path = join(folder, entry.name);
      const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8').catch(() => '')]);
      out.push({ name: entry.name.replace(/\.md$/, ''), file: relative(vault, path), path, mtime: info.mtimeMs, text: text.slice(0, 50_000) });
    }
  };
  await walk(vault);
  return out;
}

export default function obsidian(jevie, context) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    // The first name is the one shown: "Obsidian vault", what it is - not
    // "Obsidian Notes" beside Jevie's own Notes (8 October 2026).
    names: ['obsidian vault', 'obsidian note', 'obsidian notes', 'vault note', 'obsidian search'],
    what: 'notes in your Obsidian vault',
    examples: ['obsidian notes', 'obsidian note networking'],
    reversible: true,
    async run(text) {
      const vault = String(context?.preferences?.vault ?? '').trim() || await vaultFromConfig();
      if (!vault) return { status: 'needs-help', spoken: 'No Obsidian vault found.', lines: [{ title: 'No Obsidian vault found', subtitle: 'open Obsidian once, or set the folder in "settings for obsidian"' }] };
      const notes = rank(await notesIn(vault), text);
      return List({ title: text ? `Obsidian · ${text}` : 'Obsidian · newest notes', empty: `Nothing in the vault for ${text}`,
        items: notes.map(note => ({ title: note.name, subtitle: note.file.includes('/') ? note.file.slice(0, note.file.lastIndexOf('/')) : '', icon: 'text.book.closed',
          accessory: new Date(note.mtime).toISOString().slice(0, 10),
          actions: [Action.OpenInBrowser(noteUrl(vault, note.file)), Action.Preview(note.text.slice(0, 4000)), Action.CopyToClipboard(note.path)] })) });
    }
  }));
}
