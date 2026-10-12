# For coding agents

You are probably here to write a Jevie extension, port a Raycast one, or list
one in this store. Read this file first; it is short and it is the contract.

## What an extension is

A folder with `jevie-extension.json` and an `.mjs` entry whose default export
receives `(jevie, context)`. It answers **sentences**: its `examples` are how
people find it, how Jevie's check tests it, and what the store searches. Read
[docs/API.md](docs/API.md) for the manifest and the API, and copy
[templates/list](templates/list) to start.

### A command or a card?

- **A command** answers when the person asks: "hn show", "my prs". It runs
  on Return and shows a list, a detail or a form.
- **A card** shows under the field while they type: "bundle size zod", "aqi
  delhi". It is one answer at a glance, and Return copies it. Its `match` must
  be words or a pattern (decided in code). Start from `templates/card`.

## Where to write it

- For the person you work for: `~/.jevie/extensions/<id>/`. Jevie finds it
  there (they say "reload extensions"). Do not install or approve it yourself.
- For this store, by hand: in the author's own repository, then a registry
  entry here (CONTRIBUTING.md). Do not add code under `extensions/`: that
  folder is Jevie's own.

## Rules that fail the check

- Manifest: `id` (lowercase, hyphens), `title`, `description` (< 200 chars),
  exact `version`, `examples` (≥ 1), `categories` from the closed list in
  CONTRIBUTING.md.
- `README.md` present; a `CHANGELOG.md` entry `## <version> - <date>` for the
  current version.
- Every `fetch` has `AbortSignal.timeout(…)` or the context's signal.
- No `eval`, no `new Function`, no `exec("…")` shell strings (use `execFile`
  with arguments), no install scripts, exact dependency versions.
- No keys or tokens in code. Declare a `password` preference
  (`apiVersion: 2`) and read `context.preferences`.
- No home paths (`/Users/<name>`) and no private or workplace hosts. Make them
  `text` preferences.
- Not a duplicate of what Jevie answers itself (weather, Spotify, clipboard
  history, window layouts, processes, ports, system monitor, and cards for
  cron, chmod, pace, time zones, units, tips …). A card's words must not
  take a word Jevie uses ("dig" is its file finder). The check
  says each example to Jevie's own surfaces and refuses the extension if all
  of them are answered there.

## Names and effects

- `names` are objects, not verbs: "npm package", not "npm"; "subreddit",
  not "reddit".
- `command({ reversible: true })` only when it only reads. Jevie runs those
  while a sentence is still being spoken.
- Secrets never go in a row: `Action.CopySecret(sentence)` +
  `jevie.Secret(value)`.

## Checking

```sh
node scripts/store.mjs check <folder> --quick       # the store's rules
node scripts/store.mjs check-entry registry/<id>.json  # a registry entry and its newest release
```

With Jevie's source at hand, `node <jevie>/jevie/kernel/extensions/store.mjs
check <folder>` also loads it once and says every example to it.

## Sharing is the person's choice

Never push, tag or open a pull request to share an extension unless the
person asked you to. In Jevie they say "share extension <id>", and Jevie
shows them what would go first. If you work through Jevie's MCP server, ask
it the same sentence (`jevie_ask`): the person still approves.
