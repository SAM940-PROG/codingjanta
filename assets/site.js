/* Shared site JS — vanilla, no dependencies.
   Covers: theme, sidebar drawer, nav filter, scroll progress,
   checklist persistence, quiz, binary-search visualizer.
   Future topics reuse this file; per-topic data lives in the HTML. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- theme ---------- */
  // Early inline snippet in <head> already set data-theme pre-paint.
  function getTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function setTheme(next) {
    root.setAttribute("data-theme", next);
    try { window.localStorage.setItem("dsa-cp-theme", next); } catch (e) { /* private mode */ }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(next === "dark"));
      var label = btn.querySelector("[data-theme-label]");
      if (label) label.textContent = next === "dark" ? "Dark" : "Light";
    });
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  });

  /* ---------- sidebar state (desktop collapse + mobile drawer) ---------- */
  // Desktop (>960px): sidebar visible unless body.nav-collapsed (persisted).
  // Mobile (<=960px): sidebar is a drawer driven by body.nav-open (not persisted).
  var body = document.body;
  var openBtn = document.getElementById("menuBtn");
  var closeBtn = document.getElementById("sidebarClose");
  var backdrop = document.getElementById("backdrop");
  var sidebar = document.getElementById("sidebar");
  var NAV_KEY = "dsa-cp-nav";

  function isMobile() {
    return window.matchMedia("(max-width: 960px)").matches;
  }
  function loadPersisted() {
    try { return window.localStorage.getItem(NAV_KEY); } catch (e) { return null; }
  }
  function persist(v) {
    try {
      if (v) window.localStorage.setItem(NAV_KEY, v);
      else window.localStorage.removeItem(NAV_KEY);
    } catch (e) { /* private mode */ }
  }
  function syncSidebar(reason) {
    var collapsed = body.classList.contains("nav-collapsed");
    var open = body.classList.contains("nav-open");
    var visible = isMobile() ? open : !collapsed;
    if (sidebar) sidebar.setAttribute("aria-hidden", visible ? "false" : "true");
    if (openBtn) {
      openBtn.setAttribute("aria-expanded", visible ? "true" : "false");
      openBtn.setAttribute("aria-label", visible ? "Close navigation" : "Open navigation");
    }
    if (reason === "close" && !visible && openBtn && !isMobile()) {
      openBtn.focus({ preventScroll: true });
    }
  }
  // Apply persisted desktop preference on load (mobile always starts closed).
  if (!isMobile() && loadPersisted() === "collapsed") body.classList.add("nav-collapsed");
  if (openBtn) openBtn.addEventListener("click", function () {
    if (isMobile()) {
      if (body.classList.contains("nav-open")) closeNav(); else openNav();
    } else {
      body.classList.toggle("nav-collapsed");
      persist(body.classList.contains("nav-collapsed") ? "collapsed" : null);
      syncSidebar("toggle");
    }
  });
  function openNav() {
    body.classList.add("nav-open");
    syncSidebar("open");
    if (closeBtn && isMobile()) closeBtn.focus({ preventScroll: true });
  }
  function closeNav() {
    var wasOpen = body.classList.contains("nav-open");
    body.classList.remove("nav-open");
    if (isMobile() || wasOpen) syncSidebar("close");
  }
  if (closeBtn) closeBtn.addEventListener("click", function () {
    if (isMobile()) { closeNav(); if (openBtn) openBtn.focus({ preventScroll: true }); }
    else {
      body.classList.add("nav-collapsed");
      persist("collapsed");
      syncSidebar("close");
    }
  });
  if (backdrop) backdrop.addEventListener("click", closeNav);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (isMobile() && body.classList.contains("nav-open")) {
        closeNav();
        if (openBtn) openBtn.focus({ preventScroll: true });
      }
    }
  });
  // Tapping any nav link closes the drawer on mobile (no leftover dimming).
  document.querySelectorAll(".nav-item").forEach(function (a) {
    a.addEventListener("click", function () { if (isMobile()) closeNav(); });
  });
  // Resize: leaving mobile closes the drawer; entering mobile drops the
  // desktop-collapsed class effect (CSS scopes it to desktop anyway).
  var lastMobile = isMobile();
  window.addEventListener("resize", function () {
    var m = isMobile();
    if (m !== lastMobile) {
      lastMobile = m;
      body.classList.remove("nav-open");
      syncSidebar("resize");
    }
  });
  syncSidebar("init");

  /* ---------- collapsible nav categories ---------- */
  document.querySelectorAll(".nav-cat-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("aria-controls");
      var panel = id ? document.getElementById(id) : null;
      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      if (panel) panel.classList.toggle("collapsed", expanded);
    });
  });

  /* ---------- nav filter ---------- */
  var search = document.getElementById("navSearch");
  var noResults = document.getElementById("noResults");
  if (search) {
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var visible = 0;
      document.querySelectorAll(".nav-item").forEach(function (item) {
        var hit = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
        item.style.display = hit ? "" : "none";
        if (hit) visible += 1;
      });
      // Hide empty category blocks during filtering.
      document.querySelectorAll(".nav-cat").forEach(function (cat) {
        var anyVisible = Array.prototype.some.call(
          cat.querySelectorAll(".nav-item"),
          function (el) { return el.style.display !== "none"; }
        );
        cat.style.display = !q || anyVisible ? "" : "none";
      });
      document.querySelectorAll(".nav-group-label").forEach(function (el) {
        el.style.display = q ? "none" : "";
      });
      if (noResults) noResults.classList.toggle("show", q !== "" && visible === 0);
    });
  }

  /* ---------- sidebar scroll persistence (session-only) ---------- */
  // Saves .sidebar nav scrollTop to sessionStorage (rAF-throttled + on
  // navigate-away), restores it on load, and only nudges when the active
  // link would otherwise stay hidden. No visual or structural changes.
  (function sidebarScroll() {
    var KEY = "dsa-cp-sidebar-scroll";
    var nav = document.querySelector(".sidebar nav");
    if (!nav) return;
    function filtering() {
      return !!(search && search.value.trim() !== "");
    }
    function read() {
      var n = NaN;
      try { n = parseInt(window.sessionStorage.getItem(KEY), 10); } catch (e) { n = NaN; }
      if (isNaN(n) || n < 0 || n > 100000) return 0;
      return n;
    }
    function save() {
      try { window.sessionStorage.setItem(KEY, String(nav.scrollTop)); } catch (e) { /* private mode */ }
    }
    function ensureActiveVisible() {
      if (filtering()) return; // filtered results dictate position
      var active = nav.querySelector('.nav-item[aria-current="page"]');
      if (!active) return;
      var r = active.getBoundingClientRect();
      var nr = nav.getBoundingClientRect();
      if (r.top < nr.top) {
        try { nav.scrollTop -= (nr.top - r.top + 8); } catch (e) { /* ignore */ }
      } else if (r.bottom > nr.bottom) {
        try { nav.scrollTop += (r.bottom - nr.bottom + 8); } catch (e) { /* ignore */ }
      }
      // Fully visible already: do nothing (no jumping).
    }
    function restore() {
      var y = read();
      if (y > 0) {
        try { nav.scrollTop = y; } catch (e) { /* ignore */ }
      }
      ensureActiveVisible();
    }
    var queued = false;
    function schedule(fn) {
      if (window.requestAnimationFrame) return window.requestAnimationFrame(fn);
      return window.setTimeout(fn, 100);
    }
    nav.addEventListener("scroll", function () {
      if (filtering() || queued) return; // never persist filtered-list positions
      queued = true;
      schedule(function () { queued = false; save(); });
    }, { passive: true });
    // Synchronous save before internal navigation (covers drawer close + unload races).
    document.addEventListener("click", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest(".sidebar .nav-item") : null;
      if (t) save();
    });
    window.addEventListener("pagehide", save);
    // When the filter is cleared, return to the last unfiltered position.
    if (search) search.addEventListener("input", function () {
      if (!filtering()) restore();
    });
    schedule(restore);
  })();

  /* ---------- scroll progress ---------- */
  // The shared .progress node ships inside the sidebar markup; move it to
  // the top of <body> once so it acts as the page-level reading bar on
  // every page. The existing updater below is otherwise unchanged.
  (function placeReadingBar() {
    try {
      var wrap = document.querySelector(".progress");
      if (!wrap || wrap.classList.contains("read-progress")) return;
      wrap.classList.add("read-progress");
      if (wrap.parentNode !== document.body) {
        document.body.insertBefore(wrap, document.body.firstChild);
      }
    } catch (e) { /* static sidebar copy stays put */ }
  })();
  var bar = document.getElementById("progressBar");
  var ticking = false;
  function updateProgress() {
    ticking = false;
    if (!bar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = pct.toFixed(2) + "%";
  }
  document.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  /* ---------- section scroll-spy (sidebar active-section highlight) ---------- */
  // Highlights the nav link for the section currently in view. Skipped when
  // reduced motion is preferred or only one link matches (keeps it subtle).
  (function scrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-item[href*="#"]'));
    if (!links.length || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var byId = {};
    links.forEach(function (a) {
      var id = a.getAttribute("href").split("#")[1];
      if (id && document.getElementById(id)) (byId[id] = byId[id] || []).push(a);
    });
    var ids = Object.keys(byId);
    if (!ids.length) return;
    var current = null;
    function mark(id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) { a.removeAttribute("data-active"); });
      (byId[id] || []).forEach(function (a) { a.setAttribute("data-active", "true"); });
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    ids.forEach(function (id) { obs.observe(document.getElementById(id)); });
  })();

  /* ---------- checklist persistence (local only) ---------- */
  // NOTE: progress is stored locally on this device; no account exists.
  document.querySelectorAll("[data-checklist]").forEach(function (list) {
    var key = "dsa-cp-checklist:" + (list.getAttribute("data-checklist") || "default");
    var boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(key) || "null"); } catch (e) { saved = null; }
    boxes.forEach(function (box, i) {
      if (saved && typeof saved[i] === "boolean") box.checked = saved[i];
      box.addEventListener("change", function () {
        var state = boxes.map(function (b) { return b.checked; });
        try { window.localStorage.setItem(key, JSON.stringify(state)); } catch (e) { /* ignore */ }
      });
    });
  });

  /* ---------- diagnostic quiz (data-driven) ---------- */
  // Correct answers come from fieldset[data-answer]; the map below is only
  // a legacy fallback so the original binary-search page keeps working.
  var quiz = document.getElementById("quiz");
  if (quiz) {
    var legacy = { q1: "b", q2: "b", q3: "c", q4: "b", q5: "c" };
    var form = quiz.querySelector("form");
    var result = document.getElementById("quizResult");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var sets = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-answer]"));
      var score = 0, unanswered = [];
      var total = sets.length || Object.keys(legacy).length;
      var names = sets.length ? sets.map(function (fs, i) {
        var r = fs.querySelector('input[type="radio"]');
        return r ? r.name : ("q" + (i + 1));
      }) : Object.keys(legacy);
      names.forEach(function (name, i) {
        var fs = sets[i];
        var want = fs ? fs.getAttribute("data-answer") : legacy[name];
        var picked = form.querySelector('input[name="' + name + '"]:checked');
        if (!picked) { unanswered.push(name); return; }
        var wrap = picked.closest(".quiz-q");
        var fb = wrap ? wrap.querySelector(".quiz-feedback") : null;
        var correct = picked.value === want;
        if (correct) score += 1;
        if (fb) {
          fb.textContent = correct ? "Correct." : "Not quite — see the explanation below the options.";
          fb.style.color = correct ? "var(--good)" : "var(--bad)";
        }
      });
      var msg;
      if (unanswered.length) {
        msg = "You left " + unanswered.length + " question(s) unanswered. Score so far: " + score + "/" + total + ".";
      } else if (score >= total - 1) {
        msg = "Score: " + score + "/" + total + ". You remember the essentials — skim the intuition, then go to practice.";
      } else {
        msg = "Score: " + score + "/" + total + ". Work through the full lesson in order, then retry the quiz.";
      }
      result.textContent = msg;
      result.focus();
    });
    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        quiz.querySelectorAll(".quiz-feedback").forEach(function (el) { el.textContent = ""; });
        result.textContent = "";
      }, 0);
    });
  }

  /* ---------- binary search visualizer ---------- */
  var viz = document.getElementById("viz");
  if (viz) {
    var DEFAULT_ARR = [1, 3, 5, 7, 9, 11, 13, 15];
    var cellsEl = viz.querySelector("[data-cells]");
    var statusEl = viz.querySelector("[data-status]");
    var targetInput = viz.querySelector("[data-target]");
    var stepBtn = viz.querySelector("[data-step]");
    var autoBtn = viz.querySelector("[data-auto]");
    var resetBtn = viz.querySelector("[data-reset]");
    var targetSelect = viz.querySelector("[data-preset]");
    var live = viz.querySelector("[data-live]");
    var state = { arr: DEFAULT_ARR.slice(), target: 11, lo: 0, hi: DEFAULT_ARR.length - 1, step: 0, done: false };
    var timer = null;

    function stopAuto() {
      if (timer) { window.clearInterval(timer); timer = null; }
      if (autoBtn) { autoBtn.textContent = "Auto-play"; autoBtn.setAttribute("aria-pressed", "false"); }
    }

    function render(mid, message) {
      cellsEl.innerHTML = "";
      state.arr.forEach(function (value, i) {
        var d = document.createElement("div");
        var cls = "cell";
        if (i < state.lo || i > state.hi) cls += " out";
        if (mid === i && !state.done) cls += " mid";
        if (state.done && value === state.target && i >= state.lo && i <= state.hi) cls += " found";
        d.className = cls;
        d.innerHTML = "<small>[" + i + "]</small>" + value + (mid === i && !state.done ? "<small>mid</small>" : "");
        cellsEl.appendChild(d);
      });
      statusEl.innerHTML = message;
      if (live) live.textContent = statusEl.textContent;
      if (stepBtn) stepBtn.disabled = state.done;
    }

    function stepOnce() {
      if (state.done) return;
      if (state.lo > state.hi) {
        state.done = true;
        render(-1, "<strong>Not found.</strong> Range is empty, so <code>" + state.target + "</code> is absent. Steps used: " + state.step + ".");
        stopAuto();
        return;
      }
      var mid = Math.floor(state.lo + (state.hi - state.lo) / 2);
      state.step += 1;
      var v = state.arr[mid];
      if (v === state.target) {
        state.done = true;
        render(mid, "<strong>Found " + v + " at index " + mid + ".</strong> Steps used: " + state.step + ". Everything outside [" + state.lo + ", " + state.hi + "] was already proven irrelevant.");
      } else if (v < state.target) {
        render(mid, "Step " + state.step + ": <code>a[mid] = " + v + " &lt; " + state.target + "</code>, so discard <strong>left half including mid</strong>. New range: [" + (mid + 1) + ", " + state.hi + "].");
        state.lo = mid + 1;
      } else {
        render(mid, "Step " + state.step + ": <code>a[mid] = " + v + " &gt; " + state.target + "</code>, so discard <strong>right half including mid</strong>. New range: [" + state.lo + ", " + (mid - 1) + "].");
        state.hi = mid - 1;
      }
    }

    function reset(target) {
      stopAuto();
      state = {
        arr: DEFAULT_ARR.slice(),
        target: typeof target === "number" && !Number.isNaN(target) ? target : 11,
        lo: 0, hi: DEFAULT_ARR.length - 1, step: 0, done: false
      };
      render(Math.floor((state.lo + state.hi) / 2),
        "Ready. Target is <strong>" + state.target + "</strong>. Range is <strong>[0, 7]</strong>. Press <strong>Step</strong> to eliminate half.");
    }

    if (stepBtn) stepBtn.addEventListener("click", stepOnce);
    if (resetBtn) resetBtn.addEventListener("click", function () {
      var t = parseInt(targetInput.value, 10);
      reset(t);
      if (targetSelect) targetSelect.value = String(state.target);
    });
    if (targetSelect) targetSelect.addEventListener("change", function () {
      targetInput.value = targetSelect.value;
      reset(parseInt(targetSelect.value, 10));
    });
    if (targetInput) targetInput.addEventListener("change", function () {
      reset(parseInt(targetInput.value, 10));
    });
    if (autoBtn) autoBtn.addEventListener("click", function () {
      if (timer) { stopAuto(); return; }
      autoBtn.textContent = "Pause";
      autoBtn.setAttribute("aria-pressed", "true");
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      timer = window.setInterval(function () {
        if (state.done) { stopAuto(); return; }
        stepOnce();
      }, reduceMotion ? 50 : 1100);
    });

    reset(11);
  }
})();
