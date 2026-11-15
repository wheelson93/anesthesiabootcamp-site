# Anesthesia Bootcamp

Will Cohen's teaching site: https://anesthesiabootcamp.com. It also installs as a
home-screen app (see "Install on a phone" below).

## How it fits together

```
site/
  sections.json          ← the list of sections (tabs in the app, links under each intro)
  pages.json             ← OR talks (home)        ← the nightly sync adds your new artifacts here
  icu/pages.json         ← ICU talks by Elijah
  one-pagers/pages.json  ← One Pagers by Kenji Tanabe
  papers/pages.json      ← Important papers
  talks/<name>/          ← your chalk talks, copied from Claude so they open on the site (not the Claude app)
  talks/talks.json       ← which Claude artifact each copy came from; the nightly sync refreshes stale copies
  handouts/*.pdf         ← printable PDFs (saved for offline use automatically)
  assets/                ← shared look and behavior (app.css, app.js, icons)
tools/
  build.py               ← checks everything, builds the pages and the offline cache
  page-template.html     ← the one page layout every section uses
  sw-template.js         ← offline caching
```

**You only ever edit the `pages.json` files** (and `sections.json` to add a section).
Every push to `main` runs `tools/build.py` and then deploys. If a file has a mistake, the
deploy stops, the live site keeps its last good version, and the failed run in the
**Actions** tab says exactly which file and card to fix.

Phones that installed the app pick up changes the next time it opens with a connection.

## Add a card

Open the section's `pages.json` (on github.com: the file → pencil icon → edit → Commit) and
add an entry to `"pages"`. Copy an existing card and change it:

```json
{
  "title": "Malignant Hyperthermia",
  "url": "https://claude.ai/artifact/…",
  "category": "Crisis",
  "emoji": "🔥",
  "blurb": "One or two sentences on what it covers.",
  "tags": ["chalk talk", "board questions"],
  "updated": "2026-11-20",
  "links": [
    { "label": "Handout PDF", "url": "/handouts/mh.pdf" }
  ]
},
```

Watch the commas: every card is followed by a comma except the last one.

| Field      | Notes |
|------------|-------|
| `title`, `url`, `category` | Required. A new category becomes a new filter chip and section heading automatically. |
| `emoji`, `blurb`, `tags`   | Optional |
| `why`      | Optional "Why it matters" paragraph (used on the papers page) |
| `source`   | Optional; shown top-right instead of the date, e.g. `"NEJM 2013"` |
| `updated`  | `YYYY-MM-DD`; newest first, "New" badge for 21 days |
| `featured` | `true` → "Start here" row at the top |
| `links`    | Extra buttons: `{"label": "…", "url": "…"}`. Add `"private": true` to hide one |
| `hidden`   | `true` = hidden by you (the sync never changes it); `"private"` = hidden until the artifact is shared publicly |

## Add a handout PDF

Put the file in `site/handouts/` (github.com: open the folder → **Add file → Upload files**),
then link it from a card: `{ "label": "Handout PDF", "url": "/handouts/your-file.pdf" }`.
It's saved for offline use automatically.

## Add a whole section

1. Make a folder in `site/`, e.g. `site/peds/`, containing a `pages.json`:
   ```json
   {
     "site": {
       "title": "Pediatric anesthesia.",
       "lead": "One sentence for under the heading.",
       "links": [ { "label": "Their website", "kicker": "Source", "url": "https://…" } ]
     },
     "pages": []
   }
   ```
   (`links` is optional: outside links shown under the intro.)
2. Add one line to `site/sections.json`:
   ```json
   { "url": "/peds/", "label": "Pediatric talks", "short": "Peds", "emoji": "🧸" }
   ```
   `short` and `emoji` are the app's bottom tab. Keep tabs to about five.
3. Commit. The build creates the page, links it from every other section, adds the app tab
   and caches it offline.

## Your chalk talks

Talks live as copies in `site/talks/`, so they open on the site and in the app, and work offline.
When you edit a talk in Claude, the nightly sync notices the new version and refreshes the copy.
To copy one by hand: download the artifact's HTML and run
`python3 tools/mirror.py NAME FILE.html --slug … --short … --version …` (see the top of tools/mirror.py).

## Automatic additions

A scheduled Claude task runs nightly (8:47 pm Denver) and follows `SYNC.md`: any of Will's
Claude artifacts that is shared publicly and is teaching material gets a card in
`site/pages.json`. It never touches the other sections.

## Preview locally

```sh
python3 tools/build.py
cd site && python3 -m http.server 8000     # open http://localhost:8000
```

## Install on a phone

- **iPhone:** open anesthesiabootcamp.com in **Safari** → Share → **Add to Home Screen**.
- **Android:** open it in Chrome → menu → **Install app** (or **Add to Home screen**).

Once it has been opened with a connection, the pages, card lists and handout PDFs work
offline. Links to other sites (claude.ai chalk talks, journals, Kenji's and Elijah's sites)
still need a connection.
