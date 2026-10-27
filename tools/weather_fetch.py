"""Summit weather for every peak (run by .github/workflows/weather.yml every 6 h, or by hand).

Peaks closer than ~1.6 km share one forecast point (the model grid is ~2 km); the point is asked at the height of
its highest peak, lower peaks in the group get the temperature corrected by -0.65 °C / 100 m in the page.
Model: DWD ICON (ICON-D2 2 km for 2 days, then ICON-EU) via Open-Meteo ("icon_seamless"), hours 06–21, 4 days.
Summit wind = max(10 m wind, free-air wind at summit height from the pressure levels) - the 10 m wind of a 2 km model
sits on smoothed terrain far below a sharp summit and is much too low there.
Output: weather.json (compact ints, decoded by src/weather.js). Also low / mid cloud (is the summit in cloud?) and model snow depth. Needs only the Python standard library.
"""
import json, math, os, sys, time, urllib.request, urllib.error, urllib.parse, datetime

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, 'weather.json')
UA = {'User-Agent': 'dvatisocaki-weather/1.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}
API = 'https://api.open-meteo.com/v1/forecast'
HOURS = list(range(6, 22))          # 06:00 .. 21:00 local
DAYS = 4
BASE = ['temperature_2m', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'cloud_cover', 'precipitation', 'weather_code']
EXTRA = ['freezing_level_height', 'cape', 'wind_speed_850hPa', 'wind_speed_800hPa', 'wind_speed_750hPa', 'wind_speed_700hPa',
         'cloud_cover_low', 'cloud_cover_mid', 'snow_depth']
PLEV = {850: 1460, 800: 1950, 750: 2470, 700: 3010}   # standard-atmosphere heights of the pressure levels (m)


def get(url, tries=4):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 400: raise
            if e.code == 429: time.sleep(60)
            else: time.sleep(5 * (a + 1))
        except Exception:
            time.sleep(5 * (a + 1))
    raise RuntimeError('failed: ' + url[:200])


def load_peaks():
    P = []
    for f in ('peaks_final.json', 'peaks_extra.json'):
        for d in (os.path.join(R, 'src'), os.path.dirname(os.path.abspath(__file__))):
            p = os.path.join(d, f)
            if os.path.exists(p):
                P += json.load(open(p, encoding='utf-8')); break
    return [p for p in P if p.get('lat') is not None and p.get('lon') is not None]


def hav(a, b, c, d):
    r = math.radians; x = r(d - b) * math.cos(r((a + c) / 2)); y = r(c - a)
    return 6371000 * math.hypot(x, y)


def clusters(P):
    pts = []                                   # [lat, lon, elev]
    pk = {}
    for p in sorted(P, key=lambda q: -float(q.get('elev') or 0)):
        e = max(float(p.get('elev') or 0), float(p.get('dem_h') or 0))
        for i, c in enumerate(pts):
            if hav(c[0], c[1], p['lat'], p['lon']) < 1600: pk[p['id']] = i; break
        else:
            pk[p['id']] = len(pts); pts.append([round(p['lat'], 4), round(p['lon'], 4), round(e)])
    return pts, pk


def query(part, vars_, model):
    q = {'latitude': ','.join(str(c[0]) for c in part), 'longitude': ','.join(str(c[1]) for c in part),
         'elevation': ','.join(str(c[2]) for c in part), 'hourly': ','.join(vars_), 'forecast_days': DAYS,
         'timezone': 'Europe/Ljubljana', 'wind_speed_unit': 'kmh'}
    if model: q['models'] = model
    j = get(API + '?' + urllib.parse.urlencode(q, safe=','))
    return j if isinstance(j, list) else [j]


def accepted_vars(probe, model):
    """Which optional variables this model really serves (unknown names give HTTP 400, missing data gives nulls)."""
    ok = []
    for v in EXTRA:
        try:
            x = query([probe], BASE + [v], model)[0]['hourly'].get(v) or []
            if any(a is not None for a in x[:48]): ok.append(v)
        except Exception as e:
            print('skip', v, e, file=sys.stderr)
    return ok


def main():
    P = load_peaks(); pts, pk = clusters(P)
    print(len(P), 'peaks ->', len(pts), 'forecast points')
    model = 'icon_seamless'
    try: query([pts[0]], BASE, model)
    except Exception as e: print('icon_seamless failed, best match:', e, file=sys.stderr); model = None
    extra = accepted_vars(pts[0], model); print('model', model, 'extra', extra)
    V = BASE + extra
    keys = dict(T='temperature_2m', W='wind_speed_10m', G='wind_gusts_10m', D='wind_direction_10m', C='cloud_cover',
                P='precipitation', X='weather_code', F='freezing_level_height', K='cape', CL='cloud_cover_low', CM='cloud_cover_mid', S='snow_depth')
    out = {k: [None] * len(pts) for k in keys}
    days = None; sel = None
    for i in range(0, len(pts), 40):
        part = pts[i:i + 40]
        try: arr = query(part, V, model)
        except Exception as e: print('batch', i, e, file=sys.stderr); continue
        if sel is None:
            ht = arr[0]['hourly']['time']
            sel = [k for k, t in enumerate(ht) if int(t[11:13]) in HOURS][:DAYS * len(HOURS)]
            days = sorted({ht[k][:10] for k in sel})
        for n, x in enumerate(arr):
            h = x['hourly']; e = part[n][2]
            def col(name, f=lambda v: v):
                a = h.get(name)
                return None if not a else [None if a[k] is None else f(a[k]) for k in sel]
            # free-air wind at summit height, interpolated between pressure levels
            lv = sorted([(PLEV[L], h.get(f'wind_speed_{L}hPa')) for L in PLEV if h.get(f'wind_speed_{L}hPa')])
            w10 = h['wind_speed_10m']; g10 = h['wind_gusts_10m']; W = []; G = []
            for k in sel:
                fa = None
                if lv:
                    below = [l for l in lv if l[0] <= e and l[1][k] is not None]; above = [l for l in lv if l[0] > e and l[1][k] is not None]
                    if below and above:
                        (z0, a0), (z1, a1) = below[-1], above[0]; fa = a0[k] + (a1[k] - a0[k]) * (e - z0) / (z1 - z0)
                    elif below: fa = below[-1][1][k]
                    elif above: fa = above[0][1][k]
                w = max(v for v in (w10[k], fa) if v is not None) if (w10[k] is not None or fa is not None) else None
                g = max(v for v in (g10[k], w * 1.35 if w is not None else None) if v is not None) if (g10[k] is not None or w is not None) else None
                W.append(None if w is None else round(w)); G.append(None if g is None else round(g))
            I = i + n
            out['T'][I] = col('temperature_2m', lambda v: round(v * 10))
            out['W'][I] = W; out['G'][I] = G
            out['D'][I] = col('wind_direction_10m', lambda v: round(v))
            out['C'][I] = col('cloud_cover', lambda v: round(v))
            out['P'][I] = col('precipitation', lambda v: round(v * 10))
            out['X'][I] = col('weather_code', lambda v: int(v))
            out['F'][I] = col('freezing_level_height', lambda v: round(v / 10) * 10)
            out['K'][I] = col('cape', lambda v: round(v))
            out['CL'][I] = col('cloud_cover_low', lambda v: round(v))
            out['CM'][I] = col('cloud_cover_mid', lambda v: round(v))
            out['S'][I] = col('snow_depth', lambda v: round(v * 100))   # cm
        time.sleep(1)
    if days is None: sys.exit('no data')
    res = {'gen': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'model': model or 'best_match',
           'days': days, 'hours': HOURS, 'pts': pts, 'pk': pk, 'v': out}
    json.dump(res, open(OUT, 'w'), separators=(',', ':'))
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB', sum(1 for t in out['T'] if t), 'points with data')


if __name__ == '__main__':
    main()
