# Changelog

Tags: `web-vX.Y` = GitHub Pages site. Future app builds get `app-vX.Y` (see docs/PLATFORMS.md).

## web-v0.79 — 2026-11-13
- Markacija is now the main look (new visitors get it); Osnovni and Nov videz stay as older looks in ⚙ Nastavitve → Videz.
- Light / dark theme: ⚙ Nastavitve → Videz → Tema (Samodejno = as the phone/computer, Svetla, Temna; ?theme=light/dark/auto).
  Dark: dark panels with light outlines, the blaze stays red and white, the map a little dimmer; the profile / friends page too.
- Phone, peak window: a compact sheet at the bottom (sideways: on the left) instead of a big bubble; the peak moves into the
  free part of the map above it; weather, visit details, GPS, admin and webcams fold under »Več«; swipe the header down to close.
- Windows step aside: the planner, routes, drawing and sharing windows never sit under the search bar (computer) or under
  Markacija's bottom bar / side column (phone) - »Izračunaj turo« is reachable again.
- Markacija, phone sideways: swiping the side column works (the browser took the vertical swipe); the blaze no longer
  disappears - it hid whenever a window was open near the bottom middle, and was measured mid-slide and parked off screen.
- Profile / friends backgrounds redrawn: the ridge follows the real edge in the photo (sharp peaks, the spruce's tip is back,
  sky between branches cut out), true photo colours (no more green on rock in the Triglav view).

## web-v0.78 — 2026-11-12
- Profile / friends background: three pictures drawn from photos, a different one on every visit: the view from Triglav, the Julian Alps
  panorama and the Špik group from the valley (?bg=0/a/b shows one now). Above them the contour lines lie on a gradient from the
  page colour at the top to sky blue down at the ridges.
- Snow model: the satellite no longer wipes all snow from a whole height band when it looks bare - it judges flat, north and
  south slopes separately, below 1700 m and on north slopes it only thins the snow (snow under trees and in gullies is not seen
  from space), and clears open ground above 1700 m only when clearly bare (<4 % snow).

## web-v0.77 — 2026-11-12
- Markacija: the page dots of the bottom bar are now in the white middle of the blaze (they were hidden behind it).
- Snow map: steepness takes snow away much later - full snow up to 45°, thinning to 70°, only walls steeper than that hold
  little (was: less from 35°, almost none at 60°).
- Profile / friends background: the Triglav view stands higher, forests in green, rock in blue-greys; the sky behind is a blue
  that fades upward; the contour lines stay above the mountains.

## web-v0.76 — 2026-11-12
- Markacija: the blaze is the GPS summit check - tap to start / stop (it glows green while on), hold = the full menu; the bar's
  buttons change only by swiping (sideways: up/down); the blaze sits exactly in the middle of the bar. On the website (not only
  the app) the check now works too, while the page is open.
- GPS test summit: ?gpstest=1 puts a test summit at Hudovernikova 4, Ljubljana (?gpstest=lat,lon anywhere, ?gpstest=0 off);
  reaching it says "TEST ✓" - nothing is saved.
- Badges: Razor (50), Rogla, Črni vrh and Altemaver drawn from photos; Triglav zoomed out; new gold badge "10 najvišjih"
  (the 10 highest peaks, prominent or not).
- 360: back to the earlier peak names (with distance); only the compass strip along the top stays. Visoka on a computer: sharper
  satellite (z19) and terrain textures next to where you stand.
- Map panel: "Nastavitve in napredno" removed (all of it is in ⚙ Nastavitve), SL/EN moved to ⚙ Nastavitve → Jezik.
- Phone: swipe down from the top of the open peak list closes it; rivers and lakes stay visible zoomed far out.
- Shrunk legends: centred symbols; base map pictures no longer cut off; snow picture's purple on the summit.
- Profile / friends page background: the view from Triglav drawn from a photo.
- Roads: village streets (residential, living streets), link roads and trunk roads were missing from the data - included now;
  new Action "OSM pack" rebuilds the trails/roads/huts file monthly (or by hand).
- Snow model v3 (snowpack.py): no direct sun below ~12° sun height (ridges), forest below 1400–1750 m lets through 45–100 % of the
  sun, weaker sub-zero sun melt - more snow on summits and in forests. The season is recomputed from 1 October on the next run.

## web-v0.75 — 2026-11-12
- Phone held sideways (new looks): search is a round button (opens wide when tapped); Markacija's bar is a column on the
  right edge with the blaze in its middle (pages scroll up/down); new look: peak tab bottom left, menu button bottom right.
  Moving the map slides the bars away; a tap on the map or 3 s of rest brings them back.
- 360 view (new looks): peak names stand upright with a line down to the summit (longer lines when names would collide),
  a compass strip along the top (S, SV, V … and a tick every 15°), "Vidni vrhovi · N" opens the list of visible peaks
  (nearest first) - tap one to turn towards it.
- Base map pictures: relief in the badge style, satellite with a satellite, topo with believable contours and a river,
  snow with more contrast.

## web-v0.74 — 2026-11-12
- Guide: the Triglav window opens at once on a flat map for "click a peak" and "360°" (no flying, never hidden behind a
  ridge - 360° now works on a computer too); routes open at once; the lit part is live (tap, scroll, open things) while the
  rest is blocked; a moving finger shows where to scroll (peak list, peak window, routes); steps without a target sit in the
  middle of the screen; "Nastavi se" is now "Osebne nastavitve"; on the phone the guide text follows the text size.
