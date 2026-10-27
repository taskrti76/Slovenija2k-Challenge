# Changelog

Tags: `web-vX.Y` = GitHub Pages site. Future app builds get `app-vX.Y` (see docs/PLATFORMS.md).

## web-v0.19 — 2026-10-27
- "Hitri teren (test)" in Napredno (on by default): the 3D shape is built from height tiles one zoom level coarser (360: Srednja one,
  Nizka two, Visoka full detail), while satellite / relief / hillshade on top stay at full resolution (Google-Earth style:
  coarse shape, sharp picture). Hillshade + relief use coarser tiles towards the horizon. Fewer height tiles to load and decode.
  Switch off to compare at the same spot.
- Weather rating v2 (points 0–100, every deduction listed): window 07–17 h; thunder in the afternoon weighs more than in the morning;
  "in cloud" from low + mid cloud only (high thin cloud no longer counts); fresh snow; snow already lying on the summit
  (model snow depth, "zimske razmere"); cold by wind chill. Good ≥ 75, so-so 45–74, bad < 45, thunder always bad.
- "⤢ Povečaj" in the weather block: large window with all days, the score and each deduction, hourly table 06–21 h
  (temperature, feels-like, wind + direction, gusts, low/mid cloud, precipitation, freezing level, CAPE) and "Kako ocenjujemo?".
- weather_fetch.py also fetches low / mid cloud and snow depth (re-upload tools/weather_fetch.py).
- Snow map: hover (PC) or tap (phone) shows snow depth at that spot, its height, steepness and the local snow line -
  the same value the map paints there.

## web-v0.18 — 2026-10-26
- Summit weather. Peak popup: 4 days (today + 3) with a day rating for 08–15 h (good / so-so / bad and why: storms, strong wind,
  precipitation, snow on top, in cloud), summit temperature range, wind + gusts, precipitation, cloud, freezing level, storms,
  hourly strip (6–21 h, collapsible). Layer "Vreme na vrhovih (ocena dneva)": main peaks glow green / amber / red for the chosen day.
- Data: tools/weather_fetch.py + .github/workflows/weather.yml write weather.json 4x a day (DWD ICON via Open-Meteo, ICON-D2 2 km
  for 2 days then ICON-EU). Peaks within 1.6 km share a forecast point asked at the highest summit's height; lower peaks get
  -0.65 °C / 100 m. Summit wind = max(10 m wind, free-air wind at summit height from the 850–700 hPa levels) because a 2 km
  model's 10 m wind sits on smoothed terrain. Without weather.json a popup asks Open-Meteo directly for that peak only.
- Peak popup always opens above the peak and the map moves so the whole popup is visible.
- snow.yml / weather.yml share one commit queue and retry the push, so the two bots don't collide.

## web-v0.17 — 2026-10-25
- Phone stability: map tile cache sized for phones (120–180 tiles instead of 900; every cached terrain/satellite tile holds
  GPU + decoded-height memory, 900 could exhaust a phone in 360). Desktop 500. Turning back re-reads tiles from the browser cache.
- Relief and snow map now share the hillshade DEM source (one fewer copy of the terrain tiles in memory).
- 360: pixel budget on phones (max ~1.5 MP rendered); if graphics memory runs out (WebGL context lost) 360 closes and drops
  one quality level; if the page crashed inside 360, the next visit starts one level lower and says so.
- "Namesti aplikacijo" always visible (except inside the installed app); when the browser has no install prompt to offer
  (already installed, just uninstalled, Samsung/iPhone) it shows the menu steps instead of hiding.
- New icon: Triglav traced from a photo, red route over the ridge and down past Planika.

## web-v0.16 — 2026-10-25
- 360 sunrise / sunset: time and sun position where the sun actually clears the ridges (terrain horizon from the DEM up to 90 km,
  earth curvature + refraction), not the flat horizon -> sun disc no longer shows through mountains; later sunrise / earlier sunset than the flat-horizon time.
