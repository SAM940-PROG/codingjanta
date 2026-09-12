/* v3.js — V3 upgrade engine (vanilla, no dependencies).
   - Hardens external links (rel noopener).
   - Injects a "Preset field guide" (Easy/Medium/Hard + approach + comparison)
     into topic pages using presets.js + PRESET_TOPIC_MAP.
   - Renders preset catalog search ([data-preset-catalog]).
   - Renders hard mixed-pattern MCQ practice ([data-mcq-app]).
   - Renders preset comparison tables ([data-comparisons]).
   - Validates inputs; fails gracefully; respects reduced motion. */
(function () {
  "use strict";
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function store(k, v) {
    try {
      if (v === null || v === undefined) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch (e) { /* private mode */ }
  }
  function load(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function pageKey() {
    var c = document.querySelector('link[rel="canonical"]');
    var p = c ? c.getAttribute("href") : location.pathname;
    return p.replace(/^https?:\/\/[^/]+/, "") || "/";
  }
  /* Shared relative-prefix builder (single source of truth for runtime links).
     pageKey() is root-shaped ("/a/b/"); a page N segments deep needs N "../"
     to reach the site root. Matches learn.js relTo(); off-by-one here produced
     "algorithms/practice/presets/..." 404s from depth>=2 pages. */
  function relPrefix() {
    var depth = pageKey().split("/").filter(Boolean).length;
    return depth <= 1 ? "./" : new Array(depth + 1).join("../");
  }

  /* ---------- 1. external link hygiene ---------- */
  try {
    document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
      var rel = (a.getAttribute("rel") || "").toLowerCase();
      if (rel.indexOf("noopener") === -1) {
        a.setAttribute("rel", ((a.getAttribute("rel") || "") + " noopener").trim());
      }
    });
  } catch (e) { /* non-fatal */ }

  /* ---------- 2. preset field guide on topic pages ---------- */
  function topicFragment() {
    var key = pageKey(); // e.g. /algorithms/twopointers/
    var m = key.match(/\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : "";
  }
  function tierBadge(t) {
    var c = t === "Easy" ? "easy" : (t === "Medium" ? "medium" : "hard");
    return '<span class="tag ' + c + '">' + esc(t) + '</span>';
  }
  /* Copy buttons for JS-injected code (learn.js handles static <pre> only,
     and runs before this file). Same UX: copy code only, feedback, fallback. */
  function addCopyButtons(root) {
    try {
      (root.querySelectorAll ? root.querySelectorAll("pre") : []).forEach(function (pre) {
        if (!pre.parentNode || !pre.parentNode.classList) return;
        if (pre.parentNode.classList.contains("copy-done")) return;
        var hasBtn = Array.prototype.some.call(pre.parentNode.children || [], function (ch) {
          return ch.classList && ch.classList.contains("copy-btn");
        });
        if (hasBtn) return;
        var wrap = pre;
        var btn = document.createElement("button");
        btn.className = "copy-btn no-print";
        btn.type = "button";
        btn.textContent = "Copy";
        btn.setAttribute("aria-label", "Copy code to clipboard");
        btn.addEventListener("click", function () {
          var text = pre.innerText || pre.textContent || "";
          function ok() { btn.textContent = "Copied"; window.setTimeout(function () { btn.textContent = "Copy"; }, 1500); }
          function fallback() {
            try {
              var r = document.createRange();
              r.selectNodeContents(pre);
              var sel = window.getSelection();
              sel.removeAllRanges(); sel.addRange(r);
              document.execCommand("copy");
              sel.removeAllRanges(); ok();
            } catch (e) { btn.textContent = "Select manually"; }
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
          } else fallback();
        });
        if (pre.parentNode) {
          var par = pre.parentNode;
          if (par.classList && par.classList.contains("codewrap")) {
            par.classList.add("copy-done");
            par.appendChild(btn);
          } else {
            var w = document.createElement("div");
            w.className = "codewrap copy-done";
            par.insertBefore(w, pre);
            w.appendChild(pre);
            w.appendChild(btn);
          }
        }
      });
    } catch (e) { /* code stays readable without buttons */ }
  }
  function isFlagship(p) {
    return !!(window.PRESET_FLAGSHIP && window.PRESET_FLAGSHIP.indexOf(p.id) !== -1);
  }
  function problemChips(pid) {
    // Verified practice only: keys must resolve in window.PROBLEMS (§7, §29).
    try {
      var tags = (window.PROBLEM_TAGS || {})[pid] || [];
      var probs = window.PROBLEMS || {};
      var out = [];
      tags.forEach(function (k) {
        var m = probs[k];
        if (!m || !m.url) return; // unverified: never link
        var label = (m.title ? m.title + " " : "") + "(" + m.platform + " #" + m.id + (m.diff ? ", " + m.diff : "") + ")";
        out.push('<a href="' + m.url + '" target="_blank" rel="noopener noreferrer">' + esc(label) + "</a>");
      });
      if (!out.length) return "";
      return '<p><strong>Verified practice.</strong></p><ul class="chiplist">' +
        out.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";
    } catch (e) { return ""; }
  }
  function comboMentions(pid) {
    try {
      var out = (window.PRESET_COMBOS || []).filter(function (c) { return c.parts.indexOf(pid) !== -1; });
      if (!out.length) return "";
      return '<p><strong>Hybrid combos.</strong> ' + out.map(function (c) {
        return esc(c.name) + " — " + esc(c.use);
      }).join(" ") + "</p>";
    } catch (e) { return ""; }
  }
  function presetCard(p) {
    var sig = (p.signals || []).slice(0, 3).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    var star = isFlagship(p) ? ' <span class="tag hard">★ Flagship</span>' : "";
    var ov = p.depth === "overview" ? ' <span class="tag medium">Overview</span>' : "";
    var con = (p.constraints || []).slice(0, 2).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    return '<details class="preset-card"><summary><strong>' + esc(p.name) + '</strong> ' +
      tierBadge(p.tier) + star + ov + ' <span class="plat">' + esc(p.family) + ' · ' + esc(p.time) + '</span></summary>' +
      '<div class="preset-body">' +
      (p.first ? '<p><strong>First thought.</strong> ' + esc(p.first) + '.</p>' : '') +
      '<p><strong>How to recognize.</strong></p><ul>' + sig + '</ul>' +
      (con ? '<p><strong>Constraint clues.</strong></p><ul>' + con + '</ul>' : '') +
      '<p><strong>Approach.</strong> ' + esc((p.approach || []).join(" → ")) + '</p>' +
      '<p><strong>When NOT to use.</strong> ' + esc(p.whenNot || "") + '</p>' +
      '<p><strong>Trap.</strong> ' + esc(p.trap || "") + ' <strong>Related:</strong> ' + esc((p.related || []).join(", ")) + '</p>' +
      comboMentions(p.id) +
      (p.depth === "overview" ? '<div class="callout warn"><strong>Overview depth.</strong> Recognition, prerequisites, and template direction are covered; implement from a dedicated template and specialize before contests.</div>' : '') +
      (p.java ? '<div class="codewrap"><pre><code>' + esc(p.java) + '</code></pre></div>' : '') +
      problemChips(p.id) +
      '</div></details>';
  }
  (function fieldGuide() {
    try {
      if (!window.PRESETS || !window.PRESET_TOPIC_MAP) return;
      var frag = topicFragment();
      var fams = window.PRESET_TOPIC_MAP[frag];
      if (!fams || !fams.length) return;
      var main = document.querySelector("main.prose");
      if (!main || main.querySelector("[data-field-guide]")) return;
      // Primary family renders fully; related families contribute flagship only,
      // so related presets never masquerade as primary topic content.
      var primary = fams[0];
      var pool = window.PRESETS.filter(function (p) { return p.family === primary; });
      var also = window.PRESETS.filter(function (p) {
        return p.family !== primary && fams.indexOf(p.family) !== -1 && isFlagship(p);
      });
      if (!pool.length && !also.length) return;
      pool.sort(function (a, b) {
        var o = { Easy: 0, Medium: 1, Hard: 2 };
        return (o[a.tier] - o[b.tier]) || (a.name < b.name ? -1 : 1);
      });
      also.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      var flags = pool.filter(isFlagship);
      var rest = pool.filter(function (p) { return !isFlagship(p); });
      var restGroups = { Easy: [], Medium: [], Hard: [] };
      rest.forEach(function (p) { (restGroups[p.tier] || restGroups.Medium).push(p); });
      var sec = document.createElement("section");
      sec.setAttribute("data-field-guide", "");
      sec.setAttribute("aria-label", "Preset field guide");
      var html = '<h2 id="presets">Preset field guide — Easy → Medium → Hard</h2>' +
        '<p>Difficulty here means <strong>how hard the preset is to recognize and apply</strong>, not code length. ' +
        '<a data-topic-presets href="#">View ' + esc(primary) + ' presets →</a> · ' +
        'Full catalog with search: <a data-preset-link href="#">Preset catalog</a>.</p>' +
        '<div class="callout"><strong>Approach checklist (every preset).</strong> ' +
        '1) Read constraints → 2) Name the data structure → 3) Ask if order/contiguity matters → ' +
        '4) Check monotonicity → 5) Spot repeated work → 6) List 2–3 candidate presets → ' +
        '7) Eliminate by red flags → 8) Build simplest valid → 9) Optimize the bottleneck.</div>';
      ["Easy", "Medium", "Hard"].forEach(function (tier) {
        if (!restGroups[tier].length) return;
        html += '<h3>' + tier + ' — ' +
          (tier === "Easy" ? "recognize the obvious pattern" :
           tier === "Medium" ? "distinguish similar patterns" : "identify under constraints") + '</h3>';
        html += restGroups[tier].map(presetCard).join("");
      });
      if (flags.length) {
        var fh = '<h3>★ Flagship presets — master these first</h3>' +
          '<p>Highest contest value in this family. Each card below carries recognition signals, constraint clues, traps, hybrids, and verified practice.</p>' +
          flags.map(presetCard).join("");
        // Flagship block goes right after the checklist callout, before tier groups.
        html = html.replace(/(Optimize the bottleneck\.<\/div>)/, "$1" + fh);
      }
      if (also.length) {
        html += '<h3>Also useful here — flagship from related families</h3>' +
          '<p>Related, not primary: these earn their place via a direct technique link.</p>' +
          also.map(presetCard).join("");
      }
      // Relevant confusing-pair comparison (primary pool first, then related)
      if (window.PRESET_COMPARISONS) {
        var names = {};
        pool.concat(also).forEach(function (p) { names[p.name] = 1; });
        var cmp = window.PRESET_COMPARISONS.filter(function (c) { return names[c.a] || names[c.b]; })[0];
        if (cmp) {
          html += '<h3>Similar presets, different answers</h3><div class="callout warn"><strong>' +
            esc(cmp.a) + ' vs ' + esc(cmp.b) + '.</strong> ' + esc(cmp.q) + '<br><strong>Rule:</strong> ' +
            esc(cmp.pick) + '<br><span>' + esc(cmp.why) + '</span></div>';
        }
      }
      sec.innerHTML = html;
      // Fix catalog links to relative depth (shared relPrefix helper).
      var prefix = relPrefix();
      sec.querySelectorAll("[data-preset-link]").forEach(function (a) {
        a.setAttribute("href", prefix + "practice/presets/index.html");
      });
      sec.querySelectorAll("[data-topic-presets]").forEach(function (a) {
        a.setAttribute("href", prefix + "practice/presets/index.html?q=" + encodeURIComponent(primary));
      });
      // Terminal-section rule: the guide must precede review material AND the
      // "What to learn next" closer. querySelector returns the first match in
      // document order; section#next covers custom-layout lessons (binary search).
      var anchor = main.querySelector("section[aria-labelledby^='r-'], section[aria-labelledby^='qz-'], section[aria-labelledby^='v-'], section#next");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);
      else main.appendChild(sec);
      addCopyButtons(sec);
    } catch (e) { /* keep static lesson usable */ }
  })();

  /* ---------- 3. comparison tables anywhere ---------- */
  (function comparisons() {
    try {
      if (!window.PRESET_COMPARISONS) return;
      document.querySelectorAll("[data-comparisons]").forEach(function (host) {
        var rows = window.PRESET_COMPARISONS.map(function (c) {
          return "<tr><td><strong>" + esc(c.a) + "</strong><br>vs<br><strong>" + esc(c.b) + "</strong></td>" +
            "<td>" + esc(c.q) + "</td><td>" + esc(c.pick) + "</td></tr>";
        }).join("");
        host.innerHTML = '<div style="overflow-x:auto"><table><thead><tr><th>Pair</th><th>Question shape</th><th>Rule</th></tr></thead>' +
          "<tbody>" + rows + "</tbody></table></div>";
      });
    } catch (e) { /* ignore */ }
  })();

  /* ---------- 4. preset catalog app ---------- */
  (function catalog() {
    var host = document.querySelector("[data-preset-catalog]");
    if (!host || !window.PRESETS) return;
    try {
      var fams = window.PRESET_FAMILIES || [];
      host.innerHTML =
        '<div class="viz-controls" role="search">' +
        '<label class="field">Search <input type="search" data-pc-q placeholder="e.g. minimum feasible, top k, cycle…" aria-label="Search presets" style="min-width:min(320px,70vw)"></label>' +
        '<label class="field">Family <select data-pc-fam aria-label="Filter by family"><option value="">All families</option>' +
        fams.map(function (f) { return '<option value="' + esc(f) + '">' + esc(f) + "</option>"; }).join("") + "</select></label>" +
        '<label class="field">Tier <select data-pc-tier aria-label="Filter by difficulty"><option value="">All tiers</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>' +
        '<label class="field"><input type="checkbox" data-pc-flag> ★ Flagship only</label>' +
        '<span class="status" data-pc-count aria-live="polite"></span></div>' +
        '<div data-pc-list></div>';
      var q = host.querySelector("[data-pc-q]"),
          fam = host.querySelector("[data-pc-fam]"),
          tier = host.querySelector("[data-pc-tier]"),
          flag = host.querySelector("[data-pc-flag]"),
          list = host.querySelector("[data-pc-list]"),
          count = host.querySelector("[data-pc-count]");
      function render() {
        var needle = (q.value || "").trim().toLowerCase();
        var words = needle ? needle.split(/\s+/) : [];
        var out = window.PRESETS.filter(function (p) {
          if (fam.value && p.family !== fam.value) return false;
          if (tier.value && p.tier !== tier.value) return false;
          if (flag.checked && !isFlagship(p)) return false;
          if (!words.length) return true;
          var hay = (p.name + " " + p.family + " " + (p.signals || []).join(" ") + " " +
            (p.keys || "") + " " + (p.related || []).join(" ") + " " + p.ex).toLowerCase();
          return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
        count.textContent = out.length + " / " + window.PRESETS.length + " presets";
        if (!out.length) {
          list.innerHTML = '<div class="callout warn">No presets match. Try fewer words, e.g. “feasible”, “window”, “top k”, “cycle”.</div>';
          return;
        }
        // Build with DOM methods for the user-influenced parts is overkill here
        // since all preset data is trusted static; query text is never injected.
        list.innerHTML = out.map(presetCard).join("");
        addCopyButtons(list);
      }
      ["input", "change"].forEach(function (ev) {
        q.addEventListener(ev, render); fam.addEventListener(ev, render); tier.addEventListener(ev, render);
        flag.addEventListener(ev, render);
      });
      // ?q= deep link support (validated: plain string, length-capped)
      try {
        var m = /[?&]q=([^&]{1,80})/.exec(location.search || "");
        if (m) q.value = decodeURIComponent(m[1].replace(/\+/g, " "));
      } catch (e) { /* ignore */ }
      render();
    } catch (e) {
      host.innerHTML = '<div class="callout warn">Preset catalog failed to load. The lessons above remain fully usable.</div>';
    }
  })();

  /* ---------- 5. hard MCQ practice app ---------- */
  (function mcq() {
    var host = document.querySelector("[data-mcq-app]");
    if (!host || !window.MCQ_BANK) return;
    try {
      var bank = window.MCQ_BANK.slice();
      var topics = Array.from(new Set(bank.map(function (x) { return x.topic; }))).sort();
      var diffs = ["Easy", "Medium", "Hard", "Expert"];
      host.innerHTML =
        '<div class="viz-controls">' +
        '<label class="field">Topic <select data-mcq-topic aria-label="Filter by topic"><option value="">Mixed (all topics)</option>' +
        topics.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("") + "</select></label>" +
        '<label class="field">Difficulty <select data-mcq-diff aria-label="Filter by difficulty"><option value="">All levels</option>' +
        diffs.map(function (d) { return "<option>" + d + "</option>"; }).join("") + "</select></label>" +
        '<button class="btn" data-mcq-shuffle type="button">Shuffle</button>' +
        '<button class="btn" data-mcq-reset type="button">Reset score</button>' +
        '<span class="status" data-mcq-status aria-live="polite"></span></div>' +
        '<div class="pbar-track" aria-hidden="true"><div class="pbar-fill" data-mcq-fill></div></div>' +
        '<div data-mcq-card style="margin-top:12px"></div>' +
        '<div class="viz-controls"><button class="btn" data-mcq-prev type="button">← Previous</button>' +
        '<button class="btn primary" data-mcq-next type="button">Next →</button></div>';
      var selT = host.querySelector("[data-mcq-topic]"),
          selD = host.querySelector("[data-mcq-diff]"),
          card = host.querySelector("[data-mcq-card]"),
          status = host.querySelector("[data-mcq-status]"),
          fill = host.querySelector("[data-mcq-fill]");
      var order = bank.map(function (_, i) { return i; });
      var pos = 0, picked = null, revealed = false;
      var SKEY = "dsa-cp-mcq:" + pageKey();
      var state = { answered: {}, correct: {} };
      try {
        var s = JSON.parse(load(SKEY) || "null");
        if (s && typeof s === "object") state = s;
      } catch (e) { /* ignore */ }
      function persist() { store(SKEY, JSON.stringify(state)); }
      function filtered() {
        return order.map(function (i) { return bank[i]; }).filter(function (x) {
          if (selT.value && x.topic !== selT.value) return false;
          if (selD.value && x.difficulty !== selD.value) return false;
          return true;
        });
      }
      var view = filtered();
      function stats() {
        var ids = Object.keys(state.answered);
        var c = ids.filter(function (id) { return state.correct[id]; }).length;
        return { done: ids.length, correct: c };
      }
      function paintStatus() {
        var st = stats();
        status.textContent = "Q " + (view.length ? Math.min(pos + 1, view.length) : 0) + "/" + view.length +
          " · Score " + st.correct + "/" + st.done + " (persisted on this device)";
        var pct = view.length ? Math.round(((pos + 1) / view.length) * 100) : 0;
        fill.style.width = pct + "%";
      }
      function letters(i) { return String.fromCharCode(65 + i); }
      function render() {
        view = filtered();
        if (!view.length) {
          card.innerHTML = '<div class="callout warn">No questions match this filter. Broaden it.</div>';
          paintStatus(); return;
        }
        if (pos < 0) pos = 0;
        if (pos >= view.length) pos = view.length - 1;
        var x = view[pos];
        picked = null; revealed = false;
        var h = '<div class="quiz-q"><fieldset><legend>Q' + (pos + 1) + ' · ' + esc(x.difficulty) +
          ' · ' + esc(x.topic) + ' — ' + esc(x.question) + '</legend>';
        x.options.forEach(function (op, i) {
          h += '<label><input type="radio" name="mcq-' + esc(x.id) + '" value="' + i + '"> <strong>' +
            letters(i) + '.</strong> ' + esc(op) + "</label>";
        });
        h += '</fieldset><div class="viz-controls"><button class="btn primary" data-mcq-submit type="button">Submit answer</button></div>' +
          '<p class="quiz-feedback" data-mcq-fb aria-live="polite"></p>' +
          '<div data-mcq-why></div></div>';
        card.innerHTML = h;
        paintStatus();
        var submit = card.querySelector("[data-mcq-submit]");
        submit.addEventListener("click", function () {
          var sel = card.querySelector('input[type="radio"]:checked');
          var fb = card.querySelector("[data-mcq-fb]");
          var why = card.querySelector("[data-mcq-why]");
          if (!sel) { fb.textContent = "Pick an option first — contests reward commitment."; fb.style.color = "var(--warn)"; return; }
          var idx = parseInt(sel.value, 10);
          if (isNaN(idx) || idx < 0 || idx >= x.options.length) {
            fb.textContent = "Invalid selection. Try again."; fb.style.color = "var(--warn)"; return;
          }
          var ok = idx === x.answer;
          state.answered[x.id] = idx;
          if (ok) state.correct[x.id] = 1; else delete state.correct[x.id];
          persist();
          // Lightweight mistake tracking: misses per question (topic attached). Cleared on correct. (§19, §42)
          try {
            var MKEY = "dsa-cp-misses";
            var misses = JSON.parse(load(MKEY) || "{}");
            if (!ok) {
              misses[x.id] = { topic: x.topic, difficulty: x.difficulty, count: ((misses[x.id] || {}).count || 0) + 1 };
            } else if (misses[x.id]) { delete misses[x.id]; }
            store(MKEY, JSON.stringify(misses));
          } catch (e) { /* private mode */ }
          fb.textContent = ok ? "Correct — " + x.options[x.answer] + "." :
            "Incorrect. Correct: " + letters(x.answer) + ". " + x.options[x.answer] + ".";
          fb.style.color = ok ? "var(--good)" : "var(--bad)";
          // Choice-specific wrong-answer panel (§18): why YOUR pick fails, the clue missed,
          // why the correct pattern fits, then every alternative.
          var fails = x.whyOthersFail || [];
          var wrongOrder = x.options.map(function (_, i) { return i; }).filter(function (i) { return i !== x.answer; });
          var allFails = wrongOrder.map(function (oi, k) {
            return "<li><strong>" + letters(oi) + ". " + esc(x.options[oi]) + ":</strong> " +
              esc(fails[k] || "Does not fit this problem shape.") + "</li>";
          }).join("");
          var yourPick = "";
          if (!ok) {
            var wk = wrongOrder.indexOf(idx);
            yourPick = '<div class="callout warn"><strong>Why your pick (' + letters(idx) + ". " +
              esc(x.options[idx]) + ') was tempting but wrong.</strong> ' +
              esc(fails[wk] || "It matches surface features, not the deciding structure.") + "</div>";
          }
          var clue = "";
          try {
            var c = (window.MCQ_CLUES || {})[x.id];
            if (c) clue = '<p><strong>Critical clue you may have missed:</strong> ' + esc(c) + "</p>";
          } catch (e) { /* ignore */ }
          why.innerHTML = '<details open><summary>Why this answer (and why the tempting ones fail)</summary>' +
            yourPick + clue +
            "<p><strong>Correct approach:</strong> " + esc(x.options[x.answer]) + ". " +
            esc(x.explanation) + "</p><p><strong>Why each alternative fails:</strong></p><ul>" +
            allFails + "</ul></details>";
          addCopyButtons(why);
          card.querySelectorAll('input[type="radio"]').forEach(function (r) { r.disabled = true; });
          submit.disabled = true;
          paintStatus();
          why.querySelector("details").focus?.();
        });
        // Keyboard: number keys 1-4 select
        card.onkeydown = function (ev) {
          if (ev.key >= "1" && ev.key <= "4") {
            var r = card.querySelectorAll('input[type="radio"]')[parseInt(ev.key, 10) - 1];
            if (r && !r.disabled) r.checked = true;
          }
        };
      }
      selT.addEventListener("change", function () { pos = 0; render(); });
      selD.addEventListener("change", function () { pos = 0; render(); });
      host.querySelector("[data-mcq-prev]").addEventListener("click", function () { if (pos > 0) { pos--; render(); } });
      host.querySelector("[data-mcq-next]").addEventListener("click", function () {
        if (pos < filtered().length - 1) { pos++; render(); }
      });
      host.querySelector("[data-mcq-shuffle]").addEventListener("click", function () {
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = order[i]; order[i] = order[j]; order[j] = t;
        }
        pos = 0; render();
      });
      host.querySelector("[data-mcq-reset]").addEventListener("click", function () {
        state = { answered: {}, correct: {} };
        persist(); pos = 0; render();
      });
      // Deep link: ?topic= & ?diff=
      try {
        var q = location.search || "";
        var mt = /[?&]topic=([^&]{1,40})/.exec(q), md = /[?&]diff=(Easy|Medium|Hard|Expert)/.exec(q);
        if (mt) { var tv = decodeURIComponent(mt[1].replace(/\+/g, " ")); if (topics.indexOf(tv) !== -1) selT.value = tv; }
        if (md) selD.value = md[1];
      } catch (e) { /* ignore */ }
      render();
    } catch (e) {
      host.innerHTML = '<div class="callout warn">Practice failed to load. Static lessons above remain usable.</div>';
    }
  })();

  /* ---------- 5b. missed-pattern review (reads dsa-cp-misses) ---------- */
  (function missedReview() {
    var host = document.querySelector("[data-mcq-review]");
    if (!host) return;
    function render() {
      var misses = {};
      try { misses = JSON.parse(load("dsa-cp-misses") || "{}"); } catch (e) { misses = {}; }
      var byTopic = {};
      Object.keys(misses).forEach(function (id) {
        var t = misses[id].topic || "Mixed";
        byTopic[t] = (byTopic[t] || 0) + misses[id].count;
      });
      var topics = Object.keys(byTopic).sort(function (a, b) { return byTopic[b] - byTopic[a]; });
      if (!topics.length) {
        host.innerHTML = '<div class="callout good"><strong>No misses recorded.</strong> Wrong answers will appear here grouped by pattern family, with review links.</div>';
        return;
      }
      var prefix = relPrefix();
      host.innerHTML = '<h3>Missed patterns — review queue</h3><ul>' + topics.map(function (t) {
        return "<li><strong>" + esc(t) + ":</strong> " + byTopic[t] + " miss(es) — " +
          '<a href="' + prefix + 'practice/presets/index.html?q=' + encodeURIComponent(t) + '">Review preset</a> · ' +
          '<a href="' + prefix + 'practice/mixed-patterns/index.html?topic=' + encodeURIComponent(t) + '">Re-drill</a></li>';
      }).join("") + "</ul>";
    }
    render();
    document.addEventListener("click", function (ev) {
      if (ev.target && ev.target.matches && ev.target.matches("[data-mcq-submit]")) {
        window.setTimeout(render, 50);
      }
    });
  })();

  /* ---------- 5c. hybrid combos renderer ---------- */
  (function combos() {
    document.querySelectorAll("[data-combos]").forEach(function (host) {
      try {
        var list = window.PRESET_COMBOS || [];
        if (!list.length) return;
        host.innerHTML = '<div style="overflow-x:auto"><table><thead><tr><th>Combo</th><th>How it works</th></tr></thead><tbody>' +
          list.map(function (c) {
            return "<tr><td><strong>" + esc(c.name) + "</strong></td><td>" + esc(c.use) + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      } catch (e) { /* ignore */ }
    });
  })();

  /* ---------- 5d. decision assistant: "what should I think about?" ---------- */
  (function decisionAssistant() {
    var host = document.querySelector("[data-decision-assistant]");
    if (!host) return;
    var STEPS = [
      { q: "Is the input sorted, or can it be sorted without losing the answer?", yes: ["Binary Search", "Two Pointers", "Sorting"], no: [] },
      { q: "Is the question about a contiguous subarray/substring?", yes: ["Sliding Window", "Arrays"], no: [] },
      { q: "Are you asked for a minimum/maximum feasible value with a yes/no test?", yes: ["Binary Search"], no: [] },
      { q: "Is the same subproblem solved repeatedly (overlapping work)?", yes: ["DP", "Bit Manipulation"], no: [] },
      { q: "Is this a graph (nodes + edges)?", yes: ["Graphs", "Shortest Path", "DSU", "MST"], no: [] },
      { q: "Do frequencies, membership, or pair-complements dominate?", yes: ["Hashing"], no: [] },
      { q: "Do you need min/max repeatedly, or top-k?", yes: ["Heap", "Greedy"], no: [] }
    ];
    var votes = {};
    host.innerHTML = '<ol class="steps">' + STEPS.map(function (s, i) {
      return '<li><strong>' + esc(s.q) + '</strong><div class="viz-controls">' +
        '<button class="btn" data-da="yes:' + i + '" type="button">Yes</button>' +
        '<button class="btn" data-da="no:' + i + '" type="button">No</button>' +
        '<button class="btn" data-da="skip:' + i + '" type="button">Unsure</button></div></li>';
    }).join("") + "</ol>" +
      '<div class="viz-controls"><button class="btn primary" data-da-reset type="button">Reset</button></div>' +
      '<div class="status" data-da-out aria-live="polite">Answer the questions above; candidate families appear here with reasoning, not keywords.</div>';
    var out = host.querySelector("[data-da-out]");
    function paint() {
      var ranked = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; });
      if (!ranked.length) {
        out.textContent = "Answer the questions above; candidate families appear here with reasoning, not keywords.";
        return;
      }
      out.innerHTML = "<strong>Investigate first:</strong> " + ranked.slice(0, 3).map(function (f) {
        return esc(f) + " (" + votes[f] + ")";
      }).join(", ") + ". Then confirm with signals and red flags before coding.";
    }
    host.addEventListener("click", function (ev) {
      var t = ev.target;
      var reset = t.closest ? t.closest("[data-da-reset]") : null;
      if (reset) {
        votes = {};
        host.querySelectorAll("[data-da]").forEach(function (x) { x.disabled = false; });
        paint(); return;
      }
      var b = t.closest ? t.closest("[data-da]") :
        ((t.getAttribute && t.getAttribute("data-da")) ? t : null);
      if (!b) return;
      var parts = (b.getAttribute("data-da") || "").split(":");
      if (parts.length !== 2) return;
      var kind = parts[0], i = parseInt(parts[1], 10);
      if (kind === "yes") STEPS[i].yes.forEach(function (f) { votes[f] = (votes[f] || 0) + 1; });
      b.disabled = true;
      paint();
    });
  })();

  /* ---------- 5e. problem → pattern chips on static problem lists ---------- */
  (function problemChips() {
    try {
      var tags = window.PROBLEM_TAGS || {}, probs = window.PROBLEMS || {};
      if (!Object.keys(tags).length) return;
      var rev = {}; // "LC1" -> [preset names]
      var byId = {};
      (window.PRESETS || []).forEach(function (p) { byId[p.id] = p.name; });
      Object.keys(tags).forEach(function (pid) {
        tags[pid].forEach(function (k) { (rev[k] = rev[k] || []).push(byId[pid] || pid); });
      });
      function keyOf(li) {
        var a = li.querySelector("a[href*='leetcode.com/problems/'], a[href*='codeforces.com/problemset/problem/']");
        if (!a) return null;
        var m = /leetcode\.com\/problems\/([a-z0-9-]+)\//.exec(a.href);
        if (m) {
          var found = Object.keys(probs).filter(function (k) { return probs[k].url === a.href; })[0];
          return found || null;
        }
        var c = /problem\/(\d+)\/([A-Za-z0-9]+)/.exec(a.href);
        if (c) return "CF" + c[1] + c[2];
        return null;
      }
      document.querySelectorAll(".problem-list li").forEach(function (li) {
        if (li.querySelector("[data-ptag]")) return;
        var k = keyOf(li);
        if (!k || !rev[k]) return;
        var sp = document.createElement("span");
        sp.className = "plat";
        sp.setAttribute("data-ptag", "");
        sp.textContent = "Pattern: " + rev[k].slice(0, 3).join(" + ");
        sp.title = "Preset(s) this problem trains";
        // Place pattern before the solved checkbox when present so DOM order
        // matches visual order (title, pattern, platform, solved); CSS order
        // reinforces the same rows regardless.
        var lab = li.querySelector("label.plab-check");
        if (lab) li.insertBefore(sp, lab); else li.appendChild(sp);
      });
    } catch (e) { /* static list stays usable */ }
  })();

  /* ---------- 5f. challenge board: solved/attempted + reveal pattern/hint (§44) ---------- */
  (function challengeBoard() {
    try {
      var tables = document.querySelectorAll("main.prose table");
      if (!tables.length || !document.querySelector("[data-challenge-timer]")) return;
      var table = tables[0];
      var rows = Array.prototype.slice.call(table.querySelectorAll("tr")).slice(1);
      if (!rows.length || rows[0].querySelector("[data-ch]")) return;
      var CKEY = "dsa-cp-challenge";
      var st = {};
      try { st = JSON.parse(load(CKEY) || "{}"); } catch (e) { st = {}; }
      function persist() { store(CKEY, JSON.stringify(st)); }
      var tags = window.PROBLEM_TAGS || {};
      var byId = {};
      (window.PRESETS || []).forEach(function (p) { byId[p.id] = p; });
      var rev = {};
      Object.keys(tags).forEach(function (pid) {
        tags[pid].forEach(function (k) { (rev[k] = rev[k] || []).push(pid); });
      });
      var head = table.querySelector("tr");
      ["Done", "Tried", "Reveal"].forEach(function (h) {
        var th = document.createElement("th"); th.textContent = h; head.appendChild(th);
      });
      var bar = document.createElement("p");
      bar.className = "status"; bar.setAttribute("data-ch-progress", "");
      bar.setAttribute("aria-live", "polite");
      table.parentNode.insertBefore(bar, table);
      function paint() {
        var done = rows.filter(function (r, i) { return st["s" + i]; }).length;
        bar.textContent = done + " / " + rows.length + " solved (stored on this device)";
      }
      rows.forEach(function (r, i) {
        var cells = r.querySelectorAll("td");
        var idText = cells.length > 2 ? cells[2].textContent.replace(/\s+/g, "") : "";
        var key = idText.replace("#", ""); // "LC239" / "CF1551D2"
        function box(kind, label) {
          var td = document.createElement("td");
          var lab = document.createElement("label");
          var cb = document.createElement("input");
          cb.type = "checkbox"; cb.checked = !!st[kind + i];
          cb.setAttribute("data-ch", "");
          cb.setAttribute("aria-label", label + " problem " + (i + 1));
          cb.addEventListener("change", function () {
            if (cb.checked) st[kind + i] = 1; else delete st[kind + i];
            persist(); paint();
          });
          lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + label));
          td.appendChild(lab); r.appendChild(td);
        }
        box("s", "Solved"); box("t", "Tried");
        var td = document.createElement("td");
        var btn = document.createElement("button");
        btn.className = "btn"; btn.type = "button"; btn.textContent = "Pattern";
        var div = document.createElement("div");
        div.className = "status";
        btn.addEventListener("click", function () {
          var pids = rev[key] || [];
          if (!pids.length) {
            div.textContent = "Not pre-classified: read constraints, name 2 candidate presets, then check the Pattern Recognition sheet.";
          } else {
            var p = byId[pids[0]];
            div.textContent = "Pattern: " + pids.map(function (id) { return byId[id] ? byId[id].name : id; }).join(" + ") +
              (p && p.signals && p.signals[0] ? ". Hint — think about: " + p.signals[0] + "." : "");
          }
        });
        td.appendChild(btn); td.appendChild(div); r.appendChild(td);
      });
      var reset = document.createElement("button");
      reset.className = "btn"; reset.type = "button"; reset.textContent = "Reset challenge progress";
      reset.addEventListener("click", function () {
        st = {}; persist();
        table.querySelectorAll("[data-ch]").forEach(function (cb) { cb.checked = false; });
        paint();
      });
      table.parentNode.insertBefore(reset, table.nextSibling);
      paint();
    } catch (e) { /* static table stays usable */ }
  })();

  /* ---------- 6. challenge-mode timer hook (progressive enhancement) ---------- */
  (function challengeTimer() {
    var host = document.querySelector("[data-challenge-timer]");
    if (!host) return;
    try {
      var display = host.querySelector("[data-ct-display]"),
          start = host.querySelector("[data-ct-start]"),
          stop = host.querySelector("[data-ct-stop]"),
          reset = host.querySelector("[data-ct-reset]"),
          mins = host.querySelector("[data-ct-mins]");
      var total = 0, left = 0, timer = null;
      function fmt(s) {
        s = Math.max(0, s);
        var m = Math.floor(s / 60), r = s % 60;
        return (m < 10 ? "0" + m : m) + ":" + (r < 10 ? "0" + r : r);
      }
      function paint() { display.textContent = fmt(left); }
      function stopT() { if (timer) { clearInterval(timer); timer = null; } }
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      start.addEventListener("click", function () {
        var m = parseInt((mins.value || "30"), 10);
        if (isNaN(m) || m < 1) m = 30;
        if (m > 240) m = 240;
        mins.value = String(m);
        stopT();
        total = m * 60; left = total; paint();
        timer = setInterval(function () {
          left--;
          paint();
          if (left <= 0) { stopT(); display.textContent = "00:00 — time! Review what you classified, not just what you solved."; }
        }, 1000);
      });
      stop.addEventListener("click", stopT);
      reset.addEventListener("click", function () { stopT(); left = total; paint(); });
      left = 30 * 60; total = left; paint();
      if (reduce) { /* no auto behaviors anyway */ }
    } catch (e) { /* ignore */ }
  })();
})();
