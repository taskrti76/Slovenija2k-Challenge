#!/usr/bin/env python3
"""Off-trail difficulty per peak: how hard is the ground between the nearest mapped path and the summit?

Peaks without a mapped path to the top used to get a flat "zahtevna, T?" class; routes that end a few hundred metres
below the summit were graded by the path part only (often T2), so pathless summits looked easier than they are.

For every peak whose summit is more than MIN_GAP m from the nearest mapped way (dvat-osm.json.gz: paths, tracks,
ferratas, roads): Mapterhorn terrain z14 (~3.3 m; Slovenia = ARSO/GURS LiDAR, CC BY 4.0), resampled to ~6.6 m,
slope averaged over ~20 m. Searched for the EASIEST possible line, from any side, to any mapped way within ~2.5 km:
the smallest angle a for which ground no steeper than a connects the summit with a path (minimax / bottleneck path,
binary search on a + flood fill). a = crux of the easiest line; its length = shortest way through that ground.
Ground type (ESA WorldCover 10 m) changes the felt angle before that: forest −8°, shrubs −3°, grass 0, bare rock / scree
+4°, snow / ice +6° — steep forest is less serious than steep alpine rock. "deg" is that effective angle, "lc" the ground at the crux.
Grade from the crux angle, CALIBRATED on the same run: the same crux measure is taken along every OSM path with a
sac_scale (T2…T6) in the peaks' windows; a straight line through the median crux per grade gives the limits halfway
between grades (stored in offtrail.json "_calib"). Old fixed guess (fallback): < 20° T2 · < 28° T3 · < 36° T4 · < 44° T5 · ≥ 44° T6.
Output data/offtrail.json: {peak_id: {"s": T 2..6, "deg": crux °, "g": pathless metres, "d": straight distance to the path,
"lc": ground at the crux, "l": the line summit -> path as [[lon, lat], …]} — the page routes to the path end of "l" and shows "l" as a
dotted "not a path" line.
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
MIN_GAP, HALF = 30, 2500          # m: summit this far from a path counts as off-trail; window half size around the summit
STEP = 2                          # z14 px per grid cell (~6.6 m)
BANDS = [(20, 2), (28, 3), (36, 4), (44, 5)]   # crux angle limit -> T

def mx(lon): return (lon + 180.0) / 360.0 * (2 ** Z) * TS
def my(lat):
    s = math.sin(math.radians(lat)); return (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * (2 ** Z) * TS
def ilat(py):
    n = math.pi - 2 * math.pi * py / ((2 ** Z) * TS); return math.degrees(math.atan(math.sinh(n)))
def ilon(px): return px / ((2 ** Z) * TS) * 360.0 - 180.0

# land cover: ESA WorldCover 2021 10 m (CC BY 4.0, © ESA WorldCover project / Copernicus Sentinel data), read by window over HTTP.
# 10 trees · 20 shrubs (incl. dwarf pine) · 30 grass · 40 crops · 50 built · 60 bare / sparse (rock, scree) · 70 snow / ice · 80 water · 100 moss
WC = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N{la:02d}E{lo:03d}_Map.tif'
# steepness felt on that ground: forest holds soil and gives hand holds (less serious), rock / snow / ice is more serious
LC_ADJ = {10: -8.0, 20: -3.0, 30: 0.0, 40: 0.0, 50: -5.0, 60: 4.0, 70: 6.0, 80: 0.0, 100: 0.0, 0: 0.0}
LC_NAME = {10: 'gozd', 20: 'grmovje', 30: 'trava', 60: 'skala', 70: 'sneg'}
def landcover(lat, lon, fake):
    """WorldCover classes for a (lat, lon) grid; 0 where unknown."""
    out = np.zeros(lat.shape, np.uint8)
    if fake:
        out[:] = 30; out[(np.sin(lon * 900) > .3)] = 10; out[(np.cos(lat * 700) > .6)] = 60; return out
    try: import rasterio; from rasterio.windows import from_bounds
    except Exception as e: print('no rasterio:', e); return out
    for la0 in range(int(lat.min() // 3 * 3), int(lat.max() // 3 * 3) + 1, 3):
        for lo0 in range(int(lon.min() // 3 * 3), int(lon.max() // 3 * 3) + 1, 3):
            m = (lat >= la0) & (lat < la0 + 3) & (lon >= lo0) & (lon < lo0 + 3)
            if not m.any(): continue
            try:
                with rasterio.open('/vsicurl/' + WC.format(la=la0, lo=lo0)) as ds:
                    w, e_, s_, n_ = lon[m].min(), lon[m].max(), lat[m].min(), lat[m].max()
                    win = from_bounds(w - .001, s_ - .001, e_ + .001, n_ + .001, ds.transform).round_offsets().round_lengths()
                    a = ds.read(1, window=win); T = ds.window_transform(win)
                    c = ((lon[m] - T.c) / T.a).astype(int); r = ((lat[m] - T.f) / T.e).astype(int)
                    ok = (r >= 0) & (r < a.shape[0]) & (c >= 0) & (c < a.shape[1]); v = np.zeros(r.shape, np.uint8); v[ok] = a[r[ok], c[ok]]; out[m] = v
            except Exception as e: print('worldcover', la0, lo0, e, flush=True)
    return out

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
    if h is None and not fake:   # no z14 tile (outside the LiDAR coverage / failed): z13 or z12 quarter, upsampled
        for dz in (1, 2):
            px, py, f = x >> dz, y >> dz, 1 << dz
            t = fetch(Z - dz, px, py)
            if t is not None:
                ox, oy = (x - px * f) * TS // f, (y - py * f) * TS // f
                h = np.kron(t[oy:oy + TS // f, ox:ox + TS // f], np.ones((f, f), np.float32)); FALLBACK[0] += 1; break
    CACHE[(x, y)] = h; return h

FALLBACK = [0]
CAL, CAL_SEEN = {}, set()   # OSM sac_scale -> crux angles of graded paths (calibration)
def fetch(z, x, y):
    for a in range(4):
        try:
            rq = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'Dvatisocaki-offtrail/1.0 (github.com/taskrti76/Slovenija2k-Challenge)'})
            with urllib.request.urlopen(rq, timeout=30) as r: rgb = np.asarray(Image.open(io.BytesIO(r.read())).convert('RGB')).astype(np.float32)
            return rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 * (a + 1))
        except Exception: time.sleep(2 * (a + 1))
    return None

def ways():
    pk = json.load(gzip.open(os.path.join(R, 'dvat-osm.json.gz'))); W = pk['w']; out = []; o = x = y = 0
    for i, n in enumerate(W['len']):
        g = []
        for _ in range(n): x += W['xy'][o]; y += W['xy'][o + 1]; o += 2; g.append((y / 1e6, x / 1e6))
        if g: a = np.array(g); out.append((a, a[:, 0].min(), a[:, 0].max(), a[:, 1].min(), a[:, 1].max(), int(W['s'][i] or 0), i))
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
    wcells = []   # graded ways (OSM sac_scale) in the window: their cells, for the calibration
    for g, a0, a1_, o0, o1_, sac, wi in W:
        if a1_ < bl or a0 > bt or o1_ < bw or o0 > be: continue
        g = g.tolist(); cells = []
        for (a1, o1), (a2, o2) in zip(g, g[1:] or g):
            k = max(1, int(math.hypot((mx(o2) - mx(o1)), (my(a2) - my(a1))) / STEP * 2))
            for t in np.linspace(0, 1, k + 1):
                c = int((mx(o1 + (o2 - o1) * t) - x0) / STEP); rr = int((my(a1 + (a2 - a1) * t) - y0) / STEP)
                if 0 <= rr < H and 0 <= c < Wd:
                    tgt[rr, c] = True
                    if sac >= 2 and (not cells or cells[-1] != (rr, c)): cells.append((rr, c))
        if sac >= 2 and len(cells) >= 8 and wi not in CAL_SEEN: CAL_SEEN.add(wi); wcells.append((sac, cells))
    sr, sc = int((cy - y0) / STEP), int((cx - x0) / STEP)
    # the listed coordinate can sit a few metres off the top (on a cliff face): start from the highest cell within ~35 m
    rr_ = max(1, int(35 / cell)); win = h[max(0, sr - rr_):sr + rr_ + 1, max(0, sc - rr_):sc + rr_ + 1]
    k = np.unravel_index(np.argmax(win), win.shape); sr, sc = max(0, sr - rr_) + k[0], max(0, sc - rr_) + k[1]
    # easiest possible line = the one whose steepest bit is the gentlest (bottleneck / minimax path), not the cheapest sum:
    # find the smallest angle a such that ground no steeper than a connects the summit with a mapped path.
    # Slope is averaged over 3 × 3 cells (~20 m) so one noisy LiDAR cell or a 2 m step does not decide the grade.
    # ground type per cell -> felt steepness ("effective angle")
    rows = np.array([ilat(y0 + (i + .5) * STEP) for i in range(h.shape[0])]); cols = np.array([ilon(x0 + (j + .5) * STEP) for j in range(h.shape[1])])
    LA, LO = np.meshgrid(rows, cols, indexing='ij'); lc = landcover(LA, LO, fake)
    adj = np.vectorize(lambda v: LC_ADJ.get(int(v), 0.0), otypes=[np.float32])(lc)
    sl = np.maximum(sl + adj, 0)
    s3 = ndimage.uniform_filter(sl, 3)
    # calibration: the same "crux" measure (steepest ~20 m, ground type counted) along paths whose OSM grade is known
    for sac, cells in wcells:
        v = s3[tuple(np.array(cells).T)]; CAL.setdefault(sac, []).append(float(v.max()))
    seed = np.zeros(h.shape, bool); seed[max(0, sr - 1):sr + 2, max(0, sc - 1):sc + 2] = True
    def joins(a):
        lab, _ = ndimage.label((s3 <= a) | seed, structure=np.ones((3, 3)))
        k = lab[sr, sc]; return k > 0 and bool((lab[tgt] == k).any())
    if not tgt.any(): return {'none': 1}
    ys, xs = np.nonzero(tgt); d0 = float(np.min(np.hypot(ys - sr, xs - sc)) * cell)
    if d0 < MIN_GAP: return {'d': round(d0)}
    lo, hi = 0.0, 80.0
    if not joins(hi): return {'none': 1, 'd': round(d0)}
    while hi - lo > 0.5:
        mid = (lo + hi) / 2
        if joins(mid): hi = mid
        else: lo = mid
    crux = hi
    # the line itself (for its length): shortest way through the allowed ground, gentler cells preferred
    ok = (s3 <= crux + 0.01) | seed
    cost = np.where(ok, 1 + (s3 / max(crux, 1)) ** 2, 1e6)
    m = MCP_Geometric(cost); acc, _ = m.find_costs([(sr, sc)], ends=list(zip(ys, xs)), find_all_ends=False)
    acc = np.where(tgt, acc, np.inf); e = np.unravel_index(np.argmin(acc), acc.shape)
    path = np.array(m.traceback(e)); L = float((np.hypot(*np.diff(path, axis=0).T) * cell).sum()) if len(path) > 1 else 0.0
    T = None   # set after all peaks, from the calibration (main)
    # ground at the crux of that line (most common class along the cells within 1° of the crux)
    pc = path[np.abs(s3[path[:, 0], path[:, 1]] - crux) <= 1.5] if len(path) else path
    vals = lc[pc[:, 0], pc[:, 1]] if len(pc) else lc[path[:, 0], path[:, 1]]
    lk = int(np.bincount(vals).argmax()) if len(vals) else 0
    # the line, summit -> path, simplified (~1 cell tolerance), as [lon, lat]
    from skimage.measure import approximate_polygon
    sp = approximate_polygon(path.astype(float), tolerance=1.0) if len(path) > 2 else path
    line = [[round(ilon(x0 + (c + .5) * STEP), 5), round(ilat(y0 + (r + .5) * STEP), 5)] for r, c in sp]
    return {'s': T, 'deg': round(crux), 'g': round(L), 'd': round(d0), 'lc': LC_NAME.get(lk, ''), 'l': line}

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
        if r and 'deg' in r:
            out[p['id']] = r
            print(f"{p['id']:34s} crux {r['deg']:2d}°  pathless {r['g']:4d} m  (path {r['d']} m away)", flush=True)
    # calibration: limits between grades = midpoints between the median crux of OSM T2…T6 paths in the same windows
    # (a path with cables / steps is easier than bare ground at the same angle, so pathless ground graded this way is, if anything, too easy).
    med = {g: float(np.median(v)) for g, v in CAL.items() if len(v) >= 15}
    print('calibration (OSM grade: paths, median crux °):', {g: (len(CAL[g]), round(med[g], 1)) for g in sorted(med)}, flush=True)
    if len(med) >= 2:   # straight line through the grade medians (fills grades with too few paths), limits halfway between grades
        gs = sorted(med); k, c = np.polyfit(gs, [med[g] for g in gs], 1, w=[min(len(CAL[g]), 200) ** .5 for g in gs])
        k = max(k, 2.0); bands = [(c + k * (g + .5), g) for g in (2, 3, 4, 5)]
    else: bands = BANDS   # no calibration possible: the old guess
    print('bands (crux below -> T):', bands, flush=True)
    for r in out.values(): r['s'] = next((t for lim, t in bands if r['deg'] < lim), 6); hist[r['s']] = hist.get(r['s'], 0) + 1
    out['_calib'] = {'bands': [[round(l, 1), g] for l, g in bands], 'median': {str(g): round(m, 1) for g, m in med.items()}, 'n': {str(g): len(v) for g, v in CAL.items()}}
    json.dump(out, open(os.path.join(R, 'data', 'offtrail.json'), 'w', encoding='utf8'), separators=(',', ':'), sort_keys=True, ensure_ascii=False)
    print(len(out) - 1, 'off-trail summits; T histogram', dict(sorted(hist.items())))
    print('z14 tiles missing, filled from z13/z12:', FALLBACK[0])

if __name__ == '__main__': main()
