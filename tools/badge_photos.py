#!/usr/bin/env python3
"""Fetch candidate photos of the 16 badge peaks from Wikimedia Commons (for drawing the badge emblems).
Writes tools/badges/photos/<slug>/<n>.jpg (640 px wide) + credits.json (title, author, licence, page) per peak.
Run by .github/workflows/badge_photos.yml (the sandbox can't reach Commons)."""
import json, os, re, time, urllib.parse, urllib.request

PEAKS = {
  'triglav': ['Triglav north face', 'Triglav mountain'], 'mangart': ['Mangart', 'Mangart Slovenia'],
  'jalovec': ['Jalovec', 'Jalovec Slovenia'], 'razor': ['Razor Julian Alps', 'Razor mountain Slovenia'],
  'skrlatica': ['Škrlatica Vrata', 'Škrlatica Aljažev dom', 'Škrlatica', 'Skrlatica'], 'visoki-kanin': ['Kanin Bovec', 'Visoki Kanin'],
  'grintovec': ['Grintovec', 'Grintovec Kamnik'], 'ojstrica': ['Ojstrica', 'Ojstrica Logarska'],
  'stol': ['Stol Karavanke', 'Hochstuhl Karawanken'], 'vrtaca': ['Vrtača Karavanke', 'Vertatscha'],
  'crni-vrh-pohorje': ['Črni vrh Pohorje', 'Pohorje'], 'rogla': ['Rogla Pohorje', 'Rogla'],
  'veliki-sneznik': ['Snežnik', 'Veliki Snežnik'], 'travica': ['Snežnik Travica', 'Snežnik plateau'],
  'altemaver': ['Altemaver', 'Kojca Altemaver'], 'porezen': ['Porezen', 'Porezen Cerkno']}
BAD = re.compile(r'map|karta|zemljevid|relief|svg|logo|coat|grb|sign|tabla|hut|koča|koca|chapel|kapel|church|cerkev|flower|cvet|plant|insect|gams|chamois|ibex|portrait', re.I)
UA = {'User-Agent': 'Slovenski2000caki/1.0 (https://taskrti76.github.io/Slovenija2k-Challenge/; badge artwork)'}
OUT = 'tools/badges/photos'

def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return r.read()
        except Exception as e: err = e; time.sleep(3 + 4 * i)
    raise err

def search(q):
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 25,
         'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 640}
    j = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)))
    return sorted(j.get('query', {}).get('pages', {}).values(), key=lambda x: x.get('index', 99))

strip = lambda s: re.sub(r'<[^>]+>', '', s or '').strip()
for slug, qs in PEAKS.items():
    d = os.path.join(OUT, slug); os.makedirs(d, exist_ok=True); cred, seen = [], set()
    for q in qs:
        for pg in search(q):
            t = pg['title']; ii = (pg.get('imageinfo') or [{}])[0]
            if t in seen or BAD.search(t) or not ii.get('thumburl'): continue
            w, h = ii.get('width', 0), ii.get('height', 1); ar = w / h
            if not (1.15 <= ar <= 2.3) or w < 1000: continue        # landscape photos, no panoramas or small pictures
            seen.add(t); m = ii.get('extmetadata', {}); n = len(cred) + 1
            open(os.path.join(d, f'{n}.jpg'), 'wb').write(get(ii['thumburl']))
            cred.append({'n': n, 'title': t, 'author': strip(m.get('Artist', {}).get('value')), 'license': strip(m.get('LicenseShortName', {}).get('value')),
                         'page': ii.get('descriptionurl', '')})
            time.sleep(0.5)
            if len(cred) >= 8: break
        if len(cred) >= 8: break
    json.dump(cred, open(os.path.join(d, 'credits.json'), 'w'), ensure_ascii=False, indent=1)
    print(slug, len(cred))
