// Weekly list of webcams for the map (Slovenia + ~20 km over the border) from the Windy Webcams API v3 -> data/webcams.json
// [[id, title, lat, lon, city], ...]. The pictures are not stored: the page asks Windy for a fresh one when a camera is tapped.
// Key: GitHub secret WINDY_KEY (the key is restricted to the site's domain, so the request says it comes from there).
import fs from 'node:fs';
const KEY = process.env.WINDY_KEY; if (!KEY){ console.error('WINDY_KEY missing'); process.exit(1); }
const N = 46.95, E = 16.75, S = 45.25, W = 13.15;                 // Slovenia + ~20 km
const H = {'X-WINDY-API-KEY': KEY, 'Referer': 'https://taskrti76.github.io/Slovenija2k-Challenge/', 'Origin': 'https://taskrti76.github.io'};
const out = new Map();
async function page(url){ for (let a = 0; a < 4; a++){ const r = await fetch(url, {headers: H}); if (r.ok) return r.json();
  console.warn(url, r.status, (await r.text()).slice(0, 200)); if (r.status === 401 || r.status === 403) process.exit(1); await new Promise(s => setTimeout(s, 3000 * (a + 1))); } throw new Error('failed ' + url); }
// split the box into tiles so no query needs an offset past the free tier's 1000
const T = 4; for (let i = 0; i < T; i++) for (let j = 0; j < T; j++){
  const n = S + (N - S) * (i + 1) / T, s = S + (N - S) * i / T, w = W + (E - W) * j / T, e = W + (E - W) * (j + 1) / T;
  for (let off = 0; off < 1000; off += 50){
    const j2 = await page(`https://api.windy.com/webcams/api/v3/webcams?bbox=${n.toFixed(4)},${e.toFixed(4)},${s.toFixed(4)},${w.toFixed(4)}&limit=50&offset=${off}&include=location`);
    const L = j2.webcams || []; for (const c of L){ const l = c.location || {}; if (c.status && c.status !== 'active') continue; if (l.latitude == null) continue;
      out.set(c.webcamId, [c.webcamId, String(c.title || '').slice(0, 80), +(+l.latitude).toFixed(5), +(+l.longitude).toFixed(5), l.city || '']); }
    if (L.length < 50) break; await new Promise(s => setTimeout(s, 400)); } }
const cams = [...out.values()].sort((a, b) => a[0] - b[0]);
if (cams.length < 20){ console.error('only', cams.length, 'cameras - keeping the old file'); process.exit(cams.length ? 0 : 1); }
fs.writeFileSync('data/webcams.json', JSON.stringify({t: new Date().toISOString(), src: 'Windy Webcams API', cams}));
console.log(cams.length, 'cameras');
