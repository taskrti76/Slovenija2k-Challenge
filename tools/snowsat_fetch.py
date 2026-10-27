"""Satellite snow cover for the mountains (run by .github/workflows/snowsat.yml once a day, or by hand).

Copernicus Sentinel-2 L2A via the Copernicus Data Space Sentinel Hub Process API (free account, OAuth client in GitHub secrets
CDSE_CLIENT_ID / CDSE_CLIENT_SECRET). For every pixel (40 m) the newest cloud-free look of the last LOOKBACK days decides:
snow (Sentinel-2 scene classification "snow", or NDSI > 0.42 on bright ground) or no snow. Clouds / no clear look = unknown.
Output: snowsat.png (R = 0 unknown / 1 no snow / 2 snow, G = age of that look in days) + snowsat.json (bounds, date).
The page combines it with the snow model: the satellite says WHERE snow lies, the model how deep and what is new.
Needs: Python 3.9+, Pillow.
"""
import io, json, os, sys, time, math, datetime, urllib.request, urllib.parse, urllib.error
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process'
BBOX = [13.35, 46.15, 15.02, 46.62]          # Julian Alps, Karavanke, Kamnik–Savinja Alps (w, s, e, n)
RES_M = 40                                    # metres per pixel
LOOKBACK = 10                                 # days
MAXPX = 2400                                  # Process API limit is 2500 px per side

EVAL = """//VERSION=3
function setup(){ return {input:[{bands:["B03","B11","SCL","dataMask"]}], output:{bands:3, sampleType:"UINT8"}, mosaicking:"ORBIT"}; }
function preProcessScenes(c){ c.scenes.orbits.sort((a,b)=>new Date(b.dateFrom)-new Date(a.dateFrom)); return c; }
const NOW = __NOW__;
function evaluatePixel(samples, scenes){
  for (let i = 0; i < samples.length; i++){
    const s = samples[i]; if (!s.dataMask) continue;
    const c = s.SCL; if (c === 0 || c === 1 || c === 3 || c === 8 || c === 9 || c === 10) continue;   // no data, saturated, cloud shadow, clouds, cirrus
    const ndsi = (s.B03 - s.B11) / (s.B03 + s.B11 + 1e-6);
    const snow = c === 11 || (ndsi > 0.42 && s.B03 > 0.15);
    const age = Math.max(0, Math.min(254, Math.floor((NOW - Date.parse(scenes.orbits[i].dateFrom)) / 864e5)));
    return [snow ? 2 : 1, age, 0];
  }
  return [0, 255, 0];
}"""


def post(url, data, headers, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method='POST'), timeout=180) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            body = e.read()[:400].decode('utf8', 'replace')
            if e.code in (401, 403): raise RuntimeError(f'HTTP {e.code}: {body}')
            if a == tries - 1: raise RuntimeError(f'HTTP {e.code}: {body}')
            time.sleep(20 if e.code == 429 else 5 * (a + 1))
        except Exception:
            if a == tries - 1: raise
            time.sleep(5 * (a + 1))


def token():
    cid, sec = os.environ.get('CDSE_CLIENT_ID'), os.environ.get('CDSE_CLIENT_SECRET')
    if not cid or not sec: sys.exit('::error::CDSE_CLIENT_ID / CDSE_CLIENT_SECRET are not set (GitHub: Settings → Secrets and variables → Actions)')
    try:
        j = json.loads(post(TOKEN_URL, urllib.parse.urlencode({'grant_type': 'client_credentials', 'client_id': cid, 'client_secret': sec}).encode(),
                            {'Content-Type': 'application/x-www-form-urlencoded'}))
    except RuntimeError as e:
        sys.exit(f'::error::Copernicus login failed - is the OAuth client secret expired or wrong? Create a new client and update the GitHub secrets. ({e})')
    return j['access_token']


def main():
    tok = token()
    now = datetime.datetime.now(datetime.timezone.utc)
    t0 = (now - datetime.timedelta(days=LOOKBACK)).strftime('%Y-%m-%dT00:00:00Z'); t1 = now.strftime('%Y-%m-%dT23:59:59Z')
    w, s, e, n = BBOX; latm = (s + n) / 2
    W = round((e - w) * 111320 * math.cos(math.radians(latm)) / RES_M); H = round((n - s) * 111320 / RES_M)
    nx, ny = math.ceil(W / MAXPX), math.ceil(H / MAXPX)
    out = Image.new('RGB', (W, H)); ev = EVAL.replace('__NOW__', str(int(now.timestamp() * 1000)))
    print(f'{W}x{H} px at {RES_M} m, {nx}x{ny} requests, {t0[:10]} .. {t1[:10]}')
    for j in range(ny):
        for i in range(nx):
            x0, x1 = i * W // nx, (i + 1) * W // nx; y0, y1 = j * H // ny, (j + 1) * H // ny
            bb = [w + (e - w) * x0 / W, n - (n - s) * y1 / H, w + (e - w) * x1 / W, n - (n - s) * y0 / H]
            req = {'input': {'bounds': {'bbox': bb, 'properties': {'crs': 'http://www.opengis.net/def/crs/EPSG/0/4326'}},
                             'data': [{'type': 'sentinel-2-l2a', 'dataFilter': {'timeRange': {'from': t0, 'to': t1}, 'maxCloudCoverage': 95}}]},
                   'output': {'width': x1 - x0, 'height': y1 - y0, 'responses': [{'identifier': 'default', 'format': {'type': 'image/png'}}]},
                   'evalscript': ev}
            png = post(PROCESS_URL, json.dumps(req).encode(), {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'Accept': 'image/png'})
            im = Image.open(io.BytesIO(png)).convert('RGB'); out.paste(im, (x0, y0)); print('tile', i, j, im.size)
    px = out.getdata(); tot = len(px); snow = sum(1 for p in px if p[0] == 2); bare = sum(1 for p in px if p[0] == 1)
    out.save(os.path.join(R, 'snowsat.png'), optimize=True)
    json.dump({'date': now.strftime('%Y-%m-%d'), 'from': t0[:10], 'bbox': BBOX, 'w': W, 'h': H, 'res_m': RES_M,
               'snow_pct': round(100 * snow / tot, 1), 'clear_pct': round(100 * (snow + bare) / tot, 1),
               'source': 'Copernicus Sentinel-2 L2A (CDSE)'}, open(os.path.join(R, 'snowsat.json'), 'w'), separators=(',', ':'))
    print(f'snow {100*snow/tot:.1f} %, no snow {100*bare/tot:.1f} %, unknown (cloud) {100*(tot-snow-bare)/tot:.1f} %;',
          os.path.getsize(os.path.join(R, 'snowsat.png')) // 1024, 'kB')


if __name__ == '__main__':
    main()
