#!/usr/bin/env python3
"""Off-trail difficulty per peak: how hard is the ground between the nearest mapped path and the summit?

Peaks without a mapped path to the top used to get a flat "zahtevna, T?" class; routes that end a few hundred metres
below the summit were graded by the path part only (often T2), so pathless summits looked easier than they are.

For every peak whose summit is more than MIN_GAP m from the nearest mapped way (dvat-osm.json.gz: paths, tracks,
ferratas, roads): Mapterhorn terrain z14 (~3.3 m; Slovenia = ARSO/GURS LiDAR, CC BY 4.0), resampled to ~6.6 m,
lightly smoothed. The cheapest line from the summit to any path cell, cost per cell = 1 + (tan slope / 0.7)^4
(steep ground is avoided like a person would). Along that line the crux = steepest 25 m stretch (mean slope).
Grade from the crux angle (calibration below; hand fixes go to data/tech_overrides.json, they win):
  < 20° T2 (easy pathless)  · < 28° T3 · < 36° T4 (steep grass / easy rock) · < 44° T5 (scrambling) · ≥ 44° T6
Output data/offtrail.json: {peak_id: {"s": T 2..6, "deg": crux °, "g": pathless metres, "d": straight distance to the path}}
tools/build.py folds it into each peak's difficulty (p.ot, p.tech). Run by the "Off-trail grades" Action (manual).

  python tools/offtrail_grade.py [--only id1,id2] [--fake]
"""
import argparse, gzip, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.graph import MCP_Geometric

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS, Z, URL = 512, 14, 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
MIN_GAP, HALF = 30, 1800          # m: summit this far from a path counts as off-trail; window half size around the summit
STEP = 2                          # z14 px per grid cell (~6.6 m)
BANDS = [(20, 2), (28, 3), (36, 4), (44, 5)]   # crux angle limit -> T

