"""Build src/peaks_1500.json (+ extra 2000 m subpeaks) from the LiDAR CSV exported by tools/vrhovi-1500.html.
Tiers: main = prominence >= 100 m, subpeak = named and prominence >= 30 m.   Usage: python tools/make_1500.py vrhovi_1500_lidar.csv"""
import csv, json, math, os, re, sys, unicodedata
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN, SUB = 100, 30
def f(x):
    try: return float(x)
    except: return None
def hav(a, b, c, d):
    return 2*6371000*math.asin(math.sqrt(math.sin(math.radians(c-a)/2)**2+math.cos(math.radians(a))*math.cos(math.radians(c))*math.sin(math.radians(d-b)/2)**2))
# Slovenia polygon (Natural Earth 1:10m via world-atlas); peaks kept if inside or within 600 m of the border (border summits)
BORDER = json.load(open(os.path.join(R, 'data', 'slovenia_border.json')))['coordinates'][0]
def in_si(la, lo, tol=1000):
    ins = False; j = len(BORDER) - 1
    for i in range(len(BORDER)):
        xi, yi = BORDER[i]; xj, yj = BORDER[j]
        if (yi > la) != (yj > la) and lo < (xj - xi) * (la - yi) / (yj - yi) + xi: ins = not ins
        j = i
    if ins: return True
    kx, ky = 111320 * math.cos(math.radians(la)), 111320
    for i in range(len(BORDER) - 1):
        (x1, y1), (x2, y2) = BORDER[i], BORDER[i + 1]
        ax, ay, bx, by, px, py = x1 * kx, y1 * ky, x2 * kx, y2 * ky, lo * kx, la * ky
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        t = 0 if not L2 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
        if math.hypot(ax + t * dx - px, ay + t * dy - py) < tol: return True
    return False
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def si_name(r):
    if r['name_sl']: return r['name_sl'].split(';')[0].strip()
    n = r['name'].split(';')[0].strip()
    if ' / ' in n:
        parts = [x.strip() for x in n.split(' / ')]
        sl = [x for x in parts if re.search(r'[čšžČŠŽ]', x)]
        return sl[0] if sl else parts[0]
    return n
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig'), delimiter=';'))
# unnamed terrain summits: borrow the name of a named OSM peak within 250 m that was not matched itself (duplicate nodes, e.g. Golica)
named = [r for r in rows if r['name'] and not f(r['prom'])]
for r in rows:
    if r['name'] or not f(r['prom']) or not f(r['lat']): continue
    best, bd = None, 250
    for x in named:
        d = hav(f(r['lat']), f(r['lon']), f(x['osm_lat']), f(x['osm_lon']))
        if d < bd: bd, best = d, x
    if best:
        r['name'], r['name_sl'] = best['name'], best['name_sl']; named.remove(best)
        if best.get('src') == 'osm': r['src'] = 'osm'
P2k = json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8'))
loc2k = [p for p in P2k if p['lat'] is not None]
# Ranges follow the usual Slovenian hiking division (PZS guides / hribi.net "gorovja"): groups separated by main valleys.
# 1) Sava Dolinka (Rateče - Kranjska Gora - Jesenice - Radovljica) separates Julijske Alpe (south) from Karavanke (north).
# 2) south of Baška grapa - Sorica, and Jelovica/Ratitovec east of Soriška planina -> Predalpe (Škofjeloško-Cerkljansko hribovje).
# 3) Pohorje / Košenjak east of 15.0°, Snežnik south of 45.9°.
# 4) otherwise: range of the nearest classified 2000 m peak on the same side of those valleys (max 15 km).
# Per-peak exceptions: data/range_overrides.json  {"Peak name": "Range"}
DOLINKA = [(13.70, 46.505), (13.785, 46.484), (13.84, 46.478), (13.94, 46.462), (14.02, 46.446), (14.06, 46.435), (14.14, 46.40), (14.18, 46.345), (14.36, 46.24)]
def dolinka_lat(lo):
    for (x1, y1), (x2, y2) in zip(DOLINKA, DOLINKA[1:]):
        if x1 <= lo <= x2: return y1 + (y2 - y1) * (lo - x1) / (x2 - x1)
    return None
_ov = os.path.join(R, 'data', 'range_overrides.json')
OVERRIDES = json.load(open(_ov, encoding='utf8')) if os.path.exists(_ov) else {}
def rng(la, lo, name=''):
    if name in OVERRIDES: return OVERRIDES[name]
    if la < 45.9: return 'Snežnik'
    if lo > 15.0: return 'Pohorje'
    if 13.70 <= lo < 14.30 and (la < 46.21 or (lo > 14.03 and la < 46.30)): return 'Predalpe'
    dl = dolinka_lat(lo)
    allowed = ({'Karavanke'} if la > dl else {'Julijske Alpe', 'Kamniško-Savinjske Alpe'}) if dl is not None else None
    best, bd = None, 15000
    for p in loc2k:
        if allowed and p['range'] not in allowed: continue
        d = hav(la, lo, p['lat'], p['lon'])
        if d < bd: bd, best = d, p
    return best['range'] if best else None   # resolved below from neighbouring new peaks
