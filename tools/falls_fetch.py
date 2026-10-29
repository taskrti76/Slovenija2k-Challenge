"""Waterfalls for the map layer "Vode" (run by .github/workflows/osm_extras.yml once a month, or by hand).

OSM waterway=waterfall (nodes, and ways/areas as their centre) in the mountains -> falls.json (GeoJSON) next to the page.
Properties: n = name, l = label ("Slap Savica (78 m)"; unnamed falls only with a height of 10 m or more), h = height in m.
Needs: Python 3.9+ only.
"""
import json, os, sys, time, urllib.request, urllib.parse

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BBOX = '46.0,13.25,46.75,15.25'          # s, w, n, e - same area as the trail pack, with a margin
Q = f'[out:json][timeout:90];nwr["waterway"="waterfall"]({BBOX});out center tags;'
EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
UA = {'User-Agent': 'dvatisocaki-falls/1.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}


def main():
    j = None
    for a in range(3):
        for u in EP:
            try:
                req = urllib.request.Request(u, data=urllib.parse.urlencode({'data': Q}).encode(), headers=UA)
                with urllib.request.urlopen(req, timeout=120) as r: j = json.loads(r.read())
                if j.get('elements'): break
                j = None
            except Exception as ex: print('overpass', u, ex)
        if j: break
        time.sleep(30)
    if not j: sys.exit('::error::no waterfalls from Overpass (all servers failed) - falls.json left as it was')
    feats = []
    for e in j['elements']:
        la = e.get('lat', (e.get('center') or {}).get('lat')); lo = e.get('lon', (e.get('center') or {}).get('lon'))
        if la is None: continue
        t = e.get('tags', {}); nm = t.get('name') or t.get('name:sl') or ''
        try: h = float(str(t.get('height', '')).replace('m', '').replace(',', '.').strip())
        except ValueError: h = 0
        lbl = (nm + (f' ({round(h)} m)' if h > 0 else '')) if nm else (f'{round(h)} m' if h >= 10 else '')
        feats.append({'type': 'Feature', 'properties': {'n': nm, 'l': lbl, 'h': round(h) if h > 0 else None},
                      'geometry': {'type': 'Point', 'coordinates': [round(lo, 5), round(la, 5)]}})
    feats.sort(key=lambda f: f['geometry']['coordinates'])
    json.dump({'type': 'FeatureCollection', 'features': feats}, open(os.path.join(R, 'falls.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(len(feats), 'waterfalls,', sum(1 for f in feats if f['properties']['n']), 'with a name')


if __name__ == '__main__':
    main()
