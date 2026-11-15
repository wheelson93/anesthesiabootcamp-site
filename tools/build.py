#!/usr/bin/env python3
"""Check the site's content and build the generated files.

Run from the repo root:  python3 tools/build.py
GitHub Actions runs it before every deploy; if it finds a problem the deploy stops
and the live site keeps its last good version.

It does three things:
  1. Checks sections.json and every section's pages.json (required fields, broken
     local links, duplicate cards, bad dates). Problems are printed with the file and card.
  2. Writes each section's index.html from tools/page-template.html.
  3. Writes site/sw.js from tools/sw-template.js with a fresh version and the list of
     files to keep offline (pages, card lists, handout PDFs, icons).
"""
import hashlib, html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
TOOLS = ROOT / "tools"
CARD_KEYS = {"title", "url", "category", "emoji", "blurb", "why", "source", "tags",
             "updated", "featured", "hidden", "links"}
LINK_KEYS = {"label", "url", "private"}

errors, warnings = [], []
def err(where, msg): errors.append(f"  ✗ {where}: {msg}")
def warn(where, msg): warnings.append(f"  ! {where}: {msg}")

_loaded = {}
def load(path):
    if path in _loaded:
        return _loaded[path]
    _loaded[path] = _load(path)
    return _loaded[path]

def _load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        err(path.relative_to(ROOT), "file is missing")
    except json.JSONDecodeError as e:
        err(path.relative_to(ROOT), f"not valid JSON (line {e.lineno}, column {e.colno}: {e.msg}). "
                                    "Usually a missing comma or an extra one before ] or }.")
    return None

def local_target(section_dir, url):
    """Return the file a same-site link points to, or None for outside links."""
    if re.match(r"^[a-z]+:", url) or url.startswith("//") or url.startswith("#"):
        return None
    path = url.split("#")[0].split("?")[0]
    target = (SITE / path.lstrip("/")) if path.startswith("/") else (section_dir / path)
    target = target.resolve()
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target

def check_link(where, section_dir, url, generated):
    t = local_target(section_dir, url)
    if t is None:
        return
    if not (t.exists() or t in generated):
        err(where, f"links to {url}, but that file isn't in the site")

# ---------- sections ----------
nav = load(SITE / "sections.json") or {}
sections = nav.get("sections", [])
if not sections:
    err("site/sections.json", "needs a \"sections\" list")
generated = set()
for i, s in enumerate(sections):
    where = f"sections.json #{i + 1}"
    for k in ("url", "label"):
        if not s.get(k):
            err(where, f"missing \"{k}\"")
    url = s.get("url", "")
    if url and not (url.startswith("/") and url.endswith("/")):
        err(where, f"url should look like \"/folder/\" (got \"{url}\")")
    folder = SITE / url.strip("/") if url else None
    if folder is not None and s.get("custom"):
        # Hand-written section (e.g. /skills/): its own index.html, no card list.
        if not (folder / "index.html").exists():
            err(where, f"\"custom\": true, but site/{url.strip('/')}/index.html is missing")
    elif folder is not None:
        generated.add((folder / "index.html").resolve())
        if not (folder / "pages.json").exists():
            err(where, f"no pages.json in site/{url.strip('/') or '.'}/ — create one (copy another section's)")

# ---------- each section's cards ----------
# Version stamp for the shared CSS/JS so browsers never pair a new page with an old script.
SHARED = ("theme.css", "theme.js", "app.css", "app.js")
asset_v = hashlib.sha256(b"".join((SITE / "assets" / f).read_bytes() for f in SHARED)).hexdigest()[:10]
def stamp(text):
    return re.sub(r'(["\'])/assets/(theme\.css|theme\.js|app\.css|app\.js)(?:\?v=[0-9a-f]+)?\1',
                  lambda m: f"{m.group(1)}/assets/{m.group(2)}?v={asset_v}{m.group(1)}", text)
template = stamp((TOOLS / "page-template.html").read_text(encoding="utf-8"))
# The copied chalk talks load theme.css/theme.js too (added by tools/mirror.py).
for talk in sorted((SITE / "talks").glob("*/index.html")):
    old = talk.read_text(encoding="utf-8")
    new = stamp(old)
    if new != old:
        talk.write_text(new, encoding="utf-8")
# Hand-written sections load the shared CSS/JS too: version-stamp them, and check their JSON.
for s in sections:
    if not s.get("custom") or not s.get("url"):
        continue
    folder = SITE / s["url"].strip("/")
    page = folder / "index.html"
    if page.exists():
        old = page.read_text(encoding="utf-8"); new = stamp(old)
        if new != old:
            page.write_text(new, encoding="utf-8")
    for j in sorted(folder.glob("*.json")):
        load(j)
