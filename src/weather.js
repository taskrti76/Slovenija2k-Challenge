// ===================== summit weather =====================
// weather.json is written every 6 h by .github/workflows/weather.yml (tools/weather_fetch.py): DWD ICON via Open-Meteo,
// one forecast point per ~1.6 km group of peaks, asked at the height of the group's highest summit.
// If weather.json is missing or old, a peak's popup asks Open-Meteo directly (one request, only for that peak).
(function(){
const L = (sl, en) => window.LANG === 'en' ? en : sl;
const $w = id => document.getElementById(id);
const HOURS = [...Array(16)].map((_, i) => i + 6), DAY_H = [8, 15];           // rating window 08–15 h
const PLEV = {850:1460, 800:1950, 750:2470, 700:3010};
const VARS = ['temperature_2m','wind_speed_10m','wind_gusts_10m','wind_direction_10m','cloud_cover','precipitation','weather_code',
  'freezing_level_height','cape','wind_speed_850hPa','wind_speed_800hPa','wind_speed_750hPa','wind_speed_700hPa'];
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
    P:sc(v.P[i], x => x/10), X:v.X[i], F:v.F[i], K:v.K[i]}; }
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
    const w = Math.max(h.wind_speed_10m[k] ?? -1, fa ?? -1), g = Math.max(h.wind_gusts_10m[k] ?? -1, w * 1.35);
    W.push(w < 0 ? null : Math.round(w)); G.push(g < 0 ? null : Math.round(g)); }
  return LIVE[p.id] = {days:[...new Set(sel.map(k => h.time[k].slice(0, 10)))], hours:HOURS, gen:null, model:'icon (živo)',
    T:col('temperature_2m'), W, G, D:col('wind_direction_10m'), C:col('cloud_cover'), P:col('precipitation'), X:col('weather_code'),
    F:col('freezing_level_height'), K:col('cape')}; }
async function seriesFor(p){ await loadWX(); return fromWX(p) || await live(p); }

