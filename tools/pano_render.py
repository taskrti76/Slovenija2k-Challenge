#!/usr/bin/env python3
"""360° panorama from a summit, rendered from elevation data (test: Triglav).

Terrain: Mapterhorn terrarium tiles (Slovenia = ARSO/GURS LiDAR, CC BY 4.0) in three rings of detail:
  0-7 km z14 (~3 m), 7-38 km z12 (~13 m), 38-250 km z9 (~105 m).
For every column (azimuth) the ray walks outward; a pixel row shows the first ground point whose elevation angle
(Earth curvature + refraction, k = 0.13) reaches that row. Colours: stylised by height / slope (rock, scree, meadow,
forest, valley) with sun shading, optional snow, haze with distance, peak labels from data/peaks.csv + osm_peaks_1500.json.

  python tools/pano_render.py --peak triglav-2864 --out test/pano [--width 12000]
"""
import argparse, csv, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R_EARTH, K_REFR, TS = 6371000.0, 0.13, 512
URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'

def mx(lon, z): return (np.asarray(lon) + 180.0) / 360.0 * (2 ** z) * TS
def my(lat, z):
    s = np.sin(np.radians(np.asarray(lat)))
    return (0.5 - np.log((1 + s) / (1 - s)) / (4 * math.pi)) * (2 ** z) * TS

def fake_tile(z, x, y):   # PANO_FAKE=1: procedural mountains, for testing without network
    xs = (np.arange(TS) + x * TS) / (2 ** z * TS); ys = (np.arange(TS) + y * TS) / (2 ** z * TS)
    X, Y = np.meshgrid(xs * 4000, ys * 4000)
    h = 1200 + 900 * np.sin(X * 0.9) * np.cos(Y * 1.1) + 500 * np.sin(X * 3.1 + Y * 2.3) + 250 * np.sin(X * 9.7) * np.sin(Y * 8.3)
    v = np.clip(h + 32768, 0, 65535.99)
    return np.stack([v // 256, v % 256, (v * 256) % 256], -1).astype(np.uint8)

def get_tile(z, x, y):
    if os.environ.get('PANO_FAKE'): rgb = fake_tile(z, x, y)
    else:
        for a in range(4):
            try:
                req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'Dvatisocaki-panorama/1.0 (github.com/taskrti76/Slovenija2k-Challenge)'})
                with urllib.request.urlopen(req, timeout=30) as r: rgb = np.asarray(Image.open(io.BytesIO(r.read())).convert('RGB'))
                break
            except urllib.error.HTTPError as e:
                if e.code == 404: return None
                time.sleep(2 * (a + 1))
            except Exception: time.sleep(2 * (a + 1))
        else: return None
    rgb = rgb.astype(np.float32)
    return rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768

