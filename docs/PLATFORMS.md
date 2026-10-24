# Platforms: web vs app

One codebase in `src/`, several outputs. Keep platform differences **here** so web and app don't silently drift.

## Targets

| Target | Output | Status | Data loading |
|---|---|---|---|
| Web (GitHub Pages) | `index.html` + `dvat-osm.json.gz` + `snow.json` | live (web-v0.1) | fetch next to page |
| Offline single file | `dist/dvatisocaki-single.html` (`build.py --single`) | works | everything embedded |
| Installable web app (PWA) | `manifest.webmanifest` + `sw.js` (built) | live (web-v0.13) | service worker cache; offline terrain areas on request |
| Android APK | planned — Capacitor, built by GitHub Actions, attached to Releases | not started | bundled pack + cached tiles |

## Build switches (tools/build.py)
- `__PACKSRC__`: web → `data-src="dvat-osm.json.gz"`; single/app → pack embedded.
- Add new switches here when the app needs them (e.g. `__PLATFORM__`).

## Known differences / decisions
| Topic | Web | App (plan) |
|---|---|---|
| Snow data | `snow.json` daily from Action; live Open-Meteo fallback | same `snow.json` URL from Pages (absolute URL) |
| Terrain/satellite tiles | online | offline tile cache per region (size budget TBD) |
| Visited peaks / my routes | `localStorage` (per browser) | same, later sync with accounts |
| GPS | browser geolocation | native GPS, background tracking for check-in |
| Summit check-in | — | offline GPS log + QR sticker, verify when back online |
| Accounts / leaderboard | — | needs backend (not GitHub Pages) |

## Open items
- [x] PWA manifest + service worker (installable, offline pack + last snow.json + offline terrain areas).
- [ ] Choose backend for accounts/leaderboard (Supabase / Firebase / own).
- [ ] Copernicus 20 m snow cover (needs CDSE account) as optional layer.
- [ ] Check tile-provider terms if traffic grows (Esri, OpenTopoMap).
