#!/usr/bin/env python3
"""
Dvatisocaki - download trails, roads, huts and parking within 20 km of the Slovenian 2000 m peaks
from OpenStreetMap (Overpass API) and write dvat-osm.json.gz for the map.

Usage:   python dvat_fetch.py            (download what is missing, then build + slim the pack)
         python dvat_fetch.py --no-slim  (keep every footway / service road / point)
Needs:   Python 3.8+  (no extra packages)
Resumes: finished areas are kept in the folder "osm_boxes" - just run it again if it stops.
         Already downloaded areas are reused, so re-running only rebuilds the pack (about 1-2 min).
Result:  dvat-osm.json.gz  -> upload to the repo root (next to index.html)
"""
import json, gzip, os, sys, time, math, re, threading, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

BOXES = [[45.96, 13.5, 46.08, 13.68], [45.96, 13.68, 46.08, 13.86], [46.08, 13.14, 46.2, 13.32], [46.08, 13.32, 46.2, 13.5], [46.08, 13.5, 46.2, 13.68], [46.08, 13.68, 46.2, 13.86], [46.08, 13.86, 46.2, 14.04], [46.08, 14.22, 46.2, 14.4], [46.08, 14.4, 46.2, 14.58], [46.08, 14.58, 46.2, 14.76], [46.08, 14.76, 46.2, 14.94], [46.2, 13.14, 46.32, 13.32], [46.2, 13.32, 46.32, 13.5], [46.2, 13.5, 46.32, 13.68], [46.2, 13.68, 46.32, 13.86], [46.2, 13.86, 46.32, 14.04], [46.2, 14.04, 46.32, 14.22], [46.2, 14.22, 46.32, 14.4], [46.2, 14.4, 46.32, 14.58], [46.2, 14.58, 46.32, 14.76], [46.2, 14.76, 46.32, 14.94], [46.2, 14.94, 46.32, 15.12], [46.32, 13.14, 46.44, 13.32], [46.32, 13.32, 46.44, 13.5], [46.32, 13.5, 46.44, 13.68], [46.32, 13.68, 46.44, 13.86], [46.32, 13.86, 46.44, 14.04], [46.32, 14.04, 46.44, 14.22], [46.32, 14.22, 46.44, 14.4], [46.32, 14.4, 46.44, 14.58], [46.32, 14.58, 46.44, 14.76], [46.32, 14.76, 46.44, 14.94], [46.32, 14.94, 46.44, 15.12], [46.44, 13.14, 46.56, 13.32], [46.44, 13.32, 46.56, 13.5], [46.44, 13.5, 46.56, 13.68], [46.44, 13.68, 46.56, 13.86], [46.44, 13.86, 46.56, 14.04], [46.44, 14.04, 46.56, 14.22], [46.44, 14.22, 46.56, 14.4], [46.44, 14.4, 46.56, 14.58], [46.44, 14.58, 46.56, 14.76], [46.44, 14.76, 46.56, 14.94], [46.44, 14.94, 46.56, 15.12], [46.56, 13.32, 46.68, 13.5], [46.56, 13.5, 46.68, 13.68], [46.56, 13.68, 46.68, 13.86], [46.56, 13.86, 46.68, 14.04], [46.56, 14.04, 46.68, 14.22], [46.56, 14.22, 46.68, 14.4], [46.56, 14.4, 46.68, 14.58], [46.56, 14.58, 46.68, 14.76], [46.56, 14.76, 46.68, 14.94], [46.56, 14.94, 46.68, 15.12], [46.68, 13.86, 46.8, 14.04], [46.68, 14.58, 46.8, 14.76], [46.68, 14.76, 46.8, 14.94], [45.36, 14.04, 45.48, 14.22], [45.36, 14.22, 45.48, 14.4], [45.36, 14.4, 45.48, 14.58], [45.36, 14.58, 45.48, 14.76], [45.48, 14.04, 45.6, 14.22], [45.48, 14.22, 45.6, 14.4], [45.48, 14.4, 45.6, 14.58], [45.48, 14.58, 45.6, 14.76], [45.6, 14.04, 45.72, 14.22], [45.6, 14.22, 45.72, 14.4], [45.6, 14.4, 45.72, 14.58], [45.6, 14.58, 45.72, 14.76], [45.72, 14.22, 45.84, 14.4], [45.72, 14.4, 45.84, 14.58], [45.72, 14.58, 45.84, 14.76], [45.96, 13.32, 46.08, 13.5], [45.96, 13.86, 46.08, 14.04], [45.96, 14.04, 46.08, 14.22], [45.96, 14.22, 46.08, 14.4], [45.96, 14.76, 46.08, 14.94], [46.08, 12.96, 46.2, 13.14], [46.08, 14.04, 46.2, 14.22], [46.08, 14.94, 46.2, 15.12], [46.2, 12.96, 46.32, 13.14], [46.2, 15.12, 46.32, 15.3], [46.2, 15.3, 46.32, 15.48], [46.2, 15.48, 46.32, 15.66], [46.32, 12.96, 46.44, 13.14], [46.32, 15.12, 46.44, 15.3], [46.32, 15.3, 46.44, 15.48], [46.32, 15.48, 46.44, 15.66], [46.44, 15.12, 46.56, 15.3], [46.44, 15.3, 46.56, 15.48], [46.44, 15.48, 46.56, 15.66], [46.56, 15.12, 46.68, 15.3], [46.56, 15.3, 46.68, 15.48], [46.56, 15.48, 46.68, 15.66], [46.68, 13.5, 46.8, 13.68], [46.68, 13.68, 46.8, 13.86], [46.68, 14.94, 46.8, 15.12], [46.68, 15.12, 46.8, 15.3], [46.8, 14.76, 46.92, 14.94], [46.8, 14.94, 46.92, 15.12], [46.8, 15.12, 46.92, 15.3]]   # [south, west, north, east]: first 57 = 20 km around the 2000 m peaks, the rest = 20 km around the 1500–2000 m peaks (order matters: cache files are numbered)

SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
CACHE = "osm_boxes"
OUT = "dvat-osm.json.gz"

ROADQ = '["highway"~"^(primary|secondary|tertiary|unclassified|service|road)$"]["service"!~"parking_aisle|driveway|drive-through|alley"]["access"!~"^(no|private)$"]'
def query(b):
    b = ",".join(str(x) for x in b)
    return (f'[out:json][timeout:240];(way["highway"~"^(path|track|via_ferrata|bridleway|footway)$"]({b});way{ROADQ}({b}););out tags geom qt;'
            f'(nwr["tourism"~"^(alpine_hut|wilderness_hut)$"]({b});nwr["amenity"="shelter"]["shelter_type"~"^(basic_hut|lean_to|rock_shelter)$"]({b});'
            f'nwr["amenity"="parking"]({b});node["highway"="trailhead"]({b});node["natural"="spring"]({b});'
            f'node["place"~"^(village|hamlet|isolated_dwelling|locality)$"]({b}););out center tags;'
            f'rel["route"="hiking"]({b});out body;')

bad_until = {}           # server -> time until which we avoid it
lock = threading.Lock()

def fetch_box(i):
    path = os.path.join(CACHE, f"box_{i:03d}.json" if i >= 100 else f"box_{i:02d}.json")
    if os.path.exists(path):
        return i, "cached"
    data = urllib.parse.urlencode({"data": query(BOXES[i])}).encode()
    for attempt in range(12):
        for s in range(len(SERVERS)):
            srv = SERVERS[(i + s) % len(SERVERS)]
            with lock:
                if bad_until.get(srv, 0) > time.time():
                    continue
            try:
                req = urllib.request.Request(srv, data=data, headers={"User-Agent": "dvatisocaki-fetch/1.0"})
                with urllib.request.urlopen(req, timeout=300) as r:
                    j = json.loads(r.read().decode("utf-8"))
                remark = j.get("remark", "") or ""
                if re.search(r"error|timed out|out of memory", remark, re.I):
                    raise RuntimeError(remark[:80])
                tmp = path + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(j, f)
                os.replace(tmp, path)
                return i, srv.split("/")[2]
            except urllib.error.HTTPError as e:
                with lock:
                    bad_until[srv] = time.time() + (30 if e.code in (429, 504) else 60)
            except Exception:
                with lock:
                    bad_until[srv] = time.time() + 45
        time.sleep(min(60, 5 * (attempt + 1)))
    return i, None

