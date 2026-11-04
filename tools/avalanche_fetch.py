"""ARSO avalanche bulletin -> avalanche.json for the map (run by .github/workflows/avalanche.yml, or by hand).

Source 1 (preferred): ARSO's bulletin as relayed to the European avalanche services (EAWS) in the standard CAAML v6 JSON:
  https://static.avalanche.report/eaws_bulletins/<date>/<date>-SI.json   (regions SI-1 … SI-10: Karavanke, Kamniške / Savinjske
  Alpe, Julijske Alpe; levels low … very_high, optional elevation bound, avalanche problems)
Source 2 (fallback): ARSO's own XML (below).

ARSO (Agencija RS za okolje) publishes the Slovenian avalanche bulletin in the snow season (about December - May) as an XML file in a
CAAML-like format (several days, levels 1-5 per region, sometimes different above / below an elevation, avalanche problems).
The format is read generically (CAAML v5 and v6 names, Slovenian / English words for the levels), because ARSO's file deviates
from the standard. The raw file is kept in data/avalanche_raw.xml so the parser can be adjusted to the real file.

Output (avalanche.json):
  {gen, src, ok, bulletins: [{from, to, regions: [{id, name}], lo, hi, bound, problems: [..], text}]}
  lo / hi = level below / above `bound` (m); without an elevation split lo == hi.
Outside the season (or when ARSO is not reachable) bulletins is empty and the map shows nothing.
"""
import datetime, json, os, re, sys, urllib.request
import xml.etree.ElementTree as ET

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, 'avalanche.json'); RAW = os.path.join(R, 'data', 'avalanche_raw.xml')
URLS = ['https://meteo.arso.gov.si/uploads/probase/www/avalanche/text/sl/bulletinAvalanche.xml',
        'https://meteo.arso.gov.si/uploads/probase/www/avalanche/text/en/bulletinAvalanche.xml']
UA = {'User-Agent': 'dvatisocaki-avalanche/1.0 (+https://taskrti76.github.io/Slovenija2k-Challenge/)'}
WORDS = {'low': 1, 'moderate': 2, 'considerable': 3, 'high': 4, 'very_high': 5, 'veryhigh': 5, 'very high': 5,
         'nizka': 1, 'zmerna': 2, 'znatna': 3, 'velika': 4, 'zelo velika': 5, 'zelo_velika': 5}


def ln(tag):
    return tag.rsplit('}', 1)[-1].lower() if isinstance(tag, str) else ''


def level(x):
    x = (x or '').strip().lower().replace('-', '_')
    if not x: return None
    m = re.match(r'^(\d)', x)
    if m and 1 <= int(m.group(1)) <= 5: return int(m.group(1))
    return WORDS.get(x) or WORDS.get(x.replace('_', ' '))


def attr(el, *names):
    for k, v in el.attrib.items():
        if ln(k) in names: return v
    return None


def bound_of(el):
    """Elevation of a danger rating: CAAML v5 validElevation href 'ElevationRange_1800Hi' / v6 elevation/lowerBound|upperBound."""
    side = None; b = None
    for x in el.iter():
        n = ln(x.tag)
        if n == 'validelevation':
            h = attr(x, 'href') or (x.text or '')
            m = re.search(r'(\d{3,4})\s*(hi|lw|lo)', h, re.I)
            if m: b = int(m.group(1)); side = 'hi' if m.group(2).lower() == 'hi' else 'lo'
        elif n in ('lowerbound', 'upperbound') and (x.text or '').strip():
            t = x.text.strip()
            if t.isdigit(): b = int(t); side = 'hi' if n == 'lowerbound' else 'lo'
    return b, side


def regions_in(el):
    out = []
    for x in el.iter():
        n = ln(x.tag)
        if n in ('locref', 'region', 'regionid', 'regija', 'obmocje'):
            rid = attr(x, 'href', 'regionid', 'id') or ''
            name = attr(x, 'name') or ''
            for c in x:
                if ln(c.tag) in ('name', 'regionname', 'ime') and (c.text or '').strip(): name = c.text.strip()
            if not name and n != 'locref' and (x.text or '').strip() and len(x.text.strip()) < 80: name = x.text.strip()
            if rid or name: out.append({'id': rid.strip().lstrip('#'), 'name': name})
    seen = set(); res = []
    for r in out:
        k = (r['id'], r['name'])
        if k not in seen: seen.add(k); res.append(r)
    return res


def first_text(el, *names):
    for x in el.iter():
        if ln(x.tag) in names and (x.text or '').strip(): return x.text.strip()
    return None


