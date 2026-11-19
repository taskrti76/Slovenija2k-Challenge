#!/usr/bin/env python3
"""GURS DOF050 orthophoto sheets (GeoTIFF + .tfw, D96/TM, 0.5 m) -> web map tiles (WebP) -> one PMTiles file for R2.

Run on your own computer (Windows / Mac / Linux), Python 3.9+:
    pip install rasterio pillow numpy pmtiles
    python dof050_tiles.py --src "C:\\...\\GURS_DOF050" --out "C:\\...\\dof050_out"

Steps (each one can be run again: finished tiles are kept, so a stopped run continues where it was):
  1. base   - zoom 18 tiles (~0.41 m/px here, the native 0.5 m) cut straight from the sheets, in parallel
  2. levels - zoom 17 … 8 made from the tiles below (4 -> 1)
  3. pack   - all tiles into <out>/dof050.pmtiles (one file; upload it to R2 as it is)
Only one step: --step base | levels | pack. Quick test on a few sheets: --limit 4.

Outside Slovenia the GURS sheets are white (and black is "no data"): those pixels become transparent, so the map's other
satellite layer shows through there. Pure-white snow inside Slovenia is kept: only white connected to the sheet edge counts.
Credit (CC BY 4.0): "Geodetska uprava Republike Slovenije, DOF050, stanje 2023–2025".
"""
import argparse, math, os, sys, time, glob, io
from multiprocessing import Pool, cpu_count

import numpy as np
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
R = 6378137.0
ORIG = math.pi * R          # 20037508.34
CREDIT = 'Geodetska uprava Republike Slovenije, DOF050, stanje 2023–2025 (CC BY 4.0)'


# ---------- web mercator tiles ----------
def tile_bounds(z, x, y):
    s = 2 * ORIG / 2 ** z
    return (-ORIG + x * s, ORIG - (y + 1) * s, -ORIG + (x + 1) * s, ORIG - y * s)   # left, bottom, right, top (EPSG:3857)

