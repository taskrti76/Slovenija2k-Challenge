# Slovenski dvatisočaki 3D

3D map of all 364 Slovenian peaks over 2000 m (Julijske Alpe, Kamniško-Savinjske Alpe, Karavanke) with subpeaks:
visited-peak checklist, all OSM trails and roads, routes per peak with SAC T-scale and walking time, GPX export,
route planner and drawing editor, 360° summit view, webcams, weather, avalanche bulletin, daily snow map
(snowpack model + ARSO stations + Sentinel-2), accounts with friends / leaderboard / badges, offline areas.

Live: https://taskrti76.github.io/Slovenija2k-Challenge/ · Android app: `app/` (Capacitor, built by an Action).

## Layout

| Path | What |
|---|---|
| `index.html`, `sw.js`, `manifest.webmanifest` | **Built** — do not edit by hand; edit `src/` and run `tools/build.py`. |
| `dvat-osm.json.gz` | OSM pack: trails, roads, huts, bivouacs, parkings, springs, ferratas. Loaded after the map appears. |
| `snow.json`, `snowpack.json`, `snowsat.json`, `weather.json`, `avalanche.json`, `falls.json`, `data/webcams.json` | Data written by the Actions below (only on GitHub). Missing/stale → the page falls back or hides the layer. |
| `src/dvatisocaki_template.html` | Page shell, styles, map style, peaks UI, snow module (worker tiles, model sliders for admin). |
| `src/trails.js` | Trails/POIs, routing graph (lazy), routes per peak (focus mode), planner, drawing, GPX, webcams. |
| `src/design.js` | Look "v2": search bar, phone peak sheet, window placement (`dodge`) around bars/dock/keyboard. |
| `src/markacija.js` | Look "Markacija" (default): dock, blaze button, light/dark theme (dark twin CSS generated at runtime). |
| `src/account.js` | Supabase login, visits, friends, leaderboard, badges, admin (peak/POI fixes, `?nofix=1` to ignore them). |
| `src/extras.js` | Guide (per-look texts, locks to the shown feature) and small extras. |
| `src/settings.js`, `src/weather.js`, `src/v360.js`, `src/pack.js` | Settings window, weather, 360° view, OSM pack codec. |
| `src/sw_template.js` | Service worker template (offline cache; keeps old entries on update). |
| `src/peaks_final.json`, `src/peaks_extra.json` | Peaks (coords from DEM height+prominence match, LiDAR-snapped). |
| `app/` | Android app: loads the live site; `www/offline.html` starts the saved copy or the built-in copy without signal. |
| `supabase/` | Database schema / policies. |
| `badges/`, `tools/badges/` | Badge art and social backgrounds (`backdrops.py`, `emblem.py`). |
| `data/` | Peak lists (CSV/TSV) and fetched data. |
| `docs/PLATFORMS.md` | Web vs app: what differs, decisions, open items. |
| `CHANGELOG.md` | Versions (`web-vX.YY` tags). |

### Tools

| Tool | What |
|---|---|
| `tools/build.py` | `python tools/build.py` → `index.html` + `sw.js`; `--single` → `dist/dvatisocaki-single.html` (everything embedded). |
| `tools/app_bundle.py` | Built-in site copy for the APK (single file + MapLibre, gzipped into `app/www/offline.html`). Run by `android.yml`. |
| `tools/dvat_fetch.py`, `slim_pack.js`, `prune_pack.js` | Fresh OSM pack from Overpass (resumable), slimming for phones. |
| `tools/snow_fetch.py`, `snowpack.py`, `snowsat_fetch.py` | Snow: ICON-D2 depth, snowpack model with ARSO correction, Sentinel-2 snow cover (CDSE). |
| `tools/weather_fetch.py`, `avalanche_fetch.py`, `webcams_fetch.mjs`, `falls_fetch.py` | Weather, avalanche bulletin, Windy webcams, other data. |
| `tools/pano_render.py`, `peak_tech.py`, `badge_photos.py`, `make_1500.py` | 360° panoramas, peak technical data, badge photos, 1500 m list (`vrhovi-1500.html`). |

## Workflows (`.github/workflows`)

`snow.yml`, `snowpack.yml`, `snowsat.yml` (snow) · `weather.yml` · `avalanche.yml` · `webcams.yml` · `osm_pack.yml`, `osm_extras.yml` (OSM) ·
`badge_photos.yml` · `supabase_backup.yml`, `supabase_ping.yml` · `android.yml` (APK on changes in `app/**`) · `pano_test.yml`.
Secrets (`CDSE_*`, `SUPABASE_*`, `BACKUP_PASSPHRASE`, `R2_*`, …) live only in GitHub → Settings → Secrets.

## Update workflow

```bash
# code change
edit src/... ; python tools/build.py ; git commit -am "..." ; git push   # or upload the changed files on github.com
# new OSM data (every few months)
python tools/dvat_fetch.py          # downloads missing areas into osm_boxes/, builds + slims dvat-osm.json.gz
git commit -am "data: OSM YYYY-MM-DD" ; git push
```

GitHub Pages: Settings → Pages → Source: *Deploy from a branch*, `main`, `/ (root)`.

## Admin

Admin role (Supabase `role = 'admin'`) unlocks: peak / POI corrections (🛠), and on the snow map a **❄ Sneg · admin** panel with live
sliders (snow line shift, depth ×, slope thresholds, aspect ×, satellite ×, min depth). Sliders are not saved — reload = defaults.

## Data & licences

- Terrain: [Mapterhorn](https://mapterhorn.com/attribution) — Slovenia from ARSO/GURS LiDAR (CC BY 4.0).
- Trails, huts, roads: © OpenStreetMap contributors (ODbL).
- Satellite: Esri World Imagery. Topo: OpenTopoMap (CC-BY-SA). Hiking overlay: Waymarked Trails.
- Snow: DWD ICON-D2 via Open-Meteo (CC BY 4.0) — model estimate; ARSO station measurements; contains modified Copernicus Sentinel-2 data (CDSE).
- Webcams: Windy.com. Avalanche bulletin: ARSO.
- Peak list: Peakbagger-based list of Slovenian 2000 m peaks.
