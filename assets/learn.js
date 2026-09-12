/* learn.js — shared learning enhancements (vanilla, no dependencies).
   Auto-applied to every page: reading rail, copy buttons, prev/next,
   lesson completion, warm-up checkoffs, data-driven dry-run visualizers.
   Per-topic config lives in small JSON blocks in the HTML. */
(function () {
  "use strict";

  function pageKey() {
    var c = document.querySelector('link[rel="canonical"]');
    var p = c ? c.getAttribute("href") : location.pathname;
    return p.replace(/^https?:\/\/[^/]+/, "") || "/";
  }
  function store(k, v) {
    try {
      if (v === null || v === undefined) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch (e) { /* private mode */ }
  }
  function load(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  /* ---------- reading rail ("On this page" + completion) ---------- */
  var ORDER = [
    ["Complexity", "algorithms/complexity/index.html"],
    ["Recursion", "algorithms/recursion/index.html"],
    ["Sorting", "algorithms/sorting/index.html"],
    ["Binary Search", "algorithms/binary-search/index.html"],
    ["Two Pointers & Sliding Window", "algorithms/twopointers/index.html"],
    ["Prefix Sum", "algorithms/prefixsum/index.html"],
    ["Hashing", "algorithms/hashing/index.html"],
    ["Linked Lists", "algorithms/linkedlists/index.html"],
    ["Stacks", "algorithms/stacks/index.html"],
    ["Queues", "algorithms/queues/index.html"],
    ["Trees", "algorithms/trees/index.html"],
    ["Heaps", "algorithms/heaps/index.html"],
    ["Tries", "algorithms/tries/index.html"],
    ["BFS / DFS / Topo Sort", "algorithms/graphs-bfs-dfs/index.html"],
    ["Shortest Path", "algorithms/shortest-path/index.html"],
    ["MST", "algorithms/mst/index.html"],
    ["Union-Find", "algorithms/union-find/index.html"],
    ["DP — 1D", "algorithms/dp-1d/index.html"],
    ["DP — 2D / Grid", "algorithms/dp-2d/index.html"],
    ["DP — Knapsack", "algorithms/dp-knapsack/index.html"],
    ["Advanced DP", "algorithms/dp-advanced/index.html"],
    ["Greedy", "algorithms/greedy/index.html"],
    ["Bit Manipulation", "algorithms/bits/index.html"],
    ["Math & Number Theory", "algorithms/math/index.html"],
    ["String Algorithms", "algorithms/string-algos/index.html"],
    ["Segment Tree & Fenwick", "algorithms/segment-tree/index.html"],
    ["Advanced DS", "algorithms/advanced-ds/index.html"],
    ["Advanced Topics", "algorithms/advanced-topics/index.html"]
  ];
  var wideMQ = window.matchMedia("(min-width: 1280px)");
  var rail = null;

  function buildRail() {
    var main = document.querySelector("main.prose");
    if (!main) return;
    var heads = Array.prototype.slice.call(main.querySelectorAll("h2[id]"));
    if (wideMQ.matches && heads.length > 2) {
      if (!rail) {
        rail = document.createElement("aside");
        rail.className = "rail";
        rail.setAttribute("aria-label", "On this page");
        var h = document.createElement("h2");
        h.textContent = "On this page";
        rail.appendChild(h);
        var ol = document.createElement("ol");
        ol.setAttribute("data-rail-list", "");
        rail.appendChild(ol);
        var doneWrap = document.createElement("div");
        doneWrap.className = "rail-done";
        var lab = document.createElement("label");
        lab.className = "done-toggle";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("data-done", "");
        cb.checked = load("dsa-cp-done:" + pageKey()) === "1";
        cb.addEventListener("change", function () {
          store("dsa-cp-done:" + pageKey(), cb.checked ? "1" : null);
        });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode("Lesson complete"));
        doneWrap.appendChild(lab);
        rail.appendChild(doneWrap);
        main.insertBefore(rail, main.firstChild);
        if ("IntersectionObserver" in window) {
          var links = {};
          ol.childNodes.forEach ? null : null;
          var obs = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
              if (e.isIntersecting && links[e.target.id]) {
                Object.keys(links).forEach(function (k) { links[k].removeAttribute("data-active"); });
                links[e.target.id].setAttribute("data-active", "true");
              }
            });
          }, { rootMargin: "-25% 0px -65% 0px" });
          heads.forEach(function (x) {
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "#" + x.id;
            a.textContent = x.textContent.replace(/^✅\s*/, "");
            ol.appendChild(li);
            li.appendChild(a);
            links[x.id] = a;
            obs.observe(x);
          });
        } else {
          heads.forEach(function (x) {
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "#" + x.id;
            a.textContent = x.textContent;
            li.appendChild(a);
            ol.appendChild(li);
          });
        }
      }
    } else if (rail && rail.parentNode) {
      rail.parentNode.removeChild(rail);
      rail = null;
    }
  }
  buildRail();
  if (wideMQ.addEventListener) wideMQ.addEventListener("change", buildRail);
  else if (wideMQ.addListener) wideMQ.addListener(buildRail);

  /* ---------- homepage dashboard: progress + next recommended ---------- */
  (function indexProgress() {
    var rm = document.getElementById("rm");
    if (!rm) return;
    function keyFor(p) { return "/" + p.replace(/\/index\.html$/, "/"); }
    var doneList = ORDER.filter(function (o) { return load("dsa-cp-done:" + keyFor(o[1])) === "1"; });
    var next = null;
    ORDER.forEach(function (o) { if (!next && load("dsa-cp-done:" + keyFor(o[1])) !== "1") next = o; });
    var pct = Math.round(doneList.length / ORDER.length * 100);
    var div = document.createElement("div");
    div.className = "dash-grid";
    div.setAttribute("data-dashboard", "");
    var a = document.createElement("div");
    a.className = "dash-card";
    a.innerHTML = "<b>Your progress (this device)</b>" +
      '<div class="pbar-track" role="img" aria-label="' + pct + '% complete"><div class="pbar-fill' + (pct === 100 ? " full" : "") + '" style="width:' + pct + '%"></div></div>' +
      "<p style='margin:6px 0 0;color:var(--muted);font-size:13px;'>" + doneList.length + " / " + ORDER.length + " core lessons complete.</p>";
    var b = document.createElement("div");
    b.className = "dash-card";
    if (next) {
      var link = document.createElement("a");
      link.href = "./" + next[1];
      link.textContent = next[0];
      b.appendChild(document.createTextNode("Next recommended: "));
      b.appendChild(link);
      var p = document.createElement("p");
      p.style.cssText = "margin:6px 0 0;color:var(--muted);font-size:13px;";
      p.textContent = "First incomplete lesson in curriculum order. Completed lessons are checked in their rails.";
      b.appendChild(p);
    } else {
      b.innerHTML = "<b>Curriculum complete.</b><p style='margin:6px 0 0;color:var(--muted);font-size:13px;'>Revisit Challenge Top-30 on a timer — speed is the remaining skill.</p>";
    }
    var c = document.createElement("div");
    c.className = "dash-card";
    c.innerHTML = "<b>Two modes</b><p style='margin:6px 0 0;color:var(--muted);font-size:13px;'>Learn mode: follow the path top to bottom. Reference mode: search the sidebar and jump straight to a template.</p>";
    div.appendChild(a);
    div.appendChild(b);
    div.appendChild(c);
    rm.parentNode.insertBefore(div, rm);
  })();

  /* ---------- copy buttons ---------- */
  document.querySelectorAll("pre").forEach(function (pre) {
    if (pre.parentNode && pre.parentNode.classList.contains("codewrap")) return;
    var wrap = document.createElement("div");
    wrap.className = "codewrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn no-print";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () {
      var text = pre.innerText || pre.textContent;
      function ok() { btn.textContent = "Copied"; window.setTimeout(function () { btn.textContent = "Copy"; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); ok(); } catch (e) { btn.textContent = "Select manually"; }
        document.body.removeChild(ta);
      }
    });
    wrap.appendChild(btn);
  });

  /* ---------- prev / next lesson ---------- */
  (function prevNext() {
    var main = document.querySelector("main.prose");
    if (!main || document.getElementById("rm")) return; // not on homepage
    var key = pageKey();
    var idx = -1;
    ORDER.forEach(function (o, i) {
      if ("/" + o[1].replace(/\/index\.html$/, "/") === key) idx = i;
    });
    if (idx < 0) return;
    function relTo(target) {
      if (key === "/") return "./" + target;
      var depth = key.split("/").filter(Boolean).length;
      return new Array(depth + 1).join("../") + target;
    }
    var nav = document.createElement("nav");
    nav.className = "lesson-nav no-print";
    nav.setAttribute("aria-label", "Lesson sequence");
    function link(i, caption) {
      var a = document.createElement("a");
      a.href = relTo(ORDER[i][1]);
      var s = document.createElement("small");
      s.textContent = caption;
      var t = document.createElement("strong");
      t.textContent = ORDER[i][0];
      a.appendChild(s);
      a.appendChild(t);
      return a;
    }
    if (idx > 0) nav.appendChild(link(idx - 1, "← Previous lesson"));
    if (idx < ORDER.length - 1) nav.appendChild(link(idx + 1, "Next lesson →"));
    var foot = main.querySelector("footer.footer");
    if (foot) main.insertBefore(nav, foot);
    else main.appendChild(nav);
  })();

  /* ---------- warm-up checkoffs ---------- */
  (function warmups() {
    var items = document.querySelectorAll(".warm-up-problem");
    if (!items.length) return;
    var key = "dsa-cp-warm:" + pageKey();
    var saved = null;
    try { saved = JSON.parse(load(key) || "null"); } catch (e) { saved = null; }
    Array.prototype.forEach.call(items, function (el, i) {
      var lab = document.createElement("label");
      lab.style.cssText = "float:right;font-weight:500;font-size:12.5px;color:var(--muted);cursor:pointer;";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.marginRight = "4px";
      cb.checked = !!(saved && saved[i]);
      cb.setAttribute("aria-label", "Mark warm-up " + (i + 1) + " done");
      cb.addEventListener("change", function () {
        var st = [];
        document.querySelectorAll(".warm-up-problem input[type=checkbox]").forEach(function (b) { st.push(b.checked); });
        store(key, JSON.stringify(st));
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode("done"));
      el.insertBefore(lab, el.firstChild);
    });
  })();

  /* ================= dry-run engine ================= */
  function cells(arr, clsFn, subFn) {
    return '<div class="cells" aria-hidden="true">' + arr.map(function (v, i) {
      var c = "dr-node" + (clsFn ? " " + (clsFn(i, v) || "") : "");
      return '<div class="' + c + '"><small>' + i + "</small>" + esc(v) + (subFn && subFn(i, v) ? "<small>" + esc(subFn(i, v)) + "</small>" : "") + "</div>";
    }).join("") + "</div>";
  }

  var BUILDERS = {
    twoptr: function (cfg) {
      var a = cfg.a, t = cfg.target, L = 0, R = a.length - 1, steps = [];
      steps.push({ s: cells(a, function (i) { return i === 0 ? "cur" : (i === a.length - 1 ? "cur" : ""); }, function (i) { return i === 0 ? "L" : (i === a.length - 1 ? "R" : ""); }), d: "Start: L=0, R=" + R + ". Because the array is sorted, a[L]+a[R] tells us which side is wrong." });
      while (L < R) {
        var sum = a[L] + a[R];
        if (sum === t) {
          steps.push({ s: cells(a, function (i) { return (i === L || i === R) ? "hit" : "dim"; }, function (i) { return i === L ? "L" : (i === R ? "R" : ""); }), d: "a[" + L + "]+a[" + R + "] = " + sum + " = target. <strong>Found.</strong> Sortedness proved every skipped pair impossible." });
          return steps;
        } else if (sum < t) {
          steps.push({ s: cells(a, function (i) { return i === L ? "cur" : (i === R ? "cur" : (i < L ? "dim" : "")); }, function (i) { return i === L ? "L" : (i === R ? "R" : ""); }), d: "Sum " + sum + " &lt; " + t + ": even the largest partner (a[R]) is too small, so a[L] works with <em>nothing</em> — discard L (L++)." });
          L++;
        } else {
          steps.push({ s: cells(a, function (i) { return i === L ? "cur" : (i === R ? "cur" : (i > R ? "dim" : "")); }, function (i) { return i === L ? "L" : (i === R ? "R" : ""); }), d: "Sum " + sum + " &gt; " + t + ": even the smallest partner (a[L]) is too big, so a[R] works with <em>nothing</em> — discard R (R--)." });
          R--;
        }
      }
      steps.push({ s: cells(a, function () { return "dim"; }), d: "L met R with no match — <strong>no such pair.</strong> Each step discarded one element: O(n)." });
      return steps;
    },
    window: function (cfg) {
      var a = cfg.a, k = cfg.k, steps = [], best = -Infinity, bi = 0, wsum = 0;
      for (var r = 0; r < a.length; r++) {
        wsum += a[r];
        if (r >= k) wsum -= a[r - k];
        if (r >= k - 1) {
          (function (rr, ws) {
            if (ws > best) { best = ws; bi = rr - k + 1; }
            steps.push({ s: cells(a, function (i) { return (i >= rr - k + 1 && i <= rr) ? "cur" : ""; }), d: "Window [" + (rr - k + 1) + ".." + rr + "] sum = " + ws + ". Best so far: " + best + " at [" + bi + ".." + (bi + k - 1) + "]. Slide: add a[" + (rr + 1) + "], drop the leftmost." });
          })(r, wsum);
        } else {
          (function (rr, ws) {
            steps.push({ s: cells(a, function (i) { return i <= rr ? "cur" : ""; }), d: "Growing the first window: sum = " + ws + " (need " + k + " elements)." });
          })(r, wsum);
        }
      }
      steps.push({ s: cells(a, function (i) { return (i >= bi && i < bi + k) ? "hit" : "dim"; }), d: "<strong>Answer: max sum " + best + "</strong> at window [" + bi + ".." + (bi + k - 1) + "]. One pass, O(n) — each element enters and leaves once." });
      return steps;
    },
    prefix: function (cfg) {
      var a = cfg.a, l = cfg.l, r = cfg.r, pref = [0], steps = [];
      for (var i = 0; i < a.length; i++) {
        pref.push(pref[i] + a[i]);
        (function (p, idx) {
          steps.push({ s: "<p>array:</p>" + cells(a, function (j) { return j <= idx ? "cur" : ""; }) + "<p>pref:</p>" + cells(p, function () { return ""; }), d: "pref[" + (idx + 1) + "] = pref[" + idx + "] + a[" + idx + "] = " + p[idx + 1] + ". One linear build answers every future query." });
        })(pref.slice(), i);
      }
      var ans = pref[r + 1] - pref[l];
      steps.push({ s: "<p>array:</p>" + cells(a, function (j) { return (j >= l && j <= r) ? "hit" : "dim"; }) + "<p>pref:</p>" + cells(pref, function (j) { return (j === l || j === r + 1) ? "cur" : "dim"; }), d: "Query [" + l + ", " + r + "]: pref[" + (r + 1) + "] − pref[" + l + "] = " + pref[r + 1] + " − " + pref[l] + " = <strong>" + ans + "</strong>. O(1) per query." });
      return steps;
    },
    stack: function (cfg) {
      var steps = [], st = [];
      cfg.ops.forEach(function (op, k) {
        if (op[0] === "push") st.push(op[1]);
        else st.pop();
        steps.push({
          s: "<p>stack top &uarr;</p>" + '<div class="cells" aria-hidden="true">' + st.slice().reverse().map(function (v, i) { return '<div class="dr-node' + (i === 0 ? " cur" : "") + '">' + esc(v) + "</div>"; }).join("") + "</div>",
          d: "Step " + (k + 1) + ": <code>" + op[0] + (op.length > 1 ? " " + esc(op[1]) : "") + "</code>" + (op[2] ? " — " + op[2] : "") + " Stack now: [" + st.join(", ") + "]."
        });
      });
      return steps;
    },
    queue: function (cfg) {
      var steps = [], q = [];
      cfg.ops.forEach(function (op, k) {
        var note = "";
        if (op[0] === "enq") { q.push(op[1]); note = "joins the back"; }
        else { note = q.shift() + " leaves the front (FIFO)"; }
        steps.push({
          s: '<div class="cells" aria-hidden="true">' + (q.length ? q.map(function (v, i) { return '<div class="dr-node' + (i === 0 ? " cur" : "") + '">' + esc(v) + (i === 0 ? "<small>front</small>" : "") + "</div>"; }).join("") : '<div class="dr-node dim">empty</div>') + "</div>",
          d: "Step " + (k + 1) + ": <code>" + op[0] + (op.length > 1 ? " " + esc(op[1]) : "") + "</code> — " + note + "."
        });
      });
      return steps;
    },
    bfs: function (cfg) {
      var adj = cfg.adj, start = cfg.start, seen = {}, q = [start], steps = [], order = [];
      seen[start] = true;
      steps.push({ s: bfsState(adj, seen, start, q), d: "Start at " + start + ". Queue: [" + q.join(", ") + "]. Mark visited <em>on enqueue</em> — this is the bug everyone writes once." });
      while (q.length) {
        var u = q.shift();
        order.push(u);
        var added = [];
        (adj[u] || []).forEach(function (v) { if (!seen[v]) { seen[v] = true; q.push(v); added.push(v); } });
        steps.push({ s: bfsState(adj, seen, u, q), d: "Visit " + u + " (order so far: " + order.join(" → ") + ")." + (added.length ? " New neighbors enqueued: " + added.join(", ") + "." : " No new neighbors.") + " Queue: [" + (q.join(", ") || "empty") + "]." });
      }
      steps.push({ s: bfsState(adj, seen, -1, []), d: "<strong>BFS order: " + order.join(" → ") + ".</strong> Each node enqueued once: O(V+E). Layers of this order are shortest distances in edges." });
      return steps;
    },
    dp1d: function (cfg) {
      var n = cfg.n, dp = new Array(n + 1).fill(null), steps = [];
      dp[0] = 1; dp[1] = 1;
      steps.push({ s: cells(dp, function (i) { return i <= 1 ? "cur" : ""; }), d: "Base: dp[0]=1 (empty way), dp[1]=1. " + cfg.why });
      for (var i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
        (function (idx, snap) {
          steps.push({ s: cells(snap, function (j) { return j === idx ? "hit" : ((j === idx - 1 || j === idx - 2) ? "cur" : ""); }), d: "dp[" + idx + "] = dp[" + (idx - 1) + "] + dp[" + (idx - 2) + "] = " + snap[idx - 1] + " + " + snap[idx - 2] + " = <strong>" + snap[idx] + "</strong>. Only the two dependencies matter." });
        })(i, dp.slice());
      }
      steps.push({ s: cells(dp, function (j) { return j === n ? "hit" : "dim"; }), d: "<strong>Answer dp[" + n + "] = " + dp[n] + ".</strong> O(n) time, O(1) space with two variables." });
      return steps;
    },
    heap: function (cfg) {
      var h = [], steps = [];
      cfg.vals.forEach(function (v) {
        h.push(v);
        var i = h.length - 1, log = "Insert " + v + " at the end.";
        while (i > 0) {
          var p = Math.floor((i - 1) / 2);
          if ((cfg.min === false ? h[p] < h[i] : h[p] > h[i])) {
            var t = h[p]; h[p] = h[i]; h[i] = t;
            log += " Swap with parent " + h[i] + " (heap order restored upward).";
            i = p;
          } else { log += " Parent already " + (cfg.min === false ? "≥" : "≤") + " — stop."; break; }
        }
        (function (snap, msg) {
          steps.push({ s: cells(snap, function (j) { return j === snap.length - 1 ? "new" : ""; }), d: msg + " Heap array (level order): [" + snap.join(", ") + "]." });
        })(h.slice(), log);
      });
      steps.push({ s: cells(h, function (j) { return j === 0 ? "hit" : ""; }), d: "<strong>Top = " + h[0] + ".</strong> Each insert bubbles O(log n); extract reverses the process." });
      return steps;
    },
    dijkstra: function (cfg) {
      var n = cfg.n, adj = {};
      for (var i = 0; i < n; i++) adj[i] = [];
      cfg.edges.forEach(function (e) { adj[e[0]].push([e[1], e[2]]); adj[e[1]].push([e[0], e[2]]); });
      var INF = "∞", dist = [], done = [], steps = [];
      for (var k = 0; k < n; k++) { dist.push(INF); done.push(false); }
      dist[cfg.src] = 0;
      function snap(cur) {
        return cells(dist, function (j) { return done[j] ? "dim" : (j === cur ? "cur" : ""); }, function (j) { return done[j] ? "done" : ""; });
      }
      steps.push({ s: snap(cfg.src), d: "dist[source]=0, rest ∞. Always extract the <em>unsettled</em> node with smallest dist — that distance is final (non-negative weights)." });
      for (var it = 0; it < n; it++) {
        var u = -1, bd = Infinity;
        for (var j = 0; j < n; j++) if (!done[j] && dist[j] !== INF && dist[j] < bd) { bd = dist[j]; u = j; }
        if (u < 0) break;
        done[u] = true;
        var rel = [];
        adj[u].forEach(function (pr) {
          var v = pr[0], w = pr[1];
          if (!done[v] && (dist[v] === INF || dist[u] + w < dist[v])) { dist[v] = dist[u] + w; rel.push(v + "→" + dist[v]); }
        });
        (function (uu, ds, rs) {
          steps.push({ s: snap(uu), d: "Settle <strong>" + uu + "</strong> at dist " + ds + "." + (rs.length ? " Relax: " + rs.join(", ") + "." : " No improvements.") });
        })(u, bd, rel);
      }
      steps.push({ s: snap(-1), d: "<strong>Final distances from " + cfg.src + ": [" + dist.join(", ") + "].</strong> O((V+E) log V) with a heap." });
      return steps;
    },
    uf: function (cfg) {
      var parent = [], steps = [];
      for (var i = 0; i < cfg.n; i++) parent.push(i);
      function find(x) {
        var path = [];
        while (parent[x] !== x) { path.push(x); x = parent[x]; }
        return { root: x, path: path };
      }
      steps.push({ s: cells(parent, function () { return ""; }), d: "Start: every node is its own parent." });
      cfg.ops.forEach(function (op) {
        var fa = find(op[1]), fb = find(op[2]), msg;
        if (fa.root === fb.root) { msg = "find(" + op[1] + ") = find(" + op[2] + ") = " + fa.root + ": already connected, skip (this is cycle detection)."; }
        else {
          parent[fa.root] = fb.root;
          fa.path.forEach(function (x) { parent[x] = fb.root; });
          msg = "union(" + op[1] + ", " + op[2] + "): attach root " + fa.root + " under " + fb.root + "; flattened " + (fa.path.length ? fa.path.join(", ") : "nothing") + " (path compression).";
        }
        (function (snap, m, a, b) {
          steps.push({ s: cells(snap, function (j) { return (j === a || j === b) ? "cur" : ""; }), d: m });
        })(parent.slice(), msg, op[1], op[2]);
      });
      steps.push({ s: cells(parent, function () { return ""; }), d: "<strong>parent = [" + parent.join(", ") + "].</strong> With compression + union by rank every op is ~O(1) (inverse Ackermann)." });
      return steps;
    },
    reverse: function (cfg) {
      var a = cfg.a, steps = [], prev = -1, cur = 0;
      function snap(p, c2, nx) {
        return cells(a, function (j) { return j === p ? "hit" : (j === c2 ? "cur" : (j === nx ? "new" : "")); }, function (j) { return j === p ? "prev" : (j === c2 ? "curr" : (j === nx ? "next" : "")); });
      }
      steps.push({ s: snap(-1, 0, 1), d: "prev=null, curr=head. Save next <em>before</em> rewiring or the rest of the list is lost." });
      while (cur < a.length) {
        var nx = cur + 1;
        steps.push({ s: snap(prev, cur, nx < a.length ? nx : -1), d: "curr.next = prev (reverse one link: " + a[cur] + " now points back). Advance: prev=" + cur + ", curr=" + (nx < a.length ? nx : "null") + "." });
        prev = cur; cur = nx;
      }
      steps.push({ s: cells(a.slice().reverse(), function (j) { return j === 0 ? "hit" : ""; }), d: "<strong>Return prev: new head.</strong> O(n) time, O(1) space. The saved-next habit is the whole trick." });
      return steps;
    },
    traversal: function (cfg) {
      var t = cfg.tree, order = cfg.order || "in", steps = [], seq = [];
      function walk(i) {
        if (i >= t.length || t[i] === null) return;
        var L = 2 * i + 1, R = 2 * i + 2;
        if (order === "pre") visit(i);
        walk(L);
        if (order === "in") visit(i);
        walk(R);
        if (order === "post") visit(i);
      }
      function visit(i) {
        seq.push(t[i]);
        (function (sn, idx) {
          steps.push({ s: cells(t.map(function (v) { return v === null ? "·" : v; }), function (j) { return sn.indexOf(t[j]) >= 0 && t[j] !== null ? (j === idx ? "cur" : "hit") : ""; }), d: "Visit <strong>" + t[idx] + "</strong> (" + order + "order). Output so far: " + sn.join(", ") + "." });
        })(seq.slice(), i);
      }
      steps.push({ s: cells(t.map(function (v) { return v === null ? "·" : v; }), function () { return ""; }), d: cfg.order === "pre" ? "Preorder: node, left, right." : (cfg.order === "post" ? "Postorder: left, right, node." : "Inorder: left, node, right — sorted order on a BST.") });
      walk(0);
      steps.push({ s: cells(t.map(function (v) { return v === null ? "·" : v; }), function (j) { return t[j] !== null ? "hit" : ""; }), d: "<strong>" + order + "order: " + seq.join(", ") + ".</strong> O(n) — every node visited once; recursion depth = tree height." });
      return steps;
    },
    callstack: function (cfg) {
      var n = cfg.n, steps = [], depth = [];
      for (var i = n; i >= 1; i--) {
        depth.push(i);
        (function (sn) {
          steps.push({ s: '<div class="cells" aria-hidden="true">' + sn.slice().reverse().map(function (v, j) { return '<div class="dr-node' + (j === 0 ? " cur" : "") + '">f(' + v + ")</div>"; }).join("") + "</div>", d: "Call f(" + sn[sn.length - 1] + ") — a new frame is pushed. Nothing returns until f(1) hits the base case." });
        })(depth.slice());
      }
      var res = 1;
      while (depth.length) {
        var f = depth.pop();
        res *= f;
        (function (sn, r, ff) {
          steps.push({ s: '<div class="cells" aria-hidden="true">' + (sn.length ? sn.slice().reverse().map(function (v) { return '<div class="dr-node dim">f(' + v + ")</div>"; }).join("") : '<div class="dr-node dim">empty</div>') + "</div>", d: "f(" + ff + ") returns; caller multiplies by " + ff + " → running result " + r + ". Frames unwind in reverse." });
        })(depth.slice(), res, f);
      }
      steps.push({ s: "<p><strong>Result: " + n + "! = " + res + ".</strong> Depth " + n + " frames — deep recursion overflows the stack; that is why iterative or tail forms matter.</p>", d: "Each call waits for a smaller one: base case stops the descent, returns compose the answer." });
      return steps;
    },
    kruskal: function (cfg) {
      var edges = cfg.edges.map(function (e, i) { return { u: e[0], v: e[1], w: e[2], i: i, st: "" }; });
      edges.sort(function (a, b) { return a.w - b.w; });
      var parent = [];
      for (var i = 0; i < cfg.nodes; i++) parent.push(i);
      function find(x) { while (parent[x] !== x) x = parent[x]; return x; }
      var steps = [], total = 0, taken = [];
      function edgeRows() {
        return '<div class="cells" aria-hidden="true">' + edges.map(function (e) {
          return '<div class="dr-node ' + (e.st || "") + '">' + e.u + "–" + e.v + "<small>" + e.w + "</small></div>";
        }).join("") + "</div>";
      }
      steps.push({ s: edgeRows(), d: "Sort all edges by weight. Take the cheapest edge that does <em>not</em> close a cycle — the cut property makes this safe." });
      edges.forEach(function (e) {
        var ru = find(e.u), rv = find(e.v), snap;
        if (ru === rv) {
          e.st = "dim";
          snap = edgeRows();
          steps.push({ s: snap, d: "Edge " + e.u + "–" + e.v + " (" + e.w + "): find(" + e.u + ") = find(" + e.v + ") = " + ru + " — already connected, <strong>reject</strong> (would close a cycle)." });
        } else {
          parent[ru] = rv;
          e.st = "hit";
          total += e.w;
          taken.push(e.u + "–" + e.v);
          snap = edgeRows();
          steps.push({ s: snap + "<p style='color:var(--muted);font-size:13px;'>parent: [" + parent.join(", ") + "] · total: " + total + "</p>", d: "Edge " + e.u + "–" + e.v + " (" + e.w + "): different sets — <strong>accept</strong>, union the roots. Running total " + total + "." });
        }
      });
      edges.forEach(function (e) { if (!e.st) e.st = "dim"; });
      steps.push({ s: edgeRows(), d: "<strong>MST = {" + taken.join(", ") + "}, cost " + total + ".</strong> O(E log E) for the sort; unions are ~O(1)." });
      return steps;
    },
    greedy: function (cfg) {
      var items = cfg.items.map(function (it) { return { s: it[0], e: it[1], st: "" }; });
      items.sort(function (a, b) { return a.e - b.e; });
      var steps = [], lastEnd = -Infinity, picked = [];
      function rows() {
        return '<div class="cells" aria-hidden="true">' + items.map(function (it) {
          return '<div class="dr-node ' + (it.st || "") + '">[' + it.s + "," + it.e + "]</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: rows(), d: "Sort by <em>end</em> time. Earliest-finishing leaves the most room — the exchange argument." });
      items.forEach(function (it) {
        if (it.s >= lastEnd) {
          it.st = "hit"; lastEnd = it.e; picked.push("[" + it.s + "," + it.e + "]");
          steps.push({ s: rows(), d: "Take <strong>[" + it.s + "," + it.e + "]</strong>: starts at/after last end (" + (lastEnd === it.e ? "compatible" : lastEnd) + "). Safe by the exchange argument." });
        } else {
          it.st = "dim";
          steps.push({ s: rows(), d: "Reject [" + it.s + "," + it.e + "]: overlaps the taken activity ending at " + lastEnd + ". No room — skip." });
        }
      });
      steps.push({ s: rows(), d: "<strong>Picked " + picked.length + ": " + picked.join(" ") + ".</strong> O(n log n) sort + O(n) scan. No proof sketch → don't trust greedy." });
      return steps;
    },
    hashmap: function (cfg) {
      var size = cfg.size || 5, buckets = [], steps = [];
      for (var i = 0; i < size; i++) buckets.push([]);
      function h(k) { return ((k % size) + size) % size; }
      function rows(active) {
        return buckets.map(function (ch, b) {
          var inner = ch.length ? ch.map(function (kv) {
            return '<div class="dr-node' + (active && active.b === b && active.k === kv[0] ? " cur" : "") + '">' + kv[0] + "<small>" + kv[1] + "</small></div>";
          }).join("") : '<span style="color:var(--muted);font-size:12px;">∅</span>';
          return '<div style="display:flex;gap:6px;align-items:center;margin:3px 0;"><span style="min-width:52px;color:var(--muted);font-size:12px;">bucket ' + b + "</span>" + inner + "</div>";
        }).join("");
      }
      steps.push({ s: rows(null), d: "Hash map with " + size + " buckets: bucket = hash(key) mod " + size + ". Average O(1) — collisions chain inside a bucket." });
      cfg.ops.forEach(function (op, k) {
        var b = h(op[1]), msg;
        if (op[0] === "put") {
          var found = false;
          buckets[b].forEach(function (kv) { if (kv[0] === op[1]) { kv[1] = op[2]; found = true; } });
          if (!found) buckets[b].push([op[1], op[2]]);
          msg = "put(" + op[1] + "," + op[2] + ") → bucket " + b + (found ? " (key existed — value updated)." : " (appended to chain).");
        } else if (op[0] === "get") {
          var hit = null;
          buckets[b].forEach(function (kv) { if (kv[0] === op[1]) hit = kv[1]; });
          msg = "get(" + op[1] + ") → bucket " + b + ": " + (hit === null ? "<strong>miss</strong> (scan chain, absent)." : "<strong>hit = " + hit + "</strong>.");
        } else {
          var before = buckets[b].length;
          buckets[b] = buckets[b].filter(function (kv) { return kv[0] !== op[1]; });
          msg = "remove(" + op[1] + ") → bucket " + b + (buckets[b].length < before ? " (removed)." : " (absent — nothing to do).");
        }
        (function (snap, m, bb, kk) {
          steps.push({ s: snap, d: "Step " + (k + 1) + ": " + m });
        })(rows({ b: b, k: op[1] }), msg);
      });
      steps.push({ s: rows(null), d: "<strong>Final state above.</strong> Long chains degrade to O(n) — good hashes and resizing keep it O(1)." });
      return steps;
    },
    sort: function (cfg) {
      var a = cfg.a.slice(), steps = [];
      function rows(arr, cls, sub) {
        return '<div class="cells" aria-hidden="true">' + arr.map(function (v, i) {
          return '<div class="dr-node ' + (cls ? (cls(i, v) || "") : "") + '"><small>' + i + "</small>" + esc(v) +
            (sub && sub(i, v) ? "<small>" + esc(sub(i, v)) + "</small>" : "") + "</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: rows(a), d: "Input. " + (cfg.note || "Sorting reorders while preserving the multiset.") });
      var n = a.length;
      for (var i = 1; i < n; i++) {
        var key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
        (function (arr, upto, k) {
          steps.push({ s: rows(arr, function (idx) { return idx <= upto ? "hit" : ""; }, function (idx) { return idx === upto ? "sorted" : ""; }),
            d: "Insert " + k + " into the sorted prefix by shifting larger elements right. Prefix [0.." + upto + "] is now sorted." });
        })(a.slice(), i, key);
      }
      steps.push({ s: rows(a, function () { return "hit"; }), d: "<strong>Sorted: [" + a.join(", ") + "].</strong> " + (cfg.complexity || "Comparisons dominate; the built-in sort is O(n log n).") });
      return steps;
    },
    lca: function (cfg) {
      var parent = cfg.parent, u = cfg.u, v = cfg.v, steps = [];
      function path(x) { var p = []; while (x !== -1) { p.push(x); x = parent[x]; } return p.reverse(); }
      var pu = path(u), pv = path(v);
      var i = 0; while (i < pu.length && i < pv.length && pu[i] === pv[i]) i++;
      var lcaNode = pu[i - 1];
      function chain(x, upTo) {
        return '<div class="cells" aria-hidden="true">' + path(x).map(function (node) {
          return '<div class="dr-node' + (node === upTo ? " hit" : (node === u || node === v ? " cur" : "")) + '">' + node + "</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: chain(u, -1) + chain(v, -1), d: "Path to " + u + ": " + pu.join(" → ") + ". Path to " + v + ": " + pv.join(" → ") + ". They meet at the deepest common node." });
      steps.push({ s: chain(u, lcaNode), d: "The paths first coincide at <strong>" + lcaNode + "</strong> — that is the LCA. Binary lifting finds it in O(log n) by aligning depths, then jumping both up while ancestors differ." });
      return steps;
    },
    kmp: function (cfg) {
      var pat = cfg.pattern, steps = [], pi = new Array(pat.length).fill(0), k = 0;
      function rows(j) {
        return '<div class="cells" aria-hidden="true">' + pat.split("").map(function (ch, i) {
          return '<div class="dr-node' + (i < pi.length ? (j === i ? " cur" : (i < j ? " hit" : "")) : "") + '">' + esc(ch) +
            "<small>" + (pi[i] || 0) + "</small></div>";
        }).join("") + "</div>";
      }
      steps.push({ s: rows(0), d: "Build the prefix table: pi[i] = length of the longest proper prefix that is also a suffix of pat[0..i]. Numbers shown under each character." });
      for (var i = 1; i < pat.length; i++) {
        while (k > 0 && pat[i] !== pat[k]) k = pi[k - 1];
        if (pat[i] === pat[k]) k++;
        pi[i] = k;
        (function (idx) {
          steps.push({ s: rows(idx + 1), d: "pat[" + idx + "] = '" + pat[idx] + "': the longest border so far has length " + pi[idx] + ". On a mismatch, fall back to pi[k-1] instead of re-scanning." });
        })(i);
      }
      steps.push({ s: rows(pat.length), d: "<strong>Prefix table: [" + pi.join(", ") + "].</strong> Matching then skips already-compared characters — O(n + m) total." });
      return steps;
    },
    prefixdiff: function (cfg) {
      var n = cfg.n, diff = new Array(n + 1).fill(0), steps = [], shown = new Array(n).fill(0);
      function rows() {
        return "<p>difference d:</p>" + '<div class="cells" aria-hidden="true">' + diff.map(function (v, i) {
          return '<div class="dr-node">' + v + "</div>";
        }).join("") + '</div><p>array:</p><div class="cells" aria-hidden="true">' + shown.map(function (v, i) {
          return '<div class="dr-node' + (v !== 0 ? " hit" : "") + '">' + v + "</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: rows(), d: "Start with a zeroed difference array. A range add [l, r] += v only touches two cells." });
      cfg.ops.forEach(function (op, t) {
        diff[op[0]] += op[2];
        diff[op[1] + 1] -= op[2];
        (function (snap) {
          steps.push({ s: rows(), d: "Apply +" + op[2] + " on [" + op[0] + ", " + op[1] + "]: d[" + op[0] + "] += " + op[2] + ", d[" + (op[1] + 1) + "] -= " + op[2] + " (step " + (t + 1) + ")." });
        })();
      });
      var run = 0;
      for (var i = 0; i < n; i++) { run += diff[i]; shown[i] = run; }
      steps.push({ s: rows(), d: "<strong>Prefix-sum the difference array to recover the final values.</strong> Each range op was O(1); the single rebuild is O(n)." });
      return steps;
    },
    segtree: function (cfg) {
      var a = cfg.a, n = a.length, tree = new Array(2 * n), steps = [];
      for (var i = 0; i < n; i++) tree[n + i] = a[i];
      for (var i2 = n - 1; i2 > 0; i2--) tree[i2] = tree[2 * i2] + tree[2 * i2 + 1];
      function rows(treeArr, cls) {
        return "<p>a:&nbsp;" + '<div class="cells" aria-hidden="true">' + a.map(function (v, i) {
          return '<div class="dr-node">' + v + "</div>";
        }).join("") + '</div></p><p>tree (leaf = a[i], internal = sum of children):</p>' +
        '<div class="cells" aria-hidden="true">' + treeArr.map(function (v, i) {
          return '<div class="dr-node' + (cls && cls(i) ? " " + cls(i) : "") + '"><small>' + i + "</small>" + v + "</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: rows(tree, function (i) { return i >= n ? "hit" : ""; }), d: "Build: copy the array into the second half (leaves), then each internal node = sum of its two children, bottom-up. O(n)." });
      steps.push({ s: rows(tree, function (i) { return i >= n && i - n >= cfg.l && i - n <= cfg.r ? "cur" : ""; }), d: "Query sum on [" + cfg.l + ", " + cfg.r + "]: walk the two boundary leaves upward, adding only the nodes that lie fully inside the range. O(log n) — most of the tree is skipped." });
      steps.push({ s: rows(tree, function (i) { return i >= n && i - n === cfg.p ? "cur" : ""; }), d: "Point update a[" + cfg.p + "] += " + cfg.v + ": change its leaf, then recompute only the O(log n) ancestors on the path to the root." });
      return steps;
    },
    dp2d: function (cfg) {
      var grid = cfg.grid, rowsN = grid.length, cols = grid[0].length;
      var dp = grid.map(function (row) { return row.map(function () { return 0; }); });
      var steps = [];
      function show(cls) {
        return '<div class="cells" aria-hidden="true" style="flex-direction:column;gap:4px;">' +
          dp.map(function (row, r) {
            return '<div class="cells" style="gap:4px;">' + row.map(function (v, c) {
              return '<div class="dr-node' + (cls && cls(r, c) ? " " + cls(r, c) : "") + '"><small>(' + r + "," + c + ")</small>" + v + "</div>";
            }).join("") + "</div>";
          }).join("") + "</div>";
      }
      steps.push({ s: show(), d: cfg.why || "Fill the DP table cell by cell; each cell is computed from already-solved neighbors." });
      for (var r = 0; r < rowsN; r++) {
        for (var c = 0; c < cols; c++) {
          if (r === 0 && c === 0) dp[r][c] = grid[r][c];
          else if (r === 0) dp[r][c] = dp[r][c - 1] + grid[r][c];
          else if (c === 0) dp[r][c] = dp[r - 1][c] + grid[r][c];
          else dp[r][c] = Math.min(dp[r - 1][c], dp[r][c - 1]) + grid[r][c];
          (function (rr, cc) {
            steps.push({ s: show(function (x, y) { return x === rr && y === cc ? "hit" : ""; }),
              d: "dp[" + rr + "][" + cc + "] = min(from above, from left) + cost = " + dp[rr][cc] + ". Reading already-final neighbors is why we fill in this order." });
          })(r, c);
        }
      }
      steps.push({ s: show(function (x, y) { return x === rowsN - 1 && y === cols - 1 ? "hit" : ""; }), d: "<strong>Answer dp[" + (rowsN - 1) + "][" + (cols - 1) + "] = " + dp[rowsN - 1][cols - 1] + ".</strong> O(n·m) states, O(1) transition each." });
      return steps;
    },
    knapsack: function (cfg) {
      var items = cfg.items, cap = cfg.cap, dp = new Array(cap + 1).fill(0), steps = [];
      function show(cls) {
        return '<div class="cells" aria-hidden="true">' + dp.map(function (v, i) {
          return '<div class="dr-node' + (cls && cls(i) ? " " + cls(i) : "") + '"><small>w' + i + "</small>" + v + "</div>";
        }).join("") + "</div>";
      }
      steps.push({ s: show(), d: "dp[w] = best value achievable with capacity w. One row suffices for 0/1 knapsack if capacity is iterated downward." });
      items.forEach(function (it) {
        var w = it[0], v = it[1];
        for (var j = cap; j >= w; j--) {
          if (dp[j - w] + v > dp[j]) dp[j] = dp[j - w] + v;
          (function (jj) {
            steps.push({ s: show(function (i) { return i === jj ? "hit" : ""; }),
              d: "Item (weight " + w + ", value " + v + ") at capacity " + jj + ": dp[" + (jj - w) + "] + " + v + " vs dp[" + jj + "] → " + dp[jj] + "." });
          })(j);
        }
      });
      steps.push({ s: show(function (i) { return i === cap ? "hit" : ""; }), d: "<strong>Answer dp[" + cap + "] = " + dp[cap] + ".</strong> Counting downward is what stops an item being reused (that is the unbounded variant)." });
      return steps;
    },
    lis: function (cfg) {
      var a = cfg.a, steps = [], tails = [];
      function show(cls) {
        return '<div class="cells" aria-hidden="true">' + a.map(function (v, i) {
          return '<div class="dr-node' + (cls && cls(i) ? " " + cls(i) : "") + '"><small>' + i + "</small>" + v + "</div>";
        }).join("") + "</div><p style='color:var(--muted);font-size:13px;'>tails: [" + tails.join(", ") + "]</p>";
      }
      steps.push({ s: show(), d: "Maintain tails[k] = smallest possible tail of an increasing subsequence of length k+1. Its length tracks the LIS." });
      a.forEach(function (v, i) {
        var lo = 0, hi = tails.length;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (tails[mid] < v) lo = mid + 1; else hi = mid; }
        if (lo === tails.length) tails.push(v); else tails[lo] = v;
        (function (ii) {
          steps.push({ s: show(function (j) { return j <= ii ? "hit" : ""; }), d: "Place " + a[ii] + " at tails[" + (tails.indexOf(a[ii]) < 0 ? tails.length - 1 : tails.indexOf(a[ii])) + "] via binary search. tails stays sorted, so each step is O(log n)." });
        })(i);
      });
      steps.push({ s: show(), d: "<strong>LIS length = " + tails.length + ".</strong> O(n log n): binary search replaces the O(n) scan of the classic O(n²) DP." });
      return steps;
    },
    bits: function (cfg) {
      var n = cfg.n, steps = [], seen = 0, cnt = 0;
      function binary(x, width) { return x.toString(2).padStart(width, "0"); }
      steps.push({ s: "<p>Enumerate all subsets of a " + cfg.bits + "-bit mask by counting up.</p>", d: "Each integer 0..2^n−1 is a subset; bit i set means element i is included. This is the standard O(2^n) enumeration." });
      for (var m = 0; m < (1 << cfg.bits); m++) {
        var members = [];
        for (var i = 0; i < cfg.bits; i++) if (m & (1 << i)) members.push(i);
        seen |= m; cnt++;
        (function (mm, mmb) {
          steps.push({ s: '<div class="cells" aria-hidden="true">' + binary(mm, cfg.bits).split("").map(function (b, i) {
            return '<div class="dr-node' + (b === "1" ? " hit" : "") + '"><small>bit' + i + "</small>" + b + "</div>";
          }).join("") + "</div>", d: "mask " + mm + " = {" + (mmb.length ? mmb.join(", ") : "∅") + "}." });
        })(m, members);
      }
      steps.push({ s: "<p><strong>" + cnt + " subsets generated.</strong> Common tricks: lowbit = x & (-x), clear lowbit = x & (x-1), and (1L &lt;&lt; 40) to avoid 32-bit overflow.</p>", d: "Bitmask DP stores a subset as one integer, making visited-state checks O(1)." });
      return steps;
    },
    gcd: function (cfg) {
      var a = cfg.a, b = cfg.b, steps = [];
      function row(x, y) { return '<div class="cells" aria-hidden="true"><div class="dr-node cur">gcd(' + x + ", " + y + ")</div></div>"; }
      steps.push({ s: row(a, b), d: "Euclid: gcd(a, b) = gcd(b, a mod b). The remainder shrinks fast — at most O(log min(a,b)) steps." });
      while (b !== 0) {
        var r = a % b;
        steps.push({ s: row(a, b), d: a + " mod " + b + " = " + r + ", so recurse on (" + b + ", " + r + ")." });
        a = b; b = r;
      }
      steps.push({ s: row(a, 0), d: "<strong>gcd = " + a + ".</strong> When the remainder hits 0, the other number is the gcd. LCM = a*b/gcd (mind overflow)." });
      return steps;
    },
    trie: function (cfg) {
      var words = cfg.words, query = cfg.query, steps = [];
      function treeText() {
        return words.map(function (w) {
          return '<div class="dr-node">' + esc(w.charAt(0)) + "<small>" + esc(w) + "</small></div>";
        }).join("");
      }
      steps.push({ s: '<div class="cells" aria-hidden="true">' + treeText() + '</div><p style="color:var(--muted);font-size:13px;">Words share their common-prefix path in the trie.</p>', d: "Insert each word character by character under a shared root; mark the last node as end-of-word." });
      steps.push({ s: '<div class="cells" aria-hidden="true">' + query.split("").map(function (ch) {
        return '<div class="dr-node hit">' + esc(ch) + "</div>";
      }).join("") + "</div>", d: "Walk the query \"" + esc(query) + "\" one character at a time. If a child is missing, the prefix (and every word under it) does not exist — O(len) total." });
      steps.push({ s: "<p><strong>Trie operations are O(L) in the key length</strong> — independent of how many words are stored. That is why autocomplete and prefix counts are fast.</p>", d: "Array children suit a fixed 'a'..'z' alphabet; HashMap children suit sparse alphabets at the cost of memory." });
      return steps;
    },
    nim: function (cfg) {
      var piles = cfg.piles.slice(), steps = [], x = 0;
      piles.forEach(function (p) { x ^= p; });
      steps.push({ s: '<div class="cells" aria-hidden="true">' + piles.map(function (p) { return '<div class="dr-node">' + p + "</div>"; }).join("") + '</div>', d: "Compute the XOR of all pile sizes. Non-zero XOR means the player to move can win with perfect play." });
      steps.push({ s: '<div class="cells" aria-hidden="true"><div class="dr-node hit">XOR = ' + x + "</div></div>", d: x !== 0 ? "<strong>Winning position.</strong> Move to make XOR 0: pick a pile with the highest set bit of the XOR and reduce it." : "<strong>Losing position.</strong> Every move leaves a non-zero XOR the opponent can exploit." });
      steps.push({ s: "<p><strong>Nim theory:</strong> a position is losing iff the XOR of pile sizes is 0.</p>", d: "Grundy numbers generalize this to any impartial game: XOR the Grundy value of each independent component." });
      return steps;
    },
    growth: function (cfg) {
      var n = cfg.n, funcs = [
        ["O(1)", function () { return 1; }],
        ["O(log n)", function (x) { return Math.ceil(Math.log2(x)); }],
        ["O(n)", function (x) { return x; }],
        ["O(n log n)", function (x) { return x * Math.ceil(Math.log2(x)); }],
        ["O(n²)", function (x) { return x * x; }]
      ], steps = [];
      steps.push({ s: "<p>n = <strong>" + n + "</strong>. Estimated operations if each step is 1 ns (1 s budget ≈ 10⁹ ops):</p>", d: "Reading growth off code shape tells you before writing whether brute force survives the constraints." });
      funcs.forEach(function (f) {
        var ops = f[1](n);
        var secs = ops / 1e9;
        var verdict = secs <= 1 ? "fits" : (secs <= 3 ? "borderline" : "too slow");
        steps.push({ s: '<div class="cells" aria-hidden="true"><div class="dr-node' + (secs <= 1 ? " hit" : "") + '">' + f[0] + "<small>" + (ops >= 1e6 ? ops.toExponential(1) : ops) + "</small></div></div>",
          d: f[0] + " ≈ " + (ops >= 1e6 ? ops.toExponential(2) : ops) + " operations → about " + secs.toExponential(2) + " s: <strong>" + verdict + "</strong>." });
      });
      steps.push({ s: "<p><strong>Rule of thumb:</strong> n ≤ 10³ allows O(n²); n ≤ 10⁵ needs O(n log n) or better; n ≥ 10⁶ demands O(n) or O(log n).</p>", d: "Sequential loops add (take the max); nested loops multiply. A hidden sort inside a loop adds a log factor." });
      return steps;
    }
  };

  function bfsState(adj, seen, cur, q) {
    var nodes = Object.keys(adj).map(Number).sort(function (x, y) { return x - y; });
    return '<div class="cells" aria-hidden="true">' + nodes.map(function (v) {
      return '<div class="dr-node' + (v === cur ? " cur" : (seen[v] ? "hit" : "")) + '">' + v + "</div>";
    }).join("") + '</div><p style="color:var(--muted);font-size:13px;">queue: [' + (q.join(", ") || "empty") + "]</p>";
  }

  function makeStepper(box) {
    var conf;
    try { conf = JSON.parse(box.querySelector("script[type='application/json']").textContent); }
    catch (e) { return; }
    if (!BUILDERS[conf.type]) return;
    var steps = BUILDERS[conf.type](conf);
    var idx = 0, timer = null;
    box.innerHTML = '<div class="dr-state" data-st></div><p class="dr-desc" data-de aria-hidden="true"></p>' +
      '<p class="sr-only" data-live aria-live="polite" style="position:absolute;left:-9999px"></p>' +
      '<div class="viz-controls no-print"><button class="btn" data-prev>← Prev</button>' +
      '<button class="btn primary" data-next>Next →</button>' +
      '<button class="btn" data-auto aria-pressed="false">Auto-play</button>' +
      '<button class="btn" data-reset>Reset</button>' +
      '<label style="font-size:13px;color:var(--muted);">Speed <input type="range" data-speed min="300" max="2000" step="100" value="1100" aria-label="Auto-play speed"></label>' +
      '<span class="dr-meta" data-count></span></div>' +
      (conf.fallback ? '<details><summary>Text walkthrough (no interaction needed)</summary><p>' + conf.fallback + "</p></details>" : "");
    var st = box.querySelector("[data-st]"), de = box.querySelector("[data-de]"),
        live = box.querySelector("[data-live]"), count = box.querySelector("[data-count]"),
        prev = box.querySelector("[data-prev]"), next = box.querySelector("[data-next]"),
        auto = box.querySelector("[data-auto]"), reset = box.querySelector("[data-reset]"),
        speed = box.querySelector("[data-speed]");
    function render() {
      st.innerHTML = steps[idx].s;
      de.innerHTML = steps[idx].d;
      if (live) live.textContent = de.textContent;
      count.textContent = (idx + 1) + " / " + steps.length;
      prev.disabled = idx === 0;
      next.disabled = idx === steps.length - 1;
      if (idx >= steps.length - 1) stopAuto();
    }
    function stopAuto() {
      if (timer) { window.clearInterval(timer); timer = null; }
      auto.setAttribute("aria-pressed", "false");
      auto.textContent = "Auto-play";
    }
    prev.addEventListener("click", function () { stopAuto(); if (idx > 0) { idx--; render(); } });
    next.addEventListener("click", function () { stopAuto(); if (idx < steps.length - 1) { idx++; render(); } });
    reset.addEventListener("click", function () { stopAuto(); idx = 0; render(); });
    auto.addEventListener("click", function () {
      if (timer) { stopAuto(); return; }
      auto.textContent = "Pause";
      auto.setAttribute("aria-pressed", "true");
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      timer = window.setInterval(function () {
        if (idx < steps.length - 1) { idx++; render(); }
        else stopAuto();
      }, reduce ? 400 : parseInt(speed.value, 10));
    });
    render();
  }
  /* ---------- generic quizzes (form[data-quiz]) ---------- */
  // Any page can add a quiz: fieldsets carry data-answer="a|b|c...".
  // Scored locally; nothing leaves the browser.
  document.querySelectorAll("form[data-quiz]").forEach(function (form) {
    var sets = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-answer]"));
    var result = form.parentNode.querySelector("[data-quiz-result]");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var score = 0, unanswered = 0;
      sets.forEach(function (fs) {
        var want = fs.getAttribute("data-answer");
        var r = fs.querySelector('input[type="radio"]');
        var picked = r ? form.querySelector('input[name="' + r.name + '"]:checked') : null;
        var fb = fs.parentNode.querySelector(".quiz-feedback") || fs.querySelector(".quiz-feedback");
        if (!picked) { unanswered++; if (fb) { fb.textContent = ""; } return; }
        var ok = picked.value === want;
        if (ok) score++;
        if (fb) {
          fb.textContent = ok ? "Correct." : "Not quite — read the explanation below.";
          fb.style.color = ok ? "var(--good)" : "var(--bad)";
        }
      });
      var msg = "Score: " + score + "/" + sets.length + ". ";
      if (unanswered) msg += unanswered + " unanswered. ";
      msg += (score >= sets.length - 1) ? "Solid — move to practice." : "Revisit the lesson above, then retry.";
      if (result) { result.textContent = msg; result.focus(); }
      try {
        var arr = sets.map(function (fs) {
          var r = fs.querySelector('input[type="radio"]');
          var p = r ? form.querySelector('input[name="' + r.name + '"]:checked') : null;
          return p ? p.value === fs.getAttribute("data-answer") : null;
        });
        store("dsa-cp-quiz:" + pageKey() + ":" + (form.getAttribute("data-quiz") || "q"), JSON.stringify({ score: score, total: sets.length }));
      } catch (e) { /* ignore */ }
    });
    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        form.querySelectorAll(".quiz-feedback").forEach(function (el) { el.textContent = ""; });
        if (result) result.textContent = "";
      }, 0);
    });
  });

  document.querySelectorAll("[data-dryrun]").forEach(makeStepper);

  /* ================= problem links + Problem Lab ================= */
  // Hardcoded anchors in the pages are already verified. This pass upgrades the
  // remaining plain-text "LC #123 — Title" / "CF #1201C — Title" references to
  // real links ONLY when problems.js has a verified entry. Unknown references
  // stay as plain text (no invented URLs, no fabricated IDs).
  (function problemLab() {
    var map = window.PROBLEMS || {};
    var lists = document.querySelectorAll(".problem-list");
    if (!lists.length) return;

    var solvedKey = "dsa-cp-solved:" + pageKey();
    var solved = null;
    try { solved = JSON.parse(load(solvedKey) || "null"); } catch (e) { solved = null; }
    if (!solved || typeof solved !== "object") solved = {};

    function persistSolved() { store(solvedKey, JSON.stringify(solved)); }

    function platformClass(name) {
      return name === "Codeforces" ? "plat" : "plat";
    }

    var refRe = /^(LC|CF)\s*#\s*([0-9]+[A-Z]?[0-9]*)\s*[—–\-:]\s*(.*)$/;

    Array.prototype.forEach.call(lists, function (ul) {
      Array.prototype.forEach.call(ul.querySelectorAll("li"), function (li) {
        if (li.querySelector("a")) return; // already a real link
        var text = li.textContent.replace(/\s+/g, " ").trim();
        var m = refRe.exec(text);
        if (!m) return;
        var key = m[1] + m[2];
        var meta = map[key];
        if (!meta) return; // unverified: leave plain text
        var label = (meta.title || m[3] || key);
        var d = (meta.diff || "").toLowerCase();
        li.innerHTML = '<a href="' + meta.url + '" target="_blank" rel="noopener">' +
          esc(label) + " — " + esc(key) + '</a> <span class="' + platformClass(meta.platform) + '">' +
          esc(meta.platform) + "</span>" + (d ? "" : "");
        if (d === "easy" || d === "medium" || d === "hard") li.classList.add(d);
      });
    });

    // Solved checkboxes on every graded problem (Local only).
    var items = document.querySelectorAll(".problem-list li");
    if (!items.length) return;
    Array.prototype.forEach.call(items, function (li, i) {
      var id = pageKey() + "#p" + i;
      var lab = document.createElement("label");
      lab.className = "plab-check no-print";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!solved[id];
      cb.setAttribute("aria-label", "Mark problem " + (i + 1) + " solved");
      cb.addEventListener("change", function () {
        if (cb.checked) solved[id] = 1; else delete solved[id];
        persistSolved();
        updateSolvedCount();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode("solved"));
      li.appendChild(lab);
    });

    function updateSolvedCount() {
      var total = items.length;
      var done = 0;
      Array.prototype.forEach.call(items, function (li, i) { if (solved[pageKey() + "#p" + i]) done++; });
      var host = document.querySelector("[data-solved-count]");
      if (host) host.textContent = done + " / " + total + " solved";
      document.querySelectorAll("[data-solved-fill]").forEach(function (el) {
        el.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
      });
      document.querySelectorAll("[data-practice-progress]").forEach(function (el) {
        el.textContent = done + "/" + total + " problems solved";
      });
    }
    updateSolvedCount();
  })();

  /* ---------- learning objectives (auto, from the lesson's own sections) ---------- */
  (function objectives() {
    var main = document.querySelector("main.prose");
    if (!main || document.getElementById("rm")) return;
    var header = main.querySelector("header");
    if (!header || main.querySelector(".objectives")) return;
    var ids = ["intuition", "signals", "worked", "implementation", "dr"];
    var labels = {
      intuition: "Explain the idea in plain language",
      signals: "Recognize when this pattern applies",
      worked: "Follow a fully worked example",
      implementation: "Read and reproduce the core code",
      dr: "Dry-run the algorithm on a real input"
    };
    var found = [];
    ids.forEach(function (id) {
      var sec = main.querySelector("section[id='" + id + "']") ||
                main.querySelector("section[id^='" + id + "-']");
      if (sec && labels[id]) found.push(labels[id]);
    });
    var checkpoint = main.querySelector(".checklist[data-checklist]");
    if (checkpoint) found.push("Pass the move-on checklist before advancing");
    if (!found.length) return;
    var box = document.createElement("div");
    box.className = "objectives";
    box.innerHTML = "<b>By the end of this lesson you can</b><ul>" +
      found.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
    var anchor = main.querySelector(".path");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else header.parentNode.insertBefore(box, header.nextSibling);
  })();



})();
