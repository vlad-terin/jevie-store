# Contributing

## Listing an extension

1. Put it in a repository of yours, as `<id>/` (or the repository root for a
   one-extension repository). Jevie's "share extension <id>" does all of this
   for you.
2. Tag a release: `<id>-v1.0.0` (or `v1.0.0` at the root). The tag's
   `jevie-extension.json` must hold that version.
3. Open a pull request adding `registry/<id>.json`:

   ```json
   { "id": "lobsters", "repo": "github.com/you/jevie-extensions", "folder": "lobsters",
     "owners": ["you"], "listed": "2026-10-11" }
   ```

   Leave out `folder` for a repository that is the extension. Leave out
   `trust`: maintainers set it.
4. CI runs `node scripts/store.mjs check-entry registry/<id>.json`: the entry's
   shape, a release tag, and the store's rules on that release.

After it is merged, release by tagging. Nothing here needs to change.

## The rules for an extension

- `jevie-extension.json` needs `title`, `description` (under 200 characters),
  an exact `version`, at least one `examples` sentence, and one or more
  `categories`: Applications, Communication, Data, Design Tools, Developer
  Tools, Documentation, Finance, Fun, Media, News, Productivity, Security,
  System, Web, Other.
- A `README.md` saying what it does, what it needs and what to say. A
  `CHANGELOG.md` entry for every version.
- `requires.jevie` when it needs a newer Jevie than 1.1.0.
- No network call without a timeout. No keys in the code (declare a
  `password` preference). No `eval`, no shell strings, no install scripts.
- It must not duplicate what Jevie answers itself.

## Jevie's own (extensions/)

Changes to `extensions/<id>/` are ordinary pull requests: raise the version
and add a CHANGELOG entry. `node scripts/store.mjs check extensions/<id> --quick`.

## Pulling a version

A maintainer adds `{ "id", "version", "reason" }` to `revoked.json`.
