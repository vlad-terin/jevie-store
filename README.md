# Jevie store

The extensions Jevie installs from. In Jevie, type `extensions`: words narrow
the list as you type, ↵ installs, Tab walks it by keys. Or browse
[the store's page](https://vlad-terin.github.io/jevie-store/).

## How it is laid out

Unlike Raycast's store, which holds every extension's code, this store mostly
holds pointers. An extension lives in its author's own repository, and joins
the store once:

```
registry/<id>.json   { "id", "repo": "github.com/you/jevie-extensions", "folder", "owners", "listed" }
extensions/<id>/     Jevie's own extensions, kept here
revoked.json         versions pulled from the store
store.json           built every hour: each extension at its newest release that passes
index.html           the store's page, built with it
.github/CODEOWNERS   built from registry/: an entry's owners own it
```

- **Joining** is one pull request adding `registry/<id>.json`.
- **Updating** needs no pull request. Tag a release in your repository
  (`<id>-v1.2.0`). The hourly crawl finds it, checks it, pins it to its commit
  and lists it.
- **Trust:** `official` (Jevie's own), `verified` (a maintainer read it),
  `checked` (it passed the checks). Jevie shows which.
- **Pulled:** a version in `revoked.json` is never listed again, and Jevie
  tells whoever installed it.

## Cards

An extension can add a **card**: drawn under the field while a line is typed,
as Jevie's own event, split and time-zone cards are. Examples: "bundle size
zod", "air quality berlin", "dns github.com". Type `extensions cards` in Jevie
to see them. A card is matched by its words in code (never by a model) and
rendered when typing pauses, and ↵ copies its answer. Start from
[templates/card](templates/card); the API is in
[docs/API.md](docs/API.md#cards).

**A single card** (a checklist, a split bill, a lookup) can be shared too:
say **share the last card**, or **share a card** to pick one. It goes into
`cards/` in your own repository. The link shows it on the store's page, and
"Open in Jevie" types its words, which makes the card again. If the card is
an extension's, the page offers that extension first.

## Sharing yours

The easy way is from Jevie. It asks "Share it?" once an extension of yours has
worked a few times, or you say **share extension <id>** at any time. Choose:

| | what happens |
|---|---|
| keep it mine | nothing, never asked again |
| share a link | pushed to `<you>/jevie-extensions` (Jevie makes it); a link and a sentence that install it |
| list it in the store | the same, plus the pull request here |
| only my team | pushed to a team's repository (a private one is fine) |

Before anything goes, Jevie:
- checks the store's rules;
- refuses an extension whose sentences Jevie already answers;
- stops on keys in the code, your home path, or private and workplace hosts;
- writes what is missing (title, author, README, CHANGELOG).

Then it shows you what would go, and pushes only after your yes.

New versions: **release extension <id>** (or `… minor`, `… 2.0.0`).

By hand: see [CONTRIBUTING.md](CONTRIBUTING.md). Porting from Raycast: see
[PORTING.md](PORTING.md). Coding agents: see [AGENTS.md](AGENTS.md).

## Other sources

Any repository laid out like `<you>/jevie-extensions` is a tap. Say **add
extensions from acme/tools**, and its extensions show next to the store's. A
private repository works for anyone `gh` is signed in as with access, which
makes it a team store.

## Forking

**fork the <name> extension** makes a copy of your own. **send my changes to
<name>** opens a pull request to wherever it came from.
