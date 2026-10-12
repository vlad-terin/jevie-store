# The extension API

An extension is a folder: `jevie-extension.json` and an `.mjs` entry whose
default export receives `(jevie, context)`. It runs in its own Node process
with your permissions: isolated against crashes, not a sandbox.

## The manifest

```json
{
  "id": "hacker-news",
  "title": "Hacker News",
  "apiVersion": 2,
  "version": "1.1.0",
  "description": "Hacker News front page, new, best, Ask and Show.",
  "entry": "index.mjs",
  "categories": ["News"],
  "icon": "newspaper",
  "author": "your-github-name",
  "requires": { "jevie": "1.1.0" },
  "topics": ["hacker news", "hn"],
  "examples": ["hacker news", "hn best", "hn show"],
  "preferences": [
    { "name": "count", "title": "Stories", "type": "number", "default": 30 }
  ]
}
```

| field | |
| --- | --- |
| `id` | lowercase letters, digits, hyphens; the folder's name |
| `apiVersion` | `1` or `2`; each version keeps loading as it did, forever |
| `version` | exact (`1.2.0`); bump it with every change |
| `examples` | the sentences it answers: how it is found, tried, said and checked |
| `categories` | Applications, Communication, Data, Design Tools, Developer Tools, Documentation, Finance, Fun, Media, News, Productivity, Security, System, Web, Other |
| `icon` | an SF Symbol name, or put `assets/icon.png` beside the manifest |
| `requires.jevie` | the oldest Jevie it runs on; older ones show "needs Jevie …" |
| `preferences` (2) | `{ name, title, type, description, required, default, choices }`; `type` is `text`, `password`, `number`, `choice` or `toggle`. A `password` goes to the Keychain |
| `hotkeys` (2) | `[{ "keys": "hyper h", "says": "@ext-hacker-news top" }]` |
| `menubar` (2) | `[{ "says": "@ext-hacker-news top 1", "title": "HN", "every": "15 minutes" }]` |

## Registering

| | |
| --- | --- |
| `command({ names, what, reversible, run(text, context) })` | a name, then words: most extensions are this; pass it to `registerSurface` |
| `registerTool({ name, description, readOnly, inputSchema, execute(args, context) })` | an operation with JSON Schema arguments, for agents too |
| `registerCommand(name, { execute(text, context) })` | a named command taking trailing text |
| `registerSurface({ about, propose })` | your own objects found by name ("open my planning note"): `propose` observes and returns candidates, each `run` acts |
| `registerMcpServer(name, config)` | an MCP server bundled with the extension |
| `on(event, handler)`, `onDispose(cleanup)` | lifecycle; release timers and sockets on unload |

## Answers

`List`, `Detail`, `Form`, `Cards` and `Action` are on the `jevie` object, and
in version 2 `Answer`, `Row`, `Table`, `Gauge`, `Progress` and `Note`. A
command can also return a string or `{ status, spoken, lines: [{ title,
subtitle }] }`. Every list is walked with vim keys, clicked and spoken in Jevie,
with no code of yours for it.

## Context

The factory's second argument: `context.id`, `context.directory`,
`context.state.get/set` (JSON per extension, survives reloads) and
`context.preferences` (the values of the manifest's `preferences`; a changed
value loads the extension again). A tool's `execute` also gets
`context.signal`, aborted when the call is cancelled. A call has 30 seconds.

## Installing and approval

The store pins every extension to a commit. Jevie fetches it without running
any script, checks it, and approves it by the hash of its files. If the files
change later, it waits for approval again. Locally:
**install extension ~/path/to/folder**, **reload extensions**,
**settings for <id>**, **uninstall extension <id>**.
