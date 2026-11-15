# Artifact sync: how the homepage stays current

anesthesiabootcamp.com is the static page in `site/`. GitHub Pages redeploys it on every
push to `main` (`.github/workflows/pages.yml`). The card list is `site/pages.json`.

A daily scheduled task follows these steps. A person can run them by hand too.

## Rule

A Claude artifact appears on the site only when **it is shared publicly** and is
**anesthesia or medical teaching material**. Making an artifact public is the way to publish it.

## Steps

1. Read `site/pages.json`. Known URLs are every `pages[].url`, every `pages[].links[].url`,
   and every `ignore[].url`.
2. List the owner's artifacts (claude-artifacts `list_artifacts`).
3. **Visibility pass:** for every known claude.ai URL on a card or link, check `read` with
   `get_artifact`:
   - Card with `"hidden": "private"` whose artifact is now `public` → remove `hidden`.
   - Visible card whose artifact is no longer `public` → set `"hidden": "private"`.
   - Link with `"private": true` that is now `public` → remove `private`; the reverse sets it.
   - Never touch a card whose `hidden` is `true` (hidden on purpose by the owner).
4. **New artifacts:** for each artifact whose URL is not known:
   - Not `public` yet → skip it for now (no change, so it is checked again next run).
   - Public but not teaching material (personal, wedding, climbing, finances, test pages) →
     add it to `ignore` with a short `why`.
   - A handout or one-pager companion to an existing card (same topic, title contains
     "Handout", "One-Pager", "Quick Reference" or similar) → add
     `{"label": "Handout", "url": ...}` to that card's `links`.
   - A newer copy of an artifact already on a card (same title) → point the card's `url` at
     the newer one and add the old URL to `ignore`.
   - Otherwise add a card: `title` (drop suffixes like "— OR Chalk Talk"), `url`, one fitting
     `emoji`, `category` (reuse an existing one: Trauma & Acute Care, Regional & Local
     Anesthetics, Pharmacology, Inhaled Agents & the Machine, Acid–Base, Foundations; create a
     new one only when none fits), a one-sentence `blurb` from the artifact's own description
     or opening text (never invent clinical content), `tags` (e.g. "chalk talk", "interactive",
     "board questions", "handout"), and `updated` as the artifact's last-update date (YYYY-MM-DD,
     America/Denver).
5. If `pages.json` changed: validate it parses, commit to `main` with a message listing what
   was added, unhidden or hidden, and push. The site redeploys in about a minute.
6. Report a short summary. If nothing changed, say so in one line.

Do not edit `site/index.html`, remove cards, or change an existing blurb, category or tags.