// --- day summary + rating (good / okay / bad) for the usual summit hours 08–15
function day(s, d, elev){
  const nh = s.hours.length, idx = s.hours.map((h, i) => [h, d*nh + i]).filter(([h]) => h >= DAY_H[0] && h <= DAY_H[1]).map(x => x[1]);
  const all = s.hours.map((h, i) => d*nh + i), g = (a, I) => a ? I.map(k => a[k]).filter(x => x != null) : [];
  const T = g(s.T, all), W = g(s.W, idx), G = g(s.G, idx), P = g(s.P, idx), C = g(s.C, idx), X = g(s.X, idx), F = g(s.F, idx), K = g(s.K, idx);
  if (!T.length) return null;
  const mx = a => a.length ? Math.max(...a) : null, sum = a => a.reduce((x, y) => x + y, 0);
  const o = {tmin:Math.min(...T), tmax:Math.max(...T), w:mx(W), g:mx(G), p:sum(P), c:C.length ? sum(C)/C.length : null, fl:F.length ? Math.min(...F) : null,
    storm:X.some(x => x >= 95) || (mx(K) >= 800 && sum(P) >= 1), code:X.length ? worst(X) : null};
  o.snow = o.fl != null && o.fl < elev && o.p >= 0.3;
  const bad = o.storm || o.g >= 75 || o.w >= 50 || o.p >= 4, meh = o.g >= 50 || o.w >= 30 || o.p >= 0.6 || (o.c ?? 0) >= 80 || o.snow;
  o.r = bad ? 2 : meh ? 1 : 0;
  o.why = [o.storm && L('nevihte','storms'), o.g >= 50 && L('močan veter','strong wind'), o.p >= 0.6 && L('padavine','precipitation'),
    o.snow && L('sneg na vrhu','snow on top'), (o.c ?? 0) >= 80 && L('v oblakih','in cloud')].filter(Boolean);
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
.maplibregl-popup-content{max-height:calc(100vh - 140px);overflow-y:auto}`;
document.head.append(css);

// --- popup block
window.wxBox = p => {
  const box = document.createElement('div'); box.className = 'wx';
  // the popup grew -> if its top left the map, move the map down so the whole popup is visible
  const fit = () => requestAnimationFrame(() => { const el = box.closest('.maplibregl-popup'); if (!el) return;
    const r = el.getBoundingClientRect(), m = map.getContainer().getBoundingClientRect(), top = r.top - m.top - 8;
    if (top < 0) map.panBy([0, top], {duration:300}); });
  box.innerHTML = `<div class="wxh">${L('Vreme na vrhu','Summit weather')} · ${Math.round(topH(p))} m</div><div class="wxs" style="color:#888">${L('Nalagam napoved …','Loading forecast …')}</div>`;
  seriesFor(p).then(s => {
    if (!s){ box.querySelector('.wxs').textContent = L('Napoved trenutno ni dosegljiva.','Forecast not available right now.'); return; }
    const d0 = Math.max(0, s.days.indexOf(today()));
    const D = [], DD = []; s.days.forEach((d, i) => { if (i < d0) return; const o = day(s, i, topH(p)); if (o){ D.push(o); DD.push(i); } }); let sel = 0;
    const draw = () => {
      const o = D[sel], si = DD[sel], nh = s.hours.length, hrs = [6, 9, 12, 15, 18, 21];
      box.innerHTML = `<div class="wxh">${L('Vreme na vrhu','Summit weather')} · ${Math.round(topH(p))} m</div>
      <div class="wxd">${D.map((d, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}" style="border-color:${RC[d.r]}">${dname(s.days[DD[i]])}<b>${ICON(d.code)}</b>${r1(d.tmin)}…${r1(d.tmax)}°</button>`).join('')}</div>
      <div class="wxs"><span class="wxr" style="background:${RC[o.r]}">${RN()[o.r]}</span>${o.why.length ? ' ' + o.why.join(', ') : ''}<br>
        🌡 ${r1(o.tmin)} … ${r1(o.tmax)} °C · 💨 ${r1(o.w)} km/h, ${L('sunki','gusts')} ${r1(o.g)}<br>
        ${o.p > 0.05 ? `💧 ${o.p.toFixed(1)} mm · ` : ''}${o.c != null ? `☁ ${Math.round(o.c)} % · ` : ''}${o.fl != null ? `0 °C: ${Math.round(o.fl/50)*50} m` : ''}${o.storm ? ` · ⚡ ${L('nevihte možne','storms possible')}` : ''}</div>
      <details class="wxdt"${OPENH ? ' open' : ''}><summary>${L('Po urah','Hourly')}</summary><div class="wxt">${hrs.map(h => { const k = si*nh + s.hours.indexOf(h); if (s.hours.indexOf(h) < 0 || !s.T || s.T[k] == null) return '';
        return `<div>${h}h<i>${ICON(s.X && s.X[k])}</i>${Math.round(s.T[k])}°<br>${r1(s.W && s.W[k])} ${DIR(s.D && s.D[k])}</div>`; }).join('')}</div></details>
      <div class="wxf">ICON (DWD) · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>${s.gen ? ' · ' + new Date(s.gen.replace('Z', ':00Z')).toLocaleString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {weekday:'short', hour:'2-digit', minute:'2-digit'}) : ''} · ${L('ocena za 8–15 h; model, ne meritev','rating for 8–15 h; model, not a measurement')}</div>`;
      box.querySelectorAll('.wxd button').forEach(b => b.onclick = e => { e.stopPropagation(); sel = +b.dataset.i; draw(); });
      const dt = box.querySelector('.wxdt'); dt.ontoggle = () => { OPENH = dt.open; fit(); };
      fit();
    };
    if (!D.length){ box.querySelector('.wxs').textContent = L('Napoved trenutno ni dosegljiva.','Forecast not available right now.'); return; }
    draw();
  });
  return box; };

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
      <div style="margin-top:2px">${L('Glavni vrhovi, 8–15 h: veter, nevihte, padavine, oblaki, sneg. Klik na vrh = podrobna napoved.','Main peaks, 8–15 h: wind, storms, precipitation, cloud, snow. Click a peak = detailed forecast.')}</div>`;
    opt.querySelectorAll('button').forEach(b => b.onclick = () => { dsel = +b.dataset.i; paint(); });
    const d = di + dsel;
    PEAKS.forEach((p, id) => { if (p.lat == null) return; const main = p.rank != null || p.is_sub === 'no';
      const s = main ? fromWX(p) : null, o = s ? day(s, d, topH(p)) : null;
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
  const init = () => { addLayer(); onChk(); };   // feature-state survives the peaks source's setData
  if (map.loaded() && map.getSource('peaks')) init(); else map.on('load', () => setTimeout(init, 0));
}
})();
