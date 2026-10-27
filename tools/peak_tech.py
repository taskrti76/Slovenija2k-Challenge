"""Difficulty class per peak from its routes -> data/peak_tech.json (merged into the page by tools/build.py).

Input: data/peak_tech_raw.json, written by the headless run (window.__peakTech for every peak: all routes found from
parkings, each with its hardest SAC grade and whether it uses a via ferrata).
Class of a peak = class of its EASIEST route (the normal route), as PZS marks paths: 1 lahka (T1–T2) · 2 zahtevna (T3) · 3 zelo zahtevna (T4–T6 / ferrata).
Peaks without any mapped route (off-trail) get class 2 and "x":1. Hand fixes go to data/tech_overrides.json, e.g.
  {"jalovec-2645": {"c": 3, "s": 5}}
"""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(R, 'data', 'peak_tech_raw.json'), encoding='utf8'))
out = {}; hist = {1: 0, 2: 0, 3: 0}
cls = lambda r: 3 if r['fer'] or (r['sac'] or 0) >= 4 else 2 if (r['sac'] or 0) >= 3 else 1
for pid, v in raw.items():
    rs = (v or {}).get('routes') or []
    for r in rs: r['cls'] = cls(r)
    if not rs:
        out[pid] = {'c': 2, 's': None, 'x': 1}
    else:
        best = min(rs, key=lambda r: (r['cls'], r['sac'], r['km']))
        out[pid] = {'c': best['cls'], 's': best['sac'] or None, 'f': 1 if all(r['fer'] for r in rs) else 0, 'n': len(rs)}
    hist[out[pid]['c']] += 1
json.dump(out, open(os.path.join(R, 'data', 'peak_tech.json'), 'w', encoding='utf8'), separators=(',', ':'), sort_keys=True)
print(len(out), 'peaks; classes', hist, '; off-trail', sum(1 for x in out.values() if x.get('x')))
