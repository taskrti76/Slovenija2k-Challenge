#!/usr/bin/env python3
"""Built-in copy of the site for the Android app (run by .github/workflows/android.yml, after npm install in app/).

The app loads the live website; when it can't (no signal) app/www/offline.html starts the copy it saved last time.
On a brand-new install there is no saved copy yet - then it starts this built-in one: the whole page in one file
(build.py --single: peaks + trails pack inside) with MapLibre inside too, gzipped + base64 into offline.html.

  python3 tools/app_bundle.py [path/to/maplibre-gl/dist]   (default: app/node_modules/maplibre-gl/dist)
"""
import base64, datetime, gzip, os, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'app', 'node_modules', 'maplibre-gl', 'dist')
subprocess.run([sys.executable, os.path.join(R, 'tools', 'build.py'), '--single'], check=True)
html = open(os.path.join(R, 'dist', 'dvatisocaki-single.html'), encoding='utf8').read()
js = open(os.path.join(ML, 'maplibre-gl.js'), encoding='utf8').read().replace('</script', '<\\/script')
css = open(os.path.join(ML, 'maplibre-gl.css'), encoding='utf8').read()
a = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css">'
b = '<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js"></script>'
assert a in html and b in html, 'MapLibre tags not found (version changed?) - update tools/app_bundle.py'
html = html.replace(a, '<style>' + css + '</style>')
i = html.index(b); html = html[:i] + '<script>' + js + '</script>' + html[i + len(b):]
z = base64.b64encode(gzip.compress(html.encode('utf8'), 9)).decode()
p = os.path.join(R, 'app', 'www', 'offline.html'); o = open(p, encoding='utf8').read()
m = '<script type="text/plain" id="bundle" data-date="'
s = o.index(m); e = o.index('</script>', s)
o = o[:s] + m + datetime.date.today().isoformat() + '">' + z + o[e:]
open(p, 'w', encoding='utf8').write(o)
print('offline.html with the built-in site:', len(o) // 1024, 'KB (page', len(html) // 1024, 'KB)')