def mx(lon): return (lon + 180.0) / 360.0 * (2 ** Z) * TS
def my(lat):
    s = math.sin(math.radians(lat)); return (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * (2 ** Z) * TS
def ilat(py):
    n = math.pi - 2 * math.pi * py / ((2 ** Z) * TS); return math.degrees(math.atan(math.sinh(n)))
def ilon(px): return px / ((2 ** Z) * TS) * 360.0 - 180.0

CACHE = {}
def tile(x, y, fake):
    if (x, y) in CACHE: return CACHE[(x, y)]
    if fake:
        xs = (np.arange(TS) + x * TS) / 300.0; ys = (np.arange(TS) + y * TS) / 300.0; X, Y = np.meshgrid(xs, ys)
        h = 1500 + 400 * np.sin(X) * np.cos(Y * 1.3) + 120 * np.sin(X * 4.1 + Y * 2.7)
    else:
        h = None
        for a in range(4):
            try:
                rq = urllib.request.Request(URL.format(z=Z, x=x, y=y), headers={'User-Agent': 'Dvatisocaki-offtrail/1.0 (github.com/taskrti76/Slovenija2k-Challenge)'})
                with urllib.request.urlopen(rq, timeout=30) as r: rgb = np.asarray(Image.open(io.BytesIO(r.read())).convert('RGB')).astype(np.float32)
                h = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768; break
            except urllib.error.HTTPError as e:
                if e.code == 404: break
                time.sleep(2 * (a + 1))
            except Exception: time.sleep(2 * (a + 1))
    CACHE[(x, y)] = h; return h

def ways():
    pk = json.load(gzip.open(os.path.join(R, 'dvat-osm.json.gz'))); W = pk['w']; out = []; o = x = y = 0
    for i, n in enumerate(W['len']):
        g = []
        for _ in range(n): x += W['xy'][o]; y += W['xy'][o + 1]; o += 2; g.append((y / 1e6, x / 1e6))
        if g: a = np.array(g); out.append((a, a[:, 0].min(), a[:, 0].max(), a[:, 1].min(), a[:, 1].max()))
    return out

def grade(p, W, fake):
    lat0, lon0 = p['lat'], p['lon']; cx, cy = mx(lon0), my(lat0); mpp = 40075016.7 * math.cos(math.radians(lat0)) / ((2 ** Z) * TS)
    r = HALF / mpp; x0, y0 = int(cx - r), int(cy - r); n = int(2 * r)
    tx0, ty0, tx1, ty1 = x0 // TS, y0 // TS, (x0 + n) // TS, (y0 + n) // TS
    big = np.full(((ty1 - ty0 + 1) * TS, (tx1 - tx0 + 1) * TS), np.nan, np.float32)
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            t = tile(tx, ty, fake)
            if t is not None: big[(ty - ty0) * TS:(ty - ty0 + 1) * TS, (tx - tx0) * TS:(tx - tx0 + 1) * TS] = t
    h = big[y0 - ty0 * TS:y0 - ty0 * TS + n, x0 - tx0 * TS:x0 - tx0 * TS + n]
    if np.isnan(h).mean() > .2: return None
    h = np.nan_to_num(h, nan=float(np.nanmean(h)))
    h = h[:h.shape[0] // STEP * STEP, :h.shape[1] // STEP * STEP].reshape(h.shape[0] // STEP, STEP, -1, STEP).mean((1, 3))
    h = ndimage.gaussian_filter(h, 0.8); cell = mpp * STEP
    gy, gx = np.gradient(h, cell); sl = np.degrees(np.arctan(np.hypot(gx, gy)))
    # path cells: every mapped way, sampled every ~cell/2
    tgt = np.zeros(h.shape, bool); H, Wd = h.shape
    bl, bt, bw, be = ilat(y0 + n), ilat(y0), ilon(x0), ilon(x0 + n)
    for g, a0, a1_, o0, o1_ in W:
        if a1_ < bl or a0 > bt or o1_ < bw or o0 > be: continue
        g = g.tolist()
        for (a1, o1), (a2, o2) in zip(g, g[1:] or g):
            k = max(1, int(math.hypot((mx(o2) - mx(o1)), (my(a2) - my(a1))) / STEP * 2))
            for t in np.linspace(0, 1, k + 1):
                c = int((mx(o1 + (o2 - o1) * t) - x0) / STEP); rr = int((my(a1 + (a2 - a1) * t) - y0) / STEP)
                if 0 <= rr < H and 0 <= c < Wd: tgt[rr, c] = True
    sr, sc = int((cy - y0) / STEP), int((cx - x0) / STEP)
    if not tgt.any(): return {'none': 1}
    ys, xs = np.nonzero(tgt); d0 = float(np.min(np.hypot(ys - sr, xs - sc)) * cell)
    if d0 < MIN_GAP: return {'d': round(d0)}
    cost = 1 + (np.tan(np.radians(sl)) / 0.7) ** 4
    m = MCP_Geometric(cost); acc, _ = m.find_costs([(sr, sc)], ends=list(zip(ys, xs)), find_all_ends=False)
    acc = np.where(tgt, acc, np.inf); e = np.unravel_index(np.argmin(acc), acc.shape)
    path = np.array(m.traceback(e)); seg = np.hypot(*np.diff(path, axis=0).T) * cell; L = float(seg.sum())
    s = sl[path[:, 0], path[:, 1]]; win = max(1, int(round(25 / cell)))
    crux = float(np.max(np.convolve(s, np.ones(win) / win, mode='valid'))) if len(s) >= win else float(s.max())
    T = next((t for lim, t in BANDS if crux < lim), 6)
    return {'s': T, 'deg': round(crux), 'g': round(L), 'd': round(d0)}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--fake', action='store_true'); a = ap.parse_args()
    P = json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8'))
    x = os.path.join(R, 'src', 'peaks_extra.json'); P += json.load(open(x, encoding='utf8')) if os.path.exists(x) else []
    P = [p for p in P if p.get('lat') is not None and (not a.only or p['id'] in a.only.split(','))]
    W = ways(); out = {}; hist = {}
    V = np.concatenate([w[0] for w in W]); keep = []
    for p in P:   # cheap pre-filter on way vertices (ways are densely noded, real distance is smaller or equal)
        k = math.cos(math.radians(p['lat'])); d = np.sqrt(((V[:, 0] - p['lat']) * 111195) ** 2 + ((V[:, 1] - p['lon']) * 111195 * k) ** 2).min()
        if d > MIN_GAP: keep.append(p)
    print(len(P), 'peaks,', len(keep), 'further than', MIN_GAP, 'm from a way vertex', flush=True); P = keep
    # prefetch tiles in parallel (one window per peak)
    jobs = set()
    for p in P:
        cx, cy = mx(p['lon']), my(p['lat']); r = HALF / (40075016.7 * math.cos(math.radians(p['lat'])) / ((2 ** Z) * TS))
        for ty in range(int((cy - r) // TS), int((cy + r) // TS) + 1):
            for tx in range(int((cx - r) // TS), int((cx + r) // TS) + 1): jobs.add((tx, ty))
    print(len(P), 'peaks,', len(jobs), 'tiles', flush=True)
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda j: tile(*j, a.fake), sorted(jobs)))
    for i, p in enumerate(P):
        try: r = grade(p, W, a.fake)
        except Exception as e: print('!', p['id'], e, flush=True); continue
        if r and 's' in r:
            out[p['id']] = r; hist[r['s']] = hist.get(r['s'], 0) + 1
            print(f"{p['id']:34s} T{r['s']}  crux {r['deg']:2d}°  pathless {r['g']:4d} m  (path {r['d']} m away)", flush=True)
    json.dump(out, open(os.path.join(R, 'data', 'offtrail.json'), 'w', encoding='utf8'), separators=(',', ':'), sort_keys=True, ensure_ascii=False)
    print(len(out), 'off-trail summits; T histogram', dict(sorted(hist.items())))

if __name__ == '__main__': main()
