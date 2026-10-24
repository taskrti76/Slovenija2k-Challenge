# Slovenski dvatisočaki 3D

3D map of all 364 Slovenian peaks over 2000 m (Julijske Alpe, Kamniško-Savinjske Alpe, Karavanke) with subpeaks:
visited-peak checklist, all OSM trails and roads, routes per peak with SAC T-scale and walking time, GPX export,
route drawing that follows trails/roads, 360° summit view, and a daily snow map (snow depth painted on terrain + contour lines).

Live: GitHub Pages (`https://<user>.github.io/<repo>/`).

## Layout

| Path | What |
|---|---|
| `index.html` | **Built** web page. Do not edit by hand — edit `src/` and rebuild. |
| `dvat-osm.json.gz` | OSM pack: trails, roads (20 km around peaks), huts, bivouacs, parkings, springs. Loaded after the map appears. |
| `snow.json` | Snow depth, refreshed daily by `.github/workflows/snow.yml`. If missing/stale the page asks Open-Meteo directly. |
| `src/dvatisocaki_template.html` | Page shell, styles, map style, peaks UI, snow module. |
| `src/trails.js` | Trails/POIs, routing graph (built lazily), routes per peak, drawing editor, GPX. |
| `src/pack.js` | Compact OSM pack encoder/decoder. |
| `src/v360.js` | 360° summit view. |
| `src/peaks_final.json` | 364 peaks (coords from DEM height+prominence match, LiDAR-snapped). |
| `data/` | Peak lists (CSV/TSV). |
| `tools/build.py` | Build: `python tools/build.py` → `index.html`; `--single` → `dist/dvatisocaki-single.html` (offline, everything embedded). |
| `tools/dvat_fetch.py` | Download fresh OSM pack from Overpass (resumable). |
| `tools/slim_pack.js` | Slim a pack for phones: `node --max-old-space-size=6000 tools/slim_pack.js in.gz dvat-osm.json.gz 3` |
| `tools/snow_fetch.py` | Build `snow.json` (used by the daily Action). |
| `docs/PLATFORMS.md` | Web vs app: what differs, decisions, open items. |
| `CHANGELOG.md` | Versions. |

## Update workflow

```bash
# code change
edit src/... ; python tools/build.py ; git commit -am "..." ; git push
# new OSM data (every few months)
python tools/dvat_fetch.py          # downloads missing areas into osm_boxes/, builds + slims dvat-osm.json.gz (pack v2 with PZS relations)
git commit -am "data: OSM YYYY-MM-DD" ; git push   # or upload dvat-osm.json.gz on github.com
```

GitHub Pages: Settings → Pages → Source: *Deploy from a branch*, `main`, `/ (root)`.
Snow: Actions tab → *Daily snow data* → *Run workflow* once to create `snow.json`; then it runs daily.

## Data & licences

- Terrain: [Mapterhorn](https://mapterhorn.com/attribution) — Slovenia from ARSO/GURS LiDAR (CC BY 4.0).
- Trails, huts, roads: © OpenStreetMap contributors (ODbL).
- Satellite: Esri World Imagery. Topo: OpenTopoMap (CC-BY-SA). Hiking overlay: Waymarked Trails.
- Snow: DWD ICON-D2 via Open-Meteo (CC BY 4.0) — model estimate, not measurement.
- Peak list: Peakbagger-based list of Slovenian 2000 m peaks.
