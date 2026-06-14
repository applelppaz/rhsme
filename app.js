/* Hannon — piano practice guide.
   Modes: Rhythm (Hanon rhythm variations, single pitch) · Scale · Arpeggio
   (random key, 4 octaves, fingering).  Vanilla JS + Web Audio + SVG. */
(() => {
  "use strict";

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const $ = (id) => document.getElementById(id);

  // ======================================================================
  // RHYTHM patterns (Hanon "variations of No. 1").  cell = note durations
  // (sixteenths) for one beat; repeats across the 2/4 measure.
  // ======================================================================
  const BEATS = 2;
  const TOTAL16 = 4 * BEATS;
  const PATTERNS = [
    { id: "even16",  name: "Straight Sixteenths",         cat: "Even / Accent",     art: "legato",   cell: [1, 1, 1, 1] },
    { id: "acc1",    name: "Accent on 1",                 cat: "Even / Accent",     art: "legato",   cell: [1, 1, 1, 1], accents: [1, 0, 0, 0] },
    { id: "acc2",    name: "Accent on 2",                 cat: "Even / Accent",     art: "legato",   cell: [1, 1, 1, 1], accents: [0, 1, 0, 0] },
    { id: "acc3",    name: "Accent on 3",                 cat: "Even / Accent",     art: "legato",   cell: [1, 1, 1, 1], accents: [0, 0, 1, 0] },
    { id: "acc4",    name: "Accent on 4",                 cat: "Even / Accent",     art: "legato",   cell: [1, 1, 1, 1], accents: [0, 0, 0, 1] },
    { id: "dotLS",   name: "Dotted: Long–Short",          cat: "Dotted long–short", art: "legato",   cell: [3, 1] },
    { id: "dotLSst", name: "Dotted Long–Short, staccato", cat: "Dotted long–short", art: "staccato", cell: [3, 1] },
    { id: "ddotLS",  name: "Double-Dotted Long–Short",    cat: "Dotted long–short", art: "legato",   cell: [3.5, 0.5] },
    { id: "dotSL",   name: "Dotted: Short–Long",          cat: "Dotted short–long", art: "legato",   cell: [1, 3] },
    { id: "dotSLst", name: "Dotted Short–Long, staccato", cat: "Dotted short–long", art: "staccato", cell: [1, 3] },
    { id: "g8ss",    name: "Eighth + Two Sixteenths",     cat: "Groupings",         art: "legato",   cell: [2, 1, 1] },
    { id: "gss8",    name: "Two Sixteenths + Eighth",     cat: "Groupings",         art: "legato",   cell: [1, 1, 2] },
    { id: "gs8s",    name: "Sixteenth–Eighth–Sixteenth",  cat: "Groupings",         art: "legato",   cell: [1, 2, 1] },
    { id: "trip",    name: "Triplets",                    cat: "Triplets",          art: "legato",   cell: [4/3, 4/3, 4/3], tuplet: 3 },
    { id: "tripst",  name: "Triplets, staccato",          cat: "Triplets",          art: "staccato", cell: [4/3, 4/3, 4/3], tuplet: 3 },
    { id: "st8",     name: "Even Eighths, staccato",      cat: "Staccato",          art: "staccato", cell: [2, 2] },
  ];
  const patById = (id) => PATTERNS.find((p) => p.id === id);

  function buildRhythmNotes(p) {
    const notes = [];
    for (let b = 0; b < BEATS; b++) {
      let t = b * 4;
      p.cell.forEach((dur, i) => {
        notes.push({ t16: t, dur16: dur, beat: b, accent: !!(p.accents && p.accents[i]), tuplet: p.tuplet || 0 });
        t += dur;
      });
    }
    return notes;
  }

  // ======================================================================
  // SCALE / ARPEGGIO theory.
  // ======================================================================
  const SEMI = [0, 2, 4, 5, 7, 9, 11];                 // C D E F G A B
  const SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6];          // F C G D A E B
  const FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3];           // B E A D G C F
  // Standard treble-clef key-signature positions (diatonic step = oct*7 + letter)
  const SHARP_STEPS = [38, 35, 39, 36, 33, 37, 34];     // F5 C5 G5 D5 A4 E5 B4
  const FLAT_STEPS = [34, 37, 33, 36, 31, 35, 30];      // B4 E5 A4 D5 G4 C5 F4

  // tonic = letter index; acc/n = key signature; startOct = lowest tonic octave.
  // scaleFng = RH fingering per scale degree (one octave); scaleTop = finger on
  // the very top tonic.  For the major triad arpeggio: arpFng = repeating finger
  // per chord tone (tonic, 3rd, 5th); arpStart = finger on the lowest tonic;
  // arpTop = finger on the highest tonic.  White-key roots use 1·2·3 (top 5);
  // F uses 1·2·4; black-key roots use the 2·1·2·4 shape (thumb on a white note).
  const KEYS = [
    { id: "C",  name: "C",  tonic: 0, acc: "none",  n: 0, startOct: 3, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "G",  name: "G",  tonic: 4, acc: "sharp", n: 1, startOct: 3, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "D",  name: "D",  tonic: 1, acc: "sharp", n: 2, startOct: 3, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "A",  name: "A",  tonic: 5, acc: "sharp", n: 3, startOct: 2, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "E",  name: "E",  tonic: 2, acc: "sharp", n: 4, startOct: 2, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "B",  name: "B",  tonic: 6, acc: "sharp", n: 5, startOct: 2, scaleFng: [1,2,3,1,2,3,4], scaleTop: 5, arpFng: [1,2,3], arpStart: 1, arpTop: 5 },
    { id: "Gb", name: "G♭", tonic: 4, acc: "flat",  n: 6, startOct: 3, scaleFng: [2,3,4,1,2,3,1], scaleTop: 2, arpFng: [4,1,2], arpStart: 2, arpTop: 4 },
    { id: "Db", name: "D♭", tonic: 1, acc: "flat",  n: 5, startOct: 3, scaleFng: [2,3,1,2,3,4,1], scaleTop: 2, arpFng: [4,1,2], arpStart: 2, arpTop: 4 },
    { id: "Ab", name: "A♭", tonic: 5, acc: "flat",  n: 4, startOct: 2, scaleFng: [3,4,1,2,3,1,2], scaleTop: 3, arpFng: [4,1,2], arpStart: 2, arpTop: 4 },
    { id: "Eb", name: "E♭", tonic: 2, acc: "flat",  n: 3, startOct: 2, scaleFng: [3,1,2,3,4,1,2], scaleTop: 3, arpFng: [4,1,2], arpStart: 2, arpTop: 4 },
    { id: "Bb", name: "B♭", tonic: 6, acc: "flat",  n: 2, startOct: 2, scaleFng: [4,1,2,3,1,2,3], scaleTop: 4, arpFng: [4,1,2], arpStart: 2, arpTop: 4 },
    { id: "F",  name: "F",  tonic: 3, acc: "flat",  n: 1, startOct: 3, scaleFng: [1,2,3,4,1,2,3], scaleTop: 4, arpFng: [1,2,4], arpStart: 1, arpTop: 5 },
  ];
  const keyById = (id) => KEYS.find((k) => k.id === id);

  function keyAlter(letter, key) {
    if (key.acc === "sharp" && SHARP_LETTERS.slice(0, key.n).includes(letter)) return 1;
    if (key.acc === "flat" && FLAT_LETTERS.slice(0, key.n).includes(letter)) return -1;
    return 0;
  }
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Build a 4-octave run (ascending then descending). `thirds`=true → arpeggio.
  function buildRun(key, thirds) {
    const up = [];
    let letter = key.tonic, oct = key.startOct;
    const perOct = thirds ? 3 : 7;
    const total = perOct * 4;            // notes before the final top tonic
    const fng = thirds ? key.arpFng : key.scaleFng;
    const top = thirds ? key.arpTop : key.scaleTop;
    for (let i = 0; i <= total; i++) {
      const acc = keyAlter(letter, key);
      up.push({
        step: oct * 7 + letter,
        midi: (oct + 1) * 12 + SEMI[letter] + acc,
        finger: i === total ? top : (thirds && i === 0 ? key.arpStart : fng[i % perOct]),
      });
      const advance = thirds ? 2 : 1;    // step a third for arpeggios
      for (let k = 0; k < advance; k++) { letter = (letter + 1) % 7; if (letter === 0) oct++; }
    }
    const down = [];
    for (let i = up.length - 2; i >= 0; i--) down.push({ ...up[i] });
    return up.concat(down);
  }

  // ======================================================================
  // RHYTHM notation renderer (single-line rhythm staff).
  // ======================================================================
  const GEOM_FULL = { W: 600, H: 140, padL: 54, padR: 26, baseY: 96, beamY: 34, headRx: 7, headRy: 5.4, stemDx: 6.2, beamH: 6, beamGap: 4, stubLen: 12, stroke: 2.4, timeSig: true, showSlur: true, showAccent: true, fontTS: 27 };
  const GEOM_MINI = { W: 168, H: 56, padL: 8, padR: 8, baseY: 38, beamY: 15, headRx: 4, headRy: 3.1, stemDx: 3.6, beamH: 3.4, beamGap: 2.3, stubLen: 6, stroke: 1.4, timeSig: false, showSlur: false, showAccent: false, fontTS: 0 };

  const nBeams = (d, tup) => tup ? 1 : d >= 4 ? 0 : d >= 2 ? 1 : d >= 1 ? 2 : 3;
  const nDots = (d) => Math.abs(d - 3) < 1e-6 ? 1 : Math.abs(d - 3.5) < 1e-6 ? 2 : Math.abs(d - 1.5) < 1e-6 ? 1 : 0;

  function renderRhythm(p, g) {
    const notes = buildRhythmNotes(p);
    const usableW = g.W - g.padL - g.padR;
    const xOf = (t, dur) => g.padL + ((t + dur / 2) / TOTAL16) * usableW;
    const out = [];
    out.push(`<line class="staff-ink" x1="${g.padL}" y1="${g.baseY}" x2="${g.W - g.padR}" y2="${g.baseY}" stroke-width="${g.stroke * 0.5}"/>`);
    out.push(`<line class="staff-ink" x1="${g.padL}" y1="${g.baseY - 22}" x2="${g.padL}" y2="${g.baseY + 14}" stroke-width="${g.stroke * 0.5}"/>`);
    out.push(`<line class="staff-ink" x1="${g.W - g.padR}" y1="${g.baseY - 22}" x2="${g.W - g.padR}" y2="${g.baseY + 14}" stroke-width="${g.stroke * 0.5}"/>`);
    if (g.timeSig) {
      const tx = g.padL - 30;
      out.push(`<text x="${tx}" y="${g.baseY - 6}" font-size="${g.fontTS}" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,0.55)">2</text>`);
      out.push(`<text x="${tx}" y="${g.baseY + 18}" font-size="${g.fontTS}" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,0.55)">4</text>`);
    }
    const N = notes.map((n) => { const cx = xOf(n.t16, n.dur16); return { ...n, cx, stemX: cx + g.stemDx, nb: nBeams(n.dur16, n.tuplet), dots: nDots(n.dur16) }; });
    N.forEach((n) => {
      const cy = g.baseY;
      const cls = (g === GEOM_MINI && n.accent) ? "mark-ink" : "note-ink";
      out.push(`<ellipse class="${cls}" cx="${n.cx}" cy="${cy}" rx="${g.headRx}" ry="${g.headRy}" transform="rotate(-18 ${n.cx} ${cy})"/>`);
      out.push(`<line class="note-ink" x1="${n.stemX}" y1="${cy - g.headRy + 1}" x2="${n.stemX}" y2="${g.beamY}" stroke-width="${g.stroke}"/>`);
      for (let d = 0; d < n.dots; d++) out.push(`<circle class="note-ink" cx="${n.cx + g.headRx + 4 + d * 5}" cy="${cy - 1}" r="${g.headRx * 0.34}"/>`);
      if (p.art === "staccato") out.push(`<circle class="note-ink" cx="${n.cx}" cy="${cy + g.headRy + 7}" r="${g.headRx * 0.34}"/>`);
      if (g.showAccent && n.accent) { const ay = g.beamY - 9; out.push(`<path class="mark-ink" d="M ${n.stemX - 6} ${ay - 5} L ${n.stemX + 5} ${ay} L ${n.stemX - 6} ${ay + 5}" fill="none" stroke-width="${g.stroke}"/>`); }
    });
    for (let b = 0; b < BEATS; b++) {
      const grp = N.filter((n) => n.beat === b);
      if (grp.length < 2) continue;
      const x0 = grp[0].stemX, x1 = grp[grp.length - 1].stemX;
      out.push(`<rect class="note-ink" x="${x0}" y="${g.beamY}" width="${x1 - x0}" height="${g.beamH}" stroke="none"/>`);
      for (let level = 2; level <= 3; level++) {
        const y = g.beamY + (level - 1) * (g.beamH + g.beamGap);
        let i = 0;
        while (i < grp.length) {
          if (grp[i].nb < level) { i++; continue; }
          let j = i; while (j + 1 < grp.length && grp[j + 1].nb >= level) j++;
          if (j > i) out.push(`<rect class="note-ink" x="${grp[i].stemX}" y="${y}" width="${grp[j].stemX - grp[i].stemX}" height="${g.beamH}" stroke="none"/>`);
          else { const right = i === 0; const sx = right ? grp[i].stemX : grp[i].stemX - g.stubLen; out.push(`<rect class="note-ink" x="${sx}" y="${y}" width="${g.stubLen}" height="${g.beamH}" stroke="none"/>`); }
          i = j + 1;
        }
      }
      if (grp[0].tuplet) { const mid = (x0 + x1) / 2; out.push(`<text class="note-ink" x="${mid}" y="${g.beamY - 6}" font-size="${g === GEOM_MINI ? 9 : 15}" font-style="italic" text-anchor="middle" stroke="none">3</text>`); }
    }
    if (g.showSlur && p.art === "legato") { const f = N[0], l = N[N.length - 1], y = g.baseY + g.headRy + 9, mx = (f.cx + l.cx) / 2; out.push(`<path class="note-ink" d="M ${f.cx} ${y} Q ${mx} ${y + 16} ${l.cx} ${y}" fill="none" stroke-width="${g.stroke * 0.8}"/>`); }
    return `<svg viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${out.join("")}</svg>`;
  }

  // ======================================================================
  // STAFF renderer (treble clef, ledger lines, key signature, fingering).
  // Notes wrap into stacked systems; each system is sized to its content.
  // ======================================================================
  const LG = 9;                          // staff line gap
  const STAFF_REF = 30;                  // step of bottom line (E4)
  const W_STAFF = 660;
  const PER_SYS = 16;
  const yRel = (step) => -(step - STAFF_REF) * (LG / 2);   // relative to bottom line (0)

  function escSig(key) {
    const steps = key.acc === "sharp" ? SHARP_STEPS : key.acc === "flat" ? FLAT_STEPS : [];
    return { glyph: key.acc === "sharp" ? "♯" : "♭", steps: steps.slice(0, key.n) };
  }

  function renderSystem(items, key, yTop) {
    // items: [{step, finger, idx}]
    const out = [];
    const sig = escSig(key);
    const clefX = 10;
    const sigW = sig.steps.length * 10 + (sig.steps.length ? 8 : 0);
    const x0 = clefX + 34 + sigW + 12;
    const x1 = W_STAFF - 18;
    const span = items.length > 1 ? (x1 - x0) / (items.length - 1) : 0;
    const xOf = (i) => items.length > 1 ? x0 + i * span : (x0 + x1) / 2;

    // vertical fit: gather y of notes (relative), staff lines, ledgers, fingering row
    let minR = yRel(STAFF_REF + 8), maxR = yRel(STAFF_REF);      // staff top line .. bottom line
    items.forEach((n) => { minR = Math.min(minR, yRel(n.step) - 8); maxR = Math.max(maxR, yRel(n.step) + 8); });
    const fingerR = maxR + 16;
    const topPad = 6;
    const bottomLineY = yTop + topPad + (yRel(STAFF_REF) - minR);   // absolute y of E4 (bottom line)
    const absY = (rel) => bottomLineY + (rel - yRel(STAFF_REF));
    const yStep = (step) => absY(yRel(step));
    const sysH = topPad + (maxR - minR) + 22;

    // staff lines (E4,G4,B4,D5,F5 = steps 30,32,34,36,38)
    for (let s = 30; s <= 38; s += 2) out.push(`<line class="staff-line" x1="${clefX}" y1="${yStep(s)}" x2="${x1}" y2="${yStep(s)}" stroke-width="1"/>`);
    // clef
    out.push(`<text class="clef-ink glyph" x="${clefX}" y="${yStep(30) + LG * 0.2}" font-size="${LG * 6.4}">𝄞</text>`);
    // key signature
    let sx = clefX + 36;
    sig.steps.forEach((st) => { out.push(`<text class="sig-ink glyph" x="${sx}" y="${yStep(st) + LG * 1.05}" font-size="${LG * 3.1}">${sig.glyph}</text>`); sx += 10; });

    items.forEach((n, i) => {
      const cx = xOf(i), cy = yStep(n.step);
      // ledger lines
      if (n.step >= 40) for (let ls = 40; ls <= n.step; ls += 2) out.push(`<line class="ledger" x1="${cx - 8}" y1="${yStep(ls)}" x2="${cx + 8}" y2="${yStep(ls)}" stroke-width="1.1"/>`);
      if (n.step <= 28) for (let ls = 28; ls >= n.step; ls -= 2) out.push(`<line class="ledger" x1="${cx - 8}" y1="${yStep(ls)}" x2="${cx + 8}" y2="${yStep(ls)}" stroke-width="1.1"/>`);
      // stem
      const down = n.step > 34;
      const sxx = down ? cx - LG * 0.6 : cx + LG * 0.6;
      const sy2 = down ? cy + LG * 3 : cy - LG * 3;
      out.push(`<line class="note-ink" x1="${sxx}" y1="${cy}" x2="${sxx}" y2="${sy2}" stroke-width="1.7"/>`);
      // head
      out.push(`<ellipse class="note-head note-ink" data-idx="${n.idx}" cx="${cx}" cy="${cy}" rx="${LG * 0.62}" ry="${LG * 0.46}" transform="rotate(-20 ${cx} ${cy})"/>`);
      // fingering
      out.push(`<text class="finger" x="${cx}" y="${absY(fingerR) + 5}" font-size="${LG * 1.5}" text-anchor="middle">${n.finger}</text>`);
    });
    return { svg: out.join(""), height: sysH };
  }

  function renderStaff(run) {
    const key = keyById(state.scaleKey);
    let idx = 0;
    const withIdx = run.map((n) => ({ ...n, idx: idx++ }));
    const systems = [];
    for (let i = 0; i < withIdx.length; i += PER_SYS) systems.push(withIdx.slice(i, i + PER_SYS));
    let y = 8, body = "";
    systems.forEach((items) => { const r = renderSystem(items, key, y); body += r.svg; y += r.height; });
    const H = y + 6;
    return `<svg viewBox="0 0 ${W_STAFF} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }

  // ======================================================================
  // Audio.
  // ======================================================================
  const RHYTHM_FREQ = 523.25; // C5 for rhythm mode
  let ctx = null, master = null;
  function ensureAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  }
  function playTone(time, durSec, freq, vel, staccato) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 2800;
    osc.type = "triangle"; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(lp); lp.connect(master);
    const gate = Math.max(0.05, durSec * (staccato ? 0.42 : 0.92));
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, vel * 0.3), time + gate * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0006, time + gate);
    osc.start(time); osc.stop(time + gate + 0.03);
  }
  function playClick(time, accent) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "square"; osc.frequency.value = accent ? 2000 : 1400;
    osc.connect(gain); gain.connect(master);
    const v = accent ? 0.16 : 0.09;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(v, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.04);
    osc.start(time); osc.stop(time + 0.06);
  }

  // ======================================================================
  // State + persistence.
  // ======================================================================
  const SAVE_KEY = "hannon-v2";
  const state = {
    mode: "rhythm",
    bpm: 96,
    pattern: PATTERNS[0],
    scaleKey: "C",
    patEnabled: new Set(PATTERNS.map((p) => p.id)),
    keyEnabled: new Set(KEYS.map((k) => k.id)),
    opts: { countIn: false, accent: true, click: false, autoShuffle: false, trainer: false, trainerAmt: 4, trainerEvery: 4 },
    playing: false,
  };
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        mode: state.mode, bpm: state.bpm, pattern: state.pattern.id, scaleKey: state.scaleKey,
        patEnabled: [...state.patEnabled], keyEnabled: [...state.keyEnabled], opts: state.opts,
      }));
    } catch (_) {}
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!d) return;
      if (["rhythm", "scale", "arp"].includes(d.mode)) state.mode = d.mode;
      if (typeof d.bpm === "number") state.bpm = clamp(d.bpm, 40, 208);
      if (d.pattern && patById(d.pattern)) state.pattern = patById(d.pattern);
      if (d.scaleKey && keyById(d.scaleKey)) state.scaleKey = d.scaleKey;
      if (Array.isArray(d.patEnabled) && d.patEnabled.length) state.patEnabled = new Set(d.patEnabled.filter(patById));
      if (Array.isArray(d.keyEnabled) && d.keyEnabled.length) state.keyEnabled = new Set(d.keyEnabled.filter(keyById));
      if (d.opts) Object.assign(state.opts, d.opts);
    } catch (_) {}
  }

  // ======================================================================
  // Sequence builder — unifies playback across modes.
  // Returns { events:[{tBeat,durBeat,freq,vel,staccato,pulseBeat,noteIdx}], loopBeats }.
  // ======================================================================
  let currentRun = null; // cached scale/arp run for highlight
  function buildSequence() {
    if (state.mode === "rhythm") {
      const notes = buildRhythmNotes(state.pattern);
      const staccato = state.pattern.art === "staccato";
      const events = notes.map((n, i) => {
        let vel = 0.34;
        if (n.accent) vel = 0.62;
        if (state.opts.accent && n.t16 === 0) vel = Math.max(vel, 0.7);
        return { tBeat: n.t16 / 4, durBeat: n.dur16 / 4, freq: RHYTHM_FREQ, vel, staccato, pulseBeat: n.t16 % 4 === 0 ? n.t16 / 4 : null, noteIdx: i };
      });
      return { events, loopBeats: BEATS };
    }
    // scale / arpeggio: even eighth notes
    const run = currentRun || (currentRun = buildRun(keyById(state.scaleKey), state.mode === "arp"));
    const dur = 0.5; // eighth note
    const events = run.map((n, i) => {
      const onBeat = (i * dur) % 1 === 0;
      let vel = onBeat ? 0.5 : 0.4;
      if (state.opts.accent && onBeat) vel = Math.max(vel, 0.6);
      return { tBeat: i * dur, durBeat: dur, freq: midiToFreq(n.midi), vel, staccato: false, pulseBeat: onBeat ? i * dur : null, noteIdx: i };
    });
    return { events, loopBeats: run.length * dur };
  }

  // ======================================================================
  // Scheduler.
  // ======================================================================
  const LOOKAHEAD_MS = 25, AHEAD = 0.13;
  let timer = null, seq = null, evIdx = 0, loopStart = 0, secBeat = 0, loopCount = 0;
  const secPerBeat = (bpm) => 60 / bpm;

  function startPlayback(skipCountIn) {
    ensureAudio();
    if (ctx.state === "suspended") ctx.resume();
    state.playing = true; updatePlayUI();
    seq = buildSequence(); evIdx = 0; loopCount = 0;
    secBeat = secPerBeat(state.bpm);
    let t = ctx.currentTime + 0.12;
    if (state.opts.countIn && !skipCountIn) {
      for (let b = 0; b < BEATS; b++) { playClick(t + b * secBeat, b === 0); flashAt(t + b * secBeat, b, b === 0); }
      t += BEATS * secBeat;
    }
    loopStart = t;
    timer = setInterval(scheduler, LOOKAHEAD_MS); scheduler();
  }
  function stopPlayback() {
    state.playing = false;
    if (timer) clearInterval(timer); timer = null;
    updatePlayUI(); clearHighlight();
  }
  function scheduler() {
    if (!ctx) return;
    let nextTime = loopStart + seq.events[evIdx].tBeat * secBeat;
    while (nextTime < ctx.currentTime + AHEAD) {
      const ev = seq.events[evIdx];
      const at = loopStart + ev.tBeat * secBeat;
      playTone(at, ev.durBeat * secBeat, ev.freq, ev.vel, ev.staccato);
      if (ev.pulseBeat !== null) { const beat = ev.pulseBeat % BEATS; if (state.opts.click) playClick(at, beat === 0 && state.opts.accent); flashAt(at, beat, beat === 0 && state.opts.accent); }
      if (state.mode !== "rhythm") highlightAt(at, ev.noteIdx);
      evIdx++;
      if (evIdx >= seq.events.length) { evIdx = 0; loopStart += seq.loopBeats * secBeat; onLoopEnd(); secBeat = secPerBeat(state.bpm); }
      nextTime = loopStart + seq.events[evIdx].tBeat * secBeat;
    }
  }
  function onLoopEnd() {
    loopCount++;
    let changed = false, reseq = false;
    if (state.opts.trainer && loopCount % Math.max(1, state.opts.trainerEvery) === 0) {
      const nb = clamp(state.bpm + state.opts.trainerAmt, 40, 208);
      if (nb !== state.bpm) { state.bpm = nb; reflectTempo(); changed = true; }
    }
    const every = state.mode === "rhythm" ? 4 : 1;
    if (state.opts.autoShuffle && loopCount % every === 0) { pickRandom(); renderCurrent(); changed = true; reseq = true; }
    if (reseq) seq = buildSequence();
    if (changed) save();
  }

  // ======================================================================
  // Selection.
  // ======================================================================
  function pickRandom() {
    if (state.mode === "rhythm") {
      const ids = state.patEnabled.size ? [...state.patEnabled] : PATTERNS.map((p) => p.id);
      let pick = state.pattern.id;
      if (ids.length === 1) pick = ids[0]; else while (pick === state.pattern.id) pick = ids[(Math.random() * ids.length) | 0];
      state.pattern = patById(pick);
    } else {
      const ids = state.keyEnabled.size ? [...state.keyEnabled] : KEYS.map((k) => k.id);
      let pick = state.scaleKey;
      if (ids.length === 1) pick = ids[0]; else while (pick === state.scaleKey) pick = ids[(Math.random() * ids.length) | 0];
      state.scaleKey = pick; currentRun = null;
    }
  }
  function shuffle() {
    pickRandom(); renderCurrent(); save();
    if (state.playing) { stopPlayback(); startPlayback(true); }
  }

  // ======================================================================
  // Rendering / DOM.
  // ======================================================================
  const els = {};
  function renderCurrent() {
    if (state.mode === "rhythm") {
      els.notation.classList.remove("staff");
      els.notation.innerHTML = renderRhythm(state.pattern, GEOM_FULL);
      els.patternName.textContent = state.pattern.name;
      els.artiBadge.hidden = false;
      els.artiBadge.textContent = state.pattern.art;
      els.artiBadge.className = "badge " + state.pattern.art;
      els.pulseRow.style.display = "";
    } else {
      currentRun = buildRun(keyById(state.scaleKey), state.mode === "arp");
      els.notation.classList.add("staff");
      els.notation.innerHTML = renderStaff(currentRun);
      const k = keyById(state.scaleKey);
      els.patternName.textContent = `${k.name} Major ${state.mode === "arp" ? "Arpeggio" : "Scale"}`;
      els.artiBadge.hidden = false;
      els.artiBadge.textContent = "4 oct";
      els.artiBadge.className = "badge legato";
      els.pulseRow.style.display = "none";
    }
  }
  function reflectTempo() {
    els.bpmValue.textContent = state.bpm; els.tempo.value = state.bpm;
    els.tempo.style.setProperty("--fill", ((state.bpm - 40) / 168) * 100 + "%");
  }
  function updatePlayUI() {
    els.playBtn.classList.toggle("playing", state.playing);
    els.playBtn.setAttribute("aria-label", state.playing ? "Stop" : "Play");
    if (!state.playing) document.querySelectorAll("#pulseRow .dot").forEach((d) => d.classList.remove("on", "accent"));
  }
  function buildPulse() {
    els.pulseRow.innerHTML = "";
    for (let b = 0; b < BEATS; b++) { const d = document.createElement("span"); d.className = "dot"; d.dataset.beat = b; els.pulseRow.appendChild(d); }
  }
  function flashAt(time, beat, accent) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!state.playing) return;
      const dot = els.pulseRow.querySelector(`.dot[data-beat="${beat}"]`); if (!dot) return;
      dot.classList.add("on"); dot.classList.toggle("accent", !!accent);
      setTimeout(() => dot.classList.remove("on"), 120);
    }, delay);
  }
  function clearHighlight() { els.notation.querySelectorAll(".note-head.active").forEach((e) => e.classList.remove("active")); }
  function highlightAt(time, idx) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!state.playing) return;
      clearHighlight();
      const h = els.notation.querySelector(`.note-head[data-idx="${idx}"]`);
      if (h) h.classList.add("active");
    }, delay);
  }

  function openPanel() { els.panel.classList.add("open"); els.panel.setAttribute("aria-hidden", "false"); els.scrim.hidden = false; }
  function closePanel() { els.panel.classList.remove("open"); els.panel.setAttribute("aria-hidden", "true"); els.scrim.hidden = true; }

  function buildPatPool() {
    const cats = [];
    PATTERNS.forEach((p) => { if (!cats.includes(p.cat)) cats.push(p.cat); });
    els.poolList.innerHTML = cats.map((cat) => {
      const items = PATTERNS.filter((p) => p.cat === cat).map((p) => `
        <label class="pool-item"><span class="mini">${renderRhythm(p, GEOM_MINI)}</span>
        <span class="nm">${p.name}</span>
        <input type="checkbox" data-pid="${p.id}" ${state.patEnabled.has(p.id) ? "checked" : ""}/></label>`).join("");
      return `<div class="pool-cat">${cat}</div>${items}`;
    }).join("");
    els.poolList.querySelectorAll("input[data-pid]").forEach((cb) => cb.addEventListener("change", () => {
      cb.checked ? state.patEnabled.add(cb.dataset.pid) : state.patEnabled.delete(cb.dataset.pid); save();
    }));
  }
  function buildKeyPool() {
    els.keyList.innerHTML = `<div class="pool-cat">Keys (Major)</div>` + KEYS.map((k) => `
      <label class="pool-item"><span class="nm key-nm">${k.name} Major</span>
      <input type="checkbox" data-kid="${k.id}" ${state.keyEnabled.has(k.id) ? "checked" : ""}/></label>`).join("");
    els.keyList.querySelectorAll("input[data-kid]").forEach((cb) => cb.addEventListener("change", () => {
      cb.checked ? state.keyEnabled.add(cb.dataset.kid) : state.keyEnabled.delete(cb.dataset.kid); save();
    }));
  }
  function setPoolAll(on) {
    if (state.mode === "rhythm") { state.patEnabled = on ? new Set(PATTERNS.map((p) => p.id)) : new Set(); els.poolList.querySelectorAll("input[data-pid]").forEach((cb) => (cb.checked = on)); }
    else { state.keyEnabled = on ? new Set(KEYS.map((k) => k.id)) : new Set(); els.keyList.querySelectorAll("input[data-kid]").forEach((cb) => (cb.checked = on)); }
    save();
  }
  function syncPanelForMode() {
    const rhythm = state.mode === "rhythm";
    els.poolList.hidden = !rhythm; els.keyList.hidden = rhythm;
    els.panelTitle.textContent = rhythm ? "Rhythms" : "Keys";
    els.poolBtn.setAttribute("aria-label", rhythm ? "Choose rhythms" : "Choose keys");
  }

  function reflectOpts() {
    els.optCountIn.checked = state.opts.countIn; els.optAccent.checked = state.opts.accent;
    els.optClick.checked = state.opts.click; els.optAutoShuffle.checked = state.opts.autoShuffle;
    els.optTrainer.checked = state.opts.trainer;
    $("trainerAmt").textContent = state.opts.trainerAmt; $("trainerEvery").textContent = state.opts.trainerEvery;
    $("trainerCfg").classList.toggle("dim", !state.opts.trainer);
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    const wasPlaying = state.playing;
    if (wasPlaying) stopPlayback();
    state.mode = mode; currentRun = null;
    document.querySelectorAll(".mode-btn").forEach((b) => { const on = b.dataset.mode === mode; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    syncPanelForMode(); renderCurrent(); save();
    if (wasPlaying) startPlayback(true);
  }

  function init() {
    ["notation", "patternName", "artiBadge", "pulseRow", "playBtn", "shuffleBtn", "poolBtn", "settingsBtn",
      "tempo", "bpmValue", "bpmUp", "bpmDown", "panel", "scrim", "panelClose", "panelTitle", "poolList", "keyList",
      "optCountIn", "optAccent", "optClick", "optAutoShuffle", "optTrainer"].forEach((id) => (els[id] = $(id)));

    load();
    buildPulse(); buildPatPool(); buildKeyPool();
    document.querySelectorAll(".mode-btn").forEach((b) => { const on = b.dataset.mode === state.mode; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    syncPanelForMode(); renderCurrent(); reflectTempo(); reflectOpts();

    els.playBtn.addEventListener("click", () => state.playing ? stopPlayback() : startPlayback(false));
    els.shuffleBtn.addEventListener("click", shuffle);
    document.querySelectorAll(".mode-btn").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

    els.tempo.addEventListener("input", () => { state.bpm = parseInt(els.tempo.value, 10); reflectTempo(); });
    els.tempo.addEventListener("change", save);
    const bump = (d) => { state.bpm = clamp(state.bpm + d, 40, 208); reflectTempo(); save(); };
    els.bpmUp.addEventListener("click", () => bump(1));
    els.bpmDown.addEventListener("click", () => bump(-1));

    els.settingsBtn.addEventListener("click", openPanel);
    els.poolBtn.addEventListener("click", openPanel);
    els.panelClose.addEventListener("click", closePanel);
    els.scrim.addEventListener("click", closePanel);
    document.querySelectorAll(".chip[data-pool]").forEach((c) => c.addEventListener("click", () => setPoolAll(c.dataset.pool === "all")));

    const optMap = { optCountIn: "countIn", optAccent: "accent", optClick: "click", optAutoShuffle: "autoShuffle", optTrainer: "trainer" };
    Object.entries(optMap).forEach(([elId, key]) => els[elId].addEventListener("change", () => { state.opts[key] = els[elId].checked; reflectOpts(); save(); }));
    document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
      const key = b.dataset.step, d = parseInt(b.dataset.d, 10);
      if (key === "trainerAmt") state.opts.trainerAmt = clamp(state.opts.trainerAmt + d, 1, 20);
      else state.opts.trainerEvery = clamp(state.opts.trainerEvery + d, 1, 16);
      reflectOpts(); save();
    }));

    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (e.code === "Space") { e.preventDefault(); state.playing ? stopPlayback() : startPlayback(false); }
      else if (e.code === "KeyS") shuffle();
      else if (e.code === "Escape") closePanel();
      else if (e.code === "Digit1") setMode("rhythm");
      else if (e.code === "Digit2") setMode("scale");
      else if (e.code === "Digit3") setMode("arp");
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
