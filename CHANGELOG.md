# Changelog

Tags: `web-vX.Y` = GitHub Pages site. Future app builds get `app-vX.Y` (see docs/PLATFORMS.md).

## web-v0.3 — 2026-10-24
- PZS / official routes: pack v2 keeps OSM hiking relations (name, ref, operator, from/to, osmc:symbol) and which ways belong to them.
  Routes show the official route name + red PZS badge (Knafelc marking / PD or PZS operator); long-distance routes (SPP, E6/E7, Via Alpina …) ignored for naming.
  Extra routes: every named relation that reaches the summit adds its own branch(es) from the far end (start = relation from/to tag).
- Selecting a route turns the camera to look at it from the side (perpendicular to the route, from the lower/valley side). Button "⛰ Od strani" repeats it.
- Varčni način now switches extras off completely: hillshade + Waymarked overlay disabled, 360° only Nizka, fewer distant terrain/satellite tiles, no fog, max tilt 70°, height profile only for the selected route, lighter snow map.
- tools/dvat_fetch.py: writes pack v2 (relations) and slims it itself (same rules as slim_pack.js) -> upload directly.

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
