// ---- core: DEM grid, prominence (union-find flood), fingerprint matching. Pure functions, testable in node.

// Mercator helpers for 512-px tiles
const TS = 512;
const gx = (lon, z) => (lon + 180) / 360 * Math.pow(2, z) * TS;
const gy = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z) * TS; };
const lonOf = (x, z) => x / (Math.pow(2, z) * TS) * 360 - 180;
const latOf = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (Math.pow(2, z) * TS)))) * 180 / Math.PI;

// Build Uint16 grid (decimetres) for bbox at zoom z. fetchTile(z,tx,ty) -> Float32Array(TS*TS) metres.
async function buildGrid(bbox, z, fetchTile, onProgress) {
  const [w, s, e, n] = bbox;
  const X0 = Math.floor(gx(w, z)), X1 = Math.ceil(gx(e, z)), Y0 = Math.floor(gy(n, z)), Y1 = Math.ceil(gy(s, z));
  const W = X1 - X0, H = Y1 - Y0, G = new Uint16Array(W * H);
  const jobs = [];
  for (let ty = Math.floor(Y0 / TS); ty <= Math.floor((Y1 - 1) / TS); ty++)
    for (let tx = Math.floor(X0 / TS); tx <= Math.floor((X1 - 1) / TS); tx++) jobs.push([tx, ty]);
  let done = 0; const q = [...jobs];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (q.length) {
      const [tx, ty] = q.shift(); const t = await fetchTile(z, tx, ty);
      for (let j = 0; j < TS; j++) {
        const y = ty * TS + j - Y0; if (y < 0 || y >= H) continue;
        for (let i = 0; i < TS; i++) {
          const x = tx * TS + i - X0; if (x < 0 || x >= W) continue;
          const v = Math.round(t[j * TS + i] * 10); G[y * W + x] = v < 0 ? 0 : v > 65535 ? 65535 : v;
        }
      }
      done++; onProgress && onProgress(done, jobs.length);
    }
  }));
  return { G, W, H, X0, Y0, z };
}

// Prominence of every summit >= peakMin (dm) with prom >= promMin (dm), flooding only pixels >= floorDm.
// Union-find where each component root IS its highest pixel. Returns [{idx,h,prom,lb}] in dm.
function prominence(grid, floorDm, peakMin, promMin) {
  const { G, W, H } = grid, N = W * H;
  let maxv = 0; for (let p = 0; p < N; p++) if (G[p] > maxv) maxv = G[p];
  const L = maxv - floorDm + 1; if (L <= 0) return [];
  const cnt = new Uint32Array(L);
  for (let p = 0; p < N; p++) { const v = G[p]; if (v >= floorDm) cnt[v - floorDm]++; }
  const off = new Uint32Array(L); let acc = 0;
  for (let v = L - 1; v >= 0; v--) { off[v] = acc; acc += cnt[v]; }
  const order = new Int32Array(acc);
  for (let p = 0; p < N; p++) { const v = G[p]; if (v >= floorDm) order[off[v - floorDm]++] = p; }
  const par = new Int32Array(N).fill(-1);
  const find = x => { let r = x; while (par[r] !== r) r = par[r]; while (par[x] !== r) { const nx = par[x]; par[x] = r; x = nx; } return r; };
  const out = [], roots = new Int32Array(8);
  for (let k = 0; k < acc; k++) {
    const p = order[k], x = p % W, y = (p - x) / W; let nr = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx; if (xx < 0 || xx >= W) continue;
        const q = yy * W + xx; if (par[q] === -1) continue;
        const r = find(q); let dup = false; for (let m = 0; m < nr; m++) if (roots[m] === r) { dup = true; break; }
        if (!dup) roots[nr++] = r;
      }
    }
    if (!nr) { par[p] = p; continue; }
    let best = roots[0]; for (let m = 1; m < nr; m++) if (G[roots[m]] > G[best]) best = roots[m];
    par[p] = best;
    for (let m = 0; m < nr; m++) {
      const r = roots[m]; if (r === best) continue;
      const pr = G[r] - G[p];
      if (G[r] >= peakMin && pr >= promMin) out.push({ idx: r, h: G[r], prom: pr, lb: false });
      par[r] = best;
    }
  }
  for (let k = 0; k < acc; k++) { const p = order[k]; if (par[p] === p && G[p] >= peakMin) out.push({ idx: p, h: G[p], prom: G[p] - floorDm, lb: true }); }
  return out;
}

function peaksToLatLon(grid, list) {
  return list.map(d => { const x = d.idx % grid.W, y = (d.idx - x) / grid.W;
    return { h: d.h / 10, prom: d.prom / 10, lb: d.lb, lat: latOf(grid.Y0 + y + .5, grid.z), lon: lonOf(grid.X0 + x + .5, grid.z) }; });
}

const distM = (a, b, c, d) => Math.hypot((a - c) * 111320, (b - d) * 111320 * Math.cos(a * Math.PI / 180));

// Cost of list peak P (elev, prom, optional seed) vs DEM peak D. DEM at ~13 m/px reads summits a bit low.
function fpCost(P, D) {
  const dh = D.h - P.elev; const sh = dh < 0 ? 7 : 3; if (dh < -30 || dh > 12) return Infinity;
  let dp = D.prom - P.prom; if (D.lb && P.prom >= D.prom - 10) dp = 0;
  const sp = Math.max(8, 0.12 * P.prom); if (Math.abs(dp) > 5 * sp) return Infinity;
  let c = (dh / sh) ** 2 + (dp / sp) ** 2;
  if (P.seed) { const d = distM(P.seed[0], P.seed[1], D.lat, D.lon); c += (d / 1200) ** 2; if (d > 5000) return Infinity; }
  return c;
}

// Global greedy assignment. Returns per list-peak {d, cost, margin} (margin = 2nd best cost - best cost).
function matchAll(list, dem) {
  const pairs = [], per = list.map(() => []);
  list.forEach((P, i) => { if (P.prom == null) return;
    dem.forEach((D, j) => { const c = fpCost(P, D); if (c < 40) { pairs.push([c, i, j]); per[i].push(c); } }); });
  pairs.sort((a, b) => a[0] - b[0]);
  const ui = new Set(), uj = new Set(), res = list.map(() => null);
  for (const [c, i, j] of pairs) { if (ui.has(i) || uj.has(j)) continue; ui.add(i); uj.add(j);
    const s = per[i].sort((a, b) => a - b); res[i] = { d: dem[j], cost: c, margin: (s[1] ?? 99) - c }; }
  return res;
}

if (typeof module !== 'undefined') module.exports = { TS, gx, gy, lonOf, latOf, buildGrid, prominence, peaksToLatLon, fpCost, matchAll, distM };
