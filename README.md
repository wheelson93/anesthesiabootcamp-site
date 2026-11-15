# Anesthesia Bootcamp

Will Cohen's personal teaching site.

Source for https://anesthesiabootcamp.com: teaching pages, chalk talks and handouts.

- `site/`: the published site. `index.html` renders the cards in `pages.json`;
  `handouts/` holds printable PDFs.
- `.github/workflows/pages.yml`: deploys `site/` to GitHub Pages on every push to `main`.
- `SYNC.md`: how new artifacts get added automatically (share one publicly and it shows up
  after the next daily sync).

## Card fields (`site/pages.json`)

| Field      | Notes |
|------------|-------|
| `title`, `url`, `category` | Required |
| `emoji`, `blurb`, `tags`   | Optional |
| `updated`  | `YYYY-MM-DD`; newest first, "New" badge for 21 days |
| `featured` | `true` → "Start here" row |
| `links`    | Extra buttons, e.g. `{"label": "PDF", "url": "handouts/x.pdf"}`; `"private": true` hides one |
| `hidden`   | `true` = hidden by you (sync never changes it); `"private"` = hidden until the artifact is shared publicly |

`ignore` lists artifacts the sync should never add.

