"""Build the site from src/.
  python tools/build.py            -> index.html  (web: loads dvat-osm.json.gz + snow.json next to it)
  python tools/build.py --single   -> dist/dvatisocaki-single.html (everything embedded, works offline / from file://)
"""
import json, os, base64, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda f: open(os.path.join(R, 'src', f), encoding='utf8').read()
single = '--single' in sys.argv
P = json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8'))
for _p in P: _p.setdefault('tier', '2000')
_x = os.path.join(R, 'src', 'peaks_extra.json')   # 1500–2000 list + extra 2000 m subpeaks (tools/make_1500.py)
P_ALL = P + (json.load(open(_x, encoding='utf8')) if os.path.exists(_x) else [])
# difficulty class per peak (tools/peak_tech.py from the routes; data/tech_overrides.json wins): {"c":1-3,"s":T of easiest route,"f":ferrata only}
_t = os.path.join(R, 'data', 'peak_tech.json'); _o = os.path.join(R, 'data', 'tech_overrides.json')
TECH = json.load(open(_t, encoding='utf8')) if os.path.exists(_t) else {}
if os.path.exists(_o):
    for k, v in json.load(open(_o, encoding='utf8')).items():
        if not k.startswith('_'): TECH[k] = {**TECH.get(k, {}), **v}
for _p in P_ALL:
    if _p['id'] in TECH: _p['tech'] = TECH[_p['id']]
pk = os.path.join(R, 'dvat-osm.json.gz')
b64 = base64.b64encode(open(pk, 'rb').read()).decode() if single and os.path.exists(pk) else ''
out = (S('dvatisocaki_template.html')
       .replace('__PEAKS__', json.dumps(P_ALL, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
       .replace('__PACKJS__', S('pack.js')).replace('__TRAILS__', 'window.DATA_FIX=' + json.dumps({k: v for k, v in json.load(open(os.path.join(R, 'data', 'data_fixes.json'), encoding='utf8')).items() if not k.startswith('_')}, ensure_ascii=False, separators=(',', ':')) + ';\n' + S('trails.js')).replace('__V360__', S('v360.js')).replace('__EXTRAS__', S('extras.js') + '\n' + S('weather.js') + '\n' + S('settings.js') + '\n' + S('account.js'))
       .replace('__BORDER__', json.dumps(json.load(open(os.path.join(R, 'data', 'slovenia_border.json')))['coordinates'], separators=(',', ':')))
       .replace('__PACKSRC__', '' if single else ' data-src="dvat-osm.json.gz"')
       .replace('__OSMPACK__', b64))
dst = os.path.join(R, 'dist', 'dvatisocaki-single.html') if single else os.path.join(R, 'index.html')
os.makedirs(os.path.dirname(dst), exist_ok=True)
open(dst, 'w', encoding='utf8').write(out)
print('built', os.path.relpath(dst, R), len(out) // 1024, 'KB')
if not single:  # installable app: manifest + service worker (version = hash of the page + data, so phones pick up new builds)
    import hashlib
    ver = hashlib.sha1(out.encode('utf8') + (open(pk, 'rb').read() if os.path.exists(pk) else b'')).hexdigest()[:10]
    open(os.path.join(R, 'sw.js'), 'w', encoding='utf8').write(S('sw_template.js').replace('__VER__', ver))
    json.dump({"name": "Slovenski dvatisočaki", "short_name": "Dvatisočaki", "description": "3D karta slovenskih vrhov nad 2000 m - poti, 360° razgled, sneg.",
               "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any", "background_color": "#1b1f1e", "theme_color": "#1f3b57", "lang": "sl",
               "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                         {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]},
              open(os.path.join(R, 'manifest.webmanifest'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('built sw.js', ver, '+ manifest.webmanifest')
# helper tool: LiDAR analysis of OSM peaks >= 1500 m (runs in the browser, exports CSV)
T = os.path.join(R, 'tools', 'src', 'peaks1500_template.html')
if os.path.exists(T) and not single:
    osm = json.load(open(os.path.join(R, 'data', 'osm_peaks_1500.json'), encoding='utf8'))
    ours = [{'id': p['id'], 'lat': p['lat'], 'lon': p['lon']} for p in P]
    t2 = (open(T, encoding='utf8').read().replace('__PROMCORE__', open(os.path.join(R, 'tools', 'src', 'promcore.js'), encoding='utf8').read())
          .replace('__OSM__', json.dumps(osm, ensure_ascii=False, separators=(',', ':'))).replace('__OURS__', json.dumps(ours, separators=(',', ':')))
          .replace('__N__', str(len(osm))))
    open(os.path.join(R, 'tools', 'vrhovi-1500.html'), 'w', encoding='utf8').write(t2)
    print('built tools/vrhovi-1500.html', len(t2) // 1024, 'KB')
