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
    arp:      { dir: "assets/arp",      count: 24 },
    trill:    { dir: "assets/trill",    count: 15 },
    octave:   { dir: "assets/octave",   count: 8 },
    etc:      { dir: "assets/etc",      count: 24 },
  };
  const MODES = [
    { id: "rhythm", name: "Rhythm",    pools: ["rhythm", "exercise"], scroll: true },
    { id: "scale",  name: "Scales",    pools: ["scale"] },
    { id: "arp",    name: "Arpeggios", pools: ["arp"] },
    { id: "trill",  name: "Trills",    pools: ["trill"],  scroll: true, section: true },
    { id: "octave", name: "Octaves",   pools: ["octave"], scroll: true, section: true },
    { id: "etc",    name: "More",      pools: ["etc"],    scroll: true, section: true },
    { id: "self",   name: "Self",      pools: [],         scroll: true, self: true },
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

  // ---- Self mode: render a user-supplied PDF, kept in IndexedDB so it
  //      survives reloads.  PDF.js is loaded lazily on first use. ----
  const DB_NAME = "hannon-self", STORE = "pdf";
  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  function dbReq(mode, fn) {
    return openDB().then((db) => new Promise((res, rej) => {
      const tx = db.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(out && out.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    }));
  }
  const idbGet = (k) => dbReq("readonly", (s) => s.get(k));
  const idbPut = (k, v) => dbReq("readwrite", (s) => { s.put(v, k); });

  let pdfjs = null;
  async function loadPdfjs() {
    if (!pdfjs) {
      pdfjs = await import("./vendor/pdfjs/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "./vendor/pdfjs/pdf.worker.min.mjs";
    }
    return pdfjs;
  }

  function uploadPrompt(replace) {
    const sheet = $("sheet");
    sheet.innerHTML =
      `<div class="self-empty">
         <button id="selfUpload" class="self-cta" type="button">
           ${replace ? "Replace PDF" : "Upload a PDF"}
         </button>
         <p class="self-hint">${replace ? "Pick another PDF to display." :
           "Choose any PDF score — it stays saved on this device for next time."}</p>
       </div>`;
    const b = $("selfUpload");
    if (b) b.addEventListener("click", () => $("pdfInput").click());
  }

  // remember where the user was in their PDF, per stored file
  const SCROLL_KEY = "scroll";
  let scrollTimer = null;
  function saveSelfScroll(now) {
    if (!MODES[modeIdx].self) return;
    const y = $("viewer").scrollTop;
    clearTimeout(scrollTimer);
    if (now) { idbPut(SCROLL_KEY, y); return; }
    scrollTimer = setTimeout(() => idbPut(SCROLL_KEY, y), 350);
  }
  function restoreScroll(token, y) {
    const set = () => { if (token === showToken) $("viewer").scrollTop = y; };
    requestAnimationFrame(set);
    setTimeout(set, 60);
  }

  async function renderSelf(token) {
    const sheet = $("sheet");
    let buf, savedY = 0;
    try { buf = await idbGet("file"); } catch (_) { buf = null; }
    try { savedY = (await idbGet(SCROLL_KEY)) || 0; } catch (_) {}
    if (token !== showToken) return;
    if (!buf) { uploadPrompt(false); return; }
    sheet.innerHTML = `<div class="self-status">Loading…</div>`;
    try {
      const lib = await loadPdfjs();
      if (token !== showToken) return;
      const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
      if (token !== showToken) return;
      sheet.innerHTML = "";
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.min(sheet.clientWidth || 1200, 1400);
      // First lay out every page (sizes the canvases) so the saved scroll
      // position is meaningful, then paint the pixels progressively.
      const items = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (token !== showToken) return;
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: (targetW * dpr) / page.getViewport({ scale: 1 }).width });
        const canvas = document.createElement("canvas");
        canvas.className = "page selfpage";
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        sheet.appendChild(canvas);
        items.push({ page, vp, canvas });
      }
      if (token !== showToken) return;
      restoreScroll(token, savedY);
      for (const { page, vp, canvas } of items) {
        if (token !== showToken) return;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      }
    } catch (err) {
      if (token !== showToken) return;
      uploadPrompt(true);
    }
  }

  async function onPdfPicked(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      await idbPut("file", buf);
      await idbPut("name", f.name);
      await idbPut(SCROLL_KEY, 0);                    // new file → start at the top
    } catch (_) {}
    if (MODES[modeIdx].self) show();
  }

  let showToken = 0;
  function show() {
    showToken++;                                     // cancel any in-flight self render
    const m = MODES[modeIdx];
    $("modeName").textContent = m.name;
    const sheet = $("sheet");
    $("shuffleBtn").style.display = (m.section || m.self) ? "none" : "";   // sections / self: no random
    $("selfBtn").style.display = m.self ? "" : "none";
    if (m.self) {
      sheet.className = "sheet scroll selfmode";
      renderSelf(showToken);
      $("viewer").scrollTop = 0;
      return;
    }
    if (m.section) {
      // browse the whole section, top to bottom, scrollable
      const p = m.pools[0], n = POOLS[p].count;
      sheet.className = "sheet scroll";
      sheet.innerHTML = Array.from({ length: n }, (_, i) =>
        `<img class="page" src="${POOLS[p].dir}/${pad2(i + 1)}.webp" alt="Hanon — ${m.name} ${i + 1}" loading="lazy" decoding="async" />`).join("");
    } else if (m.scroll) {
      // rhythm: a random rhythm variation over a random full exercise, scrollable.
      // The rhythm pattern is shown small so its notes match the exercise's.
      sheet.className = "sheet scroll";
      sheet.innerHTML = m.pools
        .map((pid) => `<img class="page${pid === "rhythm" ? " rsmall" : ""}" src="${srcOf(pid)}" alt="Hanon — ${m.name}" loading="lazy" decoding="async" />`)
        .join("");
    } else {
      sheet.className = "sheet one-page";
      sheet.innerHTML = m.pools
        .map((pid) => `<img class="page" src="${srcOf(pid)}" alt="Hanon — ${m.name}" decoding="async" />`)
        .join("");
    }
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

  function cycleMode() { saveSelfScroll(true); modeIdx = (modeIdx + 1) % MODES.length; save(); show(); }
  function shuffle() {
    if (MODES[modeIdx].section || MODES[modeIdx].self) return;   // sections / self: no random
    if (MODES[modeIdx].id === "scale") randomizeScale();
    else MODES[modeIdx].pools.forEach(randomize);
    show();
  }
  function nav(delta) {
    if (MODES[modeIdx].scroll) return;               // scroll sections: let it scroll
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
  const IDLE_MS = 1500;
  let idleTimer = null;
  function wake() {
    const c = $("controls");
    c.classList.remove("faded");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => c.classList.add("faded"), IDLE_MS);
  }

  // Keep the controls a constant size and in the top-right of the *visible*
  // area, so pinch-zooming the sheet never scales or shifts them.
  const M = 14;
  function anchorControls() {
    const c = $("controls"), vv = window.visualViewport;
    if (!vv) { c.style.transform = `translate(-${M}px, ${M}px)`; return; }
    const dx = (vv.offsetLeft + vv.width - M) - document.documentElement.clientWidth;
    const dy = vv.offsetTop + M;
    c.style.transform = `translate(${dx}px, ${dy}px) scale(${1 / vv.scale})`;
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
    $("selfBtn").addEventListener("click", () => { $("pdfInput").click(); wake(); });
    $("pdfInput").addEventListener("change", onPdfPicked);
    const v = $("viewer");
    v.addEventListener("touchstart", onStart, { passive: true });
    v.addEventListener("touchend", onEnd, { passive: true });
    v.addEventListener("scroll", () => saveSelfScroll(false), { passive: true });
    window.addEventListener("pagehide", () => saveSelfScroll(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveSelfScroll(true);
    });
    document.addEventListener("keydown", (e) => {
      if (e.code === "ArrowUp") { e.preventDefault(); nav(-1); wake(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); nav(1); wake(); }
      else if (e.code === "Space" || e.code === "ArrowRight") { e.preventDefault(); shuffle(); wake(); }
      else if (e.code === "KeyM" || e.code === "Tab") { e.preventDefault(); cycleMode(); wake(); }
    });
    ["pointerdown", "mousemove", "scroll", "wheel"].forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true }));
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", anchorControls);
      window.visualViewport.addEventListener("scroll", anchorControls);
    }
    window.addEventListener("resize", anchorControls);
    window.addEventListener("orientationchange", anchorControls);
    show();
    anchorControls();
    wake();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
