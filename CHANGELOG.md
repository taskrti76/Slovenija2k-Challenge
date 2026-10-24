# Changelog

Tags: `web-vX.Y` = GitHub Pages site. Future app builds get `app-vX.Y` (see docs/PLATFORMS.md).

## web-v0.2 — 2026-10-24
- Varčni način (low-effort mode) for older devices: offered automatically (weak GPU/RAM guess or measured < ~22 fps while moving), toggle in Napredno. Pixel ratio 1, no hillshade, fewer trail lines when zoomed out, 360 starts on Nizka.
- Routes card: ▾ hides the route list (one summary line stays); on phone picking a route hides it automatically.
- Phone: route zoom now fits the visible map above the card (was zooming far out because of desktop sidebar padding).

## web-v0.1 — 2026-10-24 (first public push)
- 3D LiDAR terrain (Mapterhorn), relief / satellite / OpenTopoMap bases, hillshade, border, 2D/3D toggle.
- 364 peaks with ranges, labels, visited checklist (stored in the browser).
- OSM pack: trails (marked/unmarked/ferrata), roads within 20 km of peaks, huts, bivouacs, parkings, springs. Slimmed to 5.2 MB.
- Routes per peak (SAC T-scale, walking time, huts along), GPX export; route graph built lazily on first use.
- Drawing editor: follows trails then roads, movable/deletable points, undo, colour, collapsible profile, one movable window.
- 360° summit view (eye 5 m above summit, turn + tilt, quality Nizka/Srednja/Visoka).
- Snow: model cells layer + new "Snežna karta" base (depth painted per pixel from local snow–height fit, slope correction, contour lines). Movable/hideable legend.
- Snow data from daily `snow.json` (GitHub Action) — no per-visitor API calls.
- OSM attribution always shown.
