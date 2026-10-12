# Porting a Raycast extension

A Raycast extension is data code wrapped in React views. A port keeps the data
code (the `fetch` calls, the parsing, the formatting) and swaps the views for
the shapes Jevie draws itself. Most read-and-list extensions port in under an
hour; [Hacker News](extensions/hacker-news/index.mjs) is about forty lines.

Jevie does not run Raycast extensions as they are: `@raycast/api` is a React
renderer. What follows is the mapping, and it is mechanical.

## The quickest way: ask Jevie

Say **port the raycast <name> extension** in Jevie. Your coding agent writes
the port as a draft, following this guide; Jevie checks the draft and shows
it to you, and nothing installs without you. Then
**publish extension <id>** opens the pull request here.

Before you port: Jevie answers many Raycast extensions itself (Spotify,
window management, clipboard history, color picker, processes, ports,
weather, system monitor, …). Type `extensions <name>` in Jevie. If it says
"Jevie does this itself", there is nothing to port, and the store's check
refuses an extension whose every sentence Jevie already answers.

## The mapping

| Raycast | Jevie | Notes |
| --- | --- | --- |
| `package.json` | `jevie-extension.json` | see [the manifest](docs/API.md#the-manifest) |
| `commands[]` | one `command({ names, run })` each | a command is a name said or typed |
| command `title` and aliases | `names: ['hacker news', 'hn']` | every way a person might say it |
| `arguments` | the text after the name: `run(text)` | "hn show" → `run('show')` |
| `<List>` + `<List.Item>` | `List({ title, items })` | item: `title`, `subtitle`, `accessory`, `icon` (an SF Symbol), `actions` |
| `accessories` | `accessory` | one short string at the right |
| `<ActionPanel>` first action | first of `actions` | what ↵ does |
| `Action.OpenInBrowser` | `Action.OpenInBrowser(url)` | |
| `Action.CopyToClipboard` | `Action.CopyToClipboard(text)` | ⌘C; ↵ too when nothing else is on the row |
| `Clipboard.copy(…, { concealed })` | `Action.CopySecret(sentence)` + `Secret(value)` | see [secrets](#secrets) |
| `Action.Open`, `Action.ShowInFinder` | `Action.Open(path)` | opens and previews the file |
| `Action.Push` | `Action.Run('hn story 123')` | a sentence your command also answers |
| `List.Item.Detail` | `Action.Preview(markdown)` | the pane beside the list |
| `<Detail markdown metadata>` | `Detail({ markdown, metadata })` | |
| `<Form>` with a dropdown | `Form({ question, options })` | each option says a sentence |
| `<Form>` with text fields | the command's text | "@ext-notes add buy milk" |
| `showToast`, `showHUD` | `{ status: 'ok', spoken, lines: [{ title }] }` | |
| `useFetch`, `useCachedPromise` | `await fetch(…)` in `run` | always with `AbortSignal.timeout(…)` |
| `LocalStorage`, `Cache` | `context.state.get/set` | JSON per extension, survives reloads |
| `getPreferenceValues()` | `context.preferences` | declare `preferences` in the manifest (`apiVersion: 2`); Jevie draws the form |
| `open(url)`, `closeMainWindow()` | `Action.OpenInBrowser` on a row | |
| `runAppleScript` | `execFile('osascript', …)` | |
| `OAuth.PKCEClient` | an MCP server (`registerMcpServer`) | the MCP layer owns sign-in |
| menu bar command | `menubar` in the manifest (`apiVersion: 2`) | an answer kept in the menu bar, refreshed |
| keyboard shortcut | `hotkeys` in the manifest (`apiVersion: 2`) | |

The views come on the `jevie` object; nothing is imported:

```js
export default function (jevie) {
  const { List, Detail, Form, Action, command } = jevie;
  jevie.registerSurface(command({ names: ['…'], run: async text => List({ … }) }));
}
```

## Three rules Raycast does not have

**A name is an object, not a verb.** `names` say what the command is about:
"tldr", "npm package", "subreddit". The rest of the sentence says which. A
command runs unasked only when nothing else answers to its name, so:

- use two words when one is taken: `npm package`, not `npm` ("npm install
  zod" stays the shell's);
- never take a site's bare name: `reddit` opens reddit.com, the port answers
  to `subreddit`;
- `@ext-<id> …` always reaches your extension alone.

**Say when a command only reads.** `command({ reversible: true })` marks a
command that only fetches, lists or looks up. Jevie runs those while a
sentence is still being spoken, so leave it out of anything that changes
something (stops a container, sends, deletes, copies a password).

<a id="secrets"></a>
**Secrets never sit in an answer.** Answers are drawn, may be spoken, and are
recorded. A row carries only a sentence, `Action.CopySecret('@ext-1password
copy github')`; that sentence's command fetches the value when it is run and
answers `jevie.Secret(value, { label: 'the GitHub password', seconds: 30 })`.
Jevie copies it concealed and clears it after the seconds.

## Worked example: Hacker News

Raycast's (abridged from `raycast/extensions/extensions/hacker-news`):

```tsx
export default function Command() {
  const { data, isLoading } = useFetch<Story[]>(TOP_STORIES_URL, { parseResponse });
  return (
    <List isLoading={isLoading}>
      {data?.map(story => (
        <List.Item key={story.id} title={story.title}
          subtitle={`${story.score} points · by ${story.by}`}
          accessories={[{ text: ago(story.time) }]}
          actions={<ActionPanel>
            <Action.OpenInBrowser url={story.url} />
            <Action.CopyToClipboard content={story.url} />
          </ActionPanel>} />
      ))}
    </List>
  );
}
```

Jevie's ([in full](extensions/hacker-news/index.mjs)):

```js
export default function hackerNews(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['hacker news', 'hn'],
    what: 'Hacker News stories - top, new, best, ask or show',
    reversible: true,
    async run(text) {
      const feed = Object.keys(FEEDS).find(f => text.toLowerCase().startsWith(f)) ?? 'top';
      const list = await stories(feed, AbortSignal.timeout(8000));
      return List({
        title: `Hacker News · ${feed}`,
        items: list.map(story => ({
          title: story.title,
          subtitle: `${story.score ?? 0} points · by ${story.by} · ${story.descendants ?? 0} comments`,
          accessory: ago(story.time),
          icon: 'newspaper',
          actions: [Action.OpenInBrowser(story.url), Action.CopyToClipboard(story.url)]
        }))
      });
    }
  }));
}
```

`stories()` and `ago()` are the Raycast extension's own helpers, unchanged.

## Step by step

1. `cp -r templates/list extensions/<id>` and rename the id in
   `jevie-extension.json`.
2. Copy the Raycast extension's helpers from `src/` in beside `index.mjs`.
3. One `command()` per Raycast command; its title and aliases become `names`.
4. Replace each view (`<List>` → `List`, `<Detail>` → `Detail`, a dropdown
   `<Form>` → `Form`), keeping the actions in the ActionPanel's order.
5. Replace the hooks: `useFetch(url)` → `await fetch(url, { signal })`,
   `LocalStorage` → `context.state`, preferences → `context.preferences`.
6. TypeScript compiles to `.mjs` first:
   `esbuild src/index.ts --bundle --format=esm --platform=node --outfile=index.mjs`.
   Bundle dependencies in; the store installs no `node_modules`.
7. Try it: in Jevie, **install extension ~/path/to/extensions/<id>**, then say
   one of its `examples`.
8. `node scripts/store.mjs check extensions/<id> --quick`, write the README
   and the CHANGELOG, open the pull request (or **publish extension <id>**).

## What does not carry over yet

- Free-text forms with several fields: one field is the command's text.
- React state inside a view (search within a list, pagination): a Jevie list
  is an answer; searching is saying the command again with words after it.
- `AI.ask` and `LaunchProps` background refresh.

## Checklist

- [ ] `examples` are sentences someone would actually say
- [ ] every Raycast command has a `command()` with its aliases in `names`
- [ ] each row's first action is the ActionPanel's first
- [ ] every network call has a timeout
- [ ] `names` name an object and collide with no program, app or site
- [ ] `reversible: true` only on commands that only read
- [ ] no password, token or code in any row (`CopySecret` + `Secret`)
- [ ] README says what it does, what it needs, what to say; CHANGELOG has this version
- [ ] `node scripts/store.mjs check extensions/<id> --quick` passes
