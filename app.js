/* Hannon — a minimal practice-sheet viewer.
   One control cycles the practice (Rhythm → Scales → Arpeggios); the dice
   jumps to a random sheet; swipe up/down (or ↑/↓) steps to the previous /
   next sheet — handy for moving between a major scale and its harmonic /
   melodic minor forms.  Sheets are Hanon's "The Virtuoso Pianist"
   (public-domain).  No audio. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const pad2 = (n) => String(n).padStart(2, "0");

  const POOLS = {
    exercise: { dir: "assets/exercise", count: 30 },
    rhythm:   { dir: "assets/rhythm",   count: 22 },
    scale:    { dir: "assets/scale",    count: 36 },
    arp:      { dir: "assets/arp",      count: 18 },
  };
  const MODES = [
    { id: "rhythm", name: "Rhythm",    pools: ["exercise", "rhythm"] },
    { id: "scale",  name: "Scales",    pools: ["scale"] },
    { id: "arp",    name: "Arpeggios", pools: ["arp"] },
  ];

  const SAVE_KEY = "hannon-sheet";
  let modeIdx = 0;
  const cur = {};                                  // current 1-based index per pool
  Object.keys(POOLS).forEach((p) => (cur[p] = 1 + ((Math.random() * POOLS[p].count) | 0)));

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (d && typeof d.modeIdx === "number") modeIdx = ((d.modeIdx % MODES.length) + MODES.length) % MODES.length;
    } catch (_) {}
  }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ modeIdx })); } catch (_) {} };

  const srcOf = (pid) => `${POOLS[pid].dir}/${pad2(cur[pid])}.webp`;
  function randomize(pid) {
    const n = POOLS[pid].count;
    if (n <= 1) return;
    let v; do { v = 1 + ((Math.random() * n) | 0); } while (v === cur[pid]);
    cur[pid] = v;
  }

  function show() {
    const m = MODES[modeIdx];
    $("modeName").textContent = m.name;
    const sheet = $("sheet");
    sheet.className = "sheet " + (m.pools.length > 1 ? "two-row" : "one-page");
    const cls = { exercise: "ex", rhythm: "ry", scale: "page", arp: "page" };
    sheet.innerHTML = m.pools
      .map((pid) => `<img class="${cls[pid] || "page"}" src="${srcOf(pid)}" alt="Hanon — ${m.name}" decoding="async" />`)
      .join("");
    $("viewer").scrollTop = 0;
  }

  // Scales are grouped per key as [major, minor-harmonic, minor-melodic].
  // Random treats major and minor as separate items; swipe only toggles the
  // two minor forms of the current key (they're nearly the same scale).
  function randomizeScale() {
    let idx;
    do {
      const page = (Math.random() * 12) | 0;        // 12 keys
      const type = (Math.random() * 2) | 0;         // 0 = major, 1 = minor (harmonic)
      idx = page * 3 + type + 1;
    } while (idx === cur.scale);
    cur.scale = idx;
  }

  function cycleMode() { modeIdx = (modeIdx + 1) % MODES.length; save(); show(); }
  function shuffle() {
    if (MODES[modeIdx].id === "scale") randomizeScale();
    else MODES[modeIdx].pools.forEach(randomize);
    show();
  }
  function nav(delta) {
    if (MODES[modeIdx].id === "scale") {             // toggle harmonic <-> melodic minor only
      const pos = (cur.scale - 1) % 3;               // 0 major, 1 minor-harm, 2 minor-mel
      if (pos === 1) cur.scale += 1;
      else if (pos === 2) cur.scale -= 1;
      else return;                                   // major: separate, no swipe target
    } else {
      const pid = MODES[modeIdx].pools[0], n = POOLS[pid].count;
      cur[pid] = ((cur[pid] - 1 + delta) % n + n) % n + 1;
    }
    show();
  }

  // Auto-hide the controls after a short idle so they don't sit on the music.
  const IDLE_MS = 2600;
  let idleTimer = null;
  function wake() {
    const c = $("controls");
    c.classList.remove("faded");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => c.classList.add("faded"), IDLE_MS);
  }

  // Vertical swipe → prev/next (when the sheet isn't being scrolled).
  let sx = 0, sy = 0, st = 0;
  function onStart(e) { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }
  function onEnd(e) {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy, dt = Date.now() - st;
    if (dt > 800 || Math.abs(dy) < 48 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
    const v = $("viewer"), scrollable = v.scrollHeight > v.clientHeight + 4;
    if (!scrollable) { nav(dy < 0 ? 1 : -1); wake(); }
    else if (dy > 0 && v.scrollTop <= 0) { nav(-1); wake(); }
    else if (dy < 0 && v.scrollTop + v.clientHeight >= v.scrollHeight - 2) { nav(1); wake(); }
  }

  function init() {
    load();
    $("modeBtn").addEventListener("click", () => { cycleMode(); wake(); });
    $("shuffleBtn").addEventListener("click", () => { shuffle(); wake(); });
    const v = $("viewer");
    v.addEventListener("touchstart", onStart, { passive: true });
    v.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("keydown", (e) => {
      if (e.code === "ArrowUp") { e.preventDefault(); nav(-1); wake(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); nav(1); wake(); }
      else if (e.code === "Space" || e.code === "ArrowRight") { e.preventDefault(); shuffle(); wake(); }
      else if (e.code === "KeyM" || e.code === "Tab") { e.preventDefault(); cycleMode(); wake(); }
    });
    ["pointerdown", "mousemove", "scroll", "wheel"].forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true }));
    show();
    wake();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