# 1) upgrade approximate / missing 2000 m coordinates: same name, height within 15 m, < 150 m away (or no position yet)
def norm(x): return re.sub(r'\s+', ' ', re.sub(r'\(.*?\)', '', unicodedata.normalize('NFKD', x).encode('ascii', 'ignore').decode().lower())).strip()
used, nfix = set(), 0
for p in P2k:
    if p['coord_status'] == 'ok': continue
    keys = {norm(p['name'])} | ({norm(p['pb_name'])} if p.get('pb_name') else set()) | {norm(m) for m in re.findall(r'\((.*?)\)', p['name'])}
    best = None
    for r in rows:
        h, la, lo = f(r['lidar_h']), f(r['lat']), f(r['lon'])
        if h is None or la is None or abs(h - p['elev']) > 15: continue
        if not keys & {norm(x) for x in r['name'].split(' / ') + [r['name_sl']] if x}: continue
        d = 0 if p['lat'] is None else hav(p['lat'], p['lon'], la, lo)
        if d > 150: continue
        if not best or abs(h - p['elev']) < best[0]: best = (abs(h - p['elev']), r, la, lo, h)
    if best:
        _, r, la, lo, h = best; used.add(r['osm_id']); nfix += 1
        p.update(lat=la, lon=lo, dem_h=round(h, 1), coord_status='ok', coord_src='osm-lidar')
json.dump(P2k, open(os.path.join(R, 'src', 'peaks_final.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(f'2000 list: {nfix} approximate/missing positions upgraded from OSM + LiDAR')
loc2k = [p for p in P2k if p['lat'] is not None]
new15, new2k, ids = [], [], {p['id'] for p in P2k}
for r in rows:
    if r['osm_id'] in used: continue
    h, pr, la, lo = f(r['lidar_h']), f(r['prom']), f(r['lat']), f(r['lon'])
    if r['in_2000_list'] or h is None or pr is None or la is None: continue
    if r.get('src', 'osm') != 'osm' and not in_si(la, lo, 1000): nout = globals().get('nout', 0) + 1; globals()['nout'] = nout; continue
    name = si_name(r)
    if name and any(norm(name) == norm(q['name']) and q['lat'] is not None and hav(la, lo, q['lat'], q['lon']) < 1500 for q in P2k): continue  # already in the 2000 list
    if pr < MAIN and (pr < SUB or not name): continue
    if not name: name = f'Vrh {round(h)} m'
    pid = f'{slug(name)}-{round(h)}'
    while pid in ids: pid += 'x'
    ids.add(pid)
    e = {'id': pid, 'name': name, 'pb_name': r['name'] if r['name'] != name else '', 'elev': round(h, 1), 'prom': round(pr), 'rank': None,
         'range': rng(la, lo, name), 'massif': '', 'is_sub': 'no' if pr >= MAIN else 'yes', 'lat': la, 'lon': lo, 'dem_h': round(h, 1),
         'coord_status': 'ok', 'coord_src': 'osm-lidar', 'notes': f"OSM {r['osm_id']}" + (' · prominenca spodnja meja' if r['prom_lower_bound'] == '1' else '')}
    if h >= 2000: e['tier'] = '2000'; new2k.append(e)
    elif h >= 1500: e['tier'] = '1500'; new15.append(e)
# peaks too far from any 2000 m peak (e.g. Spodnje Bohinjske gore): take the range of the nearest resolved new peak, chain-wise
allp = new15 + new2k
for _ in range(10):
    todo = [p for p in allp if p['range'] is None]
    if not todo: break
    for p in todo:
        dl = dolinka_lat(p['lon']); ok = None if dl is None else ({'Karavanke'} if p['lat'] > dl else {'Julijske Alpe', 'Kamniško-Savinjske Alpe'})
        c = [(hav(p['lat'], p['lon'], q['lat'], q['lon']), q['range']) for q in allp if q['range'] and (not ok or q['range'] in ok)]
        c = [x for x in c if x[0] < 6000]
        if c: p['range'] = min(c)[1]
for p in allp:
    if p['range'] is None: p['range'] = 'Predalpe'
main = sorted([p for p in new15 if p['is_sub'] == 'no'], key=lambda p: -p['prom'])
for i, p in enumerate(main): p['rank15'] = i + 1
json.dump(new15 + new2k, open(os.path.join(R, 'src', 'peaks_extra.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
from collections import Counter
print(f'outside Slovenia skipped: {globals().get("nout",0)}')
print(f'1500–2000: {len(new15)} ({len(main)} main ≥{MAIN} m, {len(new15)-len(main)} subpeaks ≥{SUB} m) · new 2000+ subpeaks: {len(new2k)}')
print(' ranges 1500:', dict(Counter(p['range'] for p in new15)))
print(' new 2000+:', ', '.join(f"{p['name']} {p['elev']:.0f} ({p['prom']})" for p in new2k))
print(' top main:', ', '.join(f"{p['name']} {p['elev']:.0f}/{p['prom']}" for p in main[:12]))
print(' unnamed main:', [p['name'] for p in main if p['name'].startswith('Vrh ')])
