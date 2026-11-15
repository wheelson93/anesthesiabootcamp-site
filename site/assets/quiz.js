/* =====================================================================
   Anesthesia Bootcamp — interactive board questions for the chalk talks.

   The talks were written with three different question layouts. This script
   finds the questions in any of them and turns them into the same quiz:
   tap a choice → it's marked right or wrong, the explanation appears, and the
   score at the top of the question set updates. "Show answer" still works for
   reading through without guessing.

     A  <details class="q"><summary>stem</summary><div class="opts">…</div><div class="ans">…</div></details>
     B  <div class="q"><p class="qstem">…</p><ol class="opts"><li class="ans">…</li>…</ol><details>…</details></div>
     C  <div class="bq">stem<ol type="A"><li>…</li></ol><details><summary>Answer</summary><p><b>B.</b> …</p></details></div>

   The correct choice comes from <li class="ans"> when present, otherwise from the
   letter that opens the explanation ("C." / "C)"). A question where neither can be
   found is left exactly as the talk wrote it.
   Loaded on every talk by tools/mirror.py (tools/build.py version-stamps it).
   ===================================================================== */
(function () {
  "use strict";
  var LETTERS = "ABCDEFGH";

  function stripLetter(html) {
    return html.replace(/^\s*(?:<[^>]+>\s*)*[A-H]\s*[.)]\s*/i, function (m) {
      // keep any opening tags that came before the letter
      return (m.match(/<[^>]+>/g) || []).join("");
    }).trim();
  }

  function letterFrom(el) {
    if (!el) return -1;
    var m = el.textContent.trim().match(/^(?:answer\s*:?\s*)?([A-H])\s*[.):]/i);
    return m ? LETTERS.indexOf(m[1].toUpperCase()) : -1;
  }

  function optionsFrom(container) {
    // B and C: a list of choices that sits outside the reveal
    var ol = null;
    container.querySelectorAll("ol").forEach(function (o) {
      if (!ol && !o.closest("details:not(.q)") && (o.classList.contains("opts") || /^a$/i.test(o.getAttribute("type") || ""))) ol = o;
    });
    if (ol) {
      var lis = Array.prototype.filter.call(ol.children, function (c) { return c.tagName === "LI"; });
      var ans = -1;
      lis.forEach(function (li, i) { if (li.classList.contains("ans")) ans = i; });
      return { node: ol, items: lis.map(function (li) { return li.innerHTML.trim(); }), ans: ans };
    }
    // A: <div class="opts"> of <span>s, or lines split by <br>
    var box = container.querySelector(".opts");
    if (!box) return null;
    var spans = box.querySelectorAll(":scope > span, :scope > div, :scope > li");
    var items = spans.length
      ? Array.prototype.map.call(spans, function (s) { return s.innerHTML; })
      : box.innerHTML.split(/<br\s*\/?>/i);
    items = items.map(function (h) { return stripLetter(h); }).filter(function (h) { return h.replace(/<[^>]+>/g, "").trim(); });
    return { node: box, items: items, ans: -1 };
  }

  var sets = new Map(); // question-set element → {total, right, answered, bar}

  function setFor(q) {
    var root = q.closest("section, [role=tabpanel], .panel, .tab") || q.parentElement;
    if (!sets.has(root)) {
      var bar = document.createElement("div");
      bar.className = "bcq-score";
      bar.innerHTML = '<span class="bcq-score-n"></span><button type="button" class="bcq-reset">Start over</button>';
      var first = root.querySelector(".bcq");
      if (first) first.parentNode.insertBefore(bar, first); else root.appendChild(bar);
      var s = { total: 0, right: 0, answered: 0, bar: bar, qs: [] };
      bar.querySelector(".bcq-reset").addEventListener("click", function () {
        s.qs.forEach(function (fn) { fn(); });
        s.right = 0; s.answered = 0; paint(s);
      });
      sets.set(root, s);
    }
    return sets.get(root);
  }
  function paint(s) {
    s.bar.querySelector(".bcq-score-n").innerHTML = s.answered
      ? "<b>" + s.right + " of " + s.answered + "</b> correct" + (s.answered < s.total ? " · " + (s.total - s.answered) + " to go" : " · done")
      : s.total + " questions · tap a choice to answer";
    s.bar.querySelector(".bcq-reset").hidden = !s.answered;
  }

  function build(container) {
    if (container.dataset.bcq) return;
    var opts = optionsFrom(container);
    if (!opts || opts.items.length < 2) return;

    var isA = container.tagName === "DETAILS";
    var reveal = isA ? container.querySelector(".ans") : container.querySelector("details");
    var ans = opts.ans >= 0 ? opts.ans : letterFrom(reveal && (isA ? reveal : reveal.querySelector(":scope > :not(summary)")));
    if (ans < 0 || ans >= opts.items.length) return;

    // Explanation: everything in the reveal except its "Show answer" summary
    var expl = document.createElement("div");
    expl.className = "bcq-expl";
    if (reveal) {
      Array.prototype.forEach.call(reveal.childNodes, function (n) {
        if (n.nodeType === 1 && n.tagName === "SUMMARY") return;
        expl.appendChild(n.cloneNode(true));
      });
    }

    var q = document.createElement("div");
    q.className = "bcq";
    var list = document.createElement("div");
    list.className = "bcq-opts";
    list.setAttribute("role", "group");
    var buttons = opts.items.map(function (html, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bcq-opt";
      b.innerHTML = '<span class="bcq-l">' + LETTERS[i] + '</span><span class="bcq-t">' + html + "</span>";
      list.appendChild(b);
      return b;
    });
    var verdict = document.createElement("p");
    verdict.className = "bcq-verdict";
    var tools = document.createElement("div");
    tools.className = "bcq-tools";
    tools.innerHTML = '<button type="button" class="bcq-show">Show answer</button><button type="button" class="bcq-again" hidden>Try again</button>';
    var outcome = document.createElement("div");
    outcome.className = "bcq-out";
    outcome.hidden = true;
    outcome.appendChild(verdict);
    outcome.appendChild(expl);

    if (isA) {
      var stem = document.createElement("p");
      stem.className = "qstem";
      stem.innerHTML = container.querySelector("summary").innerHTML;
      q.appendChild(stem);
    }
    q.appendChild(list);
    q.appendChild(tools);
    q.appendChild(outcome);

    if (isA) {
      container.replaceWith(q);
      q.classList.add("q");
    } else {
      opts.node.replaceWith(list);
      if (reveal) reveal.remove();
      list.after(tools);
      tools.after(outcome);
      container.classList.add("bcq");
      q = container;
    }
    q.dataset.bcq = "1";

    var s = setFor(q);
    s.total++;
    var state = null; // null | "right" | "wrong" | "shown"

    function finish(choice) {
      buttons.forEach(function (b, i) {
        b.disabled = true;
        if (i === ans) b.classList.add("is-right");
        if (i === choice && choice !== ans) b.classList.add("is-wrong");
        if (i === choice) b.setAttribute("aria-pressed", "true");
      });
      if (choice === -1) { state = "shown"; verdict.innerHTML = "Answer: <b>" + LETTERS[ans] + "</b>"; }
      else if (choice === ans) { state = "right"; s.right++; s.answered++; verdict.innerHTML = "<b>Correct.</b>"; }
      else { state = "wrong"; s.answered++; verdict.innerHTML = "<b>Not quite.</b> The answer is <b>" + LETTERS[ans] + "</b>."; }
      verdict.className = "bcq-verdict " + (state === "right" ? "ok" : state === "wrong" ? "bad" : "");
      outcome.hidden = false;
      tools.querySelector(".bcq-show").hidden = true;
      tools.querySelector(".bcq-again").hidden = false;
      paint(s);
    }
    function reset() {
      state = null;
      buttons.forEach(function (b) { b.disabled = false; b.classList.remove("is-right", "is-wrong"); b.removeAttribute("aria-pressed"); });
      outcome.hidden = true;
      tools.querySelector(".bcq-show").hidden = false;
      tools.querySelector(".bcq-again").hidden = true;
    }
    s.qs.push(reset);
    buttons.forEach(function (b, i) { b.addEventListener("click", function () { if (!state) finish(i); }); });
    tools.querySelector(".bcq-show").addEventListener("click", function () { if (!state) finish(-1); });
    tools.querySelector(".bcq-again").addEventListener("click", function () {
      if (state === "right") s.right--;
      if (state === "right" || state === "wrong") s.answered--;
      reset(); paint(s);
    });
  }

  function init() {
    document.querySelectorAll("details.q, div.q, .bq").forEach(function (c) {
      try { build(c); } catch (e) { /* leave this question as the talk wrote it */ }
    });
    sets.forEach(paint);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
