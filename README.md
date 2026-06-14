# Hannon — Practice Sheet

A dead-simple practice-sheet viewer for the piano. One control cycles between
**Scales**, **Arpeggios** and **Exercises**; each shows a page from Hanon's
*The Virtuoso Pianist* (the public-domain G. Schirmer edition) chosen at
random, as large as the screen allows. Built for **landscape** on the phone.

- **Tap the mode button** to switch practice (Scales → Arpeggios → Exercises).
- **Tap shuffle** (or Space) for another page at random.
- No audio — just the sheet, big.

## Files
- `index.html` · `styles.css` · `app.js` — the viewer (vanilla, no dependencies).
- `assets/<mode>/NN.webp` — cleaned black-and-white page images.
- `icons/icon.svg`, `favicon.svg` — app icon based on the Schirmer cover.
- `netlify.toml`, `manifest.webmanifest` — static hosting + PWA.

Hanon's *Virtuoso Pianist* (1873; this Schirmer engraving is early-1900s) is in
the public domain.
