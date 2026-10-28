"""Snowpack model v2 - snow depth on the mountains from the season's weather (run daily by .github/workflows/snowpack.yml).

Where:  every ~4 km cell that has one of our peaks (0.04° × 0.055°), at every 250 m of height from 750 m to above its highest peak,
        and for three surfaces: flat ground, a 30° north-facing and a 30° south-facing slope.
Input:  hourly DWD ICON (ICON-D2 2 km, then ICON-EU) via Open-Meteo at that height: temperature (downscaled to the height),
        relative humidity, precipitation, the model's snowfall height, direct + diffuse solar radiation, wind.
Steps every hour (standard methods from snow hydrology):
  1. rain or snow: wet-bulb temperature (Stull 2011) with a smooth 50 % threshold near +1 °C (humidity-dependent partitioning,
     Jennings et al. 2018), averaged with the model's own snowfall height (melting level) when it is available
  2. new snow density from air temperature (Hedstrom & Pomeroy 1998), denser in wind
  3. albedo: fresh snow 0.85, ageing towards 0.5 (faster when melting), reset by new snow (ECMWF-style)
  4. sun on each surface: solar position every hour, direct beam on the 30° N / S slope + diffuse + reflected light
  5. melt: enhanced temperature-index model (Pellicciotti et al. 2005): M = TF·T + SRF·(1−albedo)·radiation when T > 1 °C,
     plus heat from rain
  6. liquid water held in the snow (10 %), refreezing at night, the rest runs off
  7. settling: density relaxes towards 300 kg/m³ (cold) / 500 kg/m³ (wet) with a 200 h time scale (Essery 2015, FSM)
  8. satellite check (once a day, before the new day): Copernicus Sentinel-2 snowsat.png + DEM heights/aspects -> where a band of
     a cell is seen bare (<10 % snow) the snow there is removed; where it is seen white (>60 %) but the model has none, 10 cm are added
State is kept in data/snowpack_state.json (the season builds up from 1 October). Output snowpack.json for the page.
Needs: Python 3.9+, numpy + Pillow (only for the satellite check; without them the check is skipped).
"""
import json, math, os, sys, time, datetime, urllib.request, urllib.error, urllib.parse, io

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(R, 'data', 'snowpack_state.json'); OUT = os.path.join(R, 'snowpack.json')
API = 'https://api.open-meteo.com/v1/forecast'
UA = {'User-Agent': 'dvatisocaki-snowpack/2.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}
VER = 2; DLA, DLO = 0.04, 0.055; STEP = 250; LOW = 750; SEASON_START = (10, 1)
PK = 1.0                    # precipitation multiplier (calibration knob; 1 = model precipitation as is)
TF, SRF, TT = 0.05, 0.0094, 1.0          # ETI melt: mm/h/°C, mm/h per W/m², threshold °C
SLOPE = 30.0; VARIANTS = (None, 0.0, 180.0)   # flat, north-facing, south-facing (aspect from north, clockwise)
BASE = ['temperature_2m', 'relative_humidity_2m', 'precipitation']
EXTRA = ['snowfall_height', 'direct_radiation', 'diffuse_radiation', 'wind_speed_10m']
CHECK = [('Kredarica', 46.379, 13.849, 2514), ('Kanin (smučišče)', 46.355, 13.475, 2200), ('Kanin (vrh)', 46.358, 13.471, 2580),
         ('Vogel', 46.263, 13.836, 1800), ('Krvavec', 46.297, 14.533, 1750), ('Rudno polje', 46.354, 13.932, 1347)]


def get(url, tries=4):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 400: raise
            time.sleep(60 if e.code == 429 else 5 * (a + 1))
        except Exception:
            time.sleep(5 * (a + 1))
    raise RuntimeError('failed: ' + url[:160])


def points():
    P = []
    for f in ('peaks_final.json', 'peaks_extra.json'):
        p = os.path.join(R, 'src', f)
        if os.path.exists(p): P += json.load(open(p, encoding='utf8'))
    C = {}
    for p in P:
        if p.get('lat') is None: continue
        C.setdefault((round(p['lat'] / DLA), round(p['lon'] / DLO)), []).append(p)
    pts = []
    for k in sorted(C):
        v = C[k]; la = sum(q['lat'] for q in v) / len(v); lo = sum(q['lon'] for q in v) / len(v)
        top = max(max(float(q.get('elev') or 0), float(q.get('dem_h') or 0)) for q in v)
        for e in range(LOW, int(top) + STEP, STEP): pts.append([round(la, 4), round(lo, 4), e])
    return pts


# ---------- physics ----------
def wetbulb(T, RH):     # Stull (2011), °C
    RH = max(5.0, min(100.0, RH))
    return (T * math.atan(0.151977 * (RH + 8.313659) ** 0.5) + math.atan(T + RH) - math.atan(RH - 1.676331)
            + 0.00391838 * RH ** 1.5 * math.atan(0.023101 * RH) - 4.686035)


def snow_fraction(T, RH, zs, e):
    f_tw = 1 / (1 + math.exp(2.2 * (wetbulb(T, RH if RH is not None else 85) - 1.0)))
    if zs is None: return f_tw
    f_zs = max(0.0, min(1.0, (e - zs + 100) / 200))       # 0 at 100 m below the snowfall height, 1 at 100 m above
    return 0.5 * (f_tw + f_zs)


def sun(ts, lat, lon):  # NOAA low-precision solar position -> (cos zenith, azimuth deg from north)
    d = ts / 86400 + 2440587.5 - 2451545.0
    g = math.radians(357.529 + 0.98560028 * d); q = 280.459 + 0.98564736 * d
    L = math.radians(q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)); eps = math.radians(23.439 - 0.00000036 * d)
    ra = math.atan2(math.cos(eps) * math.sin(L), math.cos(L)); dec = math.asin(math.sin(eps) * math.sin(L))
    gmst = (18.697374558 + 24.06570982441908 * d) % 24; H = math.radians(gmst * 15 + lon) - ra; f = math.radians(lat)
    cz = math.sin(f) * math.sin(dec) + math.cos(f) * math.cos(dec) * math.cos(H)
    az = math.degrees(math.atan2(-math.sin(H), math.tan(dec) * math.cos(f) - math.sin(f) * math.cos(H))) % 360
    return cz, az


