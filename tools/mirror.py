#!/usr/bin/env python3
"""Copy a Claude artifact onto the site so it opens on anesthesiabootcamp.com
(and inside the home-screen app) instead of jumping to the Claude app.

Usage (from the repo root):
  python3 tools/mirror.py NAME DOWNLOADED.html [--slug SLUG --short SHORT_ID --version VERSION]

  NAME        folder name under site/talks/, e.g. "ponv"
  DOWNLOADED  the artifact's index.html, downloaded from Claude
  --slug/--short/--version  recorded in site/talks/talks.json so the nightly sync
              can tell when the Claude version has changed and refresh the copy.

What it does to the copy:
  * text fixes listed for this talk in talks.json ("replace") are applied
  * links to other claude.ai artifacts that are mirrored here are pointed at the
    local copy (or the handout PDF), so readers stay on the site
  * adds a small "← Bootcamp" button (installed apps on iPhone have no back button)
  * registers the site's offline cache, so the talk works offline once opened
Then run tools/build.py as usual.
"""
import argparse, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TALKS = ROOT / "site" / "talks"
INDEX = TALKS / "talks.json"
MARK = "<!-- bootcamp-mirror -->"

INJECT = MARK + """
<a href="/" class="bootcamp-back" aria-label="Back to Anesthesia Bootcamp">&larr; Bootcamp</a>
<style>
.bootcamp-back{position:fixed;z-index:2147483000;left:max(12px,env(safe-area-inset-left));
bottom:max(12px,env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:6px;
padding:9px 14px;border-radius:999px;background:#14201d;color:#f5f3ee !important;
font:600 14px/1 -apple-system,system-ui,sans-serif;text-decoration:none !important;
box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92}
.bootcamp-back:hover{opacity:1}
@media print{.bootcamp-back{display:none}}
</style>
<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});</script>
"""

def load_index():
    if INDEX.exists():
        return json.loads(INDEX.read_text(encoding="utf-8"))
    return {"talks": [], "redirects": {}}

def mirror(name, src_html, slug=None, short=None, version=None):
    idx = load_index()
    # Map claude.ai short ids -> local paths (other mirrored talks and handout PDFs)
    links = dict(idx.get("redirects", {}))
    for t in idx["talks"]:
        if t.get("short"):
            links[t["short"]] = f"/talks/{t['name']}/"
    if short:
        links[short] = f"/talks/{name}/"

    html = src_html
    # Re-mirroring an already-processed file: drop the old injection first.
    html = re.sub(re.escape(MARK) + r".*?</script>\n", "", html, flags=re.S)

    def repl(m):
        sid = m.group(1)
        return links.get(sid, m.group(0))
    html = re.sub(r"https://claude\.ai/artifact/([A-Za-z0-9]+)(?:[^\"'\s<]*)?", repl, html)

    # Per-talk text fixes recorded in talks.json ("replace": [[old, new], ...]) so they survive refreshes.
    entry0 = next((t for t in idx["talks"] if t["name"] == name), {})
    for old, new in entry0.get("replace", []):
        html = html.replace(old, new)

    if "</body>" in html:
        i = html.rindex("</body>")
        html = html[:i] + INJECT + html[i:]
    else:
        html += INJECT

    out = TALKS / name / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")

    entry = next((t for t in idx["talks"] if t["name"] == name), None)
    if entry is None:
        entry = {"name": name}; idx["talks"].append(entry)
    for k, v in (("slug", slug), ("short", short), ("version", version)):
        if v: entry[k] = v
    idx["talks"].sort(key=lambda t: t["name"])
    INDEX.write_text(json.dumps(idx, indent=2) + "\n", encoding="utf-8")
    left = re.findall(r"https://claude\.ai/artifact/[A-Za-z0-9]+", html)
    print(f"mirrored {name} -> site/talks/{name}/" + (f"  (still links to Claude: {sorted(set(left))})" if left else ""))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("name"); ap.add_argument("src")
    ap.add_argument("--slug"); ap.add_argument("--short"); ap.add_argument("--version")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", a.name):
        sys.exit("NAME should be lowercase letters, numbers and dashes")
    mirror(a.name, Path(a.src).read_text(encoding="utf-8"), a.slug, a.short, a.version)
