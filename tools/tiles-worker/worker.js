// dvatisocaki-tiles: plain z/x/y map tiles out of one PMTiles file in Cloudflare R2 (binding TILES).
//   GET /<name>/<z>/<x>/<y>.webp  ->  tile from <name>.pmtiles   (404 = no picture there, the site then uses Esri)
// Self-contained (no npm): paste into the Cloudflare dashboard or deploy with wrangler. Tiles are cached at the edge (Cache API)
// and in browsers for 30 days; a new version of the file gets a new name (dof050b.pmtiles …), so nothing stale is ever served.
const TTL = 30 * 86400, MISS_TTL = 86400;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Max-Age': '86400' };
const HEAD = new Map(), DIRS = new Map(), DMAX = 96;           // per isolate: header + root directory, recent leaf directories

async function range(env, key, offset, length){
  const o = await env.TILES.get(key, { range: { offset, length } });
  if (!o) throw new Error('no ' + key);
  return new Uint8Array(await o.arrayBuffer()); }
async function inflate(b, c){ if (c === 1) return b; if (c !== 2) throw new Error('compression ' + c);
  return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
const u64 = (v, o) => v.getUint32(o, true) + v.getUint32(o + 4, true) * 4294967296;
function readDir(b){ let p = 0; const vi = () => { let r = 0, m = 1, c; do { c = b[p++]; r += (c & 127) * m; m *= 128; } while (c & 128); return r; };
  const n = vi(), E = new Array(n); let id = 0;
  for (let i = 0; i < n; i++){ id += vi(); E[i] = { id, run: 0, len: 0, off: 0 }; }
  for (let i = 0; i < n; i++) E[i].run = vi();
  for (let i = 0; i < n; i++) E[i].len = vi();
  for (let i = 0; i < n; i++){ const v = vi(); E[i].off = v === 0 && i > 0 ? E[i - 1].off + E[i - 1].len : v - 1; }
  return E; }
function find(E, id){ let lo = 0, hi = E.length - 1;
  while (lo <= hi){ const m = (lo + hi) >> 1; if (E[m].id < id) lo = m + 1; else if (E[m].id > id) hi = m - 1; else return E[m]; }
  const e = E[hi]; if (!e) return null; if (e.run === 0) return e; return id - e.id < e.run ? e : null; }
function tileId(z, x, y){ let acc = (4 ** z - 1) / 3, d = 0;               // PMTiles v3: Hilbert curve order per zoom
  for (let s = 2 ** (z - 1); s >= 1; s /= 2){ const rx = (x & s) ? 1 : 0, ry = (y & s) ? 1 : 0; d += s * s * ((3 * rx) ^ ry);
    if (ry === 0){ if (rx === 1){ x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; } }
  return acc + d; }
async function header(env, key){ let h = HEAD.get(key); if (h) return h;
  const b = await range(env, key, 0, 16384), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (String.fromCharCode(...b.subarray(0, 7)) !== 'PMTiles' || b[7] !== 3) throw new Error('not PMTiles v3');
  h = { rootOff: u64(v, 8), rootLen: u64(v, 16), leafOff: u64(v, 40), dataOff: u64(v, 56), comp: b[97], tcomp: b[98], type: b[99], minz: b[100], maxz: b[101] };
  h.root = readDir(await inflate(b.subarray(h.rootOff, h.rootOff + h.rootLen), h.comp)); HEAD.set(key, h); return h; }
async function leaf(env, key, h, off, len){ const k = key + ':' + off; let d = DIRS.get(k);
  if (!d){ d = readDir(await inflate(await range(env, key, h.leafOff + off, len), h.comp)); DIRS.set(k, d); if (DIRS.size > DMAX) DIRS.delete(DIRS.keys().next().value); }
  return d; }
async function tile(env, key, z, x, y){ const h = await header(env, key); if (z < h.minz || z > h.maxz) return null;
  const id = tileId(z, x, y); let E = h.root;
  for (let depth = 0; depth < 4; depth++){ const e = find(E, id); if (!e) return null;
    if (e.run > 0) return range(env, key, h.dataOff + e.off, e.len);
    E = await leaf(env, key, h, e.off, e.len); }
  return null; }

export default {
  async fetch(req, env, ctx){
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('', { status: 405, headers: CORS });
    const u = new URL(req.url), m = u.pathname.match(/^\/([\w-]+)\/(\d+)\/(\d+)\/(\d+)\.(webp|png|jpg)$/);
    if (!m) return new Response('dvatisocaki tiles: /<name>/<z>/<x>/<y>.webp', { status: 404, headers: CORS });
    const cache = caches.default, ck = new Request(u.origin + u.pathname), hit = await cache.match(ck); if (hit) return hit;
    const [, name, z, x, y] = m; let res;
    try{ const b = await tile(env, name + '.pmtiles', +z, +x, +y);
      res = b ? new Response(b, { headers: { ...CORS, 'Content-Type': 'image/' + (m[5] === 'jpg' ? 'jpeg' : m[5]), 'Cache-Control': `public, max-age=${TTL}` } })
              : new Response('', { status: 404, headers: { ...CORS, 'Cache-Control': `public, max-age=${MISS_TTL}` } }); }
    catch(e){ return new Response(String(e && e.message || e), { status: 500, headers: CORS }); }   // not cached: R2 hiccup / wrong name
    ctx.waitUntil(cache.put(ck, res.clone())); return res; }
};
