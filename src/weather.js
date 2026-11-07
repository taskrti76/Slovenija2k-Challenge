// ===================== summit weather =====================
// weather.json is written every 3 h by .github/workflows/weather.yml (tools/weather_fetch.py): DWD ICON via Open-Meteo,
// one forecast point per ~1.6 km group of peaks, asked at the height of the group's highest summit.
// If weather.json is missing or old, a peak's popup asks Open-Meteo directly (one request, only for that peak).
(function(){
const L = (sl, en) => window.LANG === 'en' ? en : sl;
const $w = id => document.getElementById(id);
const HOURS = [...Array(16)].map((_, i) => i + 6), DAY_H = [7, 17], PM_H = 13;   // rating window 07–17 h (incl. descent), afternoon from 13 h
const PLEV = {850:1460, 800:1950, 750:2470, 700:3010};
const VARS = ['temperature_2m','wind_speed_10m','wind_gusts_10m','wind_direction_10m','cloud_cover','precipitation','weather_code',
  'freezing_level_height','cape','wind_speed_850hPa','wind_speed_800hPa','wind_speed_750hPa','wind_speed_700hPa','cloud_cover_low','cloud_cover_mid','snow_depth'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const topH = p => Math.max(+p.elev || 0, +p.dem_h || 0);

let WX = null, wxP = null, OPENH = false; const LIVE = {};
function loadWX(){
  if (wxP) return wxP;
  wxP = (location.protocol.startsWith('http') ? fetch('weather.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null))
    .then(j => { if (j && j.days && j.days[j.days.length-1] >= today()) WX = j; return WX; });
  return wxP; }

// --- one peak's series: {days, hours, T (°C), W, G (km/h), D (°), C (%), P (mm), X (WMO code), F (m), K (J/kg)}
function fromWX(p){
  const i = WX && WX.pk[p.id]; if (i == null || !WX.v.T[i]) return null;
  const e0 = WX.pts[i][2], dT = (e0 - topH(p)) * 0.0065, v = WX.v;
  const sc = (a, f) => a ? a.map(x => x == null ? null : f(x)) : null;
  return {days:WX.days, hours:WX.hours, gen:WX.gen, model:WX.model, T:sc(v.T[i], x => x/10 + dT), W:v.W[i], G:v.G[i], D:v.D[i], C:v.C[i],
    P:sc(v.P[i], x => x/10), X:v.X[i], F:v.F[i], K:v.K[i], CL:v.CL ? v.CL[i] : null, CM:v.CM ? v.CM[i] : null, S:v.S ? v.S[i] : null, lat:p.lat, lon:p.lon}; }
async function live(p){
  if (LIVE[p.id]) return LIVE[p.id];
  const e = Math.round(topH(p)), q = `latitude=${p.lat}&longitude=${p.lon}&elevation=${e}&forecast_days=4&timezone=Europe%2FLjubljana&wind_speed_unit=kmh`;
  let j = null;
  for (const v of [VARS, VARS.slice(0, 7)]) for (const m of ['&models=icon_seamless', '']){
    if (j) break; try{ const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}&hourly=${v.join(',')}${m}`); if (r.ok) j = await r.json(); }catch(_){} }
  if (!j || !j.hourly) return null;
  const h = j.hourly, sel = h.time.map((t, k) => HOURS.includes(+t.slice(11, 13)) ? k : -1).filter(k => k >= 0);
  const col = n => h[n] ? sel.map(k => h[n][k]) : null;
  const lv = Object.entries(PLEV).map(([l, z]) => [z, h[`wind_speed_${l}hPa`]]).filter(x => x[1]).sort((a, b) => a[0] - b[0]);
  const W = [], G = [];
  for (const k of sel){ let fa = null; const ok = lv.filter(l => l[1][k] != null), bl = ok.filter(l => l[0] <= e), ab = ok.filter(l => l[0] > e);
    if (bl.length && ab.length){ const [z0, a0] = bl[bl.length-1], [z1, a1] = ab[0]; fa = a0[k] + (a1[k] - a0[k]) * (e - z0) / (z1 - z0); }
    else if (bl.length) fa = bl[bl.length-1][1][k]; else if (ab.length) fa = ab[0][1][k];
    const w = Math.max(h.wind_speed_10m[k] ?? -1, fa == null ? -1 : fa * 0.8), g = Math.max(h.wind_gusts_10m[k] ?? -1, w * 1.35);
    W.push(w < 0 ? null : Math.round(w)); G.push(g < 0 ? null : Math.round(g)); }
  return LIVE[p.id] = {days:[...new Set(sel.map(k => h.time[k].slice(0, 10)))], hours:HOURS, gen:null, model:'icon (živo)',
    T:col('temperature_2m'), W, G, D:col('wind_direction_10m'), C:col('cloud_cover'), P:col('precipitation'), X:col('weather_code'),
    F:col('freezing_level_height'), K:col('cape'), CL:col('cloud_cover_low'), CM:col('cloud_cover_mid'),
    S:h.snow_depth ? sel.map(k => h.snow_depth[k] == null ? null : Math.round(h.snow_depth[k] * 100)) : null, lat:p.lat, lon:p.lon}; }
async function seriesFor(p){ const extra = Promise.all([window.loadSat ? window.loadSat() : null, window.loadSnowpack ? window.loadSnowpack() : null]);
  await Promise.all([loadWX(), Promise.race([extra, new Promise(r => setTimeout(r, 2500))])]);   // satellite / snowpack: wait at most 2.5 s
  const s = fromWX(p) || await live(p);
  // snow on the summit = the snow map's value at that exact point (same model, wind, slope and satellite) - one number everywhere
  if (s && window.snowPoint && p.lat != null){ s.snowPt = {};
    await Promise.race([Promise.all(s.days.map(async d => { s.snowPt[d] = await window.snowPoint(p.lat, p.lon, d).catch(() => null); })), new Promise(r => setTimeout(r, 2500))]); }
  return s; }

// --- day score (0–100) and rating for the summit hours 07–17. Every factor takes points off; the list says why.
//   storms (thunder in the forecast, or high storm energy CAPE + rain; afternoon weighs more), wind / gusts at summit height,
//   precipitation, summit in cloud (low + mid cloud only - high thin cloud does not hide the view), fresh snow (freezing level
//   below the summit + precipitation), old snow lying on the summit (winter conditions), cold (wind chill).
//   good >= 75, so-so 45–74, bad < 45; thunder in the forecast is always bad.
// harder peaks / routes: the same weather matters more (snow on a T5 ridge is winter alpinism, wind on exposed rock, wet slabs ...)
// class 1 lahka (T1–T2) · 2 zahtevna (T3) · 3 zelo zahtevna (T4–T6, ferrata); winter experience from the profile scales snow
const MULT = {snow:[1,1.6,2.5], fresh:[1,1.6,2.5], wind:[1,1.3,1.6], rain:[1,1.3,1.6], cold:[1,1.2,1.4], cloud:[1,1.2,1.2], storm:[1,1,1]};
const WINTER_K = [1.5, 1, 0.5];
const CLS_N = () => [L('lahka','easy'), L('zahtevna','demanding'), L('zelo zahtevna','very demanding')];
window.peakClass = p => (window.selRouteClass && window.selRouteClass(p.id)) || (p.tech && p.tech.c) || null;
const chill = (T, V) => T <= 10 && V > 4.8 ? 13.12 + 0.6215*T - 11.37*V**0.16 + 0.3965*T*V**0.16 : T;
// hardest bit of the way (T-grade 1–6, via ferrata) - snow is judged by it: the selected route, else the peak's easiest route
window.peakTG = p => { const r = window.selRoute && window.selRoute(p.id); if (r) return {t: r.stats.sac || 2, f: !!r.stats.ferrata};
  const t = p.tech || {}; return {t: t.s || [0, 2, 3, 5][t.c || 0] || 2, f: !!t.f}; };
// snow on the way, points off by depth (1–5 / 5–15 / 15–30 / 30–50 / > 50 cm) and the way's T-grade: a trodden or hard snow cover on
// an easy path is fine even at 50 cm, a few cm on T4–T6 (over ice, on ledges and cables) are serious
const SNOW_T = {1: [0, 3, 8, 15, 22], 2: [0, 4, 10, 18, 25], 3: [6, 14, 24, 34, 42], 4: [15, 35, 50, 62, 72], 5: [22, 45, 65, 78, 88], 6: [30, 58, 80, 95, 100]};
const WINTER_SNOW = [1.3, 1, 0.55];   // winter experience: none / easy winter tours / winter alpinism
const snowPts = (cm, tg, winter) => { if (!(cm >= 1)) return 0; const b = cm < 5 ? 0 : cm < 15 ? 1 : cm < 30 ? 2 : cm < 50 ? 3 : 4, t = tg.f ? 6 : Math.min(6, Math.max(1, tg.t || 2));
  return Math.min(100, Math.round(SNOW_T[t][b] * (WINTER_SNOW[winter ?? 1] ?? 1))); };
function day(s, d, elev, cls, tg){
  const ci = Math.min(3, Math.max(1, cls || 1)) - 1, pr = window.PROFILE || {}, wk = WINTER_K[pr.winter ?? 1] ?? 1;
  const nh = s.hours.length, all = s.hours.map((h, i) => d*nh + i);
  const win = all.filter((k, i) => s.hours[i] >= DAY_H[0] && s.hours[i] <= DAY_H[1]), pm = all.filter((k, i) => s.hours[i] >= PM_H && s.hours[i] <= DAY_H[1]);
  const g = (a, I) => a ? I.map(k => a[k]).filter(x => x != null) : [];
  const T = g(s.T, all); if (!T.length) return null;
  const mx = a => a.length ? Math.max(...a) : null, sum = a => a.reduce((x, y) => x + y, 0), avg = a => a.length ? sum(a) / a.length : null;
  const W = g(s.W, win), G = g(s.G, win), P = g(s.P, win), X = g(s.X, win), K = g(s.K, win), F = g(s.F, win);
  const o = {tmin:Math.min(...T), tmax:Math.max(...T), w:mx(W), g:mx(G), p:sum(P), fl:F.length ? Math.min(...F) : null, code:X.length ? worst(X) : null, pen:[]};
  // cloud: hourly max(low, mid) when the model gives it, else total cloud (counts less, it includes thin high cloud)
  const lm = s.CL && s.CM ? win.map(k => s.CL[k] == null && s.CM[k] == null ? null : Math.max(s.CL[k] || 0, s.CM[k] || 0)).filter(x => x != null) : [];
  o.cloudLM = lm.length > 0; o.c = o.cloudLM ? avg(lm) : avg(g(s.C, win));
  const noon = all[s.hours.indexOf(12)]; o.snowcm = s.S && noon != null ? s.S[noon] : null;
  const sp = s.snowPt && s.snowPt[s.days[d]];
  if (sp != null){ o.snowcm = sp; o.snowSP = true; }
  else if (window.snowpackAt && s.lat != null){ const v = window.snowpackAt(s.lat, s.lon, elev, s.days[d]); if (v != null){ o.snowcm = Math.round(v); o.snowSP = true; } }
  // today: the satellite (Sentinel-2, newest clear look ≤10 days, 200 m around the summit) decides whether snow lies there
  if (s.days[d] === today() && s.lat != null && window.satSnow && window.satDayOK && window.satDayOK(s.days[d])){
    const v = window.satSnow(s.lat, s.lon, 2); if (v && v.cls){ o.sat = v; if (sp == null) o.snowcm = v.cls === 1 ? 0 : Math.max(o.snowcm || 0, 10); } }
  o.chill = win.length && s.T && s.W ? Math.min(...win.filter(k => s.T[k] != null && s.W[k] != null).map(k => chill(s.T[k], s.W[k]))) : null;
  if (!isFinite(o.chill)) o.chill = null;
  const add = (pts, sl, en, cat) => { if (pts > 0){ const k = (MULT[cat] || MULT.storm)[ci] * (cat === 'snow' || cat === 'fresh' ? wk : 1); o.pen.push([Math.round(pts * k), L(sl, en)]); } };
  // storms
  const thAM = win.some(k => s.X && s.X[k] >= 95 && !pm.includes(k)), thPM = pm.some(k => s.X && s.X[k] >= 95), capeMax = mx(K) || 0, pPM = sum(g(s.P, pm));
  o.thunder = thAM || thPM;
  if (thPM) add(60, 'nevihte popoldne', 'afternoon storms', 'storm'); else if (thAM) add(48, 'nevihte dopoldne', 'morning storms', 'storm');
  else if (capeMax >= 1000 && o.p >= 0.5) add(35, 'nevihte možne', 'storms possible', 'storm');
  else if (capeMax >= 500 && pPM >= 0.2) add(15, 'možne popoldanske plohe', 'afternoon showers possible', 'storm');
  // wind: the worse of sustained wind and gusts
  const pw = o.w >= 60 ? 50 : o.w >= 45 ? 30 : o.w >= 30 ? 12 : 0, pg = o.g >= 90 ? 50 : o.g >= 70 ? 30 : o.g >= 50 ? 12 : 0;
  add(Math.max(pw, pg), `veter ${r1(o.w)} km/h, sunki ${r1(o.g)}`, `wind ${r1(o.w)} km/h, gusts ${r1(o.g)}`, 'wind');
  add(o.p >= 5 ? 40 : o.p >= 2 ? 25 : o.p >= 0.5 ? 10 : 0, `padavine ${o.p.toFixed(1)} mm`, `precipitation ${o.p.toFixed(1)} mm`, 'rain');
  if (o.c != null) add(o.cloudLM ? (o.c >= 90 ? 20 : o.c >= 70 ? 8 : 0) : (o.c >= 95 ? 12 : o.c >= 85 ? 5 : 0),
    o.c >= 90 ? 'vrh v oblakih' : 'precej oblakov', o.c >= 90 ? 'summit in cloud' : 'quite cloudy', 'cloud');
  if (o.fl != null && o.fl < elev && o.p >= 0.3) add(15, 'sveži sneg', 'fresh snow', 'fresh');
  if (o.snowcm != null){ const g = tg || {t: [0, 2, 3, 5][ci + 1] || 2, f: false}, sp = snowPts(o.snowcm, g, pr.winter);   // already weighted by T-grade + experience
    if (sp > 0) o.pen.push([sp, L(`sneg ~${o.snowcm} cm na ${g.f ? 'feratni' : 'T' + g.t} poti${o.sat ? ' (satelit)' : ''}`, `snow ~${o.snowcm} cm on a ${g.f ? 'via ferrata' : 'T' + g.t} route${o.sat ? ' (satellite)' : ''}`)]); }
  // avalanche danger from ARSO's bulletin (avalanche.json): counts when there is snow on the way or the level is 3+
  const av = window.avaAt && s.lat != null ? window.avaAt(s.lat, s.lon, elev, s.days[d]) : null;
  if (av){ o.ava = av; if ((o.snowcm || 0) >= 10 || av.level >= 3) add([0, 0, 5, 20, 40, 60][av.level] || 0, `lavinska nevarnost ${av.level} (ARSO)`, `avalanche danger ${av.level} (ARSO)`, 'snow'); }
  if (o.chill != null) add(o.chill <= -20 ? 20 : o.chill <= -10 ? 8 : 0, `mrzlo (občutek ${Math.round(o.chill)} °C)`, `cold (feels like ${Math.round(o.chill)} °C)`, 'cold');
  o.pen.sort((a, b) => b[0] - a[0]);
  o.score = Math.max(0, 100 - sum(o.pen.map(x => x[0])));
  o.r = o.thunder || o.score < 45 ? 2 : o.score < 75 ? 1 : 0;
  o.why = o.pen.map(x => x[1]); o.storm = o.thunder || capeMax >= 1000; o.cls = ci + 1;
  return o; }
const worst = X => X.reduce((a, b) => rank(b) > rank(a) ? b : a, X[0]);
const rank = c => c >= 95 ? 9 : c >= 71 && c <= 77 || c >= 85 && c <= 86 ? 8 : c >= 61 && c <= 67 || c >= 80 && c <= 82 ? 7 : c >= 51 ? 6 : c >= 45 ? 5 : c >= 3 ? 3 : c >= 2 ? 2 : 1;
const ICON = c => c == null ? '' : c >= 95 ? '⛈' : (c >= 71 && c <= 77) || c === 85 || c === 86 ? '🌨' : c >= 80 ? '🌦' : c >= 51 ? '🌧' : c >= 45 ? '🌫' : c === 3 ? '☁️' : c === 2 ? '⛅' : '☀️';
const DIR = d => d == null ? '' : (window.LANG === 'en' ? ['N','NE','E','SE','S','SW','W','NW'] : ['S','SV','V','JV','J','JZ','Z','SZ'])[Math.round(d / 45) % 8];
const RC = ['#2e9d48', '#e8a317', '#d63a2f'], RN = () => [L('dober dan','good day'), L('pogojno','so-so'), L('slab dan','bad day')];
const dname = (s, i) => { if (s === today()) return L('Danes','Today'); const d = new Date(s + 'T12:00'), t = new Date(); t.setHours(12,0,0,0);
  if (Math.round((d - t) / 864e5) === 1) return L('Jutri','Tomorrow'); return (window.LANG === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['ned','pon','tor','sre','čet','pet','sob'])[d.getDay()] + ' ' + d.getDate() + '.'; };
const r1 = x => x == null ? '–' : Math.round(x);

const css = document.createElement('style'); css.textContent = `
.wx{margin-top:8px;border-top:1px solid #e3e3e3;padding-top:6px;font-size:.92em}
.wx .wxh{font-weight:700;font-size:.9em;color:#555;margin-bottom:4px}
.wx .wxd{display:flex;gap:4px}.wx .wxd button{flex:1;min-width:0;border:2px solid #ccc;border-radius:8px;background:#fff;padding:3px 0;font:inherit;font-size:.82em;line-height:1.25;cursor:pointer;color:#222}
.wx .wxd button.on{background:#f3f6f8;box-shadow:inset 0 0 0 1px currentColor}.wx .wxd b{display:block;font-size:1.25em}
.wx .wxs{margin-top:5px;line-height:1.45}.wx .wxr{display:inline-block;padding:0 6px;border-radius:9px;color:#fff;font-weight:700;font-size:.85em}
.wx .wxt{display:flex;justify-content:space-between;margin-top:5px;font-size:.8em;text-align:center;color:#333}.wx .wxt div{flex:1}.wx .wxt i{display:block;font-style:normal;font-size:1.3em}
.wx .wxf{margin-top:4px;font-size:.75em;color:#888}.wx details summary{cursor:pointer;font-size:.85em;color:#555;margin-top:4px}
.maplibregl-popup-content{max-height:calc(100vh - 140px);overflow-y:auto}
.wx .wxbig{float:right;border:1px solid #ccc;background:#fff;border-radius:6px;font:inherit;font-size:.9em;padding:0 6px;cursor:pointer;color:#333}
#wxBig{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px}
#wxBig .wb{background:#fff;color:#222;border-radius:14px;width:min(860px,100%);max-height:100%;overflow:auto;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-size:calc(14px*var(--ui,1))}
#wxBig h3{margin:0 0 8px;font-size:1.15em}#wxBig .x{float:right;border:0;background:none;font-size:1.6em;line-height:1;cursor:pointer;color:#555}
#wxBig .wxd{display:flex;gap:6px;flex-wrap:wrap}#wxBig .wxd button{flex:1;min-width:90px;border:2px solid #ccc;border-radius:10px;background:#fff;padding:6px 4px;font:inherit;cursor:pointer;color:#222;line-height:1.3}
#wxBig .wxd button.on{background:#f3f6f8;box-shadow:inset 0 0 0 1px currentColor}#wxBig .wxd b{display:block;font-size:1.5em}
#wxBig .sc{margin:10px 0;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}#wxBig .pill{display:inline-block;padding:2px 10px;border-radius:12px;color:#fff;font-weight:700}
#wxBig ul{margin:4px 0 0;padding-left:18px}#wxBig table{border-collapse:collapse;width:100%;font-size:.9em;margin-top:6px}
#wxBig th,#wxBig td{padding:3px 5px;text-align:center;border-bottom:1px solid #eee;white-space:nowrap}#wxBig th{position:sticky;top:-14px;background:#fafafa;font-weight:600}
#wxBig .tw{overflow-x:auto}#wxBig .note{font-size:.8em;color:#777;margin-top:8px}#wxBig td.win{background:#f6faf6}`;
document.head.append(css);

const SACT_ = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
function clsLine(p, o){ const sel = window.selRouteClass && window.selRouteClass(p.id), tc = p.tech, pr = window.PROFILE || {};
  const src = sel ? L('izbrana pot', 'selected route') : tc ? (tc.s ? SACT_[tc.s] + ', ' : '') + L('najlažja pot', 'easiest route') : L('ocena', 'estimate');
  const over = tc && ((tc.s && pr.maxT && tc.s > pr.maxT) || (tc.f && pr.ferrata === false));
  return `<div style="font-size:.88em;color:#555;margin-bottom:3px">${L('Zahtevnost','Difficulty')}: <b>${CLS_N()[o.cls - 1]}</b> (${src})${over ? ` · <span style="color:#c62f28;font-weight:700">⚠ ${L('nad tvojo mejo','above your limit')}</span>` : ''}</div>`; }
// --- big window: all days, the score with every deduction, hourly table 06–21 h
function big(p, s, D, DD, sel){
  let el = $w('wxBig'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'wxBig'; document.body.append(el);
  const close = () => { el.remove(); removeEventListener('keydown', esc); }, esc = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', esc); el.onclick = e => { if (e.target === el) close(); };
  const draw = () => {
    const o = D[sel], si = DD[sel], nh = s.hours.length, v = (a, k) => a && a[k] != null ? a[k] : null;
    const rows = s.hours.map((h, i) => { const k = si*nh + i; if (v(s.T, k) == null) return '';
      const lm = s.CL && s.CM ? Math.max(v(s.CL, k) || 0, v(s.CM, k) || 0) : v(s.C, k);
      return `<tr><td${h >= DAY_H[0] && h <= DAY_H[1] ? ' class="win"' : ''}>${h}:00</td><td>${ICON(v(s.X, k))}</td><td>${Math.round(s.T[k])}°</td>
        <td>${v(s.W, k) != null ? Math.round(chill(s.T[k], s.W[k])) + '°' : '–'}</td><td>${r1(v(s.W, k))} ${DIR(v(s.D, k))}</td><td>${r1(v(s.G, k))}</td>
        <td>${lm != null ? Math.round(lm) + ' %' : '–'}</td><td>${v(s.P, k) ? s.P[k].toFixed(1) : '0'}</td><td>${v(s.F, k) != null ? Math.round(s.F[k]/50)*50 : '–'}</td>
        <td>${v(s.K, k) != null ? s.K[k] : '–'}</td></tr>`; }).join('');
    el.innerHTML = `<div class="wb"><button class="x" aria-label="${L('Zapri','Close')}">×</button>
      <h3>${p.name} · ${Math.round(topH(p))} m — ${L('vreme na vrhu','summit weather')}</h3>
      <div class="wxd">${D.map((d, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}" style="border-color:${RC[d.r]}">${dname(s.days[DD[i]])}<b>${ICON(d.code)}</b>${r1(d.tmin)}…${r1(d.tmax)} °C<br><span style="color:${RC[d.r]};font-weight:700">${d.score}</span></button>`).join('')}</div>
      <div class="sc"><div>${clsLine(p, o)}<span class="pill" style="background:${RC[o.r]}">${RN()[o.r]} · ${o.score}/100</span>
        <ul>${o.pen.length ? o.pen.map(([pt, tx]) => `<li>${tx} <b>−${pt}</b></li>`).join('') : `<li>${L('brez odbitkov','no deductions')}</li>`}</ul>${o.sat ? `<div class="note" style="margin-top:4px">🛰 ${L('Satelit Sentinel-2', 'Sentinel-2 satellite')} (${o.sat.date}${o.sat.age != null ? ', ' + L('posnetek', 'image') + ' ' + o.sat.age + ' d' : ''}): ${o.sat.cls === 2 ? L('sneg na vrhu', 'snow on the summit') : L('vrh kopen', 'summit free of snow')}</div>` : ''}</div>
        <div>🌡 ${r1(o.tmin)} … ${r1(o.tmax)} °C${o.chill != null ? ` · ${L('občutek','feels like')} ${Math.round(o.chill)} °C` : ''}<br>💨 ${r1(o.w)} km/h, ${L('sunki','gusts')} ${r1(o.g)}<br>
        💧 ${o.p.toFixed(1)} mm · ☁ ${o.c != null ? Math.round(o.c) + ' %' : '–'}${o.cloudLM ? ' (' + L('nizki+srednji', 'low+mid') + ')' : ''}<br>0 °C: ${o.fl != null ? Math.round(o.fl/50)*50 + ' m' : '–'}${o.snowcm != null ? ` · ❄ ${L('sneg', 'snow')} ~${o.snowcm} cm` : ''}</div></div>
      <div class="tw"><table><thead><tr><th>${L('ura','time')}</th><th></th><th>°C</th><th>${L('občutek','feels')}</th><th>${L('veter','wind')} km/h</th><th>${L('sunki','gusts')}</th>
        <th>${L('oblaki','cloud')}</th><th>mm</th><th>0 °C m</th><th>CAPE</th></tr></thead><tbody>${rows}</tbody></table></div>
      <details class="note"><summary>${L('Kako ocenjujemo?','How is it scored?')}</summary>${L(
        'Ocena velja za 7–17 h (vzpon + sestop, zeleno v tabeli). Začne pri 100, vsak dejavnik odšteje točke: nevihte popoldne −60 (dopoldne −48; samo velika energija neviht CAPE ≥ 1000 J/kg + dež −35; popoldanske plohe −15) · veter na višini vrha ≥ 30/45/60 km/h ali sunki ≥ 50/70/90 km/h −12/−30/−50 (šteje slabše) · padavine ≥ 0,5/2/5 mm −10/−25/−40 · nizki + srednji oblaki ≥ 70/90 % −8/−20 · sveži sneg (ničta izoterma pod vrhom + padavine) −15 · sneg na vrhu ≥ 10/50 cm −15/−25 · občutek mraza ≤ −10/−20 °C −8/−20 · lavinska nevarnost (bilten ARSO) 2/3/4/5 −5/−20/−40/−60, ko je na poti sneg ali je stopnja vsaj 3. Pri zahtevnejših vrhovih odbitki rastejo (zahtevna / zelo zahtevna): sneg ×1,6 / ×2,5, veter in padavine ×1,3 / ×1,6, mraz ×1,2 / ×1,4, oblaki ×1,2; izkušnje z zimo v profilu sneg še pomnožijo (brez ×1,5, zimska alpinistika ×0,5). Dober dan ≥ 75, pogojno 45–74, slab < 45; napovedana nevihta je vedno slab dan. Model ICON (DWD) za višino vrha, ne meritev; 3. in 4. dan sta manj zanesljiva. Veter velja za izpostavljen vrh in greben; v zavetrju, na pobočju, v gozdu ali na neizpostavljenem grebenu je občutno šibkejši. Napoved se osveži vsake 3 ure.',
        'The rating covers 7–17 h (ascent + descent, green in the table). It starts at 100 and each factor deducts points: afternoon storms −60 (morning −48; only high storm energy CAPE ≥ 1000 J/kg + rain −35; afternoon showers −15) · wind at summit height ≥ 30/45/60 km/h or gusts ≥ 50/70/90 km/h −12/−30/−50 (the worse counts) · precipitation ≥ 0.5/2/5 mm −10/−25/−40 · low + mid cloud ≥ 70/90 % −8/−20 · fresh snow (freezing level below the summit + precipitation) −15 · snow on the summit ≥ 10/50 cm −15/−25 · wind chill ≤ −10/−20 °C −8/−20 · avalanche danger (ARSO bulletin) 2/3/4/5 −5/−20/−40/−60 when there is snow on the way or the level is 3+. On harder peaks deductions grow (demanding / very demanding): snow ×1.6 / ×2.5, wind and precipitation ×1.3 / ×1.6, cold ×1.2 / ×1.4, cloud ×1.2; winter experience in your profile scales snow again (none ×1.5, winter alpinism ×0.5). Good ≥ 75, so-so 45–74, bad < 45; forecast thunder is always a bad day. ICON model (DWD) at summit height, not a measurement; days 3 and 4 are less reliable. Wind is for an exposed summit or ridge; in the lee, on slopes, in forest or on a sheltered ridge it is noticeably weaker. The forecast is refreshed every 3 hours.')}</details>
      <div class="note">ICON (DWD) · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0)</div></div>`;
    el.querySelector('.x').onclick = close;
    el.querySelectorAll('.wxd button').forEach(b => b.onclick = () => { sel = +b.dataset.i; draw(); });
  };
  draw(); }

// --- popup block
// best day of the next days for one peak (peak of the week)
window.wxBestDay = async p => { const s = await seriesFor(p); if (!s) return null; const d0 = Math.max(0, s.days.indexOf(today())); let b = null;
  s.days.forEach((dd, i) => { if (i < d0) return; const o = day(s, i, topH(p), window.peakClass(p) || 2, window.peakTG(p)); if (o && (!b || o.score > b.score)) b = {day:dd, score:o.score, r:o.r}; }); return b; };

// rating of one day (YYYY-MM-DD) for one peak (notifications: weather on a group plan's day)
window.wxDayScore = async (p, dd) => { const s = await seriesFor(p); if (!s) return null; const i = s.days.indexOf(dd); if (i < 0) return null;
  const o = day(s, i, topH(p), window.peakClass(p) || 2, window.peakTG(p)); return o ? {score:o.score, r:o.r} : null; };

// --- avalanche danger: ARSO's avalanche bulletin (tools/avalanche_fetch.py -> avalanche.json, in the season ~December–May)
// Bulletin regions are matched to our mountain ranges by name; a level can differ above / below an elevation.
let AVA = null;
(location.protocol.startsWith('http') ? fetch('avalanche.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null))
  .then(j => { if (j && j.bulletins && j.bulletins.length) AVA = j; });
const AVA_N = () => [null, L('nizka','low'), L('zmerna','moderate'), L('znatna','considerable'), L('velika','high'), L('zelo velika','very high')];
const AVA_C = [null, '#ccff66', '#ffff00', '#ff9900', '#ff0000', '#9b0000'];
const AVA_RANGE = [[/julij|julian|bovšk|kanin|triglav|bohinj/i, 'Julijske Alpe'], [/karavank|karawank/i, 'Karavanke'], [/kamni|savinj|grintov/i, 'Kamniško-Savinjske Alpe'],
  [/pohorj/i, 'Pohorje'], [/snežnik|sneznik|notranj|dinar|kočevsk/i, 'Snežnik'], [/predalp|prealp|škofjelo|cerkljan|polhov|posavsk/i, 'Predalpe']];
const AVA_ID = {'SI-1':'Karavanke', 'SI-2':'Karavanke', 'SI-3':'Kamniško-Savinjske Alpe', 'SI-4':'Kamniško-Savinjske Alpe', 'SI-6':'Julijske Alpe', 'SI-7':'Julijske Alpe', 'SI-8':'Julijske Alpe', 'SI-10':'Julijske Alpe'};   // EAWS regions (ARSO)
const AVA_P = {new_snow:['nov sneg','new snow'], wind_slab:['napihan sneg','wind slab'], persistent_weak_layers:['obstojne šibke plasti','persistent weak layers'], wet_snow:['moker sneg','wet snow'], gliding_snow:['drseči sneg','gliding snow'], cornices:['opasti','cornices']};
const rangeOfReg = r => { if (AVA_ID[r.id]) return AVA_ID[r.id]; const t = (r.name || '') + ' ' + (r.id || ''); if (/sloven/i.test(t) && !AVA_RANGE.some(([re]) => re.test(t))) return '*'; const m = AVA_RANGE.find(([re]) => re.test(t)); return m ? m[1] : null; };
window.avaAt = (la, lo, elev, dayIso) => { if (!AVA) return null; let rg = null, bd = 25;
  for (const p of PEAKS){ if (p.lat == null) continue; const d = Math.hypot((p.lat - la) * 111.3, (p.lon - lo) * 77); if (d < bd){ bd = d; rg = p.range; } }
  if (!rg) return null; let best = null;
  for (const b of AVA.bulletins){ if (b.from && dayIso < b.from.slice(0, 10)) continue; if (b.to && dayIso > b.to.slice(0, 10)) continue;
    if (!(b.regions || []).some(r => { const x = rangeOfReg(r); return x === rg || x === '*'; })) continue;
    const lv = b.bound != null && elev != null ? (elev >= b.bound ? (b.hi || b.lo) : (b.lo || b.hi)) : Math.max(b.hi || 0, b.lo || 0);
    if (lv && (!best || lv > best.level)) best = {level:lv, bound:b.bound, problems:b.problems || [], region:(b.regions || []).map(r => r.name || r.id).filter(Boolean).join(', ')}; }
  return best; };
const avaLine = o => !o.ava ? '' : `<div style="margin-top:4px;padding:4px 7px;border-radius:7px;background:${AVA_C[o.ava.level]};color:${o.ava.level >= 4 ? '#fff' : '#1d2321'};font-size:.92em">⚠ ${L('Lavinska nevarnost','Avalanche danger')} <b>${o.ava.level} – ${AVA_N()[o.ava.level]}</b>${o.ava.bound ? ` (${L('meja','limit')} ${o.ava.bound} m)` : ''}${o.ava.problems.length ? ' · ' + o.ava.problems.slice(0, 2).map(x => AVA_P[x] ? L(AVA_P[x][0], AVA_P[x][1]) : x.replace(/_/g, ' ')).join(', ') : ''} · <a href="https://meteo.arso.gov.si/" target="_blank" rel="noopener" style="color:inherit">ARSO</a></div>`;

window.wxBox = p => {
  const box = document.createElement('div'); box.className = 'wx';
  // the popup grew -> if its top left the map, move the map down so the whole popup is visible
  const fit = () => requestAnimationFrame(() => { const el = box.closest('.maplibregl-popup'); if (!el) return;
    const r = el.getBoundingClientRect(), m = map.getContainer().getBoundingClientRect(), top = r.top - m.top - 8;
    // keep it clear of the side panels (PC): left sheet + tab, peak list + tab
    const pnl = document.body.classList.contains('lclosed') ? 0 : (document.querySelector('.panel') || {}).offsetWidth || 0, dr = document.getElementById('drawer');
    const L0 = m.left + (!PHONE_UI() ? pnl + 50 : 8), R0 = m.right - (!PHONE_UI() && dr && dr.classList.contains('open') ? dr.offsetWidth + 50 : 8);
    let dx = r.left < L0 ? r.left - L0 : r.right > R0 ? r.right - R0 : 0;
    if (top < 0 || dx) map.panBy([dx, Math.min(0, top)], {duration:300}); });
  box.innerHTML = `<div class="wxh">${L('Vreme na vrhu','Summit weather')} · ${Math.round(topH(p))} m</div><div class="wxs" style="color:#888">${L('Nalagam napoved …','Loading forecast …')}</div>`;
  seriesFor(p).then(s => {
    if (!s){ box.querySelector('.wxs').textContent = L('Napoved trenutno ni dosegljiva.','Forecast not available right now.'); return; }
    const d0 = Math.max(0, s.days.indexOf(today()));
    let D = [], DD = []; const mk = () => { D = []; DD = []; s.days.forEach((d, i) => { if (i < d0) return; const o = day(s, i, topH(p), window.peakClass(p) || 2, window.peakTG(p)); if (o){ D.push(o); DD.push(i); } }); }; mk(); let sel = 0;
    const draw = () => {
      const o = D[sel], si = DD[sel], nh = s.hours.length, hrs = [6, 9, 12, 15, 18, 21];
      box.innerHTML = `<div class="wxh">${L('Vreme na vrhu','Summit weather')} · ${Math.round(topH(p))} m<button class="wxbig" title="${L('Povečaj','Enlarge')}">⤢ ${L('Povečaj','Enlarge')}</button></div>
      <div class="wxd">${D.map((d, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}" style="border-color:${RC[d.r]}">${dname(s.days[DD[i]])}<b>${ICON(d.code)}</b>${r1(d.tmin)}…${r1(d.tmax)}°</button>`).join('')}</div>
      <div class="wxs">${clsLine(p, o)}<span class="wxr" style="background:${RC[o.r]}">${RN()[o.r]} · ${o.score}</span>${o.why.length ? ' ' + o.why.slice(0, 3).join(', ') : ''}<br>
        🌡 ${r1(o.tmin)} … ${r1(o.tmax)} °C · 💨 ${r1(o.w)} km/h, ${L('sunki','gusts')} ${r1(o.g)}<br>
        ${o.p > 0.05 ? `💧 ${o.p.toFixed(1)} mm · ` : ''}${o.c != null ? `☁ ${Math.round(o.c)} %${o.cloudLM ? ' ' + L('nizki/srednji','low/mid') : ''} · ` : ''}${o.fl != null ? `0 °C: ${Math.round(o.fl/50)*50} m` : ''}${o.snowcm ? ` · ❄ ${o.snowcm} cm${s.snowRoute ? ' ' + L('(največ na poti)','(most on the way up)') : ''}` : ''}${avaLine(o)}</div>
      <details class="wxdt"${OPENH ? ' open' : ''}><summary>${L('Po urah','Hourly')}</summary><div class="wxt">${hrs.map(h => { const k = si*nh + s.hours.indexOf(h); if (s.hours.indexOf(h) < 0 || !s.T || s.T[k] == null) return '';
        return `<div>${h}h<i>${ICON(s.X && s.X[k])}</i>${Math.round(s.T[k])}°<br>${r1(s.W && s.W[k])} ${DIR(s.D && s.D[k])}</div>`; }).join('')}</div></details>
      <div class="wxf">ICON (DWD) · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>${s.gen ? ' · ' + new Date(s.gen.replace('Z', ':00Z')).toLocaleString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {weekday:'short', hour:'2-digit', minute:'2-digit'}) : ''} · ${L('ocena za 7–17 h; model, ne meritev','rating for 7–17 h; model, not a measurement')}</div>`;
      box.querySelectorAll('.wxd button').forEach(b => b.onclick = e => { e.stopPropagation(); sel = +b.dataset.i; draw(); });
      box.querySelector('.wxbig').onclick = e => { e.stopPropagation(); big(p, s, D, DD, sel); };
      const dt = box.querySelector('.wxdt'); dt.ontoggle = () => { OPENH = dt.open; fit(); };
      fit();
    };
    if (!D.length){ box.querySelector('.wxs').textContent = L('Napoved trenutno ni dosegljiva.','Forecast not available right now.'); return; }
    draw();
    // snow for the rating = the most snow anywhere along the routes to this peak (snow map values); summit only when no route
    routeSnow(p, s.days.slice(d0)).then(R => { if (!R || !box.isConnected) return; s.snowPt = Object.assign({}, s.snowPt, R); s.snowRoute = true; mk(); if (D.length) draw(); });
  });
  return box; };
// samples every ~150 m along each route, snow map value per sample and day, max per day
async function routeSnow(p, days){
  if (!window.__peakRouteLines || !window.snowPoint) return null;
  let lines = null; for (let k = 0; k < 4 && lines == null; k++){ lines = await window.__peakRouteLines(p.id).catch(() => null); if (lines == null) await new Promise(r => setTimeout(r, 3000)); } // trails still loading
  if (!lines || !lines.length) return null;
  const pts = []; for (const c of lines){ let last = null; for (const q of c){ if (!last || Math.hypot((q[0]-last[0])*77, (q[1]-last[1])*111) > 0.15){ pts.push(q); last = q; } } }
  const out = {};
  for (const d of days){ let mx = null; for (const q of pts){ const v = await window.snowPoint(q[1], q[0], d); if (v != null && (mx == null || v > mx)) mx = v; } if (mx != null) out[d] = mx; }
  return Object.keys(out).length ? out : null; }

// --- map layer: main peaks coloured by the day's rating
const grp = $w('legend') && $w('legend').parentNode;
if (grp){
  const lab = document.createElement('label'); lab.innerHTML = `<input type="checkbox" id="wxChk"> ${L('Vreme na vrhovih (ocena dneva)','Summit weather (day rating)')}`;
  const opt = document.createElement('div'); opt.id = 'wxopt'; opt.style.cssText = 'display:none;margin:2px 0 4px 26px;font-size:.86em;color:var(--mute)';
  grp.insertBefore(lab, $w('legend')); grp.insertBefore(opt, $w('legend'));
  let dsel = 0;
  const paint = () => {
    if (!WX){ opt.innerHTML = L('Vremenski podatki še niso na voljo.','Weather data not available yet.'); return; }
    const di = Math.max(0, WX.days.indexOf(today())), days = WX.days.slice(di);
    if (dsel >= days.length) dsel = 0;
    opt.innerHTML = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${days.map((d, i) => `<button class="lnk" data-i="${i}" style="${i === dsel ? 'font-weight:700;text-decoration:underline' : ''}">${dname(d)}</button>`).join('')}</div>
      <div style="margin-top:3px">${RN().map((n, i) => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${RC[i]};margin:0 3px 0 6px"></span>${n}`).join('')}</div>
      <div style="margin-top:2px">${L('Glavni vrhovi, 7–17 h: nevihte, veter, padavine, oblaki, sneg, mraz. Klik na vrh = podrobna napoved (⤢ Povečaj).','Main peaks, 7–17 h: storms, wind, precipitation, cloud, snow, cold. Click a peak = detailed forecast (⤢ Enlarge).')}</div>`;
    opt.querySelectorAll('button').forEach(b => b.onclick = () => { dsel = +b.dataset.i; paint(); });
    const d = di + dsel;
    PEAKS.forEach((p, id) => { if (p.lat == null) return; const main = p.rank != null || p.is_sub === 'no';
      const s = main ? fromWX(p) : null, o = s ? day(s, d, topH(p), (p.tech && p.tech.c) || 2, window.peakTG(p)) : null;
      try{ map.setFeatureState({source:'peaks', id}, {wx: o ? o.r : -1}); }catch(_){} });
  };
  const addLayer = () => { if (map.getLayer('pk-wx')) return;
    map.addLayer({id:'pk-wx', type:'circle', source:'peaks', layout:{visibility:'none'}, paint:{
      'circle-radius':['interpolate',['linear'],['zoom'],8,8,10,11,13,19],
      'circle-color':['match',['coalesce',['feature-state','wx'],-1],0,RC[0],1,RC[1],2,RC[2],'#000'],
      'circle-opacity':['case',['>=',['coalesce',['feature-state','wx'],-1],0],0.62,0],
      'circle-blur':0.45, 'circle-pitch-alignment':'viewport'}}, 'pk'); };
  const onChk = async () => { const on = $w('wxChk').checked; opt.style.display = on ? '' : 'none';
    if (!map.getLayer('pk-wx')) return; map.setLayoutProperty('pk-wx', 'visibility', on ? 'visible' : 'none');
    if (on){ opt.innerHTML = L('Nalagam …','Loading …'); await loadWX(); paint(); } };
  $w('wxChk').onchange = onChk;
  window.wxRepaint = () => { if ($w('wxChk').checked && WX) paint(); };
  const init = () => { addLayer(); onChk(); };   // feature-state survives the peaks source's setData
  if (map.loaded() && map.getSource('peaks')) init(); else map.on('load', () => setTimeout(init, 0));
}
})();