def parse(xml):
    root = ET.fromstring(xml)
    bulletins = [e for e in root.iter() if ln(e.tag) in ('bulletin', 'avalanchebulletin', 'report')] or [root]
    out = []
    for b in bulletins:
        frm = first_text(b, 'starttime', 'beginposition', 'validfrom', 'datefrom')
        to = first_text(b, 'endtime', 'endposition', 'validto', 'dateto')
        breg = regions_in(b)
        problems = sorted({(x.text or '').strip() for x in b.iter() if ln(x.tag) in ('problemtype', 'avproblemtype', 'type') and (x.text or '').strip()
                           and any(ln(p.tag) in ('avalancheproblem', 'avproblem', 'avalancheproblems') for p in b.iter())})[:4]
        text = first_text(b, 'highlights', 'avactivityhighlights', 'comment', 'opis')
        ratings = [x for x in b.iter() if ln(x.tag) == 'dangerrating']
        groups = {}
        for r in ratings:
            lv = level(first_text(r, 'mainvalue', 'value', 'level', 'stopnja'))
            if not lv: continue
            reg = regions_in(r) or breg
            key = json.dumps(reg, sort_keys=True)
            g = groups.setdefault(key, {'regions': reg, 'lo': None, 'hi': None, 'bound': None})
            bd, side = bound_of(r)
            if bd: g['bound'] = bd
            if side == 'hi': g['hi'] = max(g['hi'] or 0, lv)
            elif side == 'lo': g['lo'] = max(g['lo'] or 0, lv)
            else: g['hi'] = max(g['hi'] or 0, lv); g['lo'] = max(g['lo'] or 0, lv)
        if not ratings:   # no dangerRating element: a bare level somewhere in the bulletin
            lv = level(first_text(b, 'mainvalue', 'dangerlevel', 'level', 'stopnja'))
            if lv: groups['_'] = {'regions': breg, 'lo': lv, 'hi': lv, 'bound': None}
        for g in groups.values():
            if g['hi'] is None: g['hi'] = g['lo']
            if g['lo'] is None: g['lo'] = g['hi']
            out.append(dict(g, **{'from': frm, 'to': to, 'problems': problems, 'text': (text or '')[:400]}))
    return out


def parse_json(j):
    out = []
    for b in j.get('bulletins', []):
        vt = b.get('validTime') or {}; g = {'lo': None, 'hi': None, 'bound': None}
        for r in b.get('dangerRatings', []):
            lv = level(str(r.get('mainValue', ''))); el = r.get('elevation') or {}
            if not lv: continue
            lb, ub = el.get('lowerBound'), el.get('upperBound')
            if lb not in (None, '') and str(lb).isdigit(): g['bound'] = int(lb); g['hi'] = max(g['hi'] or 0, lv)
            elif ub not in (None, '') and str(ub).isdigit(): g['bound'] = int(ub); g['lo'] = max(g['lo'] or 0, lv)
            else: g['hi'] = max(g['hi'] or 0, lv); g['lo'] = max(g['lo'] or 0, lv)
        if g['hi'] is None and g['lo'] is None: continue
        if g['hi'] is None: g['hi'] = g['lo']
        if g['lo'] is None: g['lo'] = g['hi']
        out.append(dict(g, **{'from': vt.get('startTime'), 'to': vt.get('endTime'),
                              'regions': [{'id': r.get('regionID', ''), 'name': r.get('name', '')} for r in b.get('regions', [])],
                              'problems': sorted({p.get('problemType', '') for p in b.get('avalancheProblems', []) if p.get('problemType')})[:4],
                              'text': ((b.get('avalancheActivity') or {}).get('highlights') or '')[:400]}))
    return out


def main():
    res = {'gen': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'src': 'ARSO (meteo.si) via EAWS', 'ok': False, 'bulletins': []}
    for d in (datetime.date.today(), datetime.date.today() + datetime.timedelta(days=1)):
        u = f'https://static.avalanche.report/eaws_bulletins/{d}/{d}-SI.json'
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                res['bulletins'] += parse_json(json.loads(r.read())); res['ok'] = True; print('read', u)
        except Exception as e:
            print('not available:', u, e)
    if res['bulletins']:
        seen = set(); res['bulletins'] = [b for b in res['bulletins'] if not (json.dumps(b, sort_keys=True) in seen or seen.add(json.dumps(b, sort_keys=True)))]
        finish(res); return
    xml = None
    for u in URLS:
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                xml = r.read()
            if xml and xml.strip(): print('read', u, len(xml), 'bytes'); break
        except Exception as e:
            print('not reachable:', u, e)
    res['src'] = 'ARSO (meteo.si)'
    if xml:
        os.makedirs(os.path.dirname(RAW), exist_ok=True)
        open(RAW, 'wb').write(xml)
        try:
            res['bulletins'] = parse(xml); res['ok'] = True
        except Exception as e:
            print('parse error:', e)
    finish(res)


def finish(res):
    today = datetime.date.today().isoformat()
    res['bulletins'] = [b for b in res['bulletins'] if not b.get('to') or b['to'][:10] >= today]   # drop days that are over
    print(len(res['bulletins']), 'bulletin entries;', 'regions:', sorted({r.get('name') or r.get('id') for b in res['bulletins'] for r in b['regions']}))
    json.dump(res, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