- Snow legend no longer shows at first load when it had been shrunk before (a shrunk legend's style showed it).
- New looks: map buttons and shrunk legends grow with the text size, but only half as much (about 30-40 px).
- New looks: better base-map pictures (relief, satellite, topo, snow); two more versions on the design canvas.

## web-v0.73.1 — 2026-11-12
- The harmless MapLibre message "Out of bounds ... _numberToString" is no longer shown as an error.

## web-v0.73 — 2026-11-12
- Markacija, phone: the bottom bar has pages. The blaze in the middle stays; tap it (or swipe the bar) and the four buttons
  change (1: Vrhovi, Karta, Načrt, Jaz; 2+: Nastavitve, Riši, Lestvica, Vodič, Prijatelji, GPS, Admin ...). Hold the blaze =
  the old round menu. Dots under the blaze show the page.
- Markacija: peak dots in their range's colour again (ring = not yet, filled = climbed).
- New looks: base maps (Podloga) as little map pictures (relief, satellite, topo, snow) instead of colour swatches; "Topo".
- New looks: a shrunk legend is a small round button like the map buttons (tap opens it); stray dot under the compass gone.
- Profile badges: wider grid, more space, long names wrap instead of running into each other.
- Profile / leaderboard / friends page: the mountains at the bottom are Škrlatica drawn from a photo (contours kept above).
- Guide in the new looks: menu steps point at the left rail (computer) or the bottom bar (Markacija phone, on the right page);
  the 360 step finds the 360° button in the new peak window.

## web-v0.72 — 2026-11-12
- Badges: 11 peaks redrawn from photos the same way as the app logo (photo → sky cut off → tone bands → outlines):
  Triglav, Mangart, Jalovec, Škrlatica, Visoki Kanin, Grintovec, Ojstrica, Stol, Košuta (replaces Vrtača on the Karavanke
  badge), Veliki Snežnik (with the hut), Porezen. Files in badges/, tool tools/badges/emblem.py.
- Third look "Markacija" (preview): Nastavitve → Videz now has Osnovni / Nov videz / Markacija (?v2=0 / 1 / mk). Markacija =
  the new layout with a trail-blaze skin (red–white, black outlines, condensed headings), peaks drawn as blazes, and on the
  phone one bottom bar (Vrhovi with count, Karta, menu button, Načrt, Jaz).
- 360 view in the new looks: name and direction top left with a close button, controls in one white card at the bottom.
- Loading screen: bigger logo; the app's own start screen now steps aside at once so the loading bar is visible; Android 12+
  start icon no longer cut by the circle (needs the new APK).
- Legends: the height legend no longer hides when the snow legend appears - both stay, stacked at the right edge.
- New look, phone in dark mode: the peak window buttons looked disabled (light text on white) - fixed.

## web-v0.71 — 2026-11-11
- Snow legend: the hide button (–) was pushed off the edge by the date; the date now sits on its own line, the button is bigger.
- 360 view: webcams and the snow legend are hidden.
- Webcams: only those within 8 km of a peak (was 20 km); the peak window lists cameras within 8 km.
- Nov videz: the snow depth on the summit is back in the peak window (when the snow layer is on).
- Android app: held sideways, the map now fills the whole screen incl. the strip next to the front camera (system bars hidden,
  swipe from the edge to show them). Needs the new APK.

## web-v0.70 — 2026-11-09
- "Nov videz" (still opt-in, ?v2=1 or Nastavitve → Videz) now also changes the layout, following the mockup:
  - search bar on the map (peaks, huts, trailheads, towns and villages) with a profile button;
  - phone: the peak list peeks from the bottom as a sheet (count, %, progress ring), the red button sits on its edge;
  - peak window: header with a "✓ Obiskan" badge, 4 big actions (Poti, 360°, V načrt, Kamere), warning when the normal route is
    above your limit, then visit info, weather, cameras as chips, GPS, admin, LiDAR line;
  - routes: sort switch (fastest / least ascent / easiest), the selected route as a card with big numbers, its profile and
    buttons ("Šel sem po tej poti" as the main one), the others as short rows (time, ascent, T);
  - Karta in sloji: base maps as picture tiles, layers as switches;
  - computer: icon rail on the left (peaks, map, settings, profile, draw, planner, leaderboard, friends, groups, admin, guide);
    the peak list and the map panel open next to it, one at a time; no more side tabs or red button.
  Off = the site exactly as before.

## web-v0.69 — 2026-11-09
- Experimental "Nov videz" (off by default): Nastavitve → Videz → Nov videz (preizkus), or ?v2=1 / ?v2=0 on the address.
  Inter font, one accent colour (alpine red #B42318) + neutrals, selection blue for routes, 10 / 14 / 20 px corners, two shadows,
  pill chips, segmented switches, line icons in the red-button menu, calm white side tabs on PC, new ferrata sign (carabiner and
  Y-lanyard clipped into the steel cable). Everything is scoped to html.v2 (src/design.js) - with it off nothing changes.
- GPS summits: the pill shows the nearest summit and your distance ("📍 Uršlja gora · 120 m · ±8 m"); a summit counts within 80 m
  when the fix is ±25 m or better (50 m otherwise, as the server allows); peak window in the app: "📍 Potrdi vrh z GPS" takes one
  fresh fix now (also without tracking) and says why it does not count (too far / not precise / height); opening routes in the
  app while tracking is off reminds once a day where to switch it on.

## web-v0.68 — 2026-11-08
- Guide: new step 2 "Nastavi se" - walking speed (with an example time), hardest grade, via ferratas, winter experience, text size,
  set right there. Steps about menu items open the red button's menu and light up that bubble (✏️ Riši pot, 👤 Moj profil,
  ⚙ Nastavitve, the whole menu for "Rdeči gumb"). 360° step: if the button is off screen in the peak window, the map moves so it
  is in the upper part and the card goes under it.
- Webcams: only cameras within 20 km of a peak (2000 m or 1500–2000 m list) are shown.
- Phone peak list: the range header pins exactly under the title (also after rotating / changing text size) - no gap.
- Loading screen: bigger logo (also in the app's own start screen).
- App: MainActivity itself asks Android to draw next to the front camera (some phones ignore the theme setting).

## web-v0.67 — 2026-11-08
- 📷 Webcams: Windy cameras in Slovenia + ~20 km over the border (layer "Spletne kamere", camera icons; list refreshed every
  Monday by the "Webcams list" Action into data/webcams.json). Tap = current picture (asked from Windy then, links to windy.com),
  "▶ Časovni potek" = Windy's timelapse player. Peak window: the 3 nearest cameras within 15 km. Admin: hide / rename / move a
  Windy camera, or add own cameras (picture URL + link) as points.
- Friends: typing a name shows matching people (name or username, public profiles); tap one to send the request.
- Planner: towns, villages and hamlets can be stops (and any clicked spot, as before).
- Snow legend: top of the scale = deepest snow of the day rounded up to 5 · 10 · 25 · 50 · 75 · 100 · 150 · 200 cm (multi-colour kept).
- Big height profile: resizing never hides the chart (the chart fills exactly the space between title and numbers, minimum height).
- App: checks for a new version every 6 h (not once a day) and gives one phone notification per new version.

## web-v0.66 — 2026-11-07
- Guide: the lit spot follows its target while the map flies or a window slides in (360° step); the red button is fully
  visible while the guide points at it.
- Legends (height, snow) sit at the right edge under the map buttons, not movable, only – / ▸; snow data note behind ⓘ.
- Snow depth: fixed multi-colour scale (1 · 5 · 15 · 30 · 60 · 100 · 200+ cm: pale blue → blue → violet → magenta → wine), the same
  colour is the same depth every day.
- Height profile: peak names never overlap (highest first, moved up a row with a thin leader line, or left out with a small ▲);
  the big profile uses the panel colours, bigger text, and can be resized from its corner (chart redrawn to fit).
- App: the map also fills the strip next to the front camera (phone held sideways); map buttons keep clear of it.
- Admin: names in the selected route are edited right in the text (start, huts on the way, route name, note; Enter saves for
  everybody); huts / bivouacs / shelters / parkings / trailheads / springs / via ferratas: click → 🛠 Uredi točko (name, kind,
  grade, move, hide) and 🛠 Admin → ＋ new point. Only admins see the ✎ marks and hidden items; everybody else just sees the
  corrected data. Admin route drawing box readable in dark mode. Needs supabase/09_admin_routes.sql (run again).

## web-v0.65 — 2026-11-07
- Red button menu: bubbles laid out on rings with every bubble and label checked against the others and the screen edges
  (no overlap at any count or screen size). Phone: the button is "☰ Meni"; a "︿ Vrhovi · n/98" tab under it opens the peak list
  (tap or swipe up). The button and tab step aside while a window sits at the bottom (planner, routes, drawing, sharing).
- Phone held sideways keeps the phone layout.
- Map sources stay behind the (i) until clicked (also on a computer).
- Guide: the card never covers what it shows - beside it on a computer, otherwise in the larger free band above / below
  (scrolls if short); big sheets are lit only at the top; smaller text on phones; shorter red-button step.
- Admin: "📍 Premakni na karti" closes the peak window and shows a draggable red pin (or click the map) with a save bar.
  Route editor: "✏️ Nariši traso znova" redraws a route's line with the drawing tool (follows trails), "＋ Nova pot" adds a
  route to the peak (start, name, T, ferrata, note); routes added by admin can be deleted again. Needs supabase/09_admin_routes.sql.

## web-v0.64 — 2026-11-07
- Snow in the day rating now scales with the route's difficulty (T1–T6, via ferrata = T6) and winter experience: T1/T2 lose
  little even at 50 cm, T6 without winter experience drops to ~0 above 15 cm. Uses the selected route's T grade if any.
- One red button (centre bottom) replaces the phone tab bar: tap = options in symmetric arcs, swipe up = peak list.
  Computer: same button in the centre, faint until hover; Vodič only on the phone (guide stays in ⚙ Settings).
- Legends styled like the map buttons, top right next to them.
- Admin role (supabase/08_admin.sql, table `fixes`): edit peak name/height/position from the peak window, route T grade /
  ferrata / name / note / hide from the route card, close a trail segment by clicking the map; 🛠 Admin list to undo fixes.
  Fixes apply for everybody immediately.
- Guide updated for the red button.

## web-v0.63 — 2026-11-07
- Height profile: "⤢ Povečaj" opens it across the screen (readable labels, finer hover, its numbers; Esc / × / click outside).
- Planner: huts and bivouacs up to 1 km off the way can be the overnight (there and back counts against the day, shown as
  "+N min tja in nazaj"); tent: the flattest point in the last ~1.5 h before the day's limit (slope over ±60 m), near a spring if
  possible, with its slope shown; "⇄ Obrni smer" reverses the trip (recomputes if it was already planned); every day profile has
  its numbers and ⤢.
- The "Riši pot" button under the map & layers panel is gone (drawing: ☰ → ✏️ on a computer, tab "Riši" on a phone); guide points there.

## web-v0.62 — 2026-11-07
- 🗓 Multi-day planner (☰ → Načrtovalnik, or "＋ V načrt ture" in a peak window): stops = peaks, huts, trailheads or a click on
  the map; best order (all orders up to 8 stops in between, first stop = start, last fixed unless "nazaj na začetek"); way along the
  trail network; split into days by walking time per day (3–12 h) with overnights at huts (+ bivouacs, + open shelters / tent spot
  with "imam šotor" - with a warning that wild camping is forbidden in Slovenia, strictly in TNP), or "brez spanja" (one go). No
  overnight just before the end. Per day: from → to, km, ↑ / ↓, time, hardest T / ferrata, peaks on the way, the hut (and how far
  off the way), small profile, GPX, show on the map; whole trip: totals, warnings, GPX, save to my routes. Days drawn in colours.
- Height profile (routes, drawing, planner): area coloured by steepness (< 10 / 10–20 / 20–30 / 30–45 / > 45 %), strip under it with
  the kind of way (road, track, marked path, unmarked path, via ferrata, no path), huts 🏠 and peaks ▲ on the way, numbers under it
  (steepest bit, hardest T, km of each kind of way); hover / drag shows distance, height, slope, way + T-grade and walking time from
  the start, with a dot on the map.
- Walking times: new base 4.5 km/h, 400 m/h up, 600 m/h down (was DIN 4 / 300 / 500 - too slow even ×0.8), terrain-aware (roads /
  tracks quicker, unmarked, via ferratas and T5–T6 slower) and summed along the real profile; fitness now 5 steps (zelo počasi …
  zelo hitro: ×1.35 / 1.15 / 1 / 0.85 / 0.72); old settings move over (počasnejši → počasi, povprečna → povprečno, hiter → hitro).
- 🔔 Notifications (⚙ Nastavitve → Obvestila): friend requests, friends' climbs, group invitations, new group plans, a good day
  (≥ 80) for a wishlist peak in the next 2 days, a poor forecast (< 45) on a group plan's day. Checked on opening, every 15 min while
  open / in the background, and on coming back; app = phone notifications, browser = system notifications after "Dovoli",
  otherwise a note on the page. Settings sync with the account. (Nothing while fully closed - that needs a push server.)
- Legends (snow, height) also stay out from under the side tabs / open panels on both sides.

## web-v0.61 — 2026-11-07 (shipped with v0.62)
- Legends (height, snow) are anchored by their right edge: expanding a shrunk legend grows to the left; a position saved on a bigger
  window is pulled back on screen whenever the legend appears (a snow legend dragged earlier could stay off-screen on PC).

## web-v0.60 — 2026-11-07 (+ app-v1.0.4)
- Website down (404 / 5xx) now counts like no signal: the service worker shows the saved copy instead of the error page (app and site).
- Loading screen with the logo: blue screen, icon, name and a small bar until the map is drawn (max 12 s). In the app the native splash
  screen (@capacitor/splash-screen, new APK) shows the same and is hidden by the page when the map is ready; Capacitor's default
  splash pictures are replaced by ours, Android 12+ uses the blue background with the round icon.
- Offline mode: no "retry" - without a connection the app/site runs from what is saved and a small "📴 Brez povezave — način brez
  signala (N shranjenih območij)" note shows on top; when the connection is back "✓ Spet povezano — pošiljam spremembe". The app's
  "no connection" page now only appears on the very first start without internet, and opens the app by itself once online.
- Offline maps share one cache ("dvat-offline"): a tile two areas need is stored once, an area only downloads what is missing (the
  estimate before downloading counts only those, "N že shranjenih"), tiles you already looked at are copied instead of downloaded,
  deleting an area removes only tiles no other area uses. Areas saved with v0.56–0.59 move into it by themselves. The bar shows the
  real stored size. Fixed: the "Saved …" note was wiped right after a download.

## web-v0.59 — 2026-11-07
- Settings → App & offline: "📱 Android aplikacija" and "⭐ Spletna aplikacija" side by side (the APK link no longer overlaps the
  heading), each with one line on what it is (APK: GPS confirms summits, also with the screen off, not from Google Play; web app: icon
  from the browser, no download, also iPhone / computer, everything except GPS confirmation).
- Offline maps: overview map of Slovenia - border, the five ranges (dashed, click = save), saved areas in blue (click = show on the
  map), the current view in red, "all on the map" (outlines of every saved area). The bar now shows what is saved out of everything
  that can be saved (all five ranges, estimate); free space on the device is a note under it.
- ☰ menu: bubbles placed on rings of 100 / 178 / 256 px with at most 3 / 4 / 5 bubbles (no more overlapping labels; the last one stays
  above the phone tab bar); the bubble under the mouse / finger grows and turns blue.

## web-v0.58 — 2026-11-07 (shipped with v0.59)
- Guide starts on a clean map: both side panels and every window (peak popup, route card, leaderboard / profile page, settings,
  account, weather overview, photo viewer, shared route, drawing) closed; on a computer each step now opens only what it talks about
  (layers panel / peak list / nothing), so the panels no longer pile up. The state from before the guide comes back at the end.

## web-v0.57 — 2026-11-07 (+ app-v1.0.3)
- Offline map manager: storage bar (saved areas / viewed tiles + app / free, from the browser's storage estimate).
- App updates: the page in the app is always the newest website (as before); the APK now tells its version in the user agent
  (" Dvat2000App/1.0.<build>", set by the build) and once a day compares it with the latest GitHub release - if newer, a bar
  "📱 Nova različica aplikacije → Posodobi" downloads it (Android asks once to install over the old one; sideloaded apps cannot
  update silently).
- Guide: 15 steps - ☰ menu step rewritten (Moj profil, Nastavitve, Lestvica, Riši, GPS vrhovi, Vodič), new steps "👤 Moj profil" and
  "🗺 Brez signala in aplikacija".

## web-v0.56 — 2026-11-07 (+ app-v1.0.2)
- 📍 GPS vrhovi now really works in the app: the app loads the page from the web, so only Capacitor's native bridge is there (no
  registerPlugin) - plugins are now called through the bridge (nativePromise / nativeCallback). The app also marks itself in the user
  agent (" Dvat2000App", new APK), so the menu item shows even if the bridge is missing (then it says to update the app).
- 🗺 Offline map manager (⚙ Nastavitve → Aplikacija in brez signala → Zemljevidi brez signala): list of saved areas (name, date, size,
  detail), 👁 show on the map (outline), ⟳ update, ✎ rename, 🗑 delete; ＋ save the current view (~25 × 25 km, z8–14) or a whole range
  (Julijske Alpe, Kamniško-Savinjske Alpe, Karavanke, Pohorje, Snežnik; z8–13) with a size estimate first, progress + stop, storage
  used. An area now holds everything the map needs there: terrain (relief, hillshade, 3D, contours, snow model) + OpenFreeMap vector
  tiles (rivers, lakes, place names) + their index; trails, huts, peaks, data files and the app are kept by the service worker. Each area
  is its own cache (dvat-reg-<id>); the browser is asked to keep the storage (persist). Old saved terrain stays usable and can be deleted.
  Satellite / OpenTopoMap: still only what you looked at (their terms forbid bulk downloads). Offline ticks and GPS confirmations are
  sent when the connection is back (as before).
- 👤 Moj profil (☰ → Moj profil, also the first tab of the leaderboard page) replaces "Račun" (which opened the same window as
  Nastavitve): numbers, GPS ✓ count, ⭐ wishlist, my climbs, my routes (show / GPX), friends, groups, badges + progress; works without
  an account. Account settings stay in ⚙ Nastavitve.
- ⭐ Wishlist: ☆ in the peak window; kept with the profile settings, so it syncs with the account.
- PC: ✏️ Riši pot in the round ☰ menu.

## web-v0.55 — 2026-11-05 (+ app-v1.0)
- 📱 Android app (APK, not from Google Play): `app/` (Capacitor shell that loads the website, so site updates reach the app at once)
  + `.github/workflows/android.yml` builds, signs and attaches `dvatisocaki.apk` to a GitHub release. Signing key made on the first
  run, kept encrypted in `app/release.jks.enc` (key = BACKUP_PASSPHRASE secret). Settings → "Aplikacija in brez signala" →
  "📱 Android aplikacija (APK)" downloads the latest release.
- 📍 GPS summit check (app only): ☰ → "GPS vrhovi" watches the location (also with the screen off, notification while on). Within 50 m
  of a summit (accuracy ≤ 50 m, height roughly right) the peak is ticked, dated and marked with a blue ✓ "Potrjeno z GPS" (list +
  peak window; local notification when the app is in the background). With an account the fix goes to `verify_ascent`
  (supabase/07_verify.sql), which checks it again (≤ 80 m from the peak, accuracy ≤ 60 m, ≤ 30 days old); verified_at cannot be
  written any other way. Without signal the fixes wait in a queue. Un-ticking a peak drops its confirmation.
- supabase/03_peaks.sql now also carries lat / lon of every peak (needed by 07).
- Leaderboard / friends / groups page: mountain panorama and contour-line pattern on the empty sides (wide screens).
- 📸 Peak of the week: up to 12 photos (Wikipedia article picked by coordinates, its Commons category, geotagged photos near the summit),
  ‹ › / dots / swipe, tap = full-screen viewer (arrows, swipe, ← → Esc, credit per photo). Best-day rating colours readable on the photo.

## web-v0.54 — 2026-11-05
- 🏅 Badges redrawn: every badge has its own emblem: a hand-drawn outline of one peak with its landmark (Triglav with Aljažev stolp, Jalovec spire,
  Mangart road, Škrlatica teeth, Kanin cable car, Ojstrica fang, Stol with Prešernova koča, Rogla tower, Pohorje forest,
  Snežnik snow dome, Ratitovec with Krekova koča, Porezen memorial …). Count badges carry the number on the band, range badges
  the peak name; ★ badges have a day sky, "all peaks" badges an evening sky with sun. Replaces the terrain skylines of v0.53 (too alike at badge size).
  10 Mangart · 25 Jalovec · 50 Razor · 98 Triglav · Julijske ★ Škrlatica / all Visoki Kanin · Kamniško-Savinjske ★ Grintovec /
  all Ojstrica · Karavanke ★ Stol / all Vrtača · Pohorje ★ Črni vrh / all Rogla · Snežnik ★ Veliki Snežnik / all Travica ·
  Predalpe ★ Altemaver (Ratitovec) / all Porezen.

## web-v0.53 — 2026-11-05
- 🏅 Every badge has its own peak: the real skyline of one summit, worked out in the browser from the terrain tiles
  (12 directions × 2 distances, the view where the peak stands out most), snow cap on the 2000 m peaks, kept in the browser
  after the first time. 10 Mangart · 25 Jalovec · 50 Razor · 98 Triglav · Julijske ★ Škrlatica / all Visoki Kanin ·
  Kamniško-Savinjske ★ Grintovec / all Ojstrica · Karavanke ★ Stol / all Vrtača · Pohorje ★ Črni vrh / all Rogla ·
  Snežnik ★ Veliki Snežnik / all Travica · Predalpe ★ Altemaver (Ratitovec) / all Porezen. Until it is computed (or offline)
  the old generic mountain shows.

## web-v0.52 — 2026-11-05 (shipped together with v0.51)
- Leaderboard page: "📸 Vrh tedna" banner on top - a Slovenian prominent 2000er (changes every week), photo from Wikimedia Commons
  (free licence, photographer + licence shown, found via the Slovenian Wikipedia article), height, range, rank, the best day of
  the next days from the summit weather rating, "Pokaži na karti".
- 🏅 Badge wall in the side column: 10 / 25 / 50 / all 98 prominent 2000ers, and for each range (Julijske Alpe, Kamniško-Savinjske
  Alpe, Karavanke, Pohorje, Snežnik, Predalpe) a gold ★ badge for its prominent peaks and a silver one for all its peaks; each
  range badge carries its best-known summit(s) (Triglav, Grintovec, Stol · Vrtača, Črni vrh …); earned ones in colour, the
  others grey with a progress ring and "x / n".
- Avalanche danger from ARSO: new Action "Avalanche bulletin" (twice a day) reads ARSO's bulletin as relayed to the European
  avalanche services (CAAML JSON, regions SI-1 … SI-10; fallback ARSO's own XML) into avalanche.json. Peak window: level 1–5 with
  name and colour, elevation limit, avalanche problems, link to ARSO; day rating: −5 / −20 / −40 / −60 for level 2 / 3 / 4 / 5 when
  there is snow on the way or the level is 3+. Regions are matched to our ranges (the highest level of a range counts). The
  bulletin runs in the snow season (~December–May); before that nothing is shown.
- Privacy page: Wikipedia / Wikimedia Commons (peak-of-the-week photo) added to the outside services.

## web-v0.51 — 2026-11-04
- My routes: a name too long for the row glides left on hover (tap on phones) so its end can be read; the row no longer
  pushes the buttons out of the panel.
- Drawing: a point set (or dropped after moving) within 10 m of a mapped road / path goes onto it.
- Phones faster: canvas at most 2× the screen pixels (phones run 2.6–3.5× - up to ~3× fewer pixels per frame), less prefetching,
  shorter tile fade; trail lines are cut into tiles only to zoom 14 (then enlarged) with a smaller buffer - less work and memory.
- Guide: a step shown again (sheet slid in, Triglav's routes loaded) only moves its card, the text and buttons stay.
- Side column: no error when supabase/06_stats.sql is not run yet.

## web-v0.50 — 2026-11-04
- Routes cross-checked against every official hiking relation and every named path that reaches within 600 m of a summit
  (all 370 peaks above 2000 m): named paths that are not in a relation now also make routes, official routes may be long
  (Tolmin – Krn) and win the final cut over unnamed shortest paths, up to 12 routes per peak (average 6 -> 8). Cmir had no
  route at all: an unmarked shortcut made every real route look like a detour - "shortest" now means shortest MARKED way.
  Tight switchbacks drawn over each other no longer count as the route crossing itself.
- Snow map zoomed out: the satellite look dates of a tile are sampled (a zoomed-out tile covered millions of pixels per tile),
  station corrections are computed once per grid point - much less work per tile.
- 🏆 Lestvica button in the peak list is translated (Leaderboard).
- Lestvica / Prijatelji / Skupine page: wider (1180 px) with a side column - my progress per range with the next targets,
  latest climbs (public profiles), most climbed peaks, most active this month, new hikers; on Prijatelji: friends' latest
  climbs and "they were there, you not yet"; on Skupine: upcoming plans of all my groups. Needs supabase/06_stats.sql.
- Guide: "Poti na vrh" flies to Triglav and opens its routes, "360° razgled" opens Triglav's window and lights up the 360 button.

## web-v0.49 — 2026-11-04
- Snow map at the ARSO stations: within ~2 km (±200 m of height) the station's reading beats the satellite (a bare pixel next to
  Kredarica no longer cuts the station's 24 cm down to the new snow only); together with the v0.48 correction the map shows
  what the stations measure.
- Snowpack model learns from the stations: a snowfall multiplier is nudged once a day by how far the model was from the readings
  (model too low -> more snow from the same precipitation, too high -> less; ±15 % of the error per day, bounded 0.6–1.8).
  It is kept in the model state and shown in snowpack.json ("pk").
- Routes: official relations that end on another peak (ridge traverses) now also give a route, continued down to a parking,
  e.g. Jubilejna pot on Prisojnik (iz Vršiča, 5.3 km); a rejected variant no longer hides its look-alikes.
- ☰ round menu (bottom left of the map, phone and PC): tap -> round buttons pop out around it: ⚙ Nastavitve, 👤 Račun / Prijava,
  🏆 Lestvica, 👥 Prijatelji, ⛰ Skupine (signed in), ❓ Vodič; red number for new requests / invitations. Replaces the ⚙ button,
  the 👥 button / tab and the Nastavitve tab. Phone tab bar: Karta · Vrhovi · Riši.
- Lestvica / Prijatelji / Skupine is its own page (full screen, "‹ Karta" back; the phone / browser back button returns to the map).

## web-v0.48 — 2026-11-04
- Snow map, new rule: the model says how much, the satellite where - but only for what lay there when it looked. Where it saw
  snow -> model depth; where it saw bare ground -> only the snow that fell since (model now minus model at the end of the day
  before the look; melt since makes it 0). After a snowfall the new snow lies everywhere, on top of the old where there was some.
  No more yes/no switch per model cell: look dates are blended over ~1 km and the satellite shares over ~280 m -> no squares.
  The satellite now also counts for the forecast days (snow falling later is added the same way). Tip: "od takrat +X cm".
- ARSO stations are right: the snowpack job trusts them much more (small measurement error, model error never below 5 cm,
  a missing pack is put in fully instead of at most ×4), and the map shifts the model nearby (~5 km, ±250 m) to the reading,
  fading over the next days. At the stations the map now shows what they measured.
- Snow map also where the model has cells outside the old ICON box (Pohorje, Snežnik) - it disappeared when zooming in.
- Routes to a summit never run over or cross themselves (loops are cut out), do not wander away from the summit and come back,
  and are dropped when more than 40 % of the climb is lost again on the way up (e.g. Pot Lojzeta Rekarja: 11.2 -> 7.4 km).
- Phone tab bar: Karta · Riši · Vrhovi (middle) · 👥 · Nastavitve.
- Legends: grab them anywhere (phones too, with a finger); a short tap still works – / ▸; double-click / double-tap = back.
- Start: if the browser restores the last base map in the menu, the map follows it (menu and map no longer disagree).

## web-v0.47 — 2026-11-02
- Snow map: no more light squares. Cloud gaps (no satellite look) took the old "bare" verdict of the pixels around them while all
  around the model's new snow was used; now "is the satellite older than the last snowfall?" is asked of the same ~280 m window
  that gives the satellite shares, so gaps follow their neighbours.
- iPhone sideways: map & layers sheet, peak list, their tabs, map buttons and the tab bar keep clear of the Dynamic Island /
  notch and rounded corners (safe areas). Phone held sideways (height ≤ 500 px): both sheets start closed so the map is visible.
- iPhone memory: canvas at most 2× pixels, smaller tile cache, fewer tiles in flight, less prefetching. If the page gets killed
  while open (out of memory), the next start switches on varčni način and says so (switching it off by hand sticks).
- Legends: collapsed = a small button (⛰ ▸ / ❄ ▸) - the height legend kept its full width before.
- Guide: each step opens what it talks about (map & layers sheet for weather / snow / draw / layers, the peak list) and lights up
  the real thing (the whole row); at the end the sheets go back to how they were.
- Signed in: 👥 Prijatelji tab in the phone tab bar (Karta · Vrhovi · Riši · 👥 · Nastavitve) and a 👥 button next to ⚙ on PC,
  both with the number of new requests / invitations.

## web-v0.46 — 2026-11-01
- Peak list: "Ostrv" and "Kainradlturm" were the same summit (one OSM node "Ostrv / Kainradlturm", 12 m apart) – merged into
  "Ostrv (Kainradlturm)" (id kainradlturm-2103, Karavanke, position from OSM). 2000 m list: 376 peaks.
- data/id_moves.json: merged duplicates (old id -> kept id). Ticks and climb details in browsers move over automatically;
  supabase/03_peaks.sql moves climbs in accounts (run it again in the SQL Editor).

## web-v0.45 — 2026-11-01 (friends + groups + group plans)
- Friends (mutual): add by username or from a profile on the leaderboard; the other one accepts. Friends see everything of each
  other – peaks with dates, routes and notes, and drawn routes (open one on the map, GPX, save a copy). "Ti in prijatelji" ranking
  with the four boards; friend's peaks on the map (rings).
- Groups (private): created among friends, you can invite only your own friends; join / decline invitations; the owner renames,
  removes members, deletes; if the owner leaves, the longest member takes over. Members see each other's peaks with dates
  (routes / notes stay friends-only).
- Group page: plans (title, date, drawn route or a peak, note; "✓ Grem" / "Ne grem", who is going, on the map, GPX), group
  leaderboard, group peaks (climbed by at least one / by all, rings on the map, "nobody yet" list), invite friends, past plans.
- Peak window: "👥 Prijatelji in skupine" – who of your friends / group members climbed it (date; route + note for friends).
- Leaderboard page has three tabs: 🏆 Lestvica · 👥 Prijatelji · ⛰ Skupine; red dot on 🏆 and a number on the tab for new requests /
  invitations; "👥 Prijatelji in skupine" button in ⚙ Settings → Account; data export includes friends and groups.
- Database: supabase/05_social.sql (tables closed, everything through functions; limits: 300 friends, 30 requests a day,
  30 groups / 10 own, 50 members, 300 plans per group). Privacy page updated.

## web-v0.44 — 2026-11-01
- Weather: refreshed every 3 h (was 6 h), follows the 3-hourly ICON-D2/EU runs; summit ratings update with it.
- Wind: summit wind = max(10 m wind, 0.8 × free-air wind at summit height) (was 1.0 × – too strong); the score note says wind is
  for exposed summits / ridges and weaker in the lee, on slopes, in forest or on sheltered ridges.
- Snowpack model: 4 runs a day (03:20 · 09:20 · 15:20 · 19:07 Slovenian winter time); every new ARSO reading of the day is
  assimilated in time order (automatic stations hourly), station labels show the reading time.
- Snowpack: the satellite check ignores pixels seen before the last snowfall (the model's new snow wins until a newer look);
  same on the snow map, in the hover tip ("pred sneženjem – velja model") and in the peak window. Satellite never used for future days.
- Snowpack: sunny slopes melt a little even below 0 °C air temperature (strong sun, T > −4 °C), shady slopes don't – a mild
  extra contrast, not a big one.
- Snow map: wind drift at high altitude – hollows / lee get more, ridges and convex tops less (above 2000 m stronger).
- Settings window: gap at the top and bottom on PC.
- Actions: each data job has its own queue (a shared one let a waiting run cancel another job's waiting run); push retry 5× with random wait.

## web-v0.43 — 2026-10-31
- Height legend: evenly spaced labels 0 · 1000 · 2000 · 2900 (colour bar stretched to match), "(m)" in the title; movable (PC, drag the
  title, double-click = back) and collapsible (–), like the snow legend. Both legends scale with the text size.
- Legends sit left of the peak list and its red tab (open or closed) unless you moved them; on phones they step aside while a peak window is open.
- Guide: new step "Namigi" (legends, tilt / north, list → peak, date / route, sharing, leaderboard); long cards always fit on screen.
- Leaderboard: all four boards visible (tabs wrap; 2 × 2 on phones).
- Climb date: no longer set by ticking; "☐ danes" next to it (in the peak window and in the editor) sets today in one tap.
- Housekeeping: GitHub Action "Supabase keep-alive" (daily ping, the free plan pauses after 7 idle days); "Supabase backup"
  (nightly, encrypted pg_dump of accounts + our tables, 30-day artifact; needs secrets SUPABASE_DB_URL + BACKUP_PASSPHRASE;
  restore tested on Postgres 16); privacy.html (SL / EN: what is stored, who sees it, outside services, rights);
  account: "⬇ Izvozi moje podatke" (JSON) + privacy link.

## web-v0.42 — 2026-10-31
- Phone: tapping a peak in the list no longer shifts the whole page (map half off-screen, tab bar at the top): the popup no
  longer takes focus while still off-screen, and nothing may scroll the page or the map box. The peak flies to the middle of the
  free part of the screen (a bit low, so its window fits above) and the window opens when the flight ends.
- Ticking a peak = climbed today (date shown under "Obiskal sem", editable); unticking drops that automatic date.
- New layers: "Kraji (mesta, vasi)" (OpenFreeMap, on) and "Izohipse (plastnice)" on any base map (off); height legend for the colour relief.
- 🏆 Leaderboard v2: everybody with an account is listed with name + numbers (switch off in the account settings), the list of
  peaks only for public profiles. Big window (PC) / full page (phone): totals, 4 boards (prominent 2000 / all 2000+ / prominent
  1500–2000 / all), user search, podium, progress bars, "Ti: n. mesto", paging, profile view with 4 counters. Button next to the
  progress in the peak list. Database: supabase/04_leaderboard.sql.
- Guide: map steps light up the whole map; peak list footer shows the account status in one line; green confirmation toasts.

## web-v0.41 — 2026-10-30
- Account moved into ⚙ Nastavitve (top section "Račun"); the guide ends with an optional step "Račun (neobvezno)" (Ustvari račun / Prijava / Ne zdaj).
- Climb details: under "Obiskal sem" in the peak window - date, route (suggestions = the computed routes to that peak), note;
  route card button "✓ Šel sem po tej poti" ticks the peak with that route + today. Shown in the peak list. Works without an account too.
- Synced to the account: ⚙ Moj profil settings (newest wins), climb details, my drawn routes (✎ Riši → Moje poti).
- Sharing routes: ⤴ in Moje poti → private / anyone with the link / public; link ?pot=… opens the route on the map
  (GPX, "Shrani med moje poti"); public routes appear in the window of the peaks they pass ("Poti uporabnikov").
- Public profile + 🏆 Lestvica (under the progress in the peak list): only users who switch "Javni profil" on; profile link ?u=username.
- Database: supabase/02_profile_routes.sql (settings, public switch, leaderboard / profile / shared-route functions; profiles readable
  only by their owner) + supabase/03_peaks.sql (peak list for the leaderboard, generated by tools/build.py). Tested on Postgres 16.

## web-v0.40 — 2026-10-30
- Accounts (Supabase): username + password with a Cloudflare Turnstile "not a robot" check, no email. 👤 button next to ⚙ (PC),
  account row at the top of ⚙ Nastavitve (phone), "prijava" link under the peak list. Account window: display name, log out,
  delete account. Ticked peaks sync to the account (offline-first; unsent changes kept until online; first login in a browser
  uploads the ticks made there before; log out = the browser forgets them, they stay in the account). No library - plain fetch.
- 360: peak names no longer drawn over the controls (name bar, quality buttons, hint, loading note).

## web-v0.39 — 2026-10-29
- 360: no more sky showing through cracks in the terrain - tile-edge "skirts" were sized from the map zoom (~0.5 m at the 360 zoom), now at least 800 m.
- Snow legend top = deepest snow of the shown day (was the next round number); deeper drifts get the darkest colour ("41+ cm").
- Water: lakes drawn over the river lines (no line through a lake), lake names bigger, big lakes named along their middle;
  waterfalls from falls.json (new monthly GitHub Action tools/falls_fetch.py), Overpass only as a fallback and an empty answer is never kept.
- Popups: small round × in the corner, the title keeps clear of it (the generic popup button style no longer applies to it).
- supabase/01_schema.sql: accounts phase 1 (profiles, ascents with route, routes with private / link / public), row-level security
  tested on Postgres 16 (other users cannot read or change your rows, role cannot be raised from the page, account delete removes everything).

## web-v0.38 — 2026-10-29
- 3D map on phones (low-angle crashes): ground layers kept in one render stack (the drawing tool's lines sat above the labels and
  doubled the terrain textures), phone terrain textures 1536² instead of 2048² (-44 % graphics memory), at most 3 (phone) / 6 (PC)
  texture repaints per frame. Phone at 80° tilt: 26 -> 13 textures, ~0.8 GB -> ~0.26 GB, repaints per frame 26 -> under 3.
  The 360 view uses the same code (budget 2 / 4).
- New layer "Vode": rivers, streams, canals, lakes with names (OpenFreeMap vector tiles, cached like other tiles) + waterfalls with
  name and height (OSM via Overpass, kept 30 days). Hidden in 360.

## web-v0.37 — 2026-10-29
- Snowpack job twice a day: 09:20 (today's ARSO 07:00 readings) and 19:07 (+ new satellite map). A second run the same day starts
  again from the end of yesterday (state keeps a 'base' copy), so nothing is counted twice. Station reading time = the one most stations have.
- Satellite snow: + Copernicus CLMS Gap-filled Fractional Snow Cover (GFSC, Sentinel-1 radar + Sentinel-2, 60 m, daily) through the
  same CDSE login - fills pixels where our own Sentinel-2 look is older or clouded. Falls back to Sentinel-2 only if GFSC fails.
- Snow map note mentions GFSC and ARSO.

## web-v0.36 — 2026-10-29
- 360 frame rate: terrain tiles capped at z15 (phone z14) - near the eye MapLibre made 17 tiny z20–22 tiles. Stenar Visoka 43 -> 19 terrain
  textures, so the 30-texture pool no longer overflows (it repainted every texture every frame). At most 4 (phone 2) texture repaints per
  frame while turning / loading, oldest first. Test browser: Visoka ~9× more frames while turning.
- Snow map legend logarithmic: colours at equal ratios from 1 cm to the top (top 100: 1, 3, 10, 32, 100).

## web-v0.35 — 2026-10-29
- Tile cache (service worker): trimming no longer lists all ~8000 cached tiles after every new tile - once, 20 s after loading calms down. Was likely a big part of slow 360 loading once the cache filled up.
- Satellite from two Esri hosts (server. + services.arcgisonline.com) = twice the parallel downloads; cached under one name; falls back to one host if the second does not answer.
- 360 Visoka: far satellite a bit softer (LOD 6 -> 6.2), ~470 instead of ~720 tiles per view.
- 360: counts as loaded at 97 % of tiles; all-around prefetch starts only after the view you look at is loaded (max 60 s).
- 360 readout while loading: tiles in / needed, tiles per second, frames per second.

## web-v0.34 — 2026-10-29
- 360: satellite tiles around you one level sharper - z18 on PC, z17 on phone (was z17 / z16); ring prefetch follows.

## web-v0.33 — 2026-10-29
- 360 loading (step A1–A6):
  - two passes: arrive with coarse tiles everywhere (a few dozen requests -> the whole view at once, no beige holes), then switch to the
    chosen quality - sharp tiles replace the coarse ones;
  - ring prefetch into the browser / service-worker cache: far satellite ring (z10–11, ~2–3 MB) as soon as a peak popup opens, the full
    ring (heights z9–12, satellite z10–17; phone z10–16) after arriving in 360, coarse levels first - turning is served from the cache;
  - 48 parallel tile requests on PC, 24 on phone (was 16);
  - satellite capped at z17 in 360 (phone z16): the z18–19 tiles under your feet were ~100–200 requests per view;
  - service-worker tile cache 4000 -> 8000 tiles;
  - "⏳ nalagam … N s · hiter pregled" / "✓ naloženo v N s" readout in 360 (real load times to compare);
  - (hillshade, relief, trails etc. were already hidden in 360.)

## web-v0.32 — 2026-10-28
- Text size rescaled: 1.0 = the old 1.4; slider 0.6–1.4 (map labels unchanged at 1.0).
- Snow in the peak popup / day rating = the most snow anywhere along the routes to that peak (snow-map values sampled every ~150 m,
  per day); summit value only when the peak has no route. Shown as "❄ 15 cm (največ na poti)". The rating layer on the map still
  uses the summit model value (computing routes for every peak live is too heavy - to be precomputed later).

## web-v0.31 — 2026-10-28
- Peak popup snow = the snow map's value at the summit point (same model, wind, slope, satellite) - one number in popup, rating,
  hover and map (window.snowPoint).
- Snow legend / colours follow the deepest snow of the shown day: legend top = next round number (10, 20, 30, 50, 100, 150, 200 ...).
- Popup sharpness: MapLibre's will-change:transform switched off (GPU layer blurred the text) + placed on whole device pixels.
- Text size: slider 1.0–2.0, default 1.4 (menus bigger; map labels keep their old size at the default). Side panels, route card
  and popup widths grow with the text size; the popup is panned clear of the side panels. Bigger checkboxes on PC.

## web-v0.30 — 2026-10-28
- Via ferrata signs: only pieces of the same path are joined (same name, or unnamed bits touching it); differently named ferratas stay
  separate even when they meet (82 -> 73 signs: only true duplicates removed). Hardest grade kept.
- Peak popup sharper: placed on whole pixels (MapLibre's centring left half pixels that blurred the text), text 14 px, 330 px wide.
- PC: bigger text in the "Karta in sloji" panel and the peak list (16 px base), both wider (300 / 400 px).
- Popup snow says "v zavetju na višini vrha" - the depth in sheltered spots at summit height; the snow map shows the exposed top itself.

## web-v0.29 — 2026-10-28
- Via ferrata signs: one sign per ferrata (82 -> 62). Pieces that touch (ends within 40 m) or share a name within 1.5 km are joined,
  wherever map-grid edges fall; the name is the longest named piece (+ a second name if the pieces carry two); the grade shown is the
  hardest piece, with its +/–. Secured bits under 60 m on normal paths get no sign; a ferrata with a closed part says "(del zaprt)".

## web-v0.28 — 2026-10-28
- Position check of all 2000 m peaks against the OSM summits (what OpenTopoMap shows) and hribi.net: 295 of 352 agree within 60 m.
  Fixed (src/peaks_final.json, reason in each peak's notes):
  - moved to the summit OSM and hribi.net agree on: Plaski Vogel, Stol, Kredarica, Štruca, Škednjovec, Spodnja Vrbanova špica, Kalška gora;
  - wrong top: Špiček (was on Nad steno), Hudičev steber (was on Mali Prisank), Lučka Baba (was on Kalški greben) -> Lučka Brana (Baba);
  - names: Veliki vrh (Dleskovec) -> Veliki vrh (Veža); Goličica 2076 -> Goličica (Prisank);
  - positions added for peaks that had none: Konjc, Celovška špica, Ostrv, Turn pod Črnim voglom, Slovenski turnc; Vrh Labrja merged
    with the duplicate Vrh Labrje.
- Peak difficulty classes recomputed for all peaks after the moves (data/peak_tech*.json).

## web-v0.27 — 2026-10-28
- Data check against hribi.net, bergsteigen.com, via-ferrata.de, exploreslovenia.si (report: docs/data-check-2026-10.md):
  - peak difficulty class from hribi.net (PZS categories) for 42 of 84 checked peaks (data/tech_overrides.json; overrides now merge per key);
  - 64 trailheads get their real names (Aljažev dom v Vratih, Mangartsko sedlo, Planica, Zadnjica, V Koncu, Logarska dolina ...) instead of
    "pri <nearest place>" (data/data_fixes.json -> starts);
  - Pot čez Žrelo (closed) left out of routing (data_fixes -> closed);
  - via ferrata names / grades fixed for Hvadnik, Češka koča, Zelenica (Spodnji plot), Mučevo, Olimpline, Via Italiana (data_fixes -> ferratas).
- Route cards: relation name only when it covers at least half of the route; no PZS badge on Italian / Austrian routes; the start hut
  is not repeated in "čez ...".
- Guide rewritten (11 steps): peak window, routes, 360° + sun, summit weather, snow map, drawing, layers, ⚙ settings and profile.
  Opening it from settings closes the settings window; hidden controls are scrolled into view.

## web-v0.26 — 2026-10-28
- Snow map smoother, no more 0 -> 30 cm cliffs:
  - satellite no longer switches single 40 m pixels to 0 / 8 cm; it uses the share of snow pixels within ~140 m and the share
    seen through clouds, so snow edges fade over ~280 m (mostly bare -> model depth fades out, mostly white -> at least 8 cm);
  - slope direction (N / S blend) taken over ~80 m, so the switch across a ridge is gradual;
  - below the lowest model level (750 m) snow fades out over 250 m instead of dropping to 0 at 150 m.
- Wind on crests: summits and ridges that stick out of their ~100 m surroundings get down to ×0.5 snow (blown off),
  hollows and gullies up to ×1.25 (drifts). Same on the map, hover readout and fallback renderer.
- Layers & maps as a roll-out sheet: PC - left edge, blue pull tab "Karta in sloji" (state remembered), same as the peak list on
  the right; phone - same tall sheet as the peak list with the title and × pinned on top.
- Fix: phone tab bar sometimes highlighted "Nastavitve" when it was not open.

## web-v0.25 — 2026-10-28
- Snowpack forecast to today + 4 days (all 4 weather-rating days use it); snow map date picker to +4 days.
- ARSO snow stations (vreme.arso.gov.si snow_geojson, ~20 mountain stations incl. Kredarica, Kanin, Vogel, Vršič, Krvavec, Zelenica)
  assimilated every day with a Kalman filter at the time of the morning reading: every model point keeps an error variance that
  grows daily (more after snowfall) and shrinks near stations; increments spread with distance (L = 20 km) and height (Lz = 400 m).
  The job log lists every mountain station: measured, model before -> after. Stations shown on the snow map with their reading.
- Snow map much faster: per-pixel work moved to background workers (fetch + decode heights, slope / aspect, satellite, colours,
  PNG); the main thread only builds a coarse snow-vs-height profile grid per tile from per-cell profiles cached per day (~10 ms
  per tile instead of ~50–170 ms + the whole pixel loop). Old fit only built when the snowpack has no data for that day.
  Fallback to the old main-thread renderer on browsers without OffscreenCanvas in workers.
- Page load: parking names from the nearest place via a grid lookup (was ~0.5 s).

## web-v0.24 — 2026-10-28
- Snowpack model v2 (tools/snowpack.py): ~4 km cells (125 cells, 791 points every 250 m from 750 m), three surfaces each - flat,
  30° north-facing, 30° south-facing. Hourly from 1 October with DWD ICON (icon_seamless) at the point's height:
  rain / snow from wet-bulb temperature (Stull 2011, humidity-dependent threshold ~ +1 °C) averaged with the model's snowfall height;
  new-snow density Hedstrom & Pomeroy (1998) + wind packing; albedo ageing / refresh; solar position + direct / diffuse radiation on
  each slope; enhanced temperature-index melt (Pellicciotti et al. 2005) + rain heat; 10 % liquid water holding, night refreeze;
  settling towards 300 / 500 kg/m³ (FSM, Essery 2015). No more guessed "+5 %/100 m" precipitation boost (it made high summits
  too snowy). Daily satellite correction: per cell, 250 m band and N / S / flat surface, Sentinel-2 seen bare (<10 % snow) ->
  snow removed, seen white (>60 %) but model empty -> 10 cm. Log prints Kredarica, Kanin, Vogel, Krvavec, Rudno polje for checking.
  Runs daily at 18:07 UTC, after the satellite job.
- Snow map / hover / weather rating read the 3 surfaces and blend them by the real slope direction and steepness.
- Phone peak list: the whole sheet scrolls, so counters and filters scroll away and the list gets the screen
  (title with × and range headers stay pinned, Export / Import at the bottom).

## web-v0.23 — 2026-10-27
- Own snowpack model (tools/snowpack.py + .github/workflows/snowpack.yml, daily): snow water + density at every 250 m of height
  (500 m … highest peak) in 61 mountain cells of ~8 km. Hourly: snowfall below ~0 °C / rain above ~2 °C (temperature downscaled to
  the height), precipitation +5 % per 100 m above 1000 m, new-snow density from temperature, settling, degree-day melt
  (stronger in spring) + rain heat. Season state kept in data/snowpack_state.json (starts 1 October). Output snowpack.json.
- Snow map depth now from the snowpack model (interpolated over height and the 3 nearest cells), less on south-facing and more on
  north-facing slopes (stronger in spring), less on steep walls; the satellite still decides where snow lies. Fallback: old fit.
- Weather rating: snow on the summit from the snowpack model at the summit height (+ satellite today).
- Settings window: clear dark text on light buttons (contrast).

## web-v0.22 — 2026-10-27
- Satellite snow cover: tools/snowsat_fetch.py + .github/workflows/snowsat.yml (daily) fetch Copernicus Sentinel-2 L2A through the
  Copernicus Data Space Sentinel Hub API (free account, OAuth client in GitHub secrets CDSE_CLIENT_ID / CDSE_CLIENT_SECRET).
  Per 40 m pixel the newest cloud-free look of the last 10 days says snow / no snow (scene classification or NDSI) -> snowsat.png + .json.
  First run 27 Oct: 82 % of the Alps seen cloud-free, 4.8 % snow (high Julian Alps, Karavanke ridge, Kamnik Alps).
- Snow map: where snow lies now comes from the satellite (seen bare = no snow, seen snow = at least 8 cm), depth from the model;
  under cloud the model alone. Hover / tap shows "🛰 satelit: sneg (1 d)". Info line shows the satellite date and % cloud-free.
- Weather rating: today's "snow on the summit" uses the satellite (200 m around the summit) when it has a clear look.
- Service worker always revalidates snowsat.png / snowsat.json.

## web-v0.21 — 2026-10-27
- Peak difficulty (data/peak_tech.json, tools/peak_tech.py): class of the easiest route found from a parking, as PZS marks paths -
  1 lahka (T1–T2), 2 zahtevna (T3), 3 zelo zahtevna (T4–T6 or ferrata only). 98 main peaks: 22 / 38 / 38; off-trail peaks = 2.
  Hand fixes: data/tech_overrides.json.
- Weather rating scales with difficulty (zahtevna / zelo zahtevna): snow ×1.6 / ×2.5, wind and rain ×1.3 / ×1.6, cold ×1.2 / ×1.4,
  cloud ×1.2; storms stay "always bad". A selected route uses its own class. Popup shows "Zahtevnost: … (T4, najlažja pot)".
- ⚙ Nastavitve (PC: next to SL/EN and where "Napredno" was; phone: 4th tab): My profile - winter experience (snow ×1.5 / ×1 / ×0.5),
  fitness (walking times ×1.25 / ×1 / ×0.8), hardest comfortable T-grade and ferratas yes/no (routes and peaks above it get
  "⚠ nad tvojo mejo"). Defaults are neutral. All former "Napredno" options moved into the same window.

## web-v0.20 — 2026-10-27
- Automatic updates: the page checks for a new version on start, every 20 min and when the app comes back to the foreground;
  the new version takes over and the page reloads itself (at once while you are just looking at the map; during 360, drawing or
  an open window it waits until you finish or switch apps), then shows "Stran je posodobljena". The page, trail pack, snow.json and
  weather.json are always revalidated with GitHub (no 10-minute browser cache). Visitors on v0.19 or older see the old
  "nova različica" notice one last time.

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
