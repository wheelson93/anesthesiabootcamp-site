# Artifact sync: how the site stays current

anesthesiabootcamp.com is built from `site/`. Every push to `main` runs `tools/build.py` (which
checks all card lists) and then deploys. The OR talks card list is `site/pages.json`.

Talks are **copied onto the site** (`site/talks/<name>/`) so they open on the site and in the
home-screen app instead of jumping to the Claude app. `site/talks/talks.json` records, for each
copy, the Claude artifact it came from (`slug`, `short` id) and the `version` last copied.

A daily scheduled task follows these steps. A person can run them by hand too.

## Rule

A Claude artifact appears on the site only when **it is shared publicly** and is
**anesthesia or medical teaching material**. Making an artifact public is the way to publish it.

## Steps

1. Read `site/pages.json` and `site/talks/talks.json`. Known artifacts are every `short` id in
   talks.json, every key in its `redirects`, every claude.ai URL still on a card, and every
   `ignore[].url` in pages.json.
2. List the owner's artifacts (claude-artifacts `list_artifacts`).
3. **Refresh copies:** for each talk in talks.json, `get_artifact` its `slug`. If the version differs
   from the recorded `version`, download it (`read_file` with `paths: ["index.html"]`, which saves it
   to disk) and run `python3 tools/mirror.py NAME SAVED_FILE --version NEW_VERSION`.
4. **Visibility pass:** a card whose artifact is no longer `public` gets `"hidden": "private"`; a card
   with `"hidden": "private"` whose artifact is public again has `hidden` removed. Never touch
   `"hidden": true` (hidden on purpose).
5. **New artifacts:** for each artifact that is not known:
   - Not `public` yet → skip it for now.
   - Public but not teaching material (personal, wedding, climbing, finances, test pages) → add it
     to `ignore` in pages.json with a short `why`.
   - A plain HTML artifact (not `made_from_type`) → copy it onto the site:
     download as in step 3, then
     `python3 tools/mirror.py NAME SAVED_FILE --slug SLUG --short SHORT_ID --version VERSION`
     (NAME: lowercase-with-dashes from the title; SHORT_ID: the last part of its claude.ai URL).
     The card's `url` is `/talks/NAME/`.
   - Made from a type (Docs, Design) → for Docs, export a PDF (Claude Docs `export`, format pdf) into
     `site/handouts/NAME.pdf` and use that as the url; for other types use the claude.ai URL.
   - A handout or one-pager companion to an existing card → add `{"label": "Handout PDF", "url": ...}`
     to that card's `links` (a PDF if one exists, otherwise its URL), and add its short id to
     talks.json `redirects` if it is a PDF on the site.
   - A newer copy of an artifact already on a card (same title) → mirror the new one under the same
     NAME and add the old short id to `redirects`.
   - Otherwise the card gets: `title` (drop suffixes like "— OR Chalk Talk"), `url`, one fitting
     `emoji`, `category` (reuse an existing one when it fits), a one-sentence `blurb` from the
     artifact's own description or opening text (never invent clinical content), `tags`, and
     `updated` as the artifact's last-update date (YYYY-MM-DD, America/Denver).
6. If anything changed: run `python3 tools/build.py` and fix anything it reports, commit to `main`
   with a message listing what was added, refreshed, unhidden or hidden, and push. The site redeploys
   in about a minute.
7. Report a short summary. If nothing changed, say so in one line. If `build.py` printed a
   "light diagram colors" warning for a talk, include it in the summary: that talk has a graphic
   that may be hard to read in dark mode, and a rule needs adding to `site/assets/theme.css`
   (which this task does not edit).

Only edit `site/pages.json`, `site/talks/`, and `site/handouts/`. Do not edit `site/sections.json`,
generated files (section `index.html` files, `sw.js`), or the other section folders (`icu/`,
`one-pagers/`, `papers/`; maintained by hand). Do not remove cards or change an existing blurb,
category or tags.
