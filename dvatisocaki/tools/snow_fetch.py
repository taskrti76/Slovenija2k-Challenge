"""Daily snow depth for the site (run by .github/workflows/snow.yml, or by hand).

Builds the same elevation-adaptive grid as the page (8 km cells, split to 4/2/1 km where terrain
exceeds 1000/1500/2000 m, only within 14 km of a peak), asks Open-Meteo (DWD ICON-D2) for hourly
snow depth (-7 .. +2 days), keeps the 12:00 value of each day and writes snow.json.
One run = a few hundred API "calls" once per day, instead of per visitor.
Needs: Python 3.9+, Pillow (with WebP).
"""
import io, json, math, os, sys, time, urllib.request, urllib.error, datetime
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, 'snow.json')
LA0, LA1, LO0, LO1, D0LA, D0LO, SPLIT = 46.05, 46.73, 13.24, 15.02, 0.072, 0.104, [1000, 1500, 2000]
UA = {'User-Agent': 'dvatisocaki-snow/1.0 (+https://github.com)'}


def get(url, tries=4):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(30)
            elif e.code < 500: raise
            else: time.sleep(5 * (a + 1))
        except Exception:
            time.sleep(5 * (a + 1))
    raise RuntimeError('failed: ' + url)


def dem_max_fn():
    Z, S = 10, 512; n = 2 ** Z
    tx = lambda lo: (lo + 180) / 360 * n * S
    ty = lambda la: (1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n * S
    T = {}
    for y in range(int(ty(LA1) // S), int(ty(LA0) // S) + 1):
        for x in range(int(tx(LO0) // S), int(tx(LO1) // S) + 1):
            try:
                im = Image.open(io.BytesIO(get(f'https://tiles.mapterhorn.com/{Z}/{x}/{y}.webp'))).convert('RGB')
                px = im.load(); T[(x, y)] = (px, im.size[0])
            except Exception as e:
                print('dem tile', x, y, e, file=sys.stderr)

    def h(X, Y):
        t = T.get((X // S, Y // S))
        if not t: return -1e9
        r, g, b = t[0][X % S, Y % S]
        return r * 256 + g + b / 256 - 32768

    def maxh(la0, lo0, la1, lo1):
        X0, X1, Y0, Y1 = math.floor(tx(lo0)), math.ceil(tx(lo1)), math.floor(ty(la1)), math.ceil(ty(la0))
        st = max(1, (X1 - X0) // 12); m = -1e9
        for Y in range(Y0, Y1 + 1, st):
            for X in range(X0, X1 + 1, st):
                m = max(m, h(X, Y))
        return m
    return maxh


def build_cells():
    peaks = [p for p in json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8')) if p.get('lat') is not None]
    near = lambda la, lo: any(math.hypot((p['lat'] - la) * 111.3, (p['lon'] - lo) * 76.7) < 14 for p in peaks)
    maxh = dem_max_fn(); out = []

    def visit(la, lo, dla, dlo, lvl):
        if lvl < 3 and maxh(la, lo, la + dla, lo + dlo) >= SPLIT[lvl]:
            for i in range(2):
                for j in range(2):
                    visit(la + i * dla / 2, lo + j * dlo / 2, dla / 2, dlo / 2, lvl + 1)
        else:
            out.append([round(la + dla / 2, 4), round(lo + dlo / 2, 4), dla, dlo])
    la = LA0
    while la < LA1 - 1e-9:
        lo = LO0
        while lo < LO1 - 1e-9:
            if near(la + D0LA / 2, lo + D0LO / 2): visit(la, lo, D0LA, D0LO, 0)
            lo += D0LO
        la += D0LA
    return out


def main():
    cells = build_cells(); print(len(cells), 'cells')
    times = None; depth = [None] * len(cells); elev = [None] * len(cells)
    for i in range(0, len(cells), 50):
        part = cells[i:i + 50]
        q = ('latitude=' + ','.join(str(c[0]) for c in part) + '&longitude=' + ','.join(str(c[1]) for c in part) +
             '&elevation=' + ','.join('nan' for _ in part) +
             '&hourly=snow_depth&past_days=7&forecast_days=3&timezone=Europe%2FLjubljana')
        arr = None
        for m in ('&models=icon_d2', '&models=icon_seamless', ''):
            try:
                j = json.loads(get('https://api.open-meteo.com/v1/forecast?' + q + m))
                x = j if isinstance(j, list) else [j]
                if x and any(v is not None for v in x[0]['hourly']['snow_depth']): arr = x; break
            except Exception as e:
                print('batch', i, m, e, file=sys.stderr)
        if not arr: continue
        ht = arr[0]['hourly']['time']; noon = [k for k, t in enumerate(ht) if t.endswith('T12:00')]
        if times is None: times = [ht[k] for k in noon]
        for k, x in enumerate(arr):
            sd = x['hourly']['snow_depth']
            depth[i + k] = [None if sd[n] is None else round(sd[n], 3) for n in noon]
            elev[i + k] = x.get('elevation')
        time.sleep(6)  # stay well under the per-minute limit
    if times is None: sys.exit('no data from Open-Meteo')
    missing = sum(d is None for d in depth)
    doc = {'t': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
           'src': 'DWD ICON-D2 via Open-Meteo (CC BY 4.0)', 'cells': cells,
           'd': {'times': times, 'depth': depth, 'elev': elev, 'partial': missing > 0}}
    json.dump(doc, open(OUT, 'w'), separators=(',', ':'))
    print('wrote snow.json', os.path.getsize(OUT) // 1024, 'KB, missing', missing)


if __name__ == '__main__':
    main()
