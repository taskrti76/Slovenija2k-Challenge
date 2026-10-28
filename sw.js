// Service worker: makes the site installable and usable without signal.
// - app shell (page, data, icons, MapLibre) cached on install, refreshed in the background
// - map tiles cached as you view them (LRU-trimmed), terrain areas downloaded on request live in "dvat-region"
const VER = 'f2daefd14b';
const SHELL = 'dvat-shell-' + VER, TILES = 'dvat-tiles', REGION = 'dvat-region';
const SHELL_URLS = ['./', './index.html', './dvat-osm.json.gz', './manifest.webmanifest', './favicon.svg', './favicon.ico', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css',
  'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Bold/0-255.pbf', 'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Bold/256-511.pbf',
  'https://tiles.mapterhorn.com/tilejson.json'];
const MAX_TILES = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_URLS.map(u => c.add(new Request(u, {cache:'reload'})).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dvat-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isTile = u => /tiles\.mapterhorn\.com\/\d+\/|arcgisonline\.com\/.*\/tile\/|tile\.opentopomap\.org\/|tile\.waymarkedtrails\.org\/|tiles\.openfreemap\.org\/fonts\//.test(u);
let trimming = false;
async function trim(){ if (trimming) return; trimming = true;
  try{ const c = await caches.open(TILES), ks = await c.keys(); for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]); } finally { trimming = false; } }
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = r.url;
  if (/api\.open-meteo\.com|overpass/.test(u)) return;                       // live data: network only
  if (isTile(u)){                                                             // tiles: cache first (downloaded area, then viewed tiles)
    e.respondWith((async () => {
      const hit = await caches.match(r, {ignoreVary:true}); if (hit) return hit;
      try{ const res = await fetch(r); if (res.ok || res.type === 'opaque'){ const c = await caches.open(TILES); c.put(r, res.clone()); trim(); } return res; }
      catch(err){ return new Response('', {status:504}); }
    })()); return;
  }
  const same = new URL(u).origin === self.location.origin;
  if (same || /cdn\.jsdelivr\.net|tilejson\.json/.test(u)){                  // app files: cache, update in background (snow.json / weather.json: network first)
    e.respondWith((async () => {
      const c = await caches.open(SHELL), hit = await c.match(r, {ignoreSearch: /(snow|weather)\.json/.test(u) ? false : true});
      // page + data files: always ask GitHub whether they changed (cheap 304 if not) instead of trusting the browser's 10-min HTTP cache
      const fresh = /snow\.json|weather\.json|snowsat\.(json|png)|snowpack\.json|\.html$|\/$|dvat-osm\.json\.gz/.test(u) || r.mode === 'navigate';
      const net = (fresh ? fetch(r.url, {cache:'no-cache', credentials:'same-origin'}) : fetch(r)).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
      if (r.mode === 'navigate' || /snow\.json|weather\.json|snowsat\.(json|png)|snowpack\.json|\.html$|\/$/.test(u)){ const res = await net; return res || hit || new Response('', {status:504}); }
      return hit || (await net) || new Response('', {status:504});
    })());
  }
});