def radiation(gdir, gdif, cz, az, aspect, alb):
    """Shortwave on the surface (W/m²): horizontal for aspect None, else a 30° slope facing `aspect`."""
    gdir = gdir or 0.0; gdif = gdif or 0.0
    if aspect is None: return gdir + gdif
    if cz <= 0.06: dni = 0.0
    else: dni = min(1100.0, gdir / cz)
    b = math.radians(SLOPE); sz = math.sqrt(max(0.0, 1 - cz * cz))
    cos_i = cz * math.cos(b) + sz * math.sin(b) * math.cos(math.radians(az - aspect))
    return dni * max(0.0, cos_i) + gdif * (1 + math.cos(b)) / 2 + (gdir + gdif) * alb * (1 - math.cos(b)) / 2


def new_state(): return {'m': 0.0, 'l': 0.0, 'r': 100.0, 'a': 0.85}   # mass ice (mm), liquid (mm), density, albedo


def hour(s, T, RH, P, zs, gdir, gdif, U, cz, az, e, aspect):
    P = (P or 0.0) * PK
    if T is None: return
    fs = snow_fraction(T, RH, zs, e) if P > 0 else 0.0
    snow, rain = P * fs, P * (1 - fs)
    if snow > 0:
        rho_n = 67.92 + 51.25 * math.exp(T / 2.59)                     # Hedstrom & Pomeroy (1998)
        if U: rho_n += 25 * max(0.0, U - 5)                             # wind-packed
        rho_n = max(50.0, min(250.0, rho_n))
        old = s['m'] + s['l']
        s['r'] = (old + snow) / (old / s['r'] + snow / rho_n) if old > 0 else rho_n
        s['m'] += snow
        s['a'] = s['a'] + (0.85 - s['a']) * min(1.0, snow / 10)           # albedo refresh
    tot = s['m'] + s['l']
    if tot <= 0: return
    if rain > 0: s['l'] += rain
    melting = T > TT
    if melting:
        Q = radiation(gdir, gdif, cz, az, aspect, s['a'])
        M = max(0.0, TF * T + SRF * (1 - s['a']) * Q) + rain * 4.18 * max(T, 0) / 334
        M = min(M, s['m']); s['m'] -= M; s['l'] += M
        s['a'] = (s['a'] - 0.5) * math.exp(-0.24 / 24) + 0.5
    else:
        s['a'] = max(0.5, s['a'] - 0.008 / 24)
        if T < 0 and s['l'] > 0:
            fr = min(s['l'], 0.05 * -T); s['l'] -= fr; s['m'] += fr
    hold = 0.1 * s['m']
    if s['l'] > hold: s['l'] = hold                                      # runoff
    rmax = 500.0 if (melting or s['l'] > 0.01 * s['m']) else 300.0
    if s['r'] < rmax: s['r'] = rmax + (s['r'] - rmax) * math.exp(-1 / 200)
    if s['m'] < 0.1: s.update(new_state())


def depth_cm(s): return round((s['m'] + s['l']) / s['r'] * 100) if s['m'] > 0 else 0


