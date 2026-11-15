/* Anesthesia Bootcamp light/dark switch.
   Loaded in <head> without "defer" so the right colors apply before the page draws.
   The choice (auto / light / dark) is saved on the device and shared by every page,
   including the chalk talks. "auto" follows the phone's or computer's setting.
   Any element with data-theme-toggle becomes the switch. */
(function () {
  var KEY = "bc-theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var BAR = { light: "#f5f3ee", dark: "#0f1514" }; // phone status bar, matches --bc-paper

  var ICON = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>'
  };
  var LABEL = {
    auto: "Theme: automatic (matches your device). Tap to change.",
    light: "Theme: light. Tap to change.",
    dark: "Theme: dark. Tap to change."
  };

  function systemDark() { return !!(mq && mq.matches); }
  function pref() {
    try { var p = localStorage.getItem(KEY); return p === "light" || p === "dark" ? p : "auto"; }
    catch (e) { return "auto"; }
  }
  function apply() {
    var p = pref();
    var mode = p === "auto" ? (systemDark() ? "dark" : "light") : p;
    root.setAttribute("data-theme", mode);
    root.setAttribute("data-theme-pref", p);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    if (!metas.length && document.head) {
      var m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); metas = [m];
    }
    for (var i = 0; i < metas.length; i++) { metas[i].removeAttribute("media"); metas[i].content = BAR[mode]; }
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var j = 0; j < btns.length; j++) {
      btns[j].innerHTML = ICON[p];
      btns[j].setAttribute("aria-label", LABEL[p]);
      btns[j].title = LABEL[p];
    }
  }
  function set(p) {
    try { if (p === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch (e) {}
    apply();
  }
  // Order of taps: Auto -> the opposite of the device -> pinned to the device's look -> Auto.
  // The first tap always changes the colors; the third returns to following the device.
  function next() {
    var p = pref(), sys = systemDark() ? "dark" : "light";
    if (p === "auto") return sys === "dark" ? "light" : "dark";
    return p === sys ? "auto" : sys;
  }

  apply();
  if (mq) { if (mq.addEventListener) mq.addEventListener("change", apply); else if (mq.addListener) mq.addListener(apply); }
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(); });
  window.addEventListener("pageshow", apply);
  document.addEventListener("DOMContentLoaded", apply);
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-theme-toggle]");
    if (b) { e.preventDefault(); set(next()); }
  });
  window.bcTheme = { pref: pref, set: set };
})();
