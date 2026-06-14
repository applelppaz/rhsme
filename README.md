# Hannon

A minimal, **black-and-white paper-sheet** piano-practice app with three modes —
**Rhythm**, **Scale** and **Arpeggio** — a clear metronome and an audio guide.
Optimised for **iPhone landscape**. Built as a single static page with no
runtime dependencies.

## Modes

### 🎵 Rhythm
Plays Hanon's classic *rhythm variations* (the "variations of No. 1" set) on a
single pitch — straight sixteenths, dotted long–short / short–long figures,
accent variations, groupings and triplets — with **staccato / legato**
articulation, and shows the **rhythm notation** of whatever is playing. Choose
which rhythms the random picker draws from.

### 🎼 Scale  ·  🎹 Arpeggio
Picks a **random key** and shows that **major scale / arpeggio over 2 octaves**
as real sheet music on a **grand staff** — right hand in the treble clef over
left hand in the bass clef, two octaves apart as in Hanon — barred in 2/4,
beamed by beat, with key signature, ledger lines and **right-hand fingering
numbers**. The audio guide plays both hands ascending and descending, and the
current note is highlighted as it sounds. Choose which keys are in the random
pool.

## Shared controls

- ▶ / ⏸ **Play / Stop** the looping guide (Web Audio, no samples needed).
- 🔀 **Shuffle** — a new random rhythm/key each press (never repeats in a row).
- 🎚️ **Tempo** slider + steppers (40–208 BPM).
- ☰ **Pool** — pick which rhythms (Rhythm mode) or keys (Scale/Arpeggio) the
  shuffle draws from, with All / None shortcuts.
- ⚙ **Practice aids:** count-in, downbeat accent, quiet metronome click,
  auto-random every few bars, and a **tempo trainer** that speeds up as you loop.
- Settings persist in `localStorage`. Installable (PWA manifest + icon).

### Keyboard

- `Space` — play / stop · `S` — shuffle · `1/2/3` — Rhythm/Scale/Arpeggio ·
  `Esc` — close panel

## Run locally

Static site — just serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Audio starts after the first click/tap (browser autoplay policy).

## Tech

Pure HTML + CSS + vanilla JS — no build step, no framework, no bundler.
- `app.js` — rhythm patterns, scale/arpeggio theory + fingering, an SVG rhythm
  renderer and a **grand-staff renderer** (treble + bass clef), the Web Audio scheduler, and UI.
- `styles.css` — liquid-glass UI.
- Clefs and accidentals use the **Noto Music** web font (Google Fonts).
- `icons/`, `favicon.svg`, `manifest.webmanifest` — app icon / PWA.

## Notes

- Rhythm patterns and fingerings are **data-driven** (`PATTERNS` and `KEYS` in
  `app.js`), so they are easy to adjust or extend.
- Scales/arpeggios cover the 12 **major** keys, both hands, with right-hand fingerings
  following Hanon, *The Virtuoso Pianist* (Ex. 39 scales, Ex. 41 arpeggios) —
  e.g. white-key arpeggios use 1·2·3, and black-key roots use the 2·1·2·4 shape.
  Minor keys can be added later (the `KEYS` table is data-driven).
