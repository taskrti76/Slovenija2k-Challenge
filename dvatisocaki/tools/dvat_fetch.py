#!/usr/bin/env python3
"""
Dvatisocaki - download trails, roads, huts and parking within 20 km of the Slovenian 2000 m peaks
from OpenStreetMap (Overpass API) and write dvat-osm.json.gz for the map.

Usage:   python dvat_fetch.py
Needs:   Python 3.8+  (no extra packages)
Resumes: finished areas are kept in the folder "osm_boxes" - just run it again if it stops.
Result:  dvat-osm.json.gz  (send this file)
"""
import json, gzip, os, sys, time, math, re, threading, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

BOXES = [[45.96, 13.5, 46.08, 13.68], [45.96, 13.68, 46.08, 13.86], [46.08, 13.14, 46.2, 13.32], [46.08, 13.32, 46.2, 13.5], [46.08, 13.5, 46.2, 13.68], [46.08, 13.68, 46.2, 13.86], [46.08, 13.86, 46.2, 14.04], [46.08, 14.22, 46.2, 14.4], [46.08, 14.4, 46.2, 14.58], [46.08, 14.58, 46.2, 14.76], [46.08, 14.76, 46.2, 14.94], [46.2, 13.14, 46.32, 13.32], [46.2, 13.32, 46.32, 13.5], [46.2, 13.5, 46.32, 13.68], [46.2, 13.68, 46.32, 13.86], [46.2, 13.86, 46.32, 14.04], [46.2, 14.04, 46.32, 14.22], [46.2, 14.22, 46.32, 14.4], [46.2, 14.4, 46.32, 14.58], [46.2, 14.58, 46.32, 14.76], [46.2, 14.76, 46.32, 14.94], [46.2, 14.94, 46.32, 15.12], [46.32, 13.14, 46.44, 13.32], [46.32, 13.32, 46.44, 13.5], [46.32, 13.5, 46.44, 13.68], [46.32, 13.68, 46.44, 13.86], [46.32, 13.86, 46.44, 14.04], [46.32, 14.04, 46.44, 14.22], [46.32, 14.22, 46.44, 14.4], [46.32, 14.4, 46.44, 14.58], [46.32, 14.58, 46.44, 14.76], [46.32, 14.76, 46.44, 14.94], [46.32, 14.94, 46.44, 15.12], [46.44, 13.14, 46.56, 13.32], [46.44, 13.32, 46.56, 13.5], [46.44, 13.5, 46.56, 13.68], [46.44, 13.68, 46.56, 13.86], [46.44, 13.86, 46.56, 14.04], [46.44, 14.04, 46.56, 14.22], [46.44, 14.22, 46.56, 14.4], [46.44, 14.4, 46.56, 14.58], [46.44, 14.58, 46.56, 14.76], [46.44, 14.76, 46.56, 14.94], [46.44, 14.94, 46.56, 15.12], [46.56, 13.32, 46.68, 13.5], [46.56, 13.5, 46.68, 13.68], [46.56, 13.68, 46.68, 13.86], [46.56, 13.86, 46.68, 14.04], [46.56, 14.04, 46.68, 14.22], [46.56, 14.22, 46.68, 14.4], [46.56, 14.4, 46.68, 14.58], [46.56, 14.58, 46.68, 14.76], [46.56, 14.76, 46.68, 14.94], [46.56, 14.94, 46.68, 15.12], [46.68, 13.86, 46.8, 14.04], [46.68, 14.58, 46.8, 14.76], [46.68, 14.76, 46.8, 14.94]]   # [south, west, north, east], 57 areas covering everything within 20 km of a peak

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
    path = os.path.join(CACHE, f"box_{i:02d}.json")
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

def encode(ways, poi, marked):
    names, nidx, K, S, V, N, L, XY = [], {}, [], [], [], [], [], []
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
    return {"v": 1, "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "w": {"k": "".join(K), "s": S, "vis": V, "n": N, "names": names, "len": L, "xy": XY}, "p": P,
            "rb": list(range(16)), "ext": 1}

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
    ways, poi, marked = {}, {}, set()
    for i in range(len(BOXES)):
        with open(os.path.join(CACHE, f"box_{i:02d}.json"), encoding="utf-8") as f:
            j = json.load(f)
        for x in j["elements"]:
            if x["type"] == "relation":
                marked.update(m["ref"] for m in x.get("members", []) if m["type"] == "way")
            elif x["type"] == "way" and "geometry" in x and (TRAILRE.match((x.get("tags") or {}).get("highway", "")) or ROADRE.match((x.get("tags") or {}).get("highway", ""))):
                ways[x["id"]] = x
            elif x.get("tags"):
                poi[x["type"] + str(x["id"])] = x
    pk = encode(list(ways.values()), list(poi.values()), marked)
    raw = json.dumps(pk, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    with gzip.open(OUT, "wb", compresslevel=9) as f:
        f.write(raw)
    nroads = sum(pk["w"]["k"].count(c) for c in "RTrs")
    print(f"Done: {len(ways)} ways ({nroads} roads), {len(pk['p'])} huts/parking/springs/places, {len(marked)} marked trail ways.")
    print(f"Wrote {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB). Send this file.")

if __name__ == "__main__":
    main()
