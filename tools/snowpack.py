"""Own snowpack model: snow depth by height, built up from the season's snowfall (run daily by .github/workflows/snowpack.yml).

Instead of trusting the weather model's snow depth (one value per smoothed 2 km cell), we keep our own snow budget at every height:
  * points: the mountain areas with our peaks (61 cells of ~8 km) × heights 500 m … highest peak, every 250 m
  * every hour: precipitation falls as snow below ~0 °C, as rain above ~2 °C (mixed in between); temperature at that height
    (Open-Meteo statistical downscaling with the elevation parameter); precipitation +5 % per 100 m above 1000 m (mountains catch more)
  * new snow density from temperature (cold = fluffy), snow settles over the days (density grows to ~400 kg/m³)
  * melt: degree-day method, mm of water per °C·day above 0 °C, stronger in spring (sun higher); rain on snow adds a little
  * depth = water equivalent / density
State (snow water + density per point) is kept in data/snowpack_state.json, so the season builds up day by day; the first run
starts 1 October (or 92 days back). Output snowpack.json: depth (cm) per point for the last 7 days + today + 2 forecast days.
The page interpolates between points and heights, adds sun/shade by slope aspect and lets the satellite decide where snow lies.
Standard library only.
"""
import json, math, os, sys, time, datetime, urllib.request, urllib.error, urllib.parse

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(R, 'data', 'snowpack_state.json'); OUT = os.path.join(R, 'snowpack.json')
API = 'https://api.open-meteo.com/v1/forecast'
UA = {'User-Agent': 'dvatisocaki-snowpack/1.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}
STEP = 250; LOW = 500; SEASON_START = (10, 1)


def get(url, tries=4):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.loads(r.read())
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
        C.setdefault((round(p['lat'] / 0.07), round(p['lon'] / 0.1)), []).append(p)
    pts = []
    for k in sorted(C):
        v = C[k]; la = sum(q['lat'] for q in v) / len(v); lo = sum(q['lon'] for q in v) / len(v)
        top = max(max(float(q.get('elev') or 0), float(q.get('dem_h') or 0)) for q in v)
        for e in range(LOW, int(top) + STEP, STEP): pts.append([round(la, 4), round(lo, 4), e])
    return pts


def ddf(month):   # melt factor mm w.e. / °C / day: weak winter sun, strong spring sun
    return {11: 2.0, 12: 1.6, 1: 1.6, 2: 2.2, 3: 3.2, 4: 4.2, 5: 5.0, 6: 5.5, 7: 5.5, 8: 5.5, 9: 4.0, 10: 3.0}[month]


def step_day(s, T, Pr, e, month):
    """One day for one point. s = {'swe': mm, 'rho': kg/m3}; T, Pr = 24 hourly temperatures (°C) / precipitation (mm)."""
    orog = 1 + max(0.0, (e - 1000) / 100 * 0.05)
    for t, p in zip(T, Pr):
        if t is None: continue
        p = (p or 0) * orog
        fs = 1.0 if t <= 0 else 0.0 if t >= 2 else 1 - t / 2          # snow fraction
        if p > 0 and fs > 0:
            rho_new = min(200.0, max(60.0, 100 + 8 * t))                 # −5 °C -> 60, 0 °C -> 100, +1 °C -> 108
            new = p * fs; old = s['swe']
            s['swe'] = old + new
            s['rho'] = (old * s['rho'] + new * rho_new) / s['swe'] if old > 0 else rho_new   # mass-weighted density
        if s['swe'] > 0:
            if t > 0: s['swe'] = max(0.0, s['swe'] - ddf(month) * t / 24 - (p * (1 - fs) * 0.0125 * t))   # degree-day melt + rain heat
            # settling: towards 400 kg/m3, faster when warm or deep
            k = 0.008 if t < -5 else 0.015 if t < 0 else 0.04
            s['rho'] = s['rho'] + (400 - s['rho']) * k / 24 * (1 + s['swe'] / 400)
    if s['swe'] <= 0.05: s['swe'] = 0.0; s['rho'] = 100.0
    return s


def depth_cm(s): return round(s['swe'] / s['rho'] * 100) if s['swe'] > 0 else 0


def fetch(pts, past, fut):
    data = []
    for i in range(0, len(pts), 40):
        part = pts[i:i + 40]
        q = {'latitude': ','.join(str(p[0]) for p in part), 'longitude': ','.join(str(p[1]) for p in part),
             'elevation': ','.join(str(p[2]) for p in part), 'hourly': 'temperature_2m,precipitation',
             'past_days': past, 'forecast_days': fut, 'timezone': 'Europe/Ljubljana'}
        j = get(API + '?' + urllib.parse.urlencode(q, safe=','))
        data += j if isinstance(j, list) else [j]
        time.sleep(1)
    return data


def main():
    pts = points(); today = datetime.date.today()
    st = json.load(open(STATE)) if os.path.exists(STATE) else None
    if st and st.get('pts') != pts: print('points changed -> new season state'); st = None
    if st is None:
        y = today.year if (today.month, today.day) >= SEASON_START else today.year - 1
        start = max(datetime.date(y, *SEASON_START), today - datetime.timedelta(days=90))
        st = {'pts': pts, 'done': (start - datetime.timedelta(days=1)).isoformat(), 's': [{'swe': 0.0, 'rho': 100.0} for _ in pts], 'hist': {}}
    done = datetime.date.fromisoformat(st['done'])
    past = min(92, max(1, (today - done).days + 7))       # +7: also redo the last week's depths for the history
    print(len(pts), 'points; state done', done, '; fetching past_days', past)
    D = fetch(pts, past, 3)
    times = D[0]['hourly']['time']; days = sorted({t[:10] for t in times})
    S = st['s']; hist = st.get('hist', {})
    out_days = [d for d in days if d >= (today - datetime.timedelta(days=7)).isoformat()]
    depth = {d: [0] * len(pts) for d in out_days}
    for i, x in enumerate(D):
        T = x['hourly']['temperature_2m']; Pr = x['hourly']['precipitation']; s = dict(S[i])
        for d in days:
            dd = datetime.date.fromisoformat(d)
            if dd <= done:          # already in the saved state: only the history depth is known
                if d in depth and d in hist: depth[d][i] = hist[d][i]
                continue
            ks = [k for k, t in enumerate(times) if t.startswith(d)]
            s = step_day(s, [T[k] for k in ks], [Pr[k] for k in ks], pts[i][2], dd.month)
            if d in depth: depth[d][i] = depth_cm(s)
            if dd < today: S[i] = dict(s)            # save only finished days, never the forecast
    st['s'] = S; st['done'] = (today - datetime.timedelta(days=1)).isoformat()
    st['hist'] = {d: depth[d] for d in out_days if d < today.isoformat()}
    json.dump(st, open(STATE, 'w'), separators=(',', ':'))
    json.dump({'gen': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'step': STEP, 'low': LOW,
               'pts': pts, 'days': out_days, 'cm': [depth[d] for d in out_days]}, open(OUT, 'w'), separators=(',', ':'))
    t = today.isoformat()
    if t in depth:
        hi = [(pts[i][2], depth[t][i]) for i in range(len(pts))]
        for e in (1000, 1500, 2000, 2500):
            v = [c for h, c in hi if h == e]
            if v: print(f'{e} m: median {sorted(v)[len(v)//2]} cm, max {max(v)} cm ({len(v)} points)')
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


if __name__ == '__main__':
    main()
