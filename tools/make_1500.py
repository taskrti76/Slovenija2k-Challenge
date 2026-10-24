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
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def si_name(r):
    if r['name_sl']: return r['name_sl'].strip()
    n = r['name'].strip()
    if ' / ' in n:
        parts = [x.strip() for x in n.split(' / ')]
        sl = [x for x in parts if re.search(r'[čšžČŠŽ]', x)]
        return sl[0] if sl else parts[0]
    return n
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig'), delimiter=';'))
P2k = json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8'))
loc2k = [p for p in P2k if p['lat'] is not None]
def rng(la, lo):
    best, bd = None, 15000
    for p in loc2k:
        d = hav(la, lo, p['lat'], p['lon'])
        if d < bd: bd, best = d, p
    if best: return best['range']
    if la < 45.9: return 'Snežnik'
    if lo > 15.0: return 'Pohorje'
    return 'Predalpe'
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
    name = si_name(r)
    if pr < MAIN and (pr < SUB or not name): continue
    if not name: name = f'Vrh {round(h)} m'
    pid = f'{slug(name)}-{round(h)}'
    while pid in ids: pid += 'x'
    ids.add(pid)
    e = {'id': pid, 'name': name, 'pb_name': r['name'] if r['name'] != name else '', 'elev': round(h, 1), 'prom': round(pr), 'rank': None,
         'range': rng(la, lo), 'massif': '', 'is_sub': 'no' if pr >= MAIN else 'yes', 'lat': la, 'lon': lo, 'dem_h': round(h, 1),
         'coord_status': 'ok', 'coord_src': 'osm-lidar', 'notes': f"OSM {r['osm_id']}" + (' · prominenca spodnja meja' if r['prom_lower_bound'] == '1' else '')}
    if h >= 2000: e['tier'] = '2000'; new2k.append(e)
    elif h >= 1500: e['tier'] = '1500'; new15.append(e)
main = sorted([p for p in new15 if p['is_sub'] == 'no'], key=lambda p: -p['prom'])
for i, p in enumerate(main): p['rank15'] = i + 1
json.dump(new15 + new2k, open(os.path.join(R, 'src', 'peaks_extra.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
from collections import Counter
print(f'1500–2000: {len(new15)} ({len(main)} main ≥{MAIN} m, {len(new15)-len(main)} subpeaks ≥{SUB} m) · new 2000+ subpeaks: {len(new2k)}')
print(' ranges 1500:', dict(Counter(p['range'] for p in new15)))
print(' new 2000+:', ', '.join(f"{p['name']} {p['elev']:.0f} ({p['prom']})" for p in new2k))
print(' top main:', ', '.join(f"{p['name']} {p['elev']:.0f}/{p['prom']}" for p in main[:12]))
print(' unnamed main:', [p['name'] for p in main if p['name'].startswith('Vrh ')])