- Leaving 360: camera zooms out from the last summit (keeps your view direction).
- Route "Od strani" / picking a route: camera now looks at the face the trail climbs (from the trail's side toward the summit),
  turns the short way round, smoother 2 s ease.
- Walking time no longer shows "5:60 h" (rounding).

## web-v0.15 — 2026-10-25
- Trail pack rebuilt with ferrata grades (OSM via_ferrata_scale), pruned to 4.2 MB.
- Ferrata signs: 82 (paths tagged with a ferrata grade count too); grade text normalised from OSM's mixed notations
  ("3"→C, "2+"→B+, "2-3"→B–C, "1.5"→A/B, letters kept).
- Layers → Poti in koče (OSM): checkbox "Ferate (oznake + težavnost)" to show/hide ferrata signs.
## web-v0.14 — 2026-10-25
- Routes: ferrata variants near the summit are added (summit -> ferrata -> nearest parking), e.g. Mangart: Via Italiana (T6, 3.4 km);
  near-duplicates are only merged when difficulty / ferrata / official route are the same.
- Last bit to the summit without a mapped trail (≤250 m) drawn dashed and listed ("zadnjih 193 m brez poti", e.g. Planjava).
- Via ferrata signs on the map (orange icon, name from the way or its hiking route, grade A–F from OSM via_ferrata_scale + SAC).
  Pack keeps via_ferrata_scale (pack.js + dvat_fetch.py) - re-run dvat_fetch.py to get the A–F grades.
- Save / delete route: in-page dialog instead of the browser's prompt/confirm.
- Phone: language switch no longer under the panel's close ×.

## web-v0.13 — 2026-10-25
- Installable app (PWA): manifest + service worker (sw.js, versioned by build hash). App files and trail data cached on install,
  map tiles cached as viewed (max 4000), "Namesti aplikacijo" button (Android/desktop), iPhone hint (Share → Add to Home Screen),
  "new version - reload" notice. "Prenesi to območje za brez signala": terrain tiles z8–14 for the visible area (max ~25 × 25 km)
  -> relief, hillshade, 3D, trails, huts, peaks work offline. Satellite / OpenTopoMap only cached as viewed (their terms forbid bulk download).
- Language SL / EN (switch at the top of the side panel and in the guide; defaults to the browser language). English applied to
  the page as it renders (dictionary + patterns); peak names stay Slovene; MapLibre buttons now in Slovene in SL.
- First-use guide (7 steps, highlights the element, phone + PC layouts); replay in Napredno → Vodič.
- Peak list renders even if the map fails to load.

## web-v0.12 — 2026-10-24
- 360: sunrise / sunset mode (button ☀ Dan → 🌅 Vzhod → 🌇 Zahod). Today's sun time and direction for that summit
  (low-precision NOAA formulas, horizon lowered by the dip from the summit height), view turns to the sun, sun disc on the horizon,
  warm sky, slopes lit from the sun's direction (hillshade), satellite toned down. Back to normal with ☀ Dan, another peak or exit.

## web-v0.11 — 2026-10-24
- 360: warm-up turn removed (tiles were dropped while spinning). Instead Visoka renders at Srednja's resolution while you turn
  and returns to full sharpness ~0.35 s after you stop; only the pixel ratio changes, loaded tiles stay (no reloading).

## web-v0.10 — 2026-10-24
- New trail pack (OSM 2026-10-24, 101 areas incl. Pohorje, Snežnik, Prealps, eastern Karavanke), pruned to what is near a peak:
  whole ways kept if any part is ≤12 km (trails) / ≤15 km (roads, parkings, huts) from a peak - nothing cut at an edge.
  269k -> 115k ways, 8.9 -> 4.2 MB, all 2 665 hiking relations kept; routes unchanged. Same pruning now in tools/dvat_fetch.py
  (tools/prune_pack.js for an existing pack).
- Routing network built per region (~55 × 55 km around the peak / drawing area); rebuilt automatically when needed.
- "% markirano" also counts ways that belong to a hiking route (Pohorje forest roads, etc.).
- Peak list: scope chips (98 prominentnih / Vsi vrhovi) + status switch (Vsi / Neobiskani / Obiskani) instead of one row that was cut off;
  range counts follow the scope (e.g. Julijske 2 / 72 prominent); heights with "m".
  (1500–2000 m also happens to have exactly 98 peaks with ≥100 m prominence - the big counter's label changes.)
- Border: whole of Slovenia (Natural Earth outline built in; precise OSM border fetched once for the whole country).
- 360: one quick warm-up turn on arrival loads every direction once (tap to stop); resolution no longer drops while turning
  (except varčni način); bigger tile cache so turning back is served from memory.

## web-v0.9 — 2026-10-24
- The 98 prominent 2000 m peaks are the main view: default filter, big red counter at the top of the list, count on the red tab.
- Ranges for new peaks by valley boundaries (tools/make_1500.py, data/range_overrides.json): Sava Dolinka splits Julijske/Karavanke,
  Baška grapa–Sorica + Ratitovec/Jelovica -> Predalpe, Pohorje east of 15°, Snežnik south of 45.9°, else nearest 2000 m peak on the same side.
  Fixes e.g. Trupejevo poldne, Visoki Kurji vrh, Bele peči (now Karavanke), Spodnje Bohinjske gore (Julijske).
- Routes always start at a parking/trailhead (≤300 m; line joined to the parking point); relation routes ending at a hut or mid-slope
  are continued to the nearest parking. Routes over 22 km or over 11 h walking (DIN 33466, from the height profile) are dropped.

## web-v0.8 — 2026-10-24
- 1500–2000 m list rebuilt from the terrain-first analysis: 302 peaks (98 main ≥100 m, 204 named subpeaks ≥30 m); Uršlja gora (499 m),
  Golica (351 m) etc. now included. Peaks outside Slovenia dropped (OSM Slovenia area, or Natural Earth border ±1 km for terrain-only peaks);
  duplicates of 2000-list peaks skipped; unnamed terrain summits take the name of a nearby unmatched OSM node.
- 2000 list: 14 more named OSM subpeaks (now 378).
- Text size slider now scales all UI text (every CSS font size, popups, legends, tab bar, 360 labels, hut and contour labels, profile).
- tools/dvat_fetch.py: +44 download areas = trails/roads/huts 20 km around the 1500–2000 m peaks (Pohorje, Snežnik, Prealps …).

## web-v0.7 — 2026-10-24
- One way to open the peak list on PC: red pull tab on the right edge (shows visited count, ‹ / ›); list open on every load.
- Map bounds cover all of Slovenia (Snežnik, Pohorje were cut off).
- tools/vrhovi-1500.html v2: terrain first - every LiDAR summit ≥1450 m with ≥30 m prominence is listed and named from the nearest
  OSM peak (all OSM peaks, also those without height). Fixes wrong low prominence (e.g. Uršlja gora got 8 m from a knob next to the summit)
  and finds peaks missing from the OSM height list. Status: ok / premaknjen / <30 m prom. / samo teren.

## web-v0.6 — 2026-10-24
- New list: 265 peaks 1500–2000 m from OSM, checked on LiDAR (tools/vrhovi-1500.html -> tools/make_1500.py):
  88 main (prominence ≥100 m, ranked #1–88) + 177 named subpeaks (≥30 m). New ranges: Predalpe, Pohorje, Snežnik.
- 13 extra 2000 m subpeaks from OSM (named, ≥30 m prominence) -> 2000 list now 377.
- 20 approximate/missing 2000 m positions upgraded to LiDAR-snapped OSM positions.
- Peak list: tier switch 2000+ / 1500–2000 / Vsi (remembered); counts, prominent chip and ranges follow the tier.
- Map: 1500 peaks smaller, main ones labelled from zoom 10.5; layer toggle "Vrhovi 1500–2000 m". 360 view labels only main 1500 peaks.

## web-v0.5 — 2026-10-24
- Peak list is now front and centre on PC: big red "▲ Seznam vrhov" button at the top of the sidebar and a floating button top-right
  (with visited count); the list opens by default on first visit and remembers open/closed; map controls and snow legend move aside.

### tools — 2026-10-24
- `tools/vrhovi-1500.html`: LiDAR analysis of 1092 OSM peaks ≥1500 m (snap to true summit, height, prominence, link to the 2000 list) -> CSV.
- Cross-check of OSM vs our 2000 list: median position difference 7 m, 282/351 within 30 m, heights agree (median 0.6 m).

## web-v0.4 — 2026-10-24
- Famous variants: named relations near the summit (up to 7 km) are followed to their far end and, if that end is not in the valley,
  continued to the nearest parking -> e.g. Triglav now offers Tominškova, Čez Plemenice, Čez Prag, Krma, Trenta (Komar), Pokljuka.
- Relations that end on another peak are ignored; absurd detours (> 2.2× shortest or +6 km) and weakly marked unnamed routes are dropped;
  near-duplicates from the same start area merged; max 9 routes, shortest first, named ones preferred.
- Route label = relation that covers most of the route, bonus if it names the peak. Start named after a hut within 700 m when there is one.
- "čez" huts listed in order from the start.

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
