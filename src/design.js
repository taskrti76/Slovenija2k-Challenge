// ===================== "Nov videz" (v2, experimental): one design system over the existing UI =====================
// On only when html.v2 is set (Nastavitve → Nov videz, or ?v2=1 / ?v2=0 on the address; remembered). Everything here is scoped
// to html.v2, so with it off the site looks exactly as before. Tokens: Inter; one accent (alpine red #B42318), ink #1B1F23,
// grey #626870, stone #F5F4F0, line #E6E3DC, selection blue #1F5FAD; radius 10 (controls) / 14 (cards) / 20 (sheets) / pill;
// two shadows (floating on the map, sheet / window); line icons instead of emoji in the round menu.
(function(){
if (!document.documentElement.classList.contains('v2')) return;
const f = document.createElement('link'); f.rel = 'stylesheet';
f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; document.head.append(f);
const PC = '@media (min-width:701px) and (min-height:501px),(min-width:701px) and (pointer:fine)';
const PH = '@media (max-width:700px),(max-height:500px) and (pointer:coarse)';
const c = document.createElement('style'); c.id = 'v2css'; c.textContent = `
html.v2{--acc:#B42318;--v2red:#B42318;--v2blue:#1F5FAD;--v2float:0 1px 3px rgba(16,24,32,.22);--v2sheet:0 8px 28px rgba(16,24,32,.18)}
@media (prefers-color-scheme:light){html.v2{--ink:#1B1F23;--mute:#626870;--line:#E6E3DC;--bg:#F5F4F0;--panel:#ffffff;--solid:#ffffff}}
@media (prefers-color-scheme:dark){html.v2{--acc:#F07167;--v2blue:#6EA8F0}}
/* the peak window is always white: keep its text dark when the phone is in dark mode (buttons looked disabled) */
html.v2 .maplibregl-popup-content{--ink:#1B1F23;--mute:#626870;--line:#E6E3DC;--solid:#fff;--panel:#fff;--acc:#B42318;color:#1B1F23}
html.v2 body,html.v2 button,html.v2 input,html.v2 select,html.v2 textarea,html.v2 .maplibregl-popup-content,html.v2 .maplibregl-ctrl{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important}
html.v2 body{-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}

/* panels, sheets, cards, windows */
html.v2 .panel,html.v2 #drawer,html.v2 .card,html.v2 #plCard{backdrop-filter:none!important;border:0!important;box-shadow:var(--v2sheet)!important}
${PC}{ html.v2 .card,html.v2 #plCard{border-radius:14px!important} }
${PH}{ html.v2 .card,html.v2 #plCard,html.v2 #drawer,html.v2 .panel{border-radius:20px 20px 0 0!important} }
html.v2 .maplibregl-popup-content{border-radius:14px!important;box-shadow:0 8px 28px rgba(16,24,32,.24)!important;padding:14px 14px 12px!important}
html.v2 #setWin .setcard,html.v2 #accWin .acard{border-radius:16px!important}
html.v2 .panel h1,html.v2 #dtitle{letter-spacing:-.015em}

/* buttons: primary (red), secondary (outlined), all 10 px corners */
html.v2 .btn,html.v2 .pbtns button,html.v2 .rb button,html.v2 .sb,html.v2 .alt,html.v2 #accBox .go,html.v2 #plCard .go,html.v2 .tb{border-radius:10px!important;font-weight:600!important}
html.v2 .pbtns button,html.v2 .rb button{min-height:40px;border:1px solid var(--line)!important;background:var(--solid)!important;color:var(--ink)!important}
html.v2 .btn:not(.btn2){background:var(--ink);border-color:var(--ink)}
html.v2 .sb.pri,html.v2 #accBox .go,html.v2 #plCard .go,html.v2 #tour .nx,html.v2 .admd .pri{background:var(--v2red)!important;border-color:var(--v2red)!important;color:#fff!important}
html.v2 .pplan{border-radius:10px!important;border-style:solid!important;font-weight:600}

/* chips (pills) and segmented switches */
html.v2 #chips button,html.v2 .chips button,html.v2 .tchips button{border-radius:999px!important;font-weight:500}
html.v2 #chips button.on,html.v2 .chips button.on,html.v2 .tchips button.on{background:var(--ink)!important;color:var(--panel)!important;border-color:var(--ink)!important}
html.v2 #stchips{border:0!important;background:rgba(127,127,127,.14);border-radius:10px!important;padding:3px;gap:3px}
html.v2 #stchips button{border:0!important;border-radius:8px!important;font-weight:500}
html.v2 #stchips button.on{background:var(--solid)!important;color:var(--ink)!important;font-weight:600;box-shadow:0 1px 2px rgba(16,24,32,.14)}

/* peak list */
html.v2 .rg{letter-spacing:.06em;font-weight:700}
html.v2 .it .rk{border:0!important;background:rgba(127,127,127,.13);border-radius:6px!important;font-weight:600;color:var(--ink)}
html.v2 .it input[type=checkbox]{accent-color:#2E7D4F}

/* route card */
html.v2 .ri{border-radius:12px!important}
html.v2 .ri.on{border-color:var(--v2blue)!important;background:rgba(31,95,173,.07)!important}
html.v2 .pzs{background:var(--v2red)!important;border-radius:4px!important}

/* map buttons, legends, little pills on the map */
html.v2 .maplibregl-ctrl-group{border-radius:12px!important;box-shadow:var(--v2float)!important;overflow:hidden}
html.v2 #hleg,html.v2 #snowleg{border-radius:12px!important;box-shadow:var(--v2float)!important}

/* the red button, its menu and the peaks tab */
html.v2 #fab .fb{background:var(--v2red)!important}
html.v2 #fab.open .fb{background:#1B1F23!important}
html.v2 #fab .fo{width:52px!important;height:52px!important;left:5px!important;top:5px!important;box-shadow:0 4px 14px rgba(16,24,32,.24)!important}
${PH}{ html.v2 #fab .fo{left:5px!important;top:5px!important} }
html.v2 #fab .fb .fi svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;display:block}
html.v2 #fab .fo .oi svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;display:block}
html.v2 #fab .fo .ol{font:600 12px Inter,system-ui,sans-serif!important;border-radius:6px!important;padding:2px 7px!important;box-shadow:0 1px 3px rgba(16,24,32,.14)}
html.v2 #fab.open .fo:hover,html.v2 #fab.open .fo:focus-visible,html.v2 #fab.open .fo:active{background:var(--v2red)!important;color:#fff!important;box-shadow:0 6px 18px rgba(180,35,24,.4)!important}
html.v2 #fab .fo:hover .ol,html.v2 #fab .fo:focus-visible .ol,html.v2 #fab .fo:active .ol{background:var(--v2red)!important;color:#fff!important}
html.v2 #fabTab{font-family:Inter,system-ui,sans-serif!important;font-weight:600!important;box-shadow:0 -4px 16px rgba(16,24,32,.16)!important}
html.v2 #fabTab .tr{color:var(--v2red)!important}

/* PC side tabs: calm white handles instead of a blue and a red bar */
${PC}{ html.v2 #ltab,html.v2 #ptab{background:var(--solid)!important;color:var(--ink)!important;box-shadow:var(--v2float)!important;border:0!important}
  html.v2 #ptab em,html.v2 #vcount3{color:var(--v2red)!important} }

/* guide */
html.v2 #tour .tc{border-radius:18px!important}
html.v2 #tour h3{letter-spacing:-.01em}
`;
document.head.append(c);
})();
// line icons for the round menu (account.js uses them when html.v2 is on)
window.V2I = (() => { const s = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`; return {
  '◧': s('<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>'),
  '⚙': s('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h12M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  '👤': s('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  '✏️': s('<path d="M4 20l4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14 7 3 3"/>'),
  '🗓': s('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>'),
  '🏆': s('<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>'),
  '👥': s('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .7 3.2 2.3 3.5 5"/>'),
  '⛰': s('<path d="m3 20 6.5-11 4 6 2.5-3.5L21 20H3Z"/><path d="M9.5 9V4l3 1.2-3 1.3"/>'),
  '📍': s('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  '❓': s('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
  '🛠': s('<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3Z"/>'),
  '☰': s('<path d="M4 7h16M4 12h16M4 17h16"/>')
}; })();
if (window.V2 && window.fabFace) fabFace();

// ===================== new look: layout (only with html.v2) =====================
(function(){
if (!window.V2) return;
const $ = id => document.getElementById(id), B = document.body, PH = () => window.PHONE_UI && PHONE_UI();
const I = k => (window.V2I && V2I[k]) || '', L = (sl, en) => window.LANG === 'en' ? en : sl;
const ICON = {route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/></svg>',
  pano: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M3 12v1c0 2.2 4 4 9 4s9-1.8 9-4v-1"/><path d="M12 8V5"/></svg>',
  cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17h.01"/></svg>',
  peaks: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 20 6.5-11 4 6 2.5-3.5L21 20H3Z"/></svg>'};

// ---------- peak window: header, 4 actions, warning, then the same parts as before ----------
window.v2PeakBox = (box, p, o) => {
  const vis = typeof visited !== 'undefined' && visited.has(p.id), tg = window.peakTG ? peakTG(p) : null, PR = window.PROFILE || {};
  const over = tg && ((PR.maxT && tg.t > PR.maxT) || (tg.f && PR.ferrata === false));
  const all = [...box.childNodes], st = all.findIndex(n => n.nodeType === 1 && (n.classList.contains('wish') || n === o.lab));
  const rest = all.slice(Math.max(0, st)).filter(n => n.nodeType === 1);   // (the old text header before it is dropped) wish, label, visit, weather, buttons row, cams, gps, admin, plan
  const wish = rest.find(n => n.classList.contains('wish')), cams = rest.find(n => n.classList.contains('pcams')), plan = rest.find(n => n.classList.contains('pplan') && !n.classList.contains('gpsb'));
  const camN = cams ? cams.querySelectorAll('a').length : 0;
  box.className = 'v2p'; box.textContent = '';
  const h = document.createElement('div'); h.className = 'v2h';
  h.innerHTML = `<div class="v2hn"><div class="v2n"><span>${p.name}</span>${vis ? `<span class="v2ok">✓ ${L('Obiskan','Climbed')}</span>` : ''}</div>
    <div class="v2s">${p.elev.toFixed(p.elev % 1 ? 1 : 0)} m${p.rank ? ` · #${p.rank}` : ''}${p.prom != null ? ` · ${L('prominenca','prominence')} ${Math.round(p.prom)} m` : ''}</div>
    <div class="v2s2">${p.range}${p.massif ? ' · ' + p.massif : ''}${p.is_sub === 'yes' ? ' · ' + L('podvrh','subpeak') : ''}${p.tier === '1500' ? ' · 1500–2000 m' : ''}</div></div>`;
  if (wish) h.append(wish); box.append(h);
  const a = document.createElement('div'); a.className = 'v2act';
  const btn = (ic, t, fn, pri) => { const b = document.createElement('button'); b.className = pri ? 'pri' : ''; b.innerHTML = ic + `<span>${t}</span>`; b.onclick = fn; a.append(b); };
  btn(ICON.route, L('Poti','Routes'), o.rb.onclick, true); btn(ICON.pano, '360°', o.vb.onclick);
  if (plan) btn(I('🗓'), L('V načrt','Plan'), plan.onclick);
  if (camN) btn(ICON.cam, `${L('Kamere','Webcams')} · ${camN}`, () => { const c = box.querySelector('.v2cams'); if (c) c.scrollIntoView({block: 'nearest', behavior: 'smooth'}); });
  box.append(a);
  if (over){ const w = document.createElement('div'); w.className = 'v2warn'; w.innerHTML = ICON.warn + `<span>${L('Normalna pot','Normal route')} <b>${tg.f ? L('ferata','via ferrata') : 'T' + tg.t}</b> — ${L('nad tvojo mejo','above your limit')} T${PR.maxT}</span>`; box.append(w); }
  { const sb = $('snow'), cm = window.snowAt && sb && sb.checked ? snowAt(p.lat, p.lon) : null;   // snow on the summit (snow layer on)
    if (cm != null){ const d = document.createElement('div'); d.className = 'v2snow'; d.textContent = `❄ ${L('Sneg','Snow')} (${L('model','model')}, ${snowDay()}): ~${cm} cm`; box.append(d); } }
  for (const n of rest) if (n !== wish && n !== plan && n !== cams && !n.classList.contains('pbtns')) box.append(n);   // visited, visit info, weather, GPS, admin
  if (cams){ const c2 = document.createElement('div'); c2.className = 'v2cams';
    cams.querySelectorAll('a').forEach(a0 => { const sm = a0.nextElementSibling, ch = document.createElement('button');
      ch.innerHTML = ICON.cam + `<span>${a0.textContent.replace(/[<>&]/g, '')}</span>` + (sm ? `<small>${sm.textContent}</small>` : ''); ch.onclick = a0.onclick; c2.append(ch); });
    box.append(c2); }
  const meta = document.createElement('div'); meta.className = 'v2meta';
  meta.textContent = [p.dem_h != null ? `LiDAR ${p.dem_h.toFixed(1)} m` : '', p.coord_status !== 'ok' ? L('približna lega (±150 m)','approximate position (±150 m)') : ''].filter(Boolean).join(' · ');
  if (meta.textContent) box.append(meta); };

// ---------- free part of the map on a computer: right of the rail and the open left panel ----------
window.v2Free = () => { const r = $('v2rail'), pn = document.querySelector('.panel'), dr = $('drawer');
  let L = r ? r.getBoundingClientRect().right : 0;
  if (pn && !B.classList.contains('lclosed')) L = Math.max(L, pn.getBoundingClientRect().right);
  if (dr && dr.classList.contains('open')) L = Math.max(L, dr.getBoundingClientRect().right);
  return [L, innerWidth]; };
const setLw = () => { if (PH()){ B.style.removeProperty('--lw'); return; }
  const r = $('v2rail'), pn = document.querySelector('.panel'), dr = $('drawer'); let L = r ? r.offsetWidth : 72;
  if (!B.classList.contains('lclosed') && pn) L += pn.offsetWidth; else if (dr && dr.classList.contains('open')) L += dr.offsetWidth;
  B.style.setProperty('--lw', L + 'px'); };

// ---------- computer: a rail of icons on the left; the peak list and the map panel open next to it, one at a time ----------
const rail = document.createElement('nav'); rail.id = 'v2rail'; rail.setAttribute('aria-label', 'Glavni meni'); B.append(rail);
let railSig = '';
function railRender(){ const items = window.fabItemsList ? fabItemsList().filter(x => x[0] !== '◧' && x[0] !== '❓') : [];
  const sig = items.map(x => x[1] + (x[3] || '')).join('|') + (B.classList.contains('lclosed') ? 0 : 1) + ($('drawer').classList.contains('open') ? 1 : 0);
  if (sig === railSig) return; railSig = sig;
  const dOpen = $('drawer').classList.contains('open'), lOpen = !B.classList.contains('lclosed');
  const it = (ic, t, on, k, badge) => `<button class="rl${on ? ' on' : ''}" data-k="${k}" title="${t}">${ic}<span>${t}</span>${badge ? `<i class="bdg">${badge}</i>` : ''}</button>`;
  rail.innerHTML = `<span class="logo">${ICON.peaks}</span>` + it(ICON.peaks, L('Vrhovi','Peaks'), dOpen, 'peaks') + it(I('◧'), L('Karta','Map'), lOpen, 'layers')
    + items.map((x, i) => it(I(x[0]) || x[0], x[1], false, 'i' + i, x[3])).join('') + '<span class="sp"></span>' + it(I('❓'), L('Vodič','Guide'), false, 'guide');
  rail.querySelectorAll('.rl').forEach(b => b.onclick = () => { const k = b.dataset.k, dr = $('drawer');
    if (k === 'peaks'){ const o = !dr.classList.contains('open'); dr.classList.toggle('open', o); if (o) B.classList.add('lclosed'); }
    else if (k === 'layers'){ const o = B.classList.contains('lclosed'); B.classList.toggle('lclosed', !o); if (o) dr.classList.remove('open'); try{ localStorage.setItem('dvat3d_lclosed', o ? '0' : '1'); }catch(_){} }
    else if (k === 'guide') window.startTour && startTour();
    else { const x = items[+k.slice(1)]; if (x) x[2](); }
    setTimeout(() => { railRender(); setLw(); window.placeLegends && placeLegends(); }, 30); }); }
if (!PH()){ B.classList.add('lclosed'); if ($('drawer')) $('drawer').classList.add('open'); }   // start: the peak list open, the map panel closed
new MutationObserver(() => { railRender(); setLw(); }).observe(B, {attributes: true, attributeFilter: ['class']});
new MutationObserver(() => { railRender(); setLw(); }).observe($('drawer'), {attributes: true, attributeFilter: ['class']});
addEventListener('resize', setLw); setInterval(railRender, 3000); setTimeout(() => { railRender(); setLw(); }, 0);

// ---------- search bar on the map: peaks, huts, trailheads, towns and villages ----------
const sb = document.createElement('div'); sb.id = 'v2s';
sb.innerHTML = `<label>${ICON.search}<input type="search" placeholder="${L('Išči vrh, kočo ali kraj','Search peak, hut or place')}" aria-label="${L('Iskanje','Search')}" autocomplete="off"></label><button class="av" aria-label="${L('Moj profil','My profile')}">${I('👤')}</button><div class="res" role="listbox"></div>`;
B.append(sb);
const inp = sb.querySelector('input'), res = sb.querySelector('.res');
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const KN = window.LANG === 'en' ? {peak: 'peak', hut: 'hut', biv: 'bivouac', sh: 'shelter', start: 'trailhead', place: 'place'} : {peak: 'vrh', hut: 'koča', biv: 'bivak', sh: 'zavetišče', start: 'izhodišče', place: 'kraj'};
function search(){ const q = norm(inp.value.trim()); if (q.length < 2){ res.innerHTML = ''; sb.classList.remove('open'); return; }
  const out = [];
  for (const p of (typeof PEAKS !== 'undefined' ? PEAKS : [])) if (p.lat != null){ const n = norm(p.name); const i = n.indexOf(q); if (i >= 0) out.push({s: (i === 0 ? 0 : 1) - (p.rank ? .5 : 0), t: p.name, sub: `${Math.round(p.elev)} m · ${p.range}`, k: 'peak', id: p.id}); }
  try{ for (const [lab, o] of (window.searchIndex ? searchIndex() : [])){ if (o.k === 'peak') continue; const n = norm(o.name), i = n.indexOf(q);
    if (i >= 0) out.push({s: (i === 0 ? 2 : 3) + (o.k === 'place' ? .5 : 0), t: o.name, sub: KN[o.k] || '', k: o.k, lat: o.lat, lon: o.lon}); } }catch(_){}
  out.sort((a, b) => a.s - b.s || a.t.length - b.t.length);
  res.innerHTML = out.slice(0, 8).map((r, i) => `<button role="option" data-i="${i}"><b>${r.t.replace(/[<>&]/g, '')}</b><span>${r.sub}</span></button>`).join('') || `<div class="no">${L('Ni zadetkov','No results')}</div>`;
  sb.classList.add('open');
  res.querySelectorAll('button').forEach(b => b.onclick = () => { const r = out[+b.dataset.i]; inp.value = ''; res.innerHTML = ''; sb.classList.remove('open'); inp.blur();
    if (r.k === 'peak') openPeak(r.id, true); else map.flyTo({center: [r.lon, r.lat], zoom: Math.max(map.getZoom(), 14), essential: true}); }); }
inp.oninput = search; inp.onkeydown = e => { if (e.key === 'Enter'){ const b = res.querySelector('button'); if (b) b.click(); } if (e.key === 'Escape'){ inp.value = ''; search(); } };
addEventListener('pointerdown', e => { if (!sb.contains(e.target)){ sb.classList.remove('open'); } });
sb.querySelector('.av').onclick = () => window.showMe && showMe();

// ---------- phone: the peak list peeks from the bottom as a sheet (title, count, progress ring); the red button sits on its edge ----------
const tab = $('fabTab');
if (tab){ tab.innerHTML = `<span class="g"></span><div class="tx"><b>${L('Moji vrhovi','My peaks')}</b><span id="v2cnt"></span></div><span class="mn">${L('Meni','Menu')}</span><div class="pr"><div><b id="v2pct"></b><span>${L('povleci gor','swipe up')}</span></div><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(127,127,127,.2)" stroke-width="5"/><circle id="v2ring" cx="20" cy="20" r="16" fill="none" stroke="#B42318" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 100.5" transform="rotate(-90 20 20)"/></svg></div>`;
  const vc = $('vcount3'), up = () => { const m = (vc && vc.textContent || '').match(/(\d+)\s*\/\s*(\d+)/); if (!m) return; const a = +m[1], b = +m[2] || 1;
    $('v2cnt').textContent = L(`${a} od ${b} prominentnih`, `${a} of ${b} prominent`); $('v2pct').textContent = Math.round(a / b * 100) + ' %'; $('v2ring').setAttribute('stroke-dasharray', `${(a / b * 100.5).toFixed(1)} 100.5`); };
  if (vc) new MutationObserver(up).observe(vc, {childList: true, characterData: true, subtree: true}); up(); }

// ---------- Karta in sloji: base maps as picture tiles, layers as switches ----------
const SW = {relief: 'linear-gradient(135deg,#A7C08A 0%,#D9CF9C 40%,#C9A97C 65%,#EEEDEA 100%)', sat: 'linear-gradient(160deg,#5E6B4E 0%,#8C8F78 35%,#B8B3A6 60%,#E9E8E4 100%)',
  topo: 'repeating-linear-gradient(170deg,#F3EEDF 0 6px,#E1D6B9 6px 7px)', snow: 'linear-gradient(135deg,#E2F3FF 0%,#56A8F5 45%,#6B3CCF 75%,#6E0B35 100%)'};
const base = document.querySelector('.panel .grp input[name=base]'), bg = base && base.closest('.grp');
if (bg){ bg.classList.add('v2base'); bg.querySelectorAll('label').forEach(l => { const v = l.querySelector('input').value, th = document.createElement('span'); th.className = 'th'; th.style.background = SW[v] || '#ddd'; l.prepend(th);
  const tx = [...l.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (tx) tx.textContent = ' ' + tx.textContent.trim().replace(/\s*\(.*\)$/, '').replace(/^Snežna karta$/, 'Sneg'); }); }
document.querySelectorAll('.panel .grp label input[type=checkbox]').forEach(c => { const l = c.closest('label'); l.classList.add('v2sw');
  const t = document.createElement('span'); t.className = 'v2tx'; [...l.childNodes].filter(n => n !== c).forEach(n => t.append(n)); l.append(t); });
// ---------- 360° view: name + direction top left with a close button, the controls in one white card at the bottom ----------
{ const v = $('v360'), ex = $('v360exit');
  if (v && ex){ ex.classList.add('v2x'); ex.setAttribute('aria-label', L('Zapri razgled','Close view')); ex.title = L('Zapri razgled','Close view');
    ex.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'; v.append(ex); } }
if (window.fabFace) fabFace();
})();

// layout styles
{ const PCq = '@media (min-width:701px) and (min-height:501px),(min-width:701px) and (pointer:fine)', PHq = '@media (max-width:700px),(max-height:500px) and (pointer:coarse)';
const st = document.createElement('style'); st.id = 'v2lay'; st.textContent = `
#v2rail{display:none}
html.v2 #v2s{position:absolute;z-index:12;top:calc(12px + env(safe-area-inset-top));left:12px;right:12px;display:flex;align-items:center;gap:6px;height:48px;padding:0 6px 0 14px;background:var(--solid);border-radius:14px;box-shadow:0 2px 10px rgba(16,24,32,.16);box-sizing:border-box}
html.v2 #v2s label{flex:1;display:flex;align-items:center;gap:10px;min-width:0}
html.v2 #v2s svg,html.v2 #v2rail svg,html.v2 .v2act svg,html.v2 .v2warn svg,html.v2 .v2cams svg{fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex:none}
html.v2 #v2s label svg{width:20px;height:20px;color:var(--mute)}
html.v2 #v2s input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:400 15px Inter,system-ui,sans-serif;color:var(--ink);-webkit-appearance:none}
html.v2 #v2s .av{width:36px;height:36px;border-radius:50%;border:0;background:#1B1F23;color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;flex:none}
html.v2 #v2s .av svg{width:18px;height:18px}
html.v2 #v2s .res{display:none;position:absolute;left:0;right:0;top:54px;background:var(--solid);border-radius:14px;box-shadow:var(--v2sheet);max-height:60vh;overflow-y:auto}
html.v2 #v2s.open .res{display:block}
html.v2 #v2s .res button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;padding:10px 14px;text-align:left;color:var(--ink);font:500 15px Inter,system-ui,sans-serif;cursor:pointer}
html.v2 #v2s .res button:hover{background:rgba(127,127,127,.08)}html.v2 #v2s .res button span{font-size:13px;color:var(--mute);font-weight:400}
html.v2 #v2s .no{padding:12px 14px;color:var(--mute)}
html.v2 body.in360 #v2s,html.v2 body.drawing #v2s{display:none}
${PHq}{ html.v2 body.dopen #v2s,html.v2 body.menu #v2s,html.v2 body.fabopen #v2s{display:none}
  html.v2 .maplibregl-ctrl-top-right{top:calc(60px + env(safe-area-inset-top))!important}
  html.v2 #fabTab{left:0!important;right:0!important;width:auto!important;transform:none!important;height:calc(88px + env(safe-area-inset-bottom))!important;border-radius:20px 20px 0 0!important;
    padding:0 20px env(safe-area-inset-bottom)!important;justify-content:space-between!important;align-items:center!important;background:var(--solid)!important;color:var(--ink)!important}
  html.v2 #fabTab .g{position:absolute;left:50%;top:8px;width:36px;height:4px;border-radius:2px;background:rgba(127,127,127,.35);margin-left:-18px}
  html.v2 #fabTab .tx{display:flex;flex-direction:column;gap:2px;max-width:38%}html.v2 #fabTab .tx b{font-size:16px;font-weight:700}html.v2 #fabTab .tx span{font-size:12.5px;color:var(--mute);font-weight:500}
  html.v2 #fabTab .pr{display:flex;align-items:center;gap:10px}html.v2 #fabTab .pr>div{display:flex;flex-direction:column;text-align:right}html.v2 #fabTab .pr b{font-size:16px;color:#B42318}html.v2 #fabTab .pr span{font-size:12px;color:var(--mute);font-weight:500}
  html.v2 #fabTab .mn{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom));font-size:11px;font-weight:600;color:var(--mute)}
  html.v2 #fab{bottom:calc(56px + env(safe-area-inset-bottom))!important}html.v2 #fab .fb .fl{display:none!important}
  html.v2 #fab .fb{box-shadow:0 6px 18px rgba(180,35,24,.38),0 0 0 4px var(--solid)!important}
  html.v2 .maplibregl-ctrl-bottom-right,html.v2 .maplibregl-ctrl-bottom-left{bottom:calc(92px + env(safe-area-inset-bottom))!important} }
${PCq}{ html.v2 #v2s{left:calc(var(--lw,72px) + 16px);right:auto;width:min(380px,40vw);height:44px;transition:left .25s}
  html.v2 #ltab,html.v2 #ptab,html.v2 #fab,html.v2 #fabBg{display:none!important}
  html.v2 #v2rail{position:absolute;left:0;top:0;bottom:0;width:72px;z-index:13;background:var(--solid);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 0;box-sizing:border-box;overflow-y:auto;scrollbar-width:none}
  html.v2 #v2rail .logo{width:40px;height:40px;border-radius:11px;background:#B42318;color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:8px;flex:none}html.v2 #v2rail .logo svg{width:24px;height:24px;stroke-width:2}
  html.v2 #v2rail .rl{position:relative;width:64px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 0;border:0;border-radius:12px;background:transparent;color:var(--mute);font:600 10.5px Inter,system-ui,sans-serif;cursor:pointer;flex:none}
  html.v2 #v2rail .rl svg{width:22px;height:22px}html.v2 #v2rail .rl span{max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  html.v2 #v2rail .rl:hover{background:rgba(127,127,127,.1);color:var(--ink)}html.v2 #v2rail .rl.on{background:rgba(180,35,24,.1);color:#B42318}
  html.v2 #v2rail .rl .bdg{position:absolute;top:2px;right:10px;margin:0}html.v2 #v2rail .sp{flex:1}
  html.v2 .panel{left:72px!important;z-index:12!important}html.v2 body.lclosed .panel{transform:translateX(calc(-100% - 80px))}
  html.v2 #drawer{left:72px!important;right:auto!important;border-left:0!important;border-right:1px solid var(--line)!important;transform:translateX(calc(-100% - 80px));box-shadow:4px 0 18px rgba(16,24,32,.12)!important;z-index:12!important}
  html.v2 #drawer.open{transform:none}
  html.v2 .maplibregl-ctrl-top-right,html.v2 body.dopen .maplibregl-ctrl-top-right{right:calc(var(--sr) + 4px)!important} }
/* peak window */
html.v2 .v2p{min-width:230px}
html.v2 .v2h{display:flex;align-items:flex-start;gap:4px;padding-right:22px}html.v2 .v2hn{flex:1;min-width:0}
html.v2 .v2n{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:20px;font-weight:700;letter-spacing:-.015em;line-height:1.2}
html.v2 .v2ok{font-size:12px;font-weight:600;color:#1F5E3A;background:#E7F2EB;border-radius:999px;padding:2px 8px;letter-spacing:0}
html.v2 .v2s{font-size:13.5px;color:var(--mute);margin-top:3px}html.v2 .v2s2{font-size:12.5px;color:var(--mute)}
html.v2 .v2h .wish{float:none!important;margin:0!important;width:36px;height:36px}
html.v2 .v2act{display:flex;gap:6px;margin:12px 0 4px}
html.v2 .v2act button{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 2px 7px;border:0;border-radius:12px;background:rgba(127,127,127,.12);color:var(--ink);font:600 12px Inter,system-ui,sans-serif;cursor:pointer;min-height:44px}
html.v2 .v2act button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
html.v2 .v2act button.pri{background:#B42318;color:#fff}html.v2 .v2act svg{width:20px;height:20px}
html.v2 .v2warn{display:flex;gap:8px;align-items:center;margin:8px 0;padding:9px 10px;border-radius:10px;background:#FFF4E5;color:#6B4100;font-size:13px;line-height:1.35}
html.v2 .v2warn svg{width:18px;height:18px;color:#B26A00}
html.v2 .v2p>label{display:flex;align-items:center;gap:8px;margin-top:8px!important;font-weight:500}
html.v2 .v2cams{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
html.v2 .v2cams button{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--solid);color:var(--ink);font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer}
html.v2 .v2cams svg{width:16px;height:16px}html.v2 .v2cams small{color:var(--mute);font-weight:500}
html.v2 .v2snow{font-size:13px;font-weight:600;color:#1F5FAD;background:#EEF4FB;border-radius:10px;padding:6px 10px;margin:8px 0 0}
html.v2 .v2meta{font-size:12px;color:var(--mute);margin-top:8px}
/* routes */
html.v2 .v2sort{display:flex;background:rgba(127,127,127,.14);border-radius:10px;padding:3px;gap:3px;margin:6px 0 10px}
html.v2 .v2sort button{flex:1;height:32px;border:0;border-radius:8px;background:transparent;font:500 12.5px Inter,system-ui,sans-serif;color:var(--mute);cursor:pointer}
html.v2 .v2sort button.on{background:var(--solid);color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(16,24,32,.14)}
html.v2 .ri.v2sel{border:1.5px solid var(--v2blue)!important;background:rgba(31,95,173,.06)!important;padding:12px!important;cursor:default}
html.v2 .v2t b{font-size:16px}
html.v2 .v2m{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:10px 0 4px}
html.v2 .v2m b{display:block;font-size:16px;font-weight:700;white-space:nowrap}html.v2 .v2m span{font-size:11.5px;color:var(--mute)}
html.v2 .v2tb{font-style:normal;font-size:12.5px;font-weight:700;border-radius:6px;padding:1px 6px;background:var(--ink);color:var(--solid)}html.v2 .v2tb.w{background:#FFF4E5;color:#6B4100}
html.v2 .v2x{font-size:12.5px;color:var(--mute)}
html.v2 .v2sel .rb{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}html.v2 .v2sel .rb button{flex:1 1 auto}
html.v2 .v2sel .rb .pri{background:#B42318!important;color:#fff!important;border-color:#B42318!important;flex:1 1 100%}
html.v2 .ri.v2c{display:flex;align-items:center;gap:10px;padding:10px 6px!important;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important}
html.v2 .v2c .l{flex:1;min-width:0}html.v2 .v2c .l b{display:block;font-size:15px}html.v2 .v2c .l span{font-size:12.5px;color:var(--mute);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.v2 .v2c .r{text-align:right;flex:none}html.v2 .v2c .r b{display:block;font-size:15px}html.v2 .v2c .r span{font-size:12px;color:var(--mute)}
/* map & layers panel */
html.v2 .panel .grp>b{display:block;font:700 12px Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:4px 0 8px}
html.v2 .v2base{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}html.v2 .v2base>b{grid-column:1/-1}
html.v2 .v2base label{display:flex!important;flex-direction:column;gap:5px;font-size:12px!important;font-weight:600;text-align:center;cursor:pointer;margin:0!important;position:relative;line-height:1.2}
html.v2 .v2base label input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
html.v2 .v2base .th{display:block;width:100%;height:52px;box-sizing:border-box;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);border:2px solid transparent}
html.v2 .v2base label:has(input:checked) .th{border-color:#B42318}
html.v2 label.v2sw{display:flex!important;align-items:center;justify-content:space-between;gap:10px;min-height:36px}html.v2 label.v2sw input{order:2}html.v2 label.v2sw .v2tx{flex:1;min-width:0}
html.v2 label.v2sw input{appearance:none;-webkit-appearance:none;width:40px!important;height:24px!important;border-radius:12px;background:#CFCBC2;position:relative;margin:0!important;flex:none;cursor:pointer;transition:background .15s}
html.v2 label.v2sw input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s}
html.v2 label.v2sw input:checked{background:#2E7D4F}html.v2 label.v2sw input:checked::after{left:19px}
/* peak list */
html.v2 .pmain{background:rgba(127,127,127,.08);border-radius:14px;padding:12px 14px}
html.v2 #tiers{display:flex;background:rgba(127,127,127,.14);border-radius:10px;padding:3px;gap:3px;border:0!important}
html.v2 #tiers button{border:0!important;border-radius:8px!important;background:transparent!important;color:var(--mute)!important;font-weight:500}
html.v2 #tiers button.on{background:var(--solid)!important;color:var(--ink)!important;font-weight:600;box-shadow:0 1px 2px rgba(16,24,32,.14)}
html.v2 #q{border-radius:10px!important}

/* 360 view (v2) */
html.v2 body.in360 #v2rail,html.v2 body.in360 #mkdock{display:none!important}
html.v2 #v360 .vt{margin:calc(16px + env(safe-area-inset-top)) 16px 0 72px;width:auto;max-width:none;background:transparent!important;padding:0;border-radius:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.45);font:700 17px Inter,system-ui,sans-serif}
html.v2 #v360dir{min-width:0;text-align:left;font:500 13px Inter,system-ui,sans-serif}
html.v2 #v360 .v2x{position:absolute;top:calc(16px + env(safe-area-inset-top));left:16px;width:44px;height:44px;border-radius:12px;border:0;background:rgba(255,255,255,.94);color:#1B1F23;display:flex;align-items:center;justify-content:center;padding:0;pointer-events:auto;cursor:pointer;box-shadow:0 1px 3px rgba(16,24,32,.25)}
html.v2 #v360 .v2x svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}
html.v2 #v360 .vb{left:12px;right:12px;transform:none;width:auto;max-width:560px;margin:0 auto;bottom:calc(16px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);border-radius:16px;padding:12px;gap:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);justify-content:center}
html.v2 #v360 .vb button{background:#F2F0EB!important;color:#1B1F23!important;backdrop-filter:none;font:600 14px Inter,system-ui,sans-serif;border-radius:999px;padding:10px 14px}
html.v2 #v360 .vb button.on{background:#1B1F23!important;color:#fff!important}
html.v2 #v360 .seg{background:#F2F0EB!important;backdrop-filter:none}
html.v2 #v360 .vb .seg button{background:transparent!important;color:#626870!important}
html.v2 #v360 .vb .seg button.on{background:#B42318!important;color:#fff!important}
html.v2 #v360 .vh{bottom:calc(150px + env(safe-area-inset-bottom));text-shadow:0 1px 3px #000}
`; document.head.append(st); }