# ---------- satellite check ----------
def satellite_check(pts, S, today):
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print('satellite check skipped (numpy / Pillow missing)'); return
    mj = os.path.join(R, 'snowsat.json'); mp = os.path.join(R, 'snowsat.png')
    if not (os.path.exists(mj) and os.path.exists(mp)): print('satellite check skipped (no snowsat)'); return
    m = json.load(open(mj))
    if (today - datetime.date.fromisoformat(m['date'])).days > 1: print('satellite check skipped (snowsat from', m['date'], ')'); return
    sat = np.asarray(Image.open(mp).convert('RGB'))[::2, ::2]          # 80 m
    cls, age = sat[..., 0], sat[..., 1]
    w, s_, e_, n = m['bbox']; H, W = cls.shape
    lat = n - (np.arange(H) + 0.5) / H * (n - s_); lon = w + (np.arange(W) + 0.5) / W * (e_ - w)
    LON, LAT = np.meshgrid(lon, lat)
    # DEM z10 mosaic
    Z, TS = 10, 512; N = 2 ** Z
    gx = (LON + 180) / 360 * N * TS
    gy = (1 - np.log(np.tan(np.radians(LAT)) + 1 / np.cos(np.radians(LAT))) / math.pi) / 2 * N * TS
    x0, x1 = int(gx.min() // TS) - 1, int(gx.max() // TS) + 1; y0, y1 = int(gy.min() // TS) - 1, int(gy.max() // TS) + 1
    D = np.full(((y1 - y0 + 1) * TS, (x1 - x0 + 1) * TS), np.nan, np.float32)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            try:
                im = np.asarray(Image.open(io.BytesIO(get(f'https://tiles.mapterhorn.com/{Z}/{tx}/{ty}.webp'))).convert('RGB')).astype(np.float32)
                D[(ty - y0) * TS:(ty - y0 + 1) * TS, (tx - x0) * TS:(tx - x0 + 1) * TS] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
            except Exception as ex: print('dem tile', tx, ty, ex)
    ix = (gx - x0 * TS).astype(int); iy = (gy - y0 * TS).astype(int)
    h = D[iy, ix]
    mpp = 40075016 * math.cos(math.radians((s_ + n) / 2)) / (N * TS)
    dzdx = (D[iy, np.minimum(ix + 1, D.shape[1] - 1)] - D[iy, np.maximum(ix - 1, 0)]) / (2 * mpp)
    dzdy = (D[np.minimum(iy + 1, D.shape[0] - 1), ix] - D[np.maximum(iy - 1, 0), ix]) / (2 * mpp)   # +y = south
    slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
    south = np.where(np.hypot(dzdx, dzdy) > 0, -dzdy / np.maximum(np.hypot(dzdx, dzdy), 1e-6), 0)   # +1 = faces south
    ok = (cls > 0) & (age <= 3) & np.isfinite(h)
    # point index for each pixel: same cell + nearest 250 m band
    idx = {}
    for i, (la, lo, e) in enumerate(pts): idx[(round(la / DLA), round(lo / DLO), e)] = i
    ck = np.round(LAT / DLA).astype(int); cl = np.round(LON / DLO).astype(int); band = (np.round((h - LOW) / STEP) * STEP + LOW)
    var = np.where((slope > 15) & (south < -0.5), 1, np.where((slope > 15) & (south > 0.5), 2, 0))
    cnt = {}
    sel = np.nonzero(ok)
    for a, b, c, v, sn in zip(ck[sel], cl[sel], band[sel], var[sel], cls[sel]):
        i = idx.get((int(a), int(b), int(c)))
        if i is None: continue
        for vv in ({0, int(v)}):
            k = (i, vv); t = cnt.get(k)
            if t is None: cnt[k] = t = [0, 0]
            t[0] += 1; t[1] += sn == 2
    bare = add = 0
    for (i, v), (nn, ns) in cnt.items():
        if nn < 30: continue
        f = ns / nn; st = S[i][v]
        if f < 0.10 and st['m'] > 0: st.update(new_state()); bare += 1
        elif f > 0.60 and st['m'] < 10: st.update({'m': 15.0, 'l': 0.0, 'r': 150.0, 'a': 0.8}); add += 1
    print(f'satellite check ({m["date"]}): {len(cnt)} point-surfaces seen, {bare} set bare, {add} given snow')


# ---------- main ----------
def accepted(probe):
    ok = []
    for v in EXTRA:
        q = {'latitude': probe[0], 'longitude': probe[1], 'elevation': probe[2], 'hourly': ','.join(BASE + [v]), 'forecast_days': 1, 'models': 'icon_seamless'}
        try:
            h = json.loads(get(API + '?' + urllib.parse.urlencode(q, safe=',')))['hourly'].get(v) or []
            if any(x is not None for x in h): ok.append(v)
        except Exception as e: print('variable not available:', v, e)
    return ok


def fetch(pts, past, fut, V):
    out = []
    for i in range(0, len(pts), 50):
        part = pts[i:i + 50]
        q = {'latitude': ','.join(str(p[0]) for p in part), 'longitude': ','.join(str(p[1]) for p in part),
             'elevation': ','.join(str(p[2]) for p in part), 'hourly': ','.join(V), 'past_days': past, 'forecast_days': fut,
             'timezone': 'GMT', 'wind_speed_unit': 'ms', 'models': 'icon_seamless'}
        j = json.loads(get(API + '?' + urllib.parse.urlencode(q, safe=',')))
        out += j if isinstance(j, list) else [j]
        time.sleep(1)
    return out


def main():
    pts = points(); today = datetime.datetime.now(datetime.timezone.utc).date()
    st = json.load(open(STATE)) if os.path.exists(STATE) else None
    if st and (st.get('ver') != VER or st.get('pts') != pts): print('new model version / points -> new season state'); st = None
    if st is None:
        y = today.year if (today.month, today.day) >= SEASON_START else today.year - 1
        start = max(datetime.date(y, *SEASON_START), today - datetime.timedelta(days=90))
        st = {'ver': VER, 'pts': pts, 'done': (start - datetime.timedelta(days=1)).isoformat(),
              's': [[new_state() for _ in VARIANTS] for _ in pts], 'hist': {}}
    done = datetime.date.fromisoformat(st['done']); S = st['s']
    if (today - done).days <= 3: satellite_check(pts, S, today)
    V = BASE + accepted(pts[len(pts) // 2]); print('variables:', V)
    past = min(92, max(1, (today - done).days))
    print(len(pts), 'points ×', len(VARIANTS), 'surfaces; state done', done, '; past_days', past)
    D = fetch(pts, past, 3, V)
    times = D[0]['hourly']['time']
    ts = [datetime.datetime.fromisoformat(t).replace(tzinfo=datetime.timezone.utc).timestamp() for t in times]
    days = sorted({t[:10] for t in times}); hist = st.get('hist', {})
    out_days = [d for d in sorted(set(hist) | set(days)) if d >= (today - datetime.timedelta(days=7)).isoformat()]
    depth = {d: hist[d] if d in hist else [[0, 0, 0] for _ in pts] for d in out_days}
    nan = [None] * len(times)
    for i, x in enumerate(D):
        h = x['hourly']; la, lo, e = pts[i]
        T, RH, P = h['temperature_2m'], h.get('relative_humidity_2m') or nan, h['precipitation']
        ZS, GD, GF, U = h.get('snowfall_height') or nan, h.get('direct_radiation') or nan, h.get('diffuse_radiation') or nan, h.get('wind_speed_10m') or nan
        sp = [sun(t - 1800, la, lo) for t in ts]                       # radiation = mean of the previous hour
        for vi, asp in enumerate(VARIANTS):
            s = dict(S[i][vi]); last = None
            for k, t in enumerate(times):
                d = t[:10]
                if datetime.date.fromisoformat(d) <= done: continue
                hour(s, T[k], RH[k], P[k], ZS[k], GD[k], GF[k], U[k], sp[k][0], sp[k][1], e, asp)
                if t[11:13] == '23':
                    if d in depth: depth[d][i][vi] = depth_cm(s)
                    if datetime.date.fromisoformat(d) < today: S[i][vi] = dict(s)
            if times[-1][11:13] != '23' and times[-1][:10] in depth: depth[times[-1][:10]][i][vi] = depth_cm(s)
    st['s'] = [[{k: round(v, 3) for k, v in x.items()} for x in row] for row in S]
    st['done'] = (today - datetime.timedelta(days=1)).isoformat()
    st['hist'] = {d: depth[d] for d in out_days if d < today.isoformat()}
    json.dump(st, open(STATE, 'w'), separators=(',', ':'))
    json.dump({'ver': VER, 'gen': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'step': STEP, 'low': LOW,
               'slope': SLOPE, 'pts': pts, 'days': out_days, 'cm': [depth[d] for d in out_days]}, open(OUT, 'w'), separators=(',', ':'))
    t = today.isoformat()
    if t in depth:
        for e in (1500, 2000, 2500):
            v = sorted(depth[t][i][0] for i in range(len(pts)) if pts[i][2] == e)
            if v: print(f'{e} m flat: median {v[len(v)//2]} cm, max {v[-1]} cm ({len(v)} points)')
        for name, la, lo, e in CHECK:
            best = min(range(len(pts)), key=lambda i: (abs(pts[i][0] - la) / DLA) ** 2 + (abs(pts[i][1] - lo) / DLO) ** 2 + ((pts[i][2] - e) / STEP) ** 2)
            fl, no, so = depth[t][best]
            print(f'{name} ({e} m): flat {fl} cm, north {no} cm, south {so} cm   [model point {pts[best]}]')
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


if __name__ == '__main__':
    main()
