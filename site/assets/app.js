// Anesthesia Bootcamp: shared renderer for every section page.
// Each section folder has an index.html (from tools/page-template.html) and a pages.json.
// Cross-links between sections come from /sections.json, so adding a section is one line there.
(() => {
  const NEW_DAYS = 21;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  $("#year").textContent = new Date().getFullYear();

  // Which section is this page? Matches the folder in the URL ("/" is the home section).
  const here = location.pathname.replace(/index\.html$/, "").replace(/\/?$/, "/");

  let pages = [], cat = "All", query = "";

  const isNew = (p) => p.updated && (Date.now() - new Date(p.updated + "T12:00:00")) / 864e5 <= NEW_DAYS;
  const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  function card(p) {
    const meta = p.source ? esc(p.source) : (isNew(p) ? `<span class="badge">New</span> · ${esc(fmtDate(p.updated))}` : esc(fmtDate(p.updated)));
    const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const links = (p.links || []).filter((l) => !l.private).map((l) =>
      `<a class="extra" href="${esc(l.url)}">${esc(l.label)} <span aria-hidden="true">↗</span></a>`).join("");
    return `<article class="card">
      <div class="top"><span class="icon" aria-hidden="true">${esc(p.emoji || "📄")}</span><span class="meta">${meta}</span></div>
      <h3><a class="main" href="${esc(p.url)}">${esc(p.title)}</a></h3>
      ${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}
      ${p.why ? `<p class="why"><b>Why it matters</b> ${esc(p.why)}</p>` : ""}
      <div class="foot">${links}<span class="tag">${esc(p.category || "Other")}</span>${tags}</div>
    </article>`;
  }

  function matches(p) {
    if (cat !== "All" && (p.category || "Other") !== cat) return false;
    if (!query) return true;
    const hay = [p.title, p.blurb, p.why, p.source, p.category, ...(p.tags || [])].join(" ").toLowerCase();
    return query.split(/\s+/).every((w) => hay.includes(w));
  }

  function renderChips() {
    const counts = {};
    pages.forEach((p) => { const c = p.category || "Other"; counts[c] = (counts[c] || 0) + 1; });
    const cats = ["All", ...Object.keys(counts).sort()];
    $("#chips").innerHTML = cats.map((c) =>
      `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}<span class="n">${c === "All" ? pages.length : counts[c]}</span></button>`
    ).join("");
  }

  function render() {
    const shown = pages.filter(matches);
    const el = $("#content");
    if (!shown.length) {
      el.innerHTML = `<div class="empty">${pages.length ? "Nothing matches that search." : "No pages yet."}${pages.length ? '<br><button class="chip" type="button" id="reset">Clear filters</button>' : ""}</div>`;
      $("#reset")?.addEventListener("click", () => { cat = "All"; query = ""; $("#q").value = ""; renderChips(); render(); });
      return;
    }
    const browsing = cat === "All" && !query;
    const featured = browsing ? shown.filter((p) => p.featured) : [];
    const rest = shown.filter((p) => !featured.includes(p));
    let html = "";
    if (featured.length) html += `<section class="section featured"><h2 class="section-label">Start here</h2><div class="grid">${featured.map(card).join("")}</div></section>`;
    if (browsing) {
      const groups = {};
      rest.forEach((p) => (groups[p.category || "Other"] ||= []).push(p));
      for (const g of Object.keys(groups).sort())
        html += `<section class="section"><h2 class="section-label">${esc(g)}</h2><div class="grid">${groups[g].map(card).join("")}</div></section>`;
    } else {
      html += `<section class="section"><h2 class="section-label">${shown.length} page${shown.length === 1 ? "" : "s"}</h2><div class="grid">${rest.map(card).join("")}</div></section>`;
    }
    el.innerHTML = html;
  }

  // Links under the intro: every other section (from sections.json), then this page's own outside links.
  function renderRelated(sections, ownLinks) {
    const others = sections.filter((s) => s.url !== here).map((s) => ({
      label: s.url === "/" ? "Back to OR talks" : s.label,
      kicker: s.url === "/" ? "Anesthesia Bootcamp" : "Also",
      url: s.url,
      internal: true,
    }));
    const all = [...others, ...(ownLinks || [])];
    if (!all.length) return;
    const nav = $("#related");
    nav.innerHTML = all.map((l) =>
      `<a href="${esc(l.url)}"${l.internal ? " data-int" : ""}>${l.kicker ? `<span class="k">${esc(l.kicker)}</span>` : ""}${esc(l.label)} <span aria-hidden="true">${/^https?:/.test(l.url) ? "↗" : "→"}</span></a>`).join("");
    nav.hidden = false;
  }

  // Bottom tab bar, shown when the site runs as an installed app (see app.css).
  function renderTabs(sections) {
    const bar = $("#tabbar");
    bar.innerHTML = sections.map((s) =>
      `<a href="${esc(s.url)}"${s.url === here ? ' aria-current="page"' : ""}><span class="ti" aria-hidden="true">${esc(s.emoji || "•")}</span><span>${esc(s.short || s.label)}</span></a>`).join("");
  }

  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.cat; renderChips(); render();
  });
  $("#q").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
    if (e.key === "Escape" && document.activeElement === $("#q")) { $("#q").value = ""; query = ""; render(); $("#q").blur(); }
  });

  const getJSON = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });

  Promise.all([getJSON("pages.json"), getJSON("/sections.json").catch(() => ({ sections: [] }))])
    .then(([data, nav]) => {
      const site = data.site || {};
      if (site.title) $("#hero-title").textContent = site.title;
      if (site.lead) $("#hero-lead").textContent = site.lead;
      if (site.brand) $("#site-name").textContent = site.brand;
      renderRelated(nav.sections || [], site.links);
      renderTabs(nav.sections || []);
      pages = (data.pages || []).filter((p) => !p.hidden)
        .sort((a, b) => (b.updated || "").localeCompare(a.updated || "") || a.title.localeCompare(b.title));
      renderChips(); render();
    })
    .catch(() => {
      $("#content").innerHTML = '<div class="empty">Couldn\'t load this page. If you\'re offline, open it once while connected and it will be saved for next time.</div>';
    });

  // Offline support + home-screen install.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
})();
