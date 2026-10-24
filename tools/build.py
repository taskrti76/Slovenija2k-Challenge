"""Build the site from src/.
  python tools/build.py            -> index.html  (web: loads dvat-osm.json.gz + snow.json next to it)
  python tools/build.py --single   -> dist/dvatisocaki-single.html (everything embedded, works offline / from file://)
"""
import json, os, base64, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda f: open(os.path.join(R, 'src', f), encoding='utf8').read()
single = '--single' in sys.argv
P = json.load(open(os.path.join(R, 'src', 'peaks_final.json'), encoding='utf8'))
pk = os.path.join(R, 'dvat-osm.json.gz')
b64 = base64.b64encode(open(pk, 'rb').read()).decode() if single and os.path.exists(pk) else ''
out = (S('dvatisocaki_template.html')
       .replace('__PEAKS__', json.dumps(P, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
       .replace('__PACKJS__', S('pack.js')).replace('__TRAILS__', S('trails.js')).replace('__V360__', S('v360.js'))
       .replace('__PACKSRC__', '' if single else ' data-src="dvat-osm.json.gz"')
       .replace('__OSMPACK__', b64))
dst = os.path.join(R, 'dist', 'dvatisocaki-single.html') if single else os.path.join(R, 'index.html')
os.makedirs(os.path.dirname(dst), exist_ok=True)
open(dst, 'w', encoding='utf8').write(out)
print('built', os.path.relpath(dst, R), len(out) // 1024, 'KB')