for s in sections:
    if s.get("custom"):
        continue
    url = s.get("url", "")
    folder = SITE / url.strip("/")
    rel = (folder / "pages.json").relative_to(ROOT)
    data = load(folder / "pages.json")
    if data is None:
        continue
    site = data.get("site", {})
    if not site.get("title"):
        err(rel, "site.title is missing (the big heading)")
    for i, l in enumerate(site.get("links", [])):
        if not l.get("label") or not l.get("url"):
            err(f"{rel} site.links #{i + 1}", "needs label and url")
    cards = data.get("pages")
    if not isinstance(cards, list):
        err(rel, "needs a \"pages\" list (it can be empty: [])")
        cards = []
    seen = {}
    for i, c in enumerate(cards):
        name = c.get("title") or f"card #{i + 1}"
        where = f"{rel} → \"{name}\""
        for k in ("title", "url", "category"):
            if not c.get(k):
                err(where, f"missing \"{k}\"")
        for k in set(c) - CARD_KEYS:
            warn(where, f"unknown field \"{k}\" (ignored; typo?)")
        if c.get("updated") and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(c["updated"])):
            err(where, f"updated should be YYYY-MM-DD (got \"{c['updated']}\")")
        if c.get("url"):
            if c["url"] in seen and not c.get("hidden"):
                err(where, f"same url as \"{seen[c['url']]}\"")
            seen[c["url"]] = name
            check_link(where, folder, c["url"], generated)
        if not isinstance(c.get("tags", []), list):
            err(where, "tags should be a list, e.g. [\"chalk talk\"]")
        for j, l in enumerate(c.get("links", [])):
            if not l.get("label") or not l.get("url"):
                err(f"{where} link #{j + 1}", "needs label and url")
                continue
            for k in set(l) - LINK_KEYS:
                warn(f"{where} link #{j + 1}", f"unknown field \"{k}\"")
            check_link(f"{where} link \"{l['label']}\"", folder, l["url"], generated)

    # Page shell for this section
    is_home = url == "/"
    title = "Anesthesia Bootcamp" if is_home else f"{s.get('label', '')} · Anesthesia Bootcamp"
    page = (template
            .replace("{{TITLE}}", html.escape(title))
            .replace("{{DESCRIPTION}}", html.escape(site.get("lead", ""), quote=True))
            .replace("{{HEADING}}", html.escape(site.get("title", "")))
            .replace("{{LEAD}}", html.escape(site.get("lead", ""))))
    if not errors:
        (folder / "index.html").write_text(page, encoding="utf-8")

# ---------- dark mode check for the copied talks ----------
# Diagrams with colors written straight in can vanish in dark mode (light text on a light
# shape). theme.css maps the colors listed in its ".bc-talk svg [fill=...]" rules; any other
# light fill in a talk's diagrams gets a warning so it can be added there.
theme_css = (SITE / "assets" / "theme.css").read_text(encoding="utf-8").lower()
def _lum(hexv):
    h = hexv.lstrip("#")
    if len(h) == 3: h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
for talk in sorted((SITE / "talks").glob("*/index.html")):
    text = talk.read_text(encoding="utf-8")
    found = set()
    for svg in re.findall(r"<svg\b.*?</svg>", text, flags=re.S | re.I):
        for tag, attrs in re.findall(r"<(\w+)([^>]*)>", svg):
            if tag.lower() in ("text", "tspan", "svg"):
                continue
            for m in re.finditer(r'(?:fill|stop-color)\s*[=:]\s*"?\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b', attrs):
                c = m.group(1).lower()
                if _lum(c) > 0.8 and c not in ("#fff", "#ffffff") and f'"{c}"' not in theme_css:
                    found.add(c)
    if found:
        warn(talk.relative_to(ROOT), "light diagram colors " + ", ".join(sorted(found)) +
             " aren't in theme.css; they may show as light shapes in dark mode. "
             "Add a rule like .bc-talk svg [fill=\"#xxxxxx\" i] { fill: var(--bc-soft); }")

# ---------- offline list + service worker ----------
if not errors:
    keep = ["/", "/sections.json", "/manifest.webmanifest"] + [f"/assets/{f}?v={asset_v}" for f in SHARED]
    for s in sections:
        u = s["url"]
        if s.get("custom"):
            keep += [u] + ["/" + j.relative_to(SITE).as_posix() for j in sorted((SITE / u.strip("/")).glob("*.json"))]
        else:
            keep += [u, u + "pages.json"]
    keep += ["/" + p.parent.relative_to(SITE).as_posix() + "/" for p in sorted((SITE / "talks").glob("*/index.html"))]
    keep += ["/" + p.relative_to(SITE).as_posix() for p in sorted((SITE / "assets" / "icons").glob("*"))]
    keep += ["/" + p.relative_to(SITE).as_posix() for p in sorted(SITE.rglob("*.pdf"))]
    keep = list(dict.fromkeys(keep))
    h = hashlib.sha256()
    for p in sorted(SITE.rglob("*")):
        if p.is_file() and p.name != "sw.js":
            h.update(p.relative_to(SITE).as_posix().encode()); h.update(p.read_bytes())
    version = h.hexdigest()[:12]
    sw = (TOOLS / "sw-template.js").read_text(encoding="utf-8")
    sw = sw.replace("__VERSION__", version).replace("__PRECACHE__", json.dumps(keep, indent=2))
    (SITE / "sw.js").write_text(sw, encoding="utf-8")

# ---------- report ----------
n_cards = 0
for s in sections:
    d = load(SITE / s.get("url", "/").strip("/") / "pages.json") if s.get("url") and not s.get("custom") else None
    n_cards += len((d or {}).get("pages", []))
if warnings:
    print("Warnings (site still builds):"); print("\n".join(warnings))
if errors:
    print(f"\n{len(errors)} problem(s) to fix before this can go live:"); print("\n".join(errors))
    sys.exit(1)
print(f"OK: {len(sections)} sections, {n_cards} cards, version {version}, {len(keep)} files kept offline.")