def tiles_in(b, z):
    s = 2 * ORIG / 2 ** z
    x0, x1 = int((b[0] + ORIG) // s), int((b[2] + ORIG) // s)
    y0, y1 = int((ORIG - b[3]) // s), int((ORIG - b[1]) // s)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]

def merc_to_lonlat(mx, my):
    return math.degrees(mx / R), math.degrees(2 * math.atan(math.exp(my / R)) - math.pi / 2)


# ---------- sheets ----------
def sheet_list(src, limit=0):
    fs = sorted(glob.glob(os.path.join(src, '*.tif')) + glob.glob(os.path.join(src, '*.TIF')))
    fs = sorted(set(fs))
    return fs[:limit] if limit else fs

def sheet_bounds(f):
    """D96/TM bounds from the .tfw (top-left pixel centre, 0.5 m)."""
    import rasterio
    tfw = os.path.splitext(f)[0] + '.tfw'
    if os.path.exists(tfw):
        a = [float(v) for v in open(tfw).read().split()]
        with rasterio.open(f) as d: w, h = d.width, d.height
        x0, y0 = a[4] - a[0] / 2, a[5] - a[3] / 2
        return (x0, y0 + a[3] * h, x0 + a[0] * w, y0), (a[0], a[3])
    with rasterio.open(f) as d:
        b = d.bounds; return (b.left, b.bottom, b.right, b.top), (d.transform.a, d.transform.e)

def load_sheet(f):
    """RGBA uint8 array (4, h, w) + affine transform; alpha 0 where there is no image (white outside the border / black)."""
    import rasterio
    from affine import Affine
    with rasterio.open(f) as d: rgb = d.read([1, 2, 3])
    (l, b, r, t), (px, py) = sheet_bounds(f)
    tr = Affine(px, 0, l, 0, py, t)
    h, w = rgb.shape[1:]
    black = (rgb[0] == 0) & (rgb[1] == 0) & (rgb[2] == 0)
    white = (rgb[0] >= 254) & (rgb[1] >= 254) & (rgb[2] >= 254)
    alpha = np.full((h, w), 255, np.uint8); alpha[black] = 0
    if white.any():
        # white that touches the sheet edge = outside Slovenia; white snow inside stays. Found on 15 × 15 px blocks (fast):
        # mostly-white blocks connected to the edge (flood fill), one block wider; there every pure-white pixel is transparent
        B = 15; hb, wb = h // B, w // B
        blk = white[:hb * B, :wb * B].reshape(hb, B, wb, B).mean((1, 3)) > 0.5
        m = Image.fromarray(np.where(blk, 255, 0).astype(np.uint8), 'L').copy()   # copy: fromarray's buffer is read-only
        for sx, sy in [(x, 0) for x in range(wb)] + [(x, hb - 1) for x in range(wb)] + [(0, y) for y in range(hb)] + [(wb - 1, y) for y in range(hb)]:
            if m.getpixel((sx, sy)) == 255: ImageDraw.floodfill(m, (sx, sy), 128)
        reg = np.asarray(m) == 128
        if reg.any():
            reg = reg | np.roll(reg, 1, 0) | np.roll(reg, -1, 0) | np.roll(reg, 1, 1) | np.roll(reg, -1, 1)
            up = np.zeros((h, w), bool); up[:hb * B, :wb * B] = np.repeat(np.repeat(reg, B, 0), B, 1)
            if wb * B < w: up[:, wb * B:] = up[:, wb * B - 1:wb * B]
            if hb * B < h: up[hb * B:, :] = up[hb * B - 1:hb * B, :]
            alpha[white & up] = 0
    return np.concatenate([rgb, alpha[None]], 0), tr


# ---------- step 1: zoom 18 tiles ----------
G = {}
def _init(index, out, q, maxz):
    G.update(index=index, out=out, q=q, maxz=maxz, cache={}, order=[])

def _sheet(i):
    c = G['cache']
    if i in c: return c[i]
    if len(c) >= 4: c.pop(G['order'].pop(0))
    c[i] = load_sheet(G['index'][i][0]); G['order'].append(i); return c[i]

def encode(rgba, q):
    """WebP; fully transparent -> None, fully opaque -> RGB (smaller)."""
    a = rgba[..., 3]
    if a.max() == 0: return None
    im = Image.fromarray(rgba, 'RGBA') if a.min() < 255 else Image.fromarray(rgba[..., :3], 'RGB')
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=4); return b.getvalue()

def tile_path(out, z, x, y): return os.path.join(out, 'tiles', str(z), str(x), f'{y}.webp')

N = 17   # grid points per side: D96/TM -> web mercator is smooth, 17 × 17 exact points + bilinear in between is sub-pixel
_GI = np.linspace(0, 255, N)
def warp(arr, tr, l, t, res):
    """256 × 256 RGBA float tile (web mercator, top-left l, t, res m/px) sampled bilinearly from one sheet; None if outside."""
    from rasterio.warp import transform
    gx = l + (_GI + .5) * res; gy = t - (_GI + .5) * res
    X, Y = np.meshgrid(gx, gy); xs, ys = transform('EPSG:3857', 'EPSG:3794', X.ravel().tolist(), Y.ravel().tolist())
    C = ((np.array(xs) - tr.c) / tr.a - .5).reshape(N, N); Rr = ((np.array(ys) - tr.f) / tr.e - .5).reshape(N, N)
    h, w = arr.shape[1:]
    if C.max() < -1 or C.min() > w or Rr.max() < -1 or Rr.min() > h: return None
    k = np.arange(256)
    def up(G):   # 17 × 17 -> 256 × 256, bilinear
        G1 = np.array([np.interp(k, _GI, row) for row in G])            # 17 × 256
        return np.array([np.interp(k, _GI, col) for col in G1.T]).T     # 256 × 256
    cc, rr = up(C), up(Rr)
    ok = (cc >= -.5) & (rr >= -.5) & (cc <= w - .5) & (rr <= h - .5)   # up to the sheet's outer pixel edge: no hairline between sheets
    if not ok.any(): return None
    cc = np.clip(cc, 0, w - 1); rr = np.clip(rr, 0, h - 1)
    c0 = np.minimum(np.floor(cc).astype(np.int64), w - 2); r0 = np.minimum(np.floor(rr).astype(np.int64), h - 2)
    fc = (cc - c0)[None]; fr = (rr - r0)[None]
    p00 = arr[:, r0, c0].astype(np.float32); p01 = arr[:, r0, c0 + 1]; p10 = arr[:, r0 + 1, c0]; p11 = arr[:, r0 + 1, c0 + 1]
    out = (p00 * (1 - fc) + p01 * fc) * (1 - fr) + (p10 * (1 - fc) + p11 * fc) * fr
    out[3][~ok] = 0
    return out

def render(job):
    (x, y), sheets = job
    z = G['maxz']; p = tile_path(G['out'], z, x, y)
    if os.path.exists(p) or os.path.exists(p + '.empty'): return 0
    l, b, r, t = tile_bounds(z, x, y)
    acc = np.zeros((4, 256, 256), np.float32)
    for i in sheets:
        arr, tr = _sheet(i); dst = warp(arr, tr, l, t, (r - l) / 256)
        if dst is None: continue
        a = dst[3:4] / 255
        acc[:3] = dst[:3] * a + acc[:3] * (1 - a); acc[3:4] = 255 * a + acc[3:4] * (1 - a)   # this sheet over the ones before
    rgba = np.clip(acc + .5, 0, 255).astype(np.uint8).transpose(1, 2, 0)
    data = encode(rgba, G['q']); os.makedirs(os.path.dirname(p), exist_ok=True)
    if data is None: open(p + '.empty', 'w').close(); return 0
    with open(p, 'wb') as f: f.write(data)
    return 1

def step_base(a):
    from rasterio.warp import transform_bounds
    fs = sheet_list(a.src, a.limit)
    print(f'{len(fs)} sheets in {a.src}', flush=True)
    index, jobs = [], {}
    for i, f in enumerate(fs):
        bb, _ = sheet_bounds(f); mb = transform_bounds('EPSG:3794', 'EPSG:3857', *bb, densify_pts=21)
        index.append((f, mb))
        for t in tiles_in(mb, a.maxz): jobs.setdefault(t, []).append(i)
    # sheet by sheet (column-wise), so each worker keeps the few sheets it needs in memory
    todo = sorted(jobs.items(), key=lambda kv: (min(kv[1]), kv[0][0], kv[0][1]))
    print(f'zoom {a.maxz}: {len(todo)} tiles to make with {a.workers} workers', flush=True)
    t0 = time.time(); done = made = 0
    with Pool(a.workers, initializer=_init, initargs=(index, a.out, a.q, a.maxz)) as pool:
        for r in pool.imap(render, todo, chunksize=64):
            done += 1; made += r
            if done % 2000 == 0 or done == len(todo):
                el = time.time() - t0; eta = el / done * (len(todo) - done)
                print(f'  {done}/{len(todo)} ({100 * done / len(todo):.1f} %) · {made} new · {el / 60:.1f} min · ~{eta / 60:.0f} min left', flush=True)


# ---------- step 2: lower zooms ----------
def _parent(job):
    out, q, z, x, y = job; p = tile_path(out, z, x, y)
    if os.path.exists(p) or os.path.exists(p + '.empty'): return 0
    big = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); any_ = False
    for dx in (0, 1):
        for dy in (0, 1):
            c = tile_path(out, z + 1, 2 * x + dx, 2 * y + dy)
            if os.path.exists(c): big.paste(Image.open(c).convert('RGBA'), (256 * dx, 256 * dy)); any_ = True
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if not any_: open(p + '.empty', 'w').close(); return 0
    sm = big.convert('RGBa').resize((256, 256), Image.LANCZOS).convert('RGBA')   # premultiplied: no dark fringes at the border
    data = encode(np.asarray(sm), q)
    if data is None: open(p + '.empty', 'w').close(); return 0
    with open(p, 'wb') as f: f.write(data)
    return 1