class Mosaic:
    """Elevation grid of one zoom level around the summit (web mercator pixels), bilinear sampling."""
    def __init__(self, z, lat0, lon0, half_m):
        self.z = z; m_per_px = 40075016.7 * math.cos(math.radians(lat0)) / (2 ** z * TS); self.mpp = m_per_px
        cx, cy = float(mx(lon0, z)), float(my(lat0, z)); r = half_m / m_per_px
        self.tx0, self.ty0 = int((cx - r) // TS), int((cy - r) // TS); tx1, ty1 = int((cx + r) // TS), int((cy + r) // TS)
        nx, ny = tx1 - self.tx0 + 1, ty1 - self.ty0 + 1
        self.h = np.zeros((ny * TS, nx * TS), np.float32)
        jobs = [(x, y) for y in range(self.ty0, ty1 + 1) for x in range(self.tx0, tx1 + 1)]
        with ThreadPoolExecutor(12) as ex:
            for (x, y), t in zip(jobs, ex.map(lambda j: get_tile(z, *j), jobs)):
                if t is not None: self.h[(y - self.ty0) * TS:(y - self.ty0 + 1) * TS, (x - self.tx0) * TS:(x - self.tx0 + 1) * TS] = t
        print(f'z{z}: {len(jobs)} tiles, {m_per_px:.1f} m/px', flush=True)
    def sample(self, lat, lon):
        px = mx(lon, self.z) - self.tx0 * TS - 0.5; py = my(lat, self.z) - self.ty0 * TS - 0.5
        H, W = self.h.shape; px = np.clip(px, 0, W - 1.001); py = np.clip(py, 0, H - 1.001)
        x0 = px.astype(np.int32); y0 = py.astype(np.int32); fx = px - x0; fy = py - y0; g = self.h
        return ((g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy).astype(np.float32)

def dest(lat0, lon0, az, d):
    """Point at distance d (m) and azimuth az (rad) from (lat0, lon0) on a sphere."""
    p1, l1, dd = math.radians(lat0), math.radians(lon0), d / R_EARTH
    p2 = np.arcsin(math.sin(p1) * np.cos(dd) + math.cos(p1) * np.sin(dd) * np.cos(az))
    l2 = l1 + np.arctan2(np.sin(az) * np.sin(dd) * math.cos(p1), np.cos(dd) - math.sin(p1) * np.sin(p2))
    return np.degrees(p2), np.degrees(l2)

def hav(la1, lo1, la2, lo2):
    p1, p2 = np.radians(la1), np.radians(la2); dp = p2 - p1; dl = np.radians(lo2 - lo1)
    return 2 * R_EARTH * np.arcsin(np.sqrt(np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2))

def bearing(la1, lo1, la2, lo2):
    p1, p2, dl = np.radians(la1), np.radians(la2), np.radians(lo2 - lo1)
    return np.arctan2(np.sin(dl) * np.cos(p2), np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(dl)) % (2 * math.pi)

def drop(d): return d * d / (2 * R_EARTH) * (1 - K_REFR)   # curvature minus refraction

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--peak', default='triglav-2864'); ap.add_argument('--out', default='test/pano')
    ap.add_argument('--width', type=int, default=12000); ap.add_argument('--top', type=float, default=6.0); ap.add_argument('--bottom', type=float, default=-28.0)
    ap.add_argument('--maxkm', type=float, default=250.0)
    a = ap.parse_args()
    peaks = list(csv.DictReader(open('data/peaks.csv', encoding='utf-8')))
    P = next(p for p in peaks if p['id'] == a.peak); lat0, lon0 = float(P['lat']), float(P['lon'])
    W = a.width; res = 360.0 / W; HGT = int(round((a.top - a.bottom) / res))
    rings = [(14, 7000.0, 8500.0), (12, 38000.0, 41000.0), (9, a.maxkm * 1000, a.maxkm * 1000 + 6000)]
    t0 = time.time(); M = [Mosaic(z, lat0, lon0, half) for z, _, half in rings]; print(f'terrain loaded in {time.time() - t0:.0f} s', flush=True)
    h0 = float(M[0].sample(np.array([lat0]), np.array([lon0]))[0]); h0 = max(h0, float(P['elev_m'])) + 1.7   # eye on the summit
    # ray samples: 2 m steps near the summit, then 0.35 % of the distance
    d = [25.0]
    while d[-1] < a.maxkm * 1000: d.append(d[-1] + max(2.0, d[-1] * 0.0035))
    d = np.array(d, np.float32); n = len(d); ring_of = np.searchsorted([r[1] for r in rings], d); ring_of = np.minimum(ring_of, 2)
    alphas = np.radians(a.top - (np.arange(HGT) + 0.5) * res)          # row centres, top -> bottom
    HIT = np.full((HGT, W), -1, np.int32)
    t0 = time.time()
    for c0 in range(0, W, 600):
        cols = np.arange(c0, min(W, c0 + 600)); az = np.radians((cols + 0.5) * res)
        lat, lon = dest(lat0, lon0, az[:, None], d[None, :])
        h = np.empty(lat.shape, np.float32)
        for k in range(3):
            s = ring_of == k
            if s.any(): h[:, s] = M[k].sample(lat[:, s], lon[:, s])
        ang = np.arctan2(h - h0 - drop(d)[None, :], d[None, :])
        cm = np.maximum.accumulate(ang, axis=1)
        for j, cc in enumerate(cols):
            idx = np.searchsorted(cm[j], alphas, side='left'); idx[idx >= n] = -1; HIT[:, cc] = idx
    print(f'rays: {time.time() - t0:.0f} s ({n} samples per column)', flush=True)
    sky = HIT < 0; I = np.where(sky, 0, HIT); D = d[I]
    azp = np.radians((np.arange(W) + 0.5) * res)[None, :].repeat(HGT, 0)
    plat, plon = dest(lat0, lon0, azp, D)
    # terrain at the hit points: height and slope / normal (central differences at that ring's resolution)
    Hh = np.zeros(D.shape, np.float32); gx = np.zeros(D.shape, np.float32); gy = np.zeros(D.shape, np.float32)
    rk = np.minimum(np.searchsorted([r[1] for r in rings], D), 2)
    for k in range(3):
        s = (rk == k) & ~sky
        if not s.any(): continue
        la, lo = plat[s], plon[s]; st = M[k].mpp * 1.5; dla = st / 111320.0; dlo = st / (111320.0 * math.cos(math.radians(lat0)))
        Hh[s] = M[k].sample(la, lo)
        gx[s] = (M[k].sample(la, lo + dlo) - M[k].sample(la, lo - dlo)) / (2 * st)
        gy[s] = (M[k].sample(la + dla, lo) - M[k].sample(la - dla, lo)) / (2 * st)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    nrm = np.stack([-gx, -gy, np.ones_like(gx)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    rng = np.random.default_rng(7); noise = rng.normal(0, 1, D.shape).astype(np.float32)
    os.makedirs(a.out, exist_ok=True)
    for season, sun_az, sun_el in (('poletje', 115.0, 32.0), ('zima', 150.0, 22.0)):
        sv = np.array([math.sin(math.radians(sun_az)) * math.cos(math.radians(sun_el)), math.cos(math.radians(sun_az)) * math.cos(math.radians(sun_el)), math.sin(math.radians(sun_el))], np.float32)
        lam = np.clip((nrm * sv).sum(-1), 0, 1); light = 0.38 + 0.78 * lam
        hj = Hh + noise * 40   # ragged boundaries
        col = np.zeros(D.shape + (3,), np.float32)
        def put(mask, rgb): col[mask] = np.array(rgb, np.float32) / 255
        put(np.ones(D.shape, bool), (126, 150, 84))                                  # meadow
        put((hj < 1550) & (slope < 40), (58, 86, 44))                                 # forest
        put((hj < 1750) & (hj >= 1550) & (slope < 38), (78, 104, 52))                 # krummholz
        put((hj < 650) & (slope < 8), (138, 160, 92))                                 # valley fields
        put((hj > 2050) | (slope > 34), (164, 158, 146))                              # scree
        put((slope > 43) | ((hj > 2350) & (slope > 25)), (138, 134, 128))             # limestone walls
        if season == 'zima': put((hj > 1250) & (slope < 50) | ((hj > 1900) & (slope < 58)), (240, 243, 247))   # snow
        col *= light[..., None]
        col *= (1 + noise[..., None] * 0.035)
        # haze with distance (aerial perspective)
        f = 1 - np.exp(-D / 55000.0); haze = np.array([0.74, 0.81, 0.90], np.float32)
        col = col * (1 - f[..., None]) + haze * f[..., None]
        # sky: light at the horizon, deeper blue up
        rows = (a.top - (np.arange(HGT) + 0.5) * res)[:, None]
        t = np.clip((rows + 2) / (a.top + 2), 0, 1)
        skyc = np.array([0.80, 0.87, 0.95], np.float32) * (1 - t[..., None]) + np.array([0.36, 0.56, 0.82], np.float32) * t[..., None]
        skyc = np.broadcast_to(skyc, col.shape)
        col = np.where(sky[..., None], skyc, col)
        img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8))
        labels(img, a, lat0, lon0, h0, peaks, W, HGT, res, D, sky, P)
        p = os.path.join(a.out, f'{a.peak}_{season}.jpg'); img.save(p, quality=86, optimize=True, progressive=True)
        img.resize((W // 4, HGT // 4), Image.LANCZOS).save(os.path.join(a.out, f'{a.peak}_{season}_mali.jpg'), quality=85)
        print('saved', p, f'{os.path.getsize(p) / 1e6:.1f} MB', flush=True)

def labels(img, a, lat0, lon0, h0, peaks, W, HGT, res, D, sky, P):
    """Names of the peaks that are really visible (the ground at their spot is the peak itself), vertical text above the skyline."""
    dr = ImageDraw.Draw(img)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 19); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except Exception: font = small = ImageFont.load_default()
    cand = [(p['name'], float(p['elev_m']), float(p['lat']), float(p['lon']), 0 if p.get('is_sub') == 'no' else 1) for p in peaks if p['id'] != P['id'] and p['lat']]
    try:
        for o in json.load(open('data/osm_peaks_1500.json', encoding='utf-8')):
            if o.get('ele') and o.get('lat'): cand.append((o.get('name_sl') or o['name'], float(o['ele']), o['lat'], o['lon'], 2))
    except Exception: pass
    sky_row = np.where(sky.all(0), HGT, np.argmax(~sky, 0))   # first ground row per column
    out = []
    for nm, el, la, lo, tier in cand:
        dist = float(hav(lat0, lon0, la, lo))
        if dist < 300 or dist > a.maxkm * 1000: continue
        ang = math.degrees(math.atan2(el - h0 - drop(dist), dist)); c = int(float(bearing(lat0, lon0, la, lo)) / math.radians(res)) % W
        r = int((a.top - ang) / res)
        if r < 0 or r >= HGT - 2: continue
        win = D[r:r + 4, max(0, c - 1):c + 2]; sk = sky[r:r + 4, max(0, c - 1):c + 2]
        if (~sk).sum() == 0 or np.median(win[~sk]) < dist * 0.95 - 250: continue   # something nearer hides it
        if r > sky_row[c] + 40: continue                                            # far below the skyline: not a summit you'd name
        out.append((tier, -el, nm, el, c, r, dist))
    out.sort(); used = []
    for tier, _, nm, el, c, r, dist in out:
        if any(abs(c - u) < 24 for u in used): continue
        used.append(c); top = 8; base = max(top + 60, sky_row[c] - 12)
        txt = f'{nm.split(" (")[0]}  {int(round(el))}'
        tw = int(dr.textlength(txt, font=font)) + 8
        lab = Image.new('RGBA', (tw, 26), (0, 0, 0, 0)); ld = ImageDraw.Draw(lab)
        ld.text((4, 2), txt, font=font, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(30, 40, 50, 230))
        lab = lab.rotate(90, expand=True); y0 = max(top, min(base - 20, r - 30) - lab.height)
        img.paste(lab, (c - 13, y0), lab)
        dr.line([(c, y0 + lab.height + 2), (c, r - 3)], fill=(255, 255, 255), width=1)
    for deg, s in ((0, 'S'), (90, 'V'), (180, 'J'), (270, 'Z')):
        x = int(deg / res); dr.text((x + 4, HGT - 24), s, font=font, fill=(255, 255, 255), stroke_width=3, stroke_fill=(30, 40, 50))
    for deg in range(0, 360, 10):
        x = int(deg / res); dr.line([(x, HGT - 8), (x, HGT)], fill=(255, 255, 255), width=2)
    dr.text((10, 10), f'{P["name"]} {int(float(P["elev_m"]))} m · teren Mapterhorn (ARSO/GURS LiDAR, Copernicus) · izris: Slovenski 2000-čaki', font=small, fill=(255, 255, 255), stroke_width=2, stroke_fill=(30, 40, 50))

if __name__ == '__main__':
    main()