# ---------- pack encoder (same format as pack.js in the map) ----------
PK_SAC = ['', 'hiking', 'mountain_hiking', 'demanding_mountain_hiking', 'alpine_hiking', 'demanding_alpine_hiking', 'difficult_alpine_hiking']
ROADRE = re.compile(r'^(primary|secondary|tertiary|unclassified|residential|living_street|service|road)')
TRAILRE = re.compile(r'^(path|track|via_ferrata|bridleway|footway)$')
def jsround(x):  # JavaScript Math.round
    return math.floor(x + 0.5)

RELT = ['name', 'ref', 'operator', 'network', 'from', 'to', 'osmc:symbol']

def encode(ways, poi, marked, rels=()):
    R, wrel = [], {}
    for r in rels:   # named hiking relations -> list + per-way membership (pack v2)
        t = r.get("tags") or {}
        if not (t.get("name") or t.get("ref")):
            continue
        ri = len(R); R.append([t.get(k, "") for k in RELT])
        for m in r.get("members", []):
            if m["type"] == "way":
                a = wrel.setdefault(m["ref"], [])
                if ri not in a: a.append(ri)
    names, nidx, K, S, V, N, L, XY, RL = [], {}, [], [], [], [], [], [], []
    px = py = 0
    for w in ways:
        g = [p for p in (w.get("geometry") or []) if p]
        if len(g) < 2:
            continue
        t = w.get("tags") or {}
        h = t.get("highway", "")
        if ROADRE.match(h):
            k = 'R' if re.match(r'^(primary|secondary)', h) else 'T' if h.startswith('tertiary') else 's' if h in ('service', 'residential', 'living_street') else 'r'
        elif h == 'via_ferrata': k = 'f'
        elif h == 'track': k = 't'
        elif w["id"] in marked: k = 'm'
        elif h == 'footway': k = 'w'
        else: k = 'p'
        K.append(k)
        S.append(PK_SAC.index(t["sac_scale"]) if t.get("sac_scale") in PK_SAC else 0)
        V.append(1 if re.match(r'^(bad|horrible|no)$', t.get("trail_visibility", "")) else 0)
        ni = -1
        if t.get("name"):
            ni = nidx.get(t["name"])
            if ni is None:
                ni = len(names); nidx[t["name"]] = ni; names.append(t["name"])
        N.append(ni)
        L.append(len(g))
        a = wrel.get(w["id"]); RL.append(-1 if not a else a[0] if len(a) == 1 else a)
        for p in g:
            x, y = jsround(p["lon"] * 1e6), jsround(p["lat"] * 1e6)
            XY += [x - px, y - py]; px, py = x, y
    P = []
    for e in poi:
        t = e.get("tags") or {}
        la = e.get("lat", (e.get("center") or {}).get("lat"))
        lo = e.get("lon", (e.get("center") or {}).get("lon"))
        if la is None:
            continue
        if t.get("place"): k = 'place'
        elif t.get("tourism") == 'alpine_hut': k = 'hut'
        elif t.get("tourism") == 'wilderness_hut' or t.get("amenity") == 'shelter': k = 'biv'
        elif t.get("amenity") == 'parking':
            if t.get("access") == 'private': continue
            k = 'park'
        elif t.get("highway") == 'trailhead': k = 'th'
        elif t.get("natural") == 'spring': k = 'spring'
        else: continue
        P.append([k, t.get("name", ""), jsround(la * 1e6), jsround(lo * 1e6), t.get("ele", ""), t.get("website") or t.get("contact:website") or ""])
    return {"v": 2, "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "w": {"k": "".join(K), "s": S, "vis": V, "n": N, "names": names, "len": L, "xy": XY, "rel": RL}, "p": P, "r": R,
            "rb": list(range(16)), "ext": 1}