def step_levels(a):
    for z in range(a.maxz - 1, a.minz - 1, -1):
        kids = glob.glob(os.path.join(a.out, 'tiles', str(z + 1), '*', '*.webp'))
        par = sorted({(int(os.path.basename(os.path.dirname(k))) // 2, int(os.path.basename(k)[:-5]) // 2) for k in kids})
        t0 = time.time()
        with Pool(a.workers) as pool: n = sum(pool.imap(_parent, [(a.out, a.q, z, x, y) for x, y in par], chunksize=64))
        print(f'zoom {z}: {len(par)} tiles ({n} new) · {time.time() - t0:.0f} s', flush=True)


# ---------- step 3: one PMTiles file ----------
def step_pack(a):
    from pmtiles.writer import Writer
    from pmtiles.tile import zxy_to_tileid, TileType, Compression
    tiles = []
    for p in glob.glob(os.path.join(a.out, 'tiles', '*', '*', '*.webp')):
        y = int(os.path.basename(p)[:-5]); x = int(os.path.basename(os.path.dirname(p))); z = int(os.path.basename(os.path.dirname(os.path.dirname(p))))
        if a.minz <= z <= a.maxz: tiles.append((zxy_to_tileid(z, x, y), z, x, y, p))
    tiles.sort()
    if not tiles: sys.exit('no tiles - run the base and levels steps first')
    zt = [t for t in tiles if t[1] == a.maxz]
    xs = [t[2] for t in zt]; ys = [t[3] for t in zt]
    w, s = merc_to_lonlat(*tile_bounds(a.maxz, min(xs), max(ys))[:2]); e, n = merc_to_lonlat(*tile_bounds(a.maxz, max(xs), min(ys))[2:])
    dst = os.path.join(a.out, 'dof050.pmtiles'); t0 = time.time(); size = 0
    with open(dst, 'wb') as f:
        wr = Writer(f)
        for k, (tid, z, x, y, p) in enumerate(tiles):
            d = open(p, 'rb').read(); size += len(d); wr.write_tile(tid, d)
            if (k + 1) % 50000 == 0: print(f'  {k + 1}/{len(tiles)}', flush=True)
        wr.finalize({'tile_type': TileType.WEBP, 'tile_compression': Compression.NONE, 'min_zoom': a.minz, 'max_zoom': a.maxz,
                     'min_lon_e7': int(w * 1e7), 'min_lat_e7': int(s * 1e7), 'max_lon_e7': int(e * 1e7), 'max_lat_e7': int(n * 1e7),
                     'center_zoom': 12, 'center_lon_e7': int((w + e) / 2 * 1e7), 'center_lat_e7': int((s + n) / 2 * 1e7)},
                    {'name': 'GURS DOF050 2023–2025', 'attribution': CREDIT, 'format': 'webp', 'type': 'baselayer'})
    print(f'{dst}: {len(tiles)} tiles, {size / 1e9:.2f} GB of images, {os.path.getsize(dst) / 1e9:.2f} GB file · {time.time() - t0:.0f} s')
    print(f'bounds {w:.4f},{s:.4f},{e:.4f},{n:.4f}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', required=True, help='folder with the .tif + .tfw sheets')
    ap.add_argument('--out', required=True, help='work / output folder (needs ~2× the final size free: tiles + the .pmtiles)')
    ap.add_argument('--step', choices=['all', 'base', 'levels', 'pack'], default='all')
    ap.add_argument('--maxz', type=int, default=18); ap.add_argument('--minz', type=int, default=8)
    ap.add_argument('--q', type=int, default=75, help='WebP quality (75 ≈ 10 KB per tile here)')
    ap.add_argument('--workers', type=int, default=max(1, min(8, cpu_count() - 1)), help='parallel processes (each ~0.5 GB RAM)')
    ap.add_argument('--limit', type=int, default=0, help='only the first N sheets (test)')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True); T = time.time()
    if a.step in ('all', 'base'): step_base(a)
    if a.step in ('all', 'levels'): step_levels(a)
    if a.step in ('all', 'pack'): step_pack(a)
    print(f'done in {(time.time() - T) / 60:.1f} min')
