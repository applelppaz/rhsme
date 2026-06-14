/* Hannon — a minimal practice-sheet viewer.
   One control cycles the practice (Scales → Arpeggios → Exercises); each shows
   a random page from Hanon's "The Virtuoso Pianist" (Schirmer edition), as
   large as the screen allows.  No audio. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const pad2 = (n) => String(n).padStart(2, "0");

  // Practice modes and how many pages each has under assets/<dir>/NN.webp
  const MODES = [
    { id: "scale",    name: "Scales",    dir: "assets/scale",    count: 11 },
    { id: "arp",      name: "Arpeggios", dir: "assets/arp",      count: 6 },
    { id: "exercise", name: "Exercises", dir: "assets/exercise", count: 14 },
  ];
  const files = (m) => Array.from({ length: m.count }, (_, i) => `${m.dir}/${pad2(i + 1)}.webp`);

  const SAVE_KEY = "hannon-sheet";
  let modeIdx = 0;
  const lastFile = {};                       // remember current page per mode

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (d && typeof d.modeIdx === "number") modeIdx = ((d.modeIdx % MODES.length) + MODES.length) % MODES.length;
    } catch (_) {}
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ modeIdx })); } catch (_) {}
  }

  // Pick a random page for the mode, avoiding an immediate repeat.
  function pick(m) {
    const list = files(m);
    if (list.length <= 1) return list[0];
    let f;
    do { f = list[(Math.random() * list.length) | 0]; } while (f === lastFile[m.id]);
    lastFile[m.id] = f;
    return f;
  }

  function show(newPage) {
    const m = MODES[modeIdx];
    const src = newPage || lastFile[m.id] || pick(m);
    lastFile[m.id] = src;
    $("modeName").textContent = m.name;
    const sheet = $("sheet");
    sheet.innerHTML = `<img src="${src}" alt="Hanon — ${m.name}" decoding="async" />`;
    $("viewer").scrollTop = 0;
  }

  function cycleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
    save();
    show(pick(MODES[modeIdx]));
  }
  function shuffle() { show(pick(MODES[modeIdx])); }

  function init() {
    load();
    $("modeBtn").addEventListener("click", cycleMode);
    $("shuffleBtn").addEventListener("click", shuffle);
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown") { e.preventDefault(); shuffle(); }
      else if (e.code === "KeyM" || e.code === "Tab") { e.preventDefault(); cycleMode(); }
    });
    show(pick(MODES[modeIdx]));
  }
  document.addEventListener("DOMContentLoaded", init);
})();
