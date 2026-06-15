/* Hannon — a minimal practice-sheet viewer.
   One control cycles the practice (Rhythm → Scales → Arpeggios); each shows a
   page from Hanon's "The Virtuoso Pianist" (public-domain) chosen at random,
   as large as the screen allows.  Rhythm shows two rows: a random exercise
   (No. 1–30) over a random rhythm variation.  No audio. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const pad2 = (n) => String(n).padStart(2, "0");

  // Image pools: assets/<dir>/NN.webp
  const POOLS = {
    exercise: { dir: "assets/exercise", count: 30 },
    rhythm:   { dir: "assets/rhythm",   count: 22 },
    scale:    { dir: "assets/scale",    count: 36 },
    arp:      { dir: "assets/arp",      count: 18 },
  };
  // A practice mode stacks one or more pools as rows.
  const MODES = [
    { id: "rhythm", name: "Rhythm",    pools: ["exercise", "rhythm"] },
    { id: "scale",  name: "Scales",    pools: ["scale"] },
    { id: "arp",    name: "Arpeggios", pools: ["arp"] },
  ];

  const SAVE_KEY = "hannon-sheet";
  let modeIdx = 0;
  const last = {};                           // last file shown per pool

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (d && typeof d.modeIdx === "number") modeIdx = ((d.modeIdx % MODES.length) + MODES.length) % MODES.length;
    } catch (_) {}
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ modeIdx })); } catch (_) {} }

  // Random file from a pool, avoiding an immediate repeat.
  function pick(poolId) {
    const p = POOLS[poolId];
    let n;
    do { n = 1 + ((Math.random() * p.count) | 0); } while (p.count > 1 && n === last[poolId]);
    last[poolId] = n;
    return `${p.dir}/${pad2(n)}.webp`;
  }

  function show() {
    const m = MODES[modeIdx];
    $("modeName").textContent = m.name;
    const sheet = $("sheet");
    sheet.className = "sheet " + (m.pools.length > 1 ? "two-row" : "one-page");
    const cls = { exercise: "ex", rhythm: "ry", scale: "page", arp: "page" };
    sheet.innerHTML = m.pools
      .map((pid) => `<img class="${cls[pid] || "page"}" src="${pick(pid)}" alt="Hanon — ${m.name}" decoding="async" />`)
      .join("");
    $("viewer").scrollTop = 0;
  }

  function cycleMode() { modeIdx = (modeIdx + 1) % MODES.length; save(); show(); }
  function shuffle() { show(); }

  // Auto-hide the controls after a short idle so they don't sit on the music.
  const IDLE_MS = 2600;
  let idleTimer = null;
  function wake() {
    const c = $("controls");
    c.classList.remove("faded");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => c.classList.add("faded"), IDLE_MS);
  }

  function init() {
    load();
    $("modeBtn").addEventListener("click", () => { cycleMode(); wake(); });
    $("shuffleBtn").addEventListener("click", () => { shuffle(); wake(); });
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown") { e.preventDefault(); shuffle(); wake(); }
      else if (e.code === "KeyM" || e.code === "Tab") { e.preventDefault(); cycleMode(); wake(); }
    });
    ["pointerdown", "touchstart", "mousemove", "scroll", "wheel"].forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true }));
    show();
    wake();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
