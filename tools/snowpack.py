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
  9. station measurements (ARSO, ~20 mountain stations, morning reading): Kalman-filter update at the time of the reading -
     every point keeps an error variance that grows each day and shrinks near stations; the increment spreads with distance and
     height (see analysis())
State is kept in data/snowpack_state.json (the season builds up from 1 October). Output snowpack.json for the page:
the last 7 days, today and 4 forecast days.
Needs: Python 3.9+, numpy + Pillow (only for the satellite check; without them the check is skipped).
"""
import json, math, os, sys, time, datetime, urllib.request, urllib.error, urllib.parse, io

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(R, 'data', 'snowpack_state.json'); OUT = os.path.join(R, 'snowpack.json')
API = 'https://api.open-meteo.com/v1/forecast'
UA = {'User-Agent': 'dvatisocaki-snowpack/2.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}
FUT = 5                     # forecast days fetched (today + 4) - covers the 4 days of the weather rating
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


def arso_obs():
    """ARSO snow stations (vreme.arso.gov.si snow_geojson): measured snow depth, usually the 07:00 reading."""
    try: j = json.loads(get('https://vreme.arso.gov.si/api/1.0/snow_geojson/'))
    except Exception as ex: print('ARSO snow data not available:', ex); return []
    out = []
    for f in j.get('features', []):
        p = f.get('properties', {}); c = (f.get('geometry') or {}).get('coordinates') or [None, None]
        try: alt = float(p.get('altitude'))
        except (TypeError, ValueError): continue
        best = None
        for d in p.get('days', []):
            for tl in d.get('timeline', []):
                v = tl.get('snow')
                try: cm = float(v)
                except (TypeError, ValueError): continue
                best = (tl.get('valid') or d.get('date') or '', cm)
        if best and c[0] is not None:
            out.append({'name': p.get('title', '?'), 'alt': alt, 'lat': c[1], 'lon': c[0], 'cm': best[1], 'valid': best[0]})
    return out


# ---------- Kalman filter / optimal interpolation of station snow depths ----------
# Every model point carries an error variance P (cm², flat surface). It grows each day (model error, more after snowfall)
# and shrinks where a station measures. The analysis is the Kalman update with background covariances
#   B_ab = sqrt(P_a P_b) · (1 + r/L) e^(−r/L) · e^(−(Δz/Lz)²)   (horizontal second-order autoregressive × height correlation,
#   as in operational snow-depth analysis - Brasnett 1999, ECMWF), observation error R = 5² + 5² + (0.15·obs)² cm².
L_H, L_Z = 20.0, 400.0
def corr(la1, lo1, z1, la2, lo2, z2):
    r = math.hypot((la1 - la2) * 111.3, (lo1 - lo2) * 111.3 * math.cos(math.radians(la1)))
    return (1 + r / L_H) * math.exp(-r / L_H) * math.exp(-((z1 - z2) / L_Z) ** 2)


def model_at(pts, val, la, lo, alt):
    """Flat model depth (and point index) at a station: nearest ~4 km cell within 8 km, interpolated between its 250 m levels."""
    cells = {}
    for i, (a, b, e) in enumerate(pts): cells.setdefault((a, b), []).append((e, i))
    best = None
    for (a, b), lv in cells.items():
        r = math.hypot((a - la) * 111.3, (b - lo) * 77)
        if r <= 8 and (best is None or r < best[0]): best = (r, sorted(lv))
    if not best: return None, None
    lv = best[1]
    if alt <= lv[0][0]: return (0.0 if alt < lv[0][0] - 150 else val(lv[0][1])), lv[0][1]
    if alt >= lv[-1][0]: return val(lv[-1][1]), lv[-1][1]
    for (e0, i0), (e1, i1) in zip(lv, lv[1:]):
        if e0 <= alt <= e1:
            f = (alt - e0) / (e1 - e0); return val(i0) * (1 - f) + val(i1) * f, (i0 if f < .5 else i1)


def analysis(pts, cur, PV, obs):
    try: import numpy as np
    except ImportError: print('Kalman update skipped (numpy missing)'); return []
    dflat = lambda i: depth_cm(cur[i][0])
    use = []
    for o in obs:
        mv, mi = model_at(pts, dflat, o['lat'], o['lon'], o['alt'])
        o['model'] = None if mv is None else round(mv)
        if mv is not None: use.append((o, mv, mi))
    if not use: print('Kalman update: no station near a model point'); return []
    n = len(use); sig = np.array([math.sqrt(PV[mi]) for _, _, mi in use])
    y = np.array([o['cm'] - mv for o, mv, _ in use])
    A = np.zeros((n, n))
    for a in range(n):
        for b in range(n):
            oa, ob = use[a][0], use[b][0]
            A[a, b] = sig[a] * sig[b] * corr(oa['lat'], oa['lon'], oa['alt'], ob['lat'], ob['lon'], ob['alt'])
        A[a, a] += 25 + 25 + (0.15 * use[a][0]['cm']) ** 2
    Ai = np.linalg.inv(A); w = Ai @ y
    changed = 0
    for i, (la, lo, e) in enumerate(pts):
        bi = np.array([math.sqrt(PV[i]) * sig[j] * corr(la, lo, e, use[j][0]['lat'], use[j][0]['lon'], use[j][0]['alt']) for j in range(n)])
        if bi.max() < 1e-3: continue
        inc = float(bi @ w); PV[i] = max(4.0, PV[i] - float(bi @ Ai @ bi))
        d = dflat(i); dn = max(0.0, d + inc)
        if abs(dn - d) < 0.5: continue
        changed += 1
        for st in cur[i]:
            ds = depth_cm(st)
            if ds > 1:
                k = max(0.0, min(4.0, dn / d if d > 1 else (ds + inc) / ds)); st['m'] *= k; st['l'] *= k
                if st['m'] < 0.1: st.update(new_state())
            elif inc > 2:
                st.update({'m': inc * 2.0, 'l': 0.0, 'r': 200.0, 'a': 0.8})
    for o, mv, mi in use: o['after'] = round(model_at(pts, dflat, o['lat'], o['lon'], o['alt'])[0])
    print(f'Kalman update with {n} stations: {changed} model points changed')
    return [o for o, _, _ in use]


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
    PV = st.get('pv') or [100.0] * len(pts)                                  # error variance (cm²) per point, flat surface
    if (today - done).days <= 3: satellite_check(pts, S, today)
    V = BASE + accepted(pts[len(pts) // 2]); print('variables:', V)
    past = min(92, max(1, (today - done).days))
    print(len(pts), 'points ×', len(VARIANTS), 'surfaces; state done', done, '; past_days', past)
    D = fetch(pts, past, FUT, V)
    times = D[0]['hourly']['time']
    ts = [datetime.datetime.fromisoformat(t).replace(tzinfo=datetime.timezone.utc).timestamp() for t in times]
    days = sorted({t[:10] for t in times}); hist = st.get('hist', {})
    out_days = [d for d in sorted(set(hist) | set(days)) if d >= (today - datetime.timedelta(days=7)).isoformat()]
    depth = {d: hist[d] if d in hist else [[0, 0, 0] for _ in pts] for d in out_days}
    nan = [None] * len(times)
    F = []
    for i, x in enumerate(D):
        h = x['hourly']; la, lo, e = pts[i]
        F.append((h['temperature_2m'], h.get('relative_humidity_2m') or nan, h['precipitation'], h.get('snowfall_height') or nan,
                  h.get('direct_radiation') or nan, h.get('diffuse_radiation') or nan, h.get('wind_speed_10m') or nan,
                  [sun(t - 1800, la, lo) for t in ts]))                    # radiation = mean of the previous hour
    cur = [[dict(S[i][vi]) for vi in range(len(VARIANTS))] for i in range(len(pts))]
    prev = [depth_cm(cur[i][0]) for i in range(len(pts))]

    def advance(k0, k1):
        for k in range(k0, k1):
            t = times[k]; d = t[:10]; dd = datetime.date.fromisoformat(d)
            if dd <= done: continue
            for i in range(len(pts)):
                T, RH, P, ZS, GD, GF, U, sp = F[i]; e = pts[i][2]
                for vi, asp in enumerate(VARIANTS):
                    hour(cur[i][vi], T[k], RH[k], P[k], ZS[k], GD[k], GF[k], U[k], sp[k][0], sp[k][1], e, asp)
            if t[11:13] == '23':
                for i in range(len(pts)):
                    if d in depth: depth[d][i] = [depth_cm(s) for s in cur[i]]
                    if dd <= today:
                        S[i] = [dict(s) for s in cur[i]]
                        dn = depth_cm(cur[i][0]); PV[i] = min(2500.0, PV[i] + 4 + (0.3 * max(0, dn - prev[i])) ** 2); prev[i] = dn

    # stations: assimilate at the time of their reading (normally 06 UTC today), if that is after the saved state
    obs = arso_obs(); used = []
    k_obs = None
    if obs:
        vd = max(o['valid'] for o in obs)[:13]                              # e.g. 2026-10-28T06
        obs = [o for o in obs if o['valid'][:13] == vd]
        k_obs = next((k for k, t in enumerate(times) if t[:13] == vd), None)
        if k_obs is not None and datetime.date.fromisoformat(vd[:10]) <= done: k_obs = None; print('stations', vd, 'already assimilated')
    if k_obs is not None:
        advance(0, k_obs + 1)
        used = analysis(pts, cur, PV, obs)
        advance(k_obs + 1, len(times))
    else:
        advance(0, len(times))
    last = times[-1][:10]
    if times[-1][11:13] != '23' and last in depth:
        for i in range(len(pts)): depth[last][i] = [depth_cm(s) for s in cur[i]]
    st['s'] = [[{k: round(v, 3) for k, v in x.items()} for x in row] for row in S]
    st['pv'] = [round(v, 1) for v in PV]
    st['done'] = today.isoformat()
    st['hist'] = {d: depth[d] for d in out_days if d <= today.isoformat()}
    json.dump(st, open(STATE, 'w'), separators=(',', ':'))
    json.dump({'ver': VER, 'gen': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'step': STEP, 'low': LOW,
               'slope': SLOPE, 'pts': pts, 'days': out_days, 'cm': [depth[d] for d in out_days],
               'obs': [{k: o.get(k) for k in ('name', 'alt', 'lat', 'lon', 'cm', 'valid', 'model', 'after')} for o in (used or obs)]},
              open(OUT, 'w'), separators=(',', ':'))
    t = today.isoformat()
    if t in depth:
        for e in (1500, 2000, 2500):
            v = sorted(depth[t][i][0] for i in range(len(pts)) if pts[i][2] == e)
            if v: print(f'{e} m flat: median {v[len(v)//2]} cm, max {v[-1]} cm ({len(v)} points)')
    if obs:
        print('station            alt   measured   model before -> after (cm, flat, at the station height)')
        for o in sorted([o for o in obs if o.get('model') is not None], key=lambda o: -o['alt']):
            print(f"{o['name'][:18]:18s} {o['alt']:5.0f}  {o['cm']:6.0f}     {o.get('model') if o.get('model') is not None else '-':>6}  -> {o.get('after', '-')}")
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


if __name__ == '__main__':
    main()