# ---------- keep only what is near a peak (whole ways, nothing cut at the edge): trails <=12 km, roads/POIs <=15 km
def prune_far(ways, poi, trail_km=12, road_km=15):
    here = os.path.dirname(os.path.abspath(__file__)); peaks = []
    for f in ('peaks_final.json', 'peaks_extra.json'):
        for cand in (os.path.join(here, '..', 'src', f), os.path.join(here, f)):
            if os.path.exists(cand): peaks += [p for p in json.load(open(cand, encoding='utf8')) if p.get('lat') is not None]; break
    if not peaks: print('prune: peak lists not found, skipped'); return ways, poi
    C, grid = 0.1, {}
    for p in peaks: grid.setdefault((math.floor(p['lat'] / C), math.floor(p['lon'] / C)), []).append(p)
    def near(la, lo, km):
        cy, cx, r = math.floor(la / C), math.floor(lo / C), int(km / 8) + 1
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                for p in grid.get((y, x), ()):
                    if math.hypot((p['lat'] - la) * 111.3, (p['lon'] - lo) * 77) <= km: return True
        return False
    kw = []
    for w in ways:
        g = w['geometry']; km = road_km if ROADRE.match((w.get('tags') or {}).get('highway', '')) else trail_km
        step = max(1, len(g) // 20)
        if any(near(q['lat'], q['lon'], km) for q in g[::step] + [g[-1]]): kw.append(w)
    kp = [e for e in poi if (e.get('lat', (e.get('center') or {}).get('lat')) is None) or near(e.get('lat', (e.get('center') or {}).get('lat')), e.get('lon', (e.get('center') or {}).get('lon')), road_km)]
    print(f"Prune: ways {len(ways)} -> {len(kw)}, POIs {len(poi)} -> {len(kp)} (far from every peak)")
    return kw, kp

# ---------- slimming (same rules as tools/slim_pack.js): phones need a lighter network ----------
def slim(ways, poi, marked, tol=3.0):
    key = lambda p: (jsround(p["lat"] * 1e6), jsround(p["lon"] * 1e6))
    is_trail = lambda w: re.match(r'^(path|track|via_ferrata|bridleway)$', (w.get("tags") or {}).get("highway", "")) or w["id"] in marked
    trail_pts, use = set(), {}
    for w in ways:
        g = w["geometry"]; tr = is_trail(w)
        for i, p in enumerate(g):
            k = key(p)
            if tr: trail_pts.add(k)
            use[k] = use.get(k, 0) + (2 if i in (0, len(g) - 1) else 1)
    C = 0.005; grid = {}
    for (a, b) in trail_pts:
        grid.setdefault((math.floor(a / 1e6 / C), math.floor(b / 1e6 / C)), []).append((a / 1e6, b / 1e6))
    def near_trail(la, lo, m):
        cy, cx = math.floor(la / C), math.floor(lo / C)
        for y in (cy - 1, cy, cy + 1):
            for x in (cx - 1, cx, cx + 1):
                for (p, q) in grid.get((y, x), ()):
                    if math.hypot((p - la) * 111320, (q - lo) * 76700) < m: return True
        return False
    keep, dw, ds = [], 0, 0
    for w in ways:
        h = (w.get("tags") or {}).get("highway", ""); g = w["geometry"]
        touches = any(key(p) in trail_pts for p in g)
        if h == "footway" and w["id"] not in marked and not touches: dw += 1; continue
        if h == "service" and not touches and not near_trail(g[0]["lat"], g[0]["lon"], 150) and not near_trail(g[-1]["lat"], g[-1]["lon"], 150): ds += 1; continue
        keep.append(w)
    KX, KY = 76700, 111320; before = after = 0
    for w in keep:
        g = [p for p in w["geometry"] if p]; n = len(g); before += n
        if n >= 3:
            k = [False] * n; k[0] = k[-1] = True
            for i in range(1, n - 1):
                if use.get(key(g[i]), 0) > 1: k[i] = True
            st, s0 = [], 0
            for i in range(1, n):
                if k[i]: st.append((s0, i)); s0 = i
            while st:
                a, b = st.pop()
                if b - a < 2: continue
                ax, ay, bx, by = g[a]["lon"] * KX, g[a]["lat"] * KY, g[b]["lon"] * KX, g[b]["lat"] * KY
                dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1; md, mi = -1, -1
                for i in range(a + 1, b):
                    d = abs((g[i]["lon"] * KX - ax) * dy - (g[i]["lat"] * KY - ay) * dx) / L
                    if d > md: md, mi = d, i
                if md > tol: k[mi] = True; st += [(a, mi), (mi, b)]
            g = [p for i, p in enumerate(g) if k[i]]
        w["geometry"] = g; after += len(g)
    dp_ = 0; poi2 = []
    for e in poi:
        t = e.get("tags") or {}
        la = e.get("lat", (e.get("center") or {}).get("lat")); lo = e.get("lon", (e.get("center") or {}).get("lon"))
        if t.get("amenity") == "parking" and la is not None and not near_trail(la, lo, 500): dp_ += 1; continue
        poi2.append(e)
    print(f"Slim: ways {len(ways)} -> {len(keep)} (-{dw} footways, -{ds} service roads), points {before} -> {after}, parkings -{dp_}")
    return keep, poi2

def main():
    os.makedirs(CACHE, exist_ok=True)
    todo = [i for i in range(len(BOXES)) if not os.path.exists(os.path.join(CACHE, f"box_{i:02d}.json"))]
    print(f"{len(BOXES)} areas, {len(BOXES) - len(todo)} already downloaded, {len(todo)} to go.")
    t0, done, failed = time.time(), 0, []
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(fetch_box, i) for i in todo]
        for f in as_completed(futs):
            i, how = f.result(); done += 1
            el = time.time() - t0
            eta = el / done * (len(todo) - done) / 60
            if how: print(f"  [{done}/{len(todo)}] area {i:2d} ok ({how})   ~{eta:.0f} min left", flush=True)
            else:   print(f"  [{done}/{len(todo)}] area {i:2d} FAILED - run the script again later", flush=True); failed.append(i)
    if failed:
        print(f"\n{len(failed)} areas failed. Run the script again - it continues where it stopped."); sys.exit(1)

    print("\nMerging ...")
    ways, poi, marked, rels = {}, {}, set(), {}
    for i in range(len(BOXES)):
        with open(os.path.join(CACHE, f"box_{i:02d}.json"), encoding="utf-8") as f:
            j = json.load(f)
        for x in j["elements"]:
            if x["type"] == "relation":
                marked.update(m["ref"] for m in x.get("members", []) if m["type"] == "way")
                rels[x["id"]] = x
            elif x["type"] == "way" and "geometry" in x and (TRAILRE.match((x.get("tags") or {}).get("highway", "")) or ROADRE.match((x.get("tags") or {}).get("highway", ""))):
                ways[x["id"]] = x
            elif x.get("tags"):
                poi[x["type"] + str(x["id"])] = x
    wl, pl = list(ways.values()), list(poi.values())
    if "--no-slim" not in sys.argv:
        wl, pl = slim(wl, pl, marked)
        wl, pl = prune_far(wl, pl)
    pk = encode(wl, pl, marked, list(rels.values()))
    raw = json.dumps(pk, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    with gzip.open(OUT, "wb", compresslevel=9) as f:
        f.write(raw)
    nroads = sum(pk["w"]["k"].count(c) for c in "RTrs")
    print(f"Done: {len(pk['w']['len'])} ways ({nroads} roads), {len(pk['p'])} huts/parking/springs/places, {len(marked)} marked trail ways, {len(pk['r'])} named hiking routes.")
    print(f"Wrote {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB). Upload it to the repo (replace the old one).")

if __name__ == "__main__":
    main()
