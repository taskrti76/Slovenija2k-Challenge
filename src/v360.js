// ===================== 360° summit view =====================
(function(){
const $$ = id => document.getElementById(id);
const S = {on:false, raf:0};
const DIRS = ['S','SV','V','JV','J','JZ','Z','SZ'];
const HANDLERS = ['dragPan','dragRotate','scrollZoom','touchZoomRotate','touchPitch','keyboard','doubleClickZoom','boxZoom'];
const HEAVY = ['snowobs','snowobs-lbl','pk-wx','cont-line','cont-lbl','pk','pk-lbl','hs','tr-road-c','tr-road','tr-track','tr-path','tr-mark-c','tr-mark','tr-ferr','poi-hut','poi-park','poi-spring','rt-alt','rt-sel-c','rt-sel','rt-gap','ferr-sign','my-rt','dr-line-c','dr-line','dr-hit','dr-pts','border-casing'];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

// ---------- fast loading ----------
// 1) ring prefetch: the satellite + height tiles a 360 view needs all around the summit, nearest first, into the browser /
//    service-worker cache. Coarse far ring already when a peak popup opens (~2 MB), the full ring once 360 starts.
//    Turning later is then served from the cache (milliseconds) instead of the network.
// 2) two passes: arrive with coarse tiles (few, fast) so the whole view is there at once, then switch to the chosen quality.
const SAT_URL = (z,x,y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const DEM_URL = (z,x,y) => `https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`;
// [zoom, from km, to km] - tile zoom the 360 view asks for at each distance (one zoom level per doubling of distance;
// satellite measured at Visoka: z11–z18 within ~70 km, height tiles z12 near … z8 at 100+ km)
const RING = {
  sat: [[18,0,0.5],[17,0.5,1],[16,1,2],[15,2,4],[14,4,8],[13,8,16],[12,16,32],[11,32,64],[10,64,100]],
  dem: [[12,0,8],[11,8,16],[10,16,40],[9,40,90]] };
function ringTiles(p, kind, maxZ, minZ){ const out=[], n=z=>2**z, X=(lon,z)=>(lon+180)/360*n(z), Y=(lat,z)=>{ const r=lat*D2R; return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n(z); };
  for (const [z,a,b] of RING[kind]){ if (z>maxZ || z<minZ) continue; const kx=111.32*Math.cos(p.lat*D2R), dl=b/kx, dt=b/111.32;
    const x0=Math.floor(X(p.lon-dl,z)), x1=Math.floor(X(p.lon+dl,z)), y0=Math.floor(Y(p.lat+dt,z)), y1=Math.floor(Y(p.lat-dt,z));
    for (let x=x0;x<=x1;x++) for (let y=y0;y<=y1;y++){ // tile centre distance
      const lon=(x+.5)/n(z)*360-180, t=Math.PI*(1-2*(y+.5)/n(z)), lat=Math.atan(Math.sinh(t))/D2R, d=Math.hypot((lon-p.lon)*kx,(lat-p.lat)*111.32);
      const half=Math.hypot(360/n(z)*kx, 360/n(z)*111.32*Math.cos(lat*D2R))/2;   // tile half-diagonal (km)
      if (d+half>=a && d-half<=b) out.push([d,z,x,y]); } }
  // coarse levels first (whole circle blurry-but-complete quickly), sharper levels after, nearest first within a level
  return out.sort((u,v)=>u[1]-v[1]||u[0]-v[0]).map(([d,z,x,y])=>kind==='sat'?SAT_URL(z,x,y):DEM_URL(z,x,y)); }
const PF = {key:null, ctl:null, done:new Set()};
async function prefetch(p, full){
  const key = p.id + (full?':full':':far'); if (PF.key === key) return; if (PF.ctl) PF.ctl.abort(); PF.key = key; const ctl = PF.ctl = new AbortController();
  // popup: far satellite ring only (z10–11, ~2–3 MB); 360: heights + all satellite levels, phones without the two sharpest near ones
  const urls = full ? [...ringTiles(p,'dem', window.IS_PHONE ? 11 : 12, 9), ...ringTiles(p,'sat', window.IS_PHONE ? 16 : 17, 10)] : ringTiles(p,'sat',11,10);
  const todo = urls.filter(u => !PF.done.has(u)); let i = 0;
  const worker = async () => { while (i < todo.length && !ctl.signal.aborted){ const u = todo[i++];
    try{ const r = await fetch(u, {signal:ctl.signal, priority:'low'}); if (r.ok){ await r.arrayBuffer(); PF.done.add(u); } }catch(_){} } };
  await Promise.all(Array.from({length: window.IS_PHONE ? 4 : 8}, worker));   // few at a time: the map's own requests go first
  if (PF.key === key) PF.key = key + ':ok'; }
window.prefetch360 = id => { const p = byId[id]; if (p && p.lat != null && !S.on && !window.LITE_ON) prefetch(p, false); };

// loading readout: "nalagam …" while tiles are coming, then "naloženo v N s" for a moment (also tells us real load times)
const LD = document.createElement('div'); LD.id = 'v360load'; $$('v360').append(LD);
const ldCss = document.createElement('style'); ldCss.textContent = '#v360load{position:fixed;left:50%;top:calc(52px + env(safe-area-inset-top));transform:translateX(-50%);z-index:20;background:rgba(20,22,22,.72);color:#fff;font:600 calc(12px * var(--ui,1)) system-ui,sans-serif;padding:5px 11px;border-radius:14px;display:none;pointer-events:none}body.in360 #v360load.on{display:block}';
document.head.append(ldCss);
let ldT = 0, ldTimer = 0;
function loadWatch(){ clearInterval(ldTimer); ldT = performance.now(); LD.classList.add('on'); LD.textContent = '⏳ ' + T('nalagam …');
  ldTimer = setInterval(() => { if (!S.on){ clearInterval(ldTimer); LD.classList.remove('on'); return; } const s = Math.round((performance.now() - ldT)/1000);
    if (map.areTilesLoaded() && S.full){ clearInterval(ldTimer); LD.textContent = '✓ ' + T('naloženo v') + ' ' + s + ' s'; console.info('360 loaded', s, 's'); setTimeout(() => LD.classList.remove('on'), 2500); }
    else LD.textContent = '⏳ ' + T('nalagam …') + ' ' + s + ' s' + (S.full ? '' : ' · ' + T('hiter pregled')); }, 500); }
const T = s => (window.T || (x => x))(s);

let pending=false;
function schedule(){ if(pending) return; pending=true; requestAnimationFrame(()=>{ pending=false; if(S.on) apply(); }); }
// eye point fixed 5 m above the summit (center elevation set explicitly, not clamped to ground);
// camera sits a few metres behind it, so turning = plain bearing change around the eye point
const CAM_D = 3;
function eyeZoom(){ const c=map.getContainer(), cam=0.5/Math.tan(S.fov*D2R/2)*c.clientHeight;
  return Math.min(map.getMaxZoom(), Math.log2(cam*40075016.686*Math.cos(S.p.lat*D2R)/(512*CAM_D))); }
function cam(){ return {center:[S.p.lon, S.p.lat], elevation:S.eye, zoom:eyeZoom(), pitch:90+S.look, bearing:S.brg}; }
function apply(){
  if (ready && window.__v360moving) window.__v360moving();
  map.jumpTo(cam());
  const b = ((S.brg % 360) + 360) % 360;
  $$('v360dir').textContent = `${DIRS[Math.round(b/45) % 8]} ${Math.round(b)}°`;
  placeLabels(); placeSun();
}

// ---------- own peak labels (projected from the summit) ----------
const LBL = $$('v360lbl'); let LB = [], ready = false;
const D2R = Math.PI/180;
function geo(a, b){ const φ1=a.lat*D2R, φ2=b.lat*D2R, Δλ=(b.lon-a.lon)*D2R;
  const az=Math.atan2(Math.sin(Δλ)*Math.cos(φ2), Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ));
  const x=Δλ*Math.cos((φ1+φ2)/2), y=φ2-φ1; return {az, d:6371000*Math.hypot(x,y)}; }
const topH = q => Math.max(q.elev, q.dem_h || 0);
function buildLabels(){
  LBL.innerHTML=''; LB=[]; ready=false;
  for (const q of PEAKS){ if (q===S.p || q.lat==null || (q.tier==='1500'&&q.is_sub==='yes')) continue; const {az,d}=geo(S.p,q); if (d<60 || d>70000) continue;
    const major = q.rank!=null || q.is_sub==='no'; if (!major && d>5000) continue;
    const el = Math.atan2(topH(q)-S.eye, d);
    const div=document.createElement('div'); div.className='pl'+(q.rank&&q.rank<=25?' big':'');
    div.innerHTML=`${q.name}<small>${Math.round(q.elev)} m · ${d<10000?(d/1000).toFixed(1):Math.round(d/1000)} km</small>`;
    div.style.display='none'; div.onclick=()=>window.enter360(q.id); LBL.append(div);
    LB.push({q,az,el,d,div,vis:true,w:Math.max(q.name.length*7.2,70)+8,pri:(q.rank||400)+d/2000}); }
  LB.sort((a,b)=>a.pri-b.pri);
  occlusion(S.p);
}
function placeLabels(){
  if (!ready){ LB.forEach(o=>o.div.style.display='none'); return; }
  const W=LBL.clientWidth, H=LBL.clientHeight, f=(H/2)/Math.tan(S.fov*D2R/2), B=S.brg*D2R, Lk=S.look*D2R;
  const F=[Math.cos(Lk)*Math.sin(B), Math.cos(Lk)*Math.cos(B), Math.sin(Lk)], Rt=[Math.cos(B), -Math.sin(B), 0], U=[-Math.sin(Lk)*Math.sin(B), -Math.sin(Lk)*Math.cos(B), Math.cos(Lk)];
  const boxes=[];
  for (const o of LB){
    const v=[Math.cos(o.el)*Math.sin(o.az), Math.cos(o.el)*Math.cos(o.az), Math.sin(o.el)];
    const zc=v[0]*F[0]+v[1]*F[1]+v[2]*F[2]; let show=o.vis && zc>0.08;
    let x=0,y=0;
    if (show){ x=W/2+(v[0]*Rt[0]+v[1]*Rt[1])/zc*f; y=H/2-(v[0]*U[0]+v[1]*U[1]+v[2]*U[2])/zc*f;
      if (x<-60||x>W+60||y<40||y>H+20) show=false; }
    if (show){ const b=[x-o.w/2, y-46, x+o.w/2, y]; if (boxes.some(c=>b[0]<c[2]&&b[2]>c[0]&&b[1]<c[3]&&b[3]>c[1])) show=false; else boxes.push(b); }
    if (show){ o.div.style.display=''; o.div.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; }
    else o.div.style.display='none';
  }
}
// line-of-sight check on the DEM (z10 ≈ 50 m) so peaks hidden behind ridges get no label
const TS=512, TZ=10, dtiles=new Map();
const tx=lon=>(lon+180)/360*2**TZ*TS, ty=lat=>{const r=lat*D2R;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**TZ*TS;};
function tile(x,y){ const k=x+','+y; if(dtiles.has(k)) return dtiles.get(k);
  const p=(async()=>{ const r=await fetch(`https://tiles.mapterhorn.com/${TZ}/${x}/${y}.webp`); if(!r.ok) throw 0; return decodeTerrarium(await r.blob(),TS); })();
  dtiles.set(k,p); p.catch(()=>dtiles.delete(k)); return p; }
async function occlusion(p0){
  const lats=[p0.lat,...LB.map(o=>o.q.lat)], lons=[p0.lon,...LB.map(o=>o.q.lon)];
  const x0=Math.floor(tx(Math.min(...lons))/TS), x1=Math.floor(tx(Math.max(...lons))/TS), y0=Math.floor(ty(Math.max(...lats))/TS), y1=Math.floor(ty(Math.min(...lats))/TS);
  const T={}; const jobs=[]; for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) jobs.push(tile(x,y).then(h=>T[x+','+y]=h).catch(()=>{}));
  await Promise.all(jobs); if (S.p!==p0) return;
  const hAt=(lon,lat)=>{ const X=tx(lon), Y=ty(lat), t=T[Math.floor(X/TS)+','+Math.floor(Y/TS)]; return t?t[(Math.floor(Y)%TS)*TS+(Math.floor(X)%TS)]:null; };
  for (const o of LB){
    const n=Math.max(8, Math.round(o.d/60)); let vis=true;
    for (let i=1;i<n;i++){ const f=i/n, dd=o.d*f; if (dd<350 || o.d-dd<200) continue;
      const lon=p0.lon+(o.q.lon-p0.lon)*f, lat=p0.lat+(o.q.lat-p0.lat)*f, h=hAt(lon,lat); if (h==null) continue;
      if (h > S.eye+(topH(o.q)-S.eye)*f + 12){ vis=false; break; } }
    o.vis=vis; }
  if (S.on && S.p===p0) placeLabels();
}
addEventListener('resize', ()=>{ if (S.on){ fitFov(); schedule(); } });
function fitFov(){ const c=map.getContainer(); const portrait=c.clientHeight>c.clientWidth;
  S.fov=clamp((portrait?46:34)*S.zoomK, 12, 75); if (map.setVerticalFieldOfView) map.setVerticalFieldOfView(S.fov); }
function zoomBy(f){ S.zoomK=clamp(S.zoomK*f, 0.3, 1.6); fitFov(); schedule(); }
function setAuto(on, warm){
  S.auto = on; $$('v360auto').classList.toggle('on', on && !warm); cancelAnimationFrame(S.raf);
  // warm = one quick full turn right after arriving: every direction gets its tiles loaded once,
  // so later turning is served from the tile cache (smooth, same sharpness)
  if (on){ let t0 = performance.now(), turned = 0; const spd = warm ? 0.05 : 0.006;
    const step = t => { if (!S.on || !S.auto) return; const d=(t - t0) * spd; S.brg += d; turned += d; t0 = t; apply();
      if (warm && turned >= 360){ setAuto(false); return; } S.raf = requestAnimationFrame(step); }; S.raf = requestAnimationFrame(step); }
}
function goTo(p){
  S.p = p; S.eye = Math.max(p.elev, p.dem_h || 0) + 5; S.look = -6; setAuto(false); if (SUN && SUN.mode) setTimeout(()=>setSun(SUN.mode), 1700);
  $$('v360name').textContent = `${p.name} · ${Math.round(p.elev)} m`;
  buildLabels(); fitFov();
  S.flying = true;
  map.flyTo(Object.assign(cam(), {duration:1600, essential:true}));
  S.full = false; applyQuality(); loadWatch();
  const done = () => { if (!S.flying || S.p !== p) return; S.flying = false; if (!S.on) return; ready = true; apply();
    // coarse view first; once it is complete (or after 5 s) switch to the chosen quality - sharp tiles replace coarse ones
    let sw = false; const sharp = () => { if (sw || !S.on || S.p !== p) return; sw = true; S.full = true; applyQuality(); schedule(); prefetch(p, true); };
    map.once('idle', sharp); setTimeout(sharp, 5000); };
  map.once('moveend', done); setTimeout(done, 2200);
}
window.enter360 = id => { try { enter360_(id); } catch (err) { console.error(err); window.toastErr && toastErr('360: ' + err.message); try { exit360(); } catch(_){} } };
function enter360_(id){
  const p = byId[id]; if (!p || p.lat == null) return;
  if (popup) popup.remove();
  if (S.on){ goTo(p); return; }
  const base = (document.querySelector('input[name=base]:checked') || {}).value || 'relief';
  S.prev = {cam:{center:map.getCenter(), zoom:map.getZoom(), pitch:map.getPitch(), bearing:map.getBearing()}, base,
    dim: window.__dim ? window.__dim.d : 3, maxPitch: map.getMaxPitch(),
    fov: map.getVerticalFieldOfView ? map.getVerticalFieldOfView() : null,
    clamp: map.getCenterClampedToGround ? map.getCenterClampedToGround() : true};
  Object.assign(S, {on:true, brg:map.getBearing(), fov:46, zoomK:S.zoomK||1, auto:false});
  if (window.__dim && window.__dim.d !== 3) window.__dim.set(3, true);
  map.setTerrain({source:'dem_terrain', exaggeration:1});
  const r = document.querySelector('input[name=base][value=sat]'); if (r){ r.checked = true; r.dispatchEvent(new Event('change')); }
  HANDLERS.forEach(h => map[h] && map[h].disable());
  // performance: hide heavy draped layers, fewer far tiles, lower render resolution
  S.hidden = HEAVY.filter(id => map.getLayer(id) && map.getLayoutProperty(id,'visibility') !== 'none');
  S.hidden.forEach(id => map.setLayoutProperty(id,'visibility','none'));
  S.dpr = map.getPixelRatio ? map.getPixelRatio() : devicePixelRatio;
  applyQuality();
  // satellite: no z18–19 (0.3–0.6 m) tiles for the rocks under your feet - ~100–200 requests less per view; from 5 m above you only
  // see that ground at grazing angles, where 1 m tiles look the same
  { const ss = map.getSource('sat'); if (ss){ S.satMax = ss.maxzoom; ss.maxzoom = window.IS_PHONE ? 16 : 17; } }
  S.maxZoom = map.getMaxZoom(); map.setMaxZoom(24); S.bounds = map.getMaxBounds(); map.setMaxBounds(null);
  map.setMaxPitch(150); if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
  map.getCanvasContainer().style.touchAction='none';
  try{ localStorage.setItem('dvat3d_in360', String(qi)); }catch(_){}
  document.body.classList.add('in360'); document.body.classList.remove('menu'); if (typeof drawer!=='undefined') drawer.classList.remove('open');
  goTo(p);
}
window.exit360 = () => {
  if (!S.on) return; if (PF.ctl) PF.ctl.abort(); PF.key = null;
  { const ss = map.getSource('sat'); if (ss && S.satMax) ss.maxzoom = S.satMax; } setSun(0); S.on = false; setAuto(false); stopInertia(); const P = S.prev; movingPR=false;
  (S.hidden||[]).forEach(id => map.getLayer(id) && map.setLayoutProperty(id,'visibility','visible'));
  if (map.setPixelRatio && S.dpr) map.setPixelRatio(S.dpr);
  try{ map.setSourceTileLodParams(9.314, 3, 'sat'); map.setSourceTileLodParams(9.314, 3, 'dem_terrain'); }catch(_){}
  if (map.setVerticalFieldOfView && P.fov) map.setVerticalFieldOfView(P.fov);
  if (map.setCenterClampedToGround) map.setCenterClampedToGround(P.clamp);
  map.setMaxPitch(P.maxPitch); map.setMaxZoom(S.maxZoom || 22);
  if (S.bounds) map.setMaxBounds(S.bounds);
  HANDLERS.forEach(h => map[h] && map[h].enable());
  if (window.__dim && P.dim === 2) window.__dim.set(2, true);
  else map.setTerrain({source:'dem_terrain', exaggeration:+$$('exag').value});
  const r = document.querySelector(`input[name=base][value=${P.base}]`); if (r){ r.checked = true; r.dispatchEvent(new Event('change')); }
  window.TERRAIN_DELTA = null;
  try{ localStorage.removeItem('dvat3d_in360'); }catch(_){}
  document.body.classList.remove('in360'); map.getCanvasContainer().style.touchAction=''; LBL.innerHTML=''; LB=[];
  // zoom out from the last viewed summit (keeps the direction you were looking)
  const flat = window.__dim && window.__dim.d === 2, pk = S.p;
  if (pk && pk.lat != null){ map.jumpTo({center:[pk.lon, pk.lat], zoom:14, bearing:S.brg, pitch:flat?0:Math.min(60, P.maxPitch)});
    map.easeTo({zoom:Math.min(P.cam.zoom, 11.5), pitch:flat?0:Math.min(P.cam.pitch||50, 55, P.maxPitch), duration:1400}); }
  else map.jumpTo(Object.assign({}, P.cam, {pitch: Math.min(P.cam.pitch, P.maxPitch)}));
};

// controls: one finger / mouse drag left-right = turn (with inertia); nothing else
const pad = $$('v360pad'); let drag = null, vel = 0, inert = 0;
const degPerPx = () => { const W=pad.clientWidth||1, H=pad.clientHeight||1, hf=2*Math.atan(Math.tan(S.fov*D2R/2)*W/H)/D2R; return 1.5 * hf / W; };
function stopInertia(){ cancelAnimationFrame(inert); inert = 0; }
pad.addEventListener('pointerdown', e => { if (!S.on) return; e.preventDefault();
  if (S.flying){ map.stop(); S.flying = false; ready = true; }
  setAuto(false); stopInertia(); try{ pad.setPointerCapture(e.pointerId); }catch(_){}
  drag = {id:e.pointerId, x:e.clientX, y:e.clientY, t:performance.now()}; vel = 0; });
pad.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; e.preventDefault();
  const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(1, now - drag.t);
  S.brg -= dx * degPerPx(); vel = 0.7*vel + 0.3*(-dx * degPerPx() / dt);
  S.look = clamp(S.look + dy * S.fov / (pad.clientHeight||1), -35, 20);   // up/down = tilt head
  drag.x = e.clientX; drag.y = e.clientY; drag.t = now; schedule(); });
const release = e => { if (!drag || e.pointerId !== drag.id) return; drag = null;
  if (Math.abs(vel) < 0.01) return; let last = performance.now();
  const step = t => { if (!S.on){ inert = 0; return; } const dt = t - last; last = t; S.brg += vel * dt; vel *= Math.pow(0.94, dt/16); apply();
    inert = Math.abs(vel) > 0.003 && S.on ? requestAnimationFrame(step) : 0; };
  inert = requestAnimationFrame(step); };
pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release);
pad.addEventListener('wheel', e => { if (!S.on) return; e.preventDefault(); setAuto(false); stopInertia();
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { S.brg += e.deltaX * 0.08; schedule(); }
  else zoomBy(Math.pow(1.0015, e.deltaY)); }, {passive:false});
document.addEventListener('keydown', e => { if (!S.on) return;
  if (e.key === 'Escape') exit360();
  if (e.key === '+' || e.key === '=') zoomBy(1/1.2); if (e.key === '-') zoomBy(1.2); if (e.key === ' ') { e.preventDefault(); setAuto(!S.auto); }
  if (e.key === 'ArrowLeft'){ S.brg -= 5; schedule(); } if (e.key === 'ArrowRight'){ S.brg += 5; schedule(); }
  if (e.key === 'ArrowUp'){ S.look = clamp(S.look + 3, -35, 20); schedule(); } if (e.key === 'ArrowDown'){ S.look = clamp(S.look - 3, -35, 20); schedule(); } });
// ---------- image quality (user choice, remembered) ----------
// pr = render resolution, lod = [max zoom levels on screen, tile-count ratio]: lower first / higher second = sharper far away
const Q = [
  {n:'Nizka',   pr:0.75,sat:[16,1.3], dem:[16,1.3]},
  {n:'Srednja', pr:1.5, sat:[7.5,3.8],dem:[8,3.5]},
  {n:'Visoka',  pr:2.0, sat:[6,4.5],  dem:[7,4]} ];
const COARSE = {sat:[16,1.0], dem:[16,1.0]};
const MOBILE = matchMedia('(pointer:coarse)').matches;
let qi = window.LITE_ON ? 0 : 1; if(!window.LITE_ON) try{ const r=localStorage.getItem('dvat3d_q360'); const s=parseInt(r,10); if (r!==null && s>=0 && s<Q.length) qi=s; }catch(_){}
let movingPR=false;
// phones: cap the number of rendered pixels (GPU memory of the terrain render targets grows with it); the picture stays sharp
// because phone screens are tiny - 1.5 MP on a 6" screen is still ~1.4 px per CSS pixel
const PX_BUDGET = window.IS_PHONE ? 1.5e6 : 6e6;
function setPR(pr){ const c=map.getContainer(), css=Math.max(1,c.clientWidth*c.clientHeight); pr=Math.min(pr, Math.sqrt(PX_BUDGET/css));
  if (map.setPixelRatio && Math.abs(map.getPixelRatio()-pr)>0.01) map.setPixelRatio(pr); }
function applyQuality(){ const q=Q[qi];
  window.TERRAIN_DELTA = S.on ? (qi===2 ? 0 : qi===1 ? 1 : 2) : null; window.applyTerrainLOD && window.applyTerrainLOD();
  setPR(Math.min(devicePixelRatio, movingPR?Math.min(qi===2?Q[1].pr:1,q.pr):q.pr));
  const L = S.on && !S.full ? COARSE : q;   // first pass: coarse tiles everywhere
  try{ map.setSourceTileLodParams(L.sat[0], L.sat[1], 'sat'); map.setSourceTileLodParams(L.dem[0], L.dem[1], 'dem_terrain'); }catch(_){}
  $$('v360q').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===qi)); }
$$('v360q').innerHTML=(window.LITE_ON?Q.slice(0,1):Q).map((q,i)=>`<button data-i="${i}">${q.n}${window.LITE_ON?' (varčno)':''}</button>`).join('');
$$('v360q').onclick = e => { const b=e.target.closest('button'); if(!b) return; qi=+b.dataset.i;
  if (MOBILE && qi===2) toastErr && toastErr('Visoka kakovost je na telefonu lahko prezahtevna — če slika izgine, izberi Srednjo.');
  try{ localStorage.setItem('dvat3d_q360', qi); }catch(_){}
  if (S.on){ applyQuality(); schedule(); } };
$$('v360q').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===qi));
// last visit ended inside 360 (page crashed / was killed for memory) -> start one quality lower and say so
try{ const c=localStorage.getItem('dvat3d_in360'); if (c!==null){ localStorage.removeItem('dvat3d_in360'); const was=parseInt(c,10);
  if (was>0){ qi=Math.min(qi,was-1); localStorage.setItem('dvat3d_q360',qi); setTimeout(()=>window.toastErr&&toastErr('360 se je prejšnjič sesul — kakovost znižana na '+Q[qi].n+'.'),2500); } } }catch(_){}
// graphics memory ran out (WebGL context lost): lower the 360 quality, leave 360; MapLibre restores the map itself
map.on('webglcontextlost', () => { if (!S.on) return; if (qi>0){ qi--; try{ localStorage.setItem('dvat3d_q360',qi); }catch(_){} }
  window.toastErr && toastErr('Grafični pomnilnik je poln — 360 zaprt, kakovost znižana na '+Q[qi].n+'.'); try{ exit360(); }catch(_){} });
applyQuality.restore = ()=>{};
// adaptive resolution: render lighter while turning, full sharpness ~0.35 s after you stop
let still=0;
// while turning: Visoka renders at Srednja's resolution (pixel ratio only - the loaded tiles stay, nothing reloads);
// ~0.35 s after you stop it switches back to full Visoka sharpness. Varčni način: drops to 1×.
window.__v360moving = () => { if (!S.on) return; const lo = window.LITE_ON ? 1 : (qi===2 ? Q[1].pr : 0); if (!lo) return; clearTimeout(still);
  if (!movingPR){ movingPR=true; setPR(Math.min(devicePixelRatio, lo)); }
  still=setTimeout(()=>{ if (!S.on || S.auto) return; movingPR=false; setPR(Math.min(devicePixelRatio,Q[qi].pr)); }, 350); };
$$('v360in').onclick = () => zoomBy(1/1.35); $$('v360out').onclick = () => zoomBy(1.35);
$$('v360auto').onclick = () => { setAuto(!S.auto); if (!S.auto && window.__v360moving) window.__v360moving(); };
$$('v360exit').onclick = () => exit360();

// ---------- sunrise / sunset mode: today's sun position from the summit, warm sky, slopes lit from the sun's side ----------
const SUN = {mode:0, az:0, el:0, t:null, saved:null};
function solar(ms, lat, lon){ // NOAA-style low-precision sun position -> azimuth (rad, from north clockwise), elevation (rad)
  const d = ms/864e5 + 2440587.5 - 2451545.0, g = (357.529 + 0.98560028*d)*D2R, q = 280.459 + 0.98564736*d;
  const L = (q + 1.915*Math.sin(g) + 0.020*Math.sin(2*g))*D2R, e = (23.439 - 0.00000036*d)*D2R;
  const ra = Math.atan2(Math.cos(e)*Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e)*Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908*d) % 24 + 24) % 24, H = (gmst*15 + lon)*D2R - ra, f = lat*D2R;
  const el = Math.asin(Math.sin(f)*Math.sin(dec) + Math.cos(f)*Math.cos(dec)*Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec)*Math.cos(f) - Math.sin(f)*Math.cos(H));
  return {az:(az + 2*Math.PI) % (2*Math.PI), el}; }
function sunEvent(p, rise){ // first rising / last setting crossing today; horizon lowered by the dip seen from the summit
  const day = new Date(); day.setHours(0,0,0,0); const lim = (-0.833 - 0.0293*Math.sqrt(Math.max(0, S.eye)))*D2R;
  let prev = solar(day.getTime(), p.lat, p.lon).el, hit = null;
  for (let m = 2; m <= 1440; m += 2){ const t = day.getTime() + m*6e4, el = solar(t, p.lat, p.lon).el;
    if (rise && prev < lim && el >= lim){ hit = t; break; } if (!rise && prev >= lim && el < lim) hit = t; prev = el; }
  return hit; }
// terrain horizon seen from the summit in direction az (rad): max elevation angle of the DEM along the ray (earth curvature + refraction)
const HZ = new Map();
async function horizonAt(p0, az){
  const key = p0.id + ':' + Math.round(az/D2R*4); if (HZ.has(key)) return HZ.get(key);
  const R = 6371000, MAXD = 90000, kx = 1/(111320*Math.cos(p0.lat*D2R)), ky = 1/111320, sx = Math.sin(az), sy = Math.cos(az);
  const T = {}, need = new Set();
  for (let d = 0; d <= MAXD; d += 2000){ const X = tx(p0.lon + sx*d*kx), Y = ty(p0.lat + sy*d*ky); need.add(Math.floor(X/TS)+','+Math.floor(Y/TS)); }
  await Promise.all([...need].map(k => { const [x,y] = k.split(',').map(Number); return tile(x,y).then(h => T[k] = h).catch(()=>{}); }));
  let best = -0.1;
  for (let d = 300; d <= MAXD; d += d < 5000 ? 60 : d < 20000 ? 120 : 250){
    const X = tx(p0.lon + sx*d*kx), Y = ty(p0.lat + sy*d*ky), h = (T[Math.floor(X/TS)+','+Math.floor(Y/TS)] || null);
    if (!h) continue; const z = h[(Math.floor(Y)%TS)*TS + (Math.floor(X)%TS)];
    const a = Math.atan((z - d*d*0.87/(2*R) - S.eye)/d); if (a > best) best = a; }
  HZ.set(key, best); return best; }
// visible sunrise / sunset: first time after (rise) / last time before (set) the astronomical event that the sun clears the ridges
async function sunOverRidge(p, rise, t0){
  for (let k = 0; k <= 120; k++){ const t = t0 + (rise ? 1 : -1)*k*2*6e4, s = solar(t, p.lat, p.lon), hz = await horizonAt(p, s.az);
    if (s.el >= hz + 0.25*D2R) return {t, az:s.az, el:s.el, hz}; }   // 0.25° = sun's radius: whole disc just above the ridge
  return null; }
const SKY = { 1:{"sky-color":"#3c5a8c","horizon-color":"#ffb67a","fog-color":"#f0a982","sky-horizon-blend":0.75,"horizon-fog-blend":0.5,"fog-ground-blend":0.7},
              2:{"sky-color":"#2f2f63","horizon-color":"#ff8a4c","fog-color":"#d97a63","sky-horizon-blend":0.8,"horizon-fog-blend":0.5,"fog-ground-blend":0.7} };
const sunEl = document.createElement('div'); sunEl.id = 'v360sunDisk'; LBL.parentNode.append(sunEl);
function placeSun(){
  if (!SUN.mode || !S.on || SUN.hidden){ sunEl.style.display = 'none'; return; }
  const W = LBL.clientWidth, H = LBL.clientHeight, f = (H/2)/Math.tan(S.fov*D2R/2), B = S.brg*D2R, Lk = S.look*D2R;
  const F = [Math.cos(Lk)*Math.sin(B), Math.cos(Lk)*Math.cos(B), Math.sin(Lk)], Rt = [Math.cos(B), -Math.sin(B), 0], U = [-Math.sin(Lk)*Math.sin(B), -Math.sin(Lk)*Math.cos(B), Math.cos(Lk)];
  const el = Math.max(SUN.el, 0.004), v = [Math.cos(el)*Math.sin(SUN.az), Math.cos(el)*Math.cos(SUN.az), Math.sin(el)];
  const zc = v[0]*F[0] + v[1]*F[1] + v[2]*F[2]; if (zc < 0.05){ sunEl.style.display = 'none'; return; }
  const x = W/2 + (v[0]*Rt[0] + v[1]*Rt[1])/zc*f, y = H/2 - (v[0]*U[0] + v[1]*U[1] + v[2]*U[2])/zc*f;
  sunEl.style.display = 'block'; sunEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; }
async function setSun(mode){
  const btn = $$('v360sun');
  if (mode && !SUN.saved){ // remember what we change
    SUN.saved = {sky: map.getSky ? map.getSky() : null, hsVis: map.getLayoutProperty('hs','visibility'),
      hs: ['hillshade-method','hillshade-illumination-direction','hillshade-illumination-anchor','hillshade-exaggeration','hillshade-highlight-color','hillshade-shadow-color','hillshade-accent-color'].map(k=>[k,map.getPaintProperty('hs',k)]),
      sat: ['raster-brightness-max','raster-saturation','raster-contrast'].map(k=>[k,map.getPaintProperty('sat',k)])}; }
  SUN.mode = mode;
  if (!mode){
    const sv = SUN.saved; SUN.saved = null; if (btn) btn.textContent = '☀ Dan'; $$('v360name').textContent = S.p ? `${S.p.name} · ${Math.round(S.p.elev)} m` : '';
    if (sv){ try{ if (sv.sky) map.setSky(sv.sky); sv.hs.forEach(([k,v])=>{ try{ map.setPaintProperty('hs',k,v); }catch(_){} }); sv.sat.forEach(([k,v])=>{ try{ map.setPaintProperty('sat',k,v); }catch(_){} });
      map.setLayoutProperty('hs','visibility', S.on ? 'none' : (sv.hsVis||'visible')); }catch(_){} }
    placeSun(); return; }
  const rise = mode === 1, t0 = sunEvent(S.p, rise);
  if (t0 == null){ toastErr && toastErr('Sonce danes ne vzide / ne zaide.'); return setSun(0); }
  if (btn) btn.textContent = rise ? '🌅 računam …' : '🌇 računam …';
  const p0 = S.p; let vis = null; try{ vis = await sunOverRidge(p0, rise, t0); }catch(e){ console.warn('horizon', e); }
  if (SUN.mode !== mode || S.p !== p0 || !S.on) return;           // changed meanwhile
  const t = vis ? vis.t : t0, pos = vis || solar(t0, S.p.lat, S.p.lon); SUN.az = pos.az; SUN.el = pos.el; SUN.t = t; SUN.hidden = !vis;
  const hhmm = new Date(t).toLocaleTimeString('sl-SI', {hour:'2-digit', minute:'2-digit'});
  if (btn) btn.textContent = rise ? `🌅 Vzhod ${hhmm}` : `🌇 Zahod ${hhmm}`;
  $$('v360name').textContent = `${S.p.name} · ${rise?'sončni vzhod':'sončni zahod'} ${hhmm}`;
  try{
    map.setSky(SKY[mode]);
    map.setLayoutProperty('hs','visibility','visible');
    const P = {'hillshade-method':'standard','hillshade-illumination-direction':Math.round(pos.az/D2R),'hillshade-illumination-anchor':'map','hillshade-exaggeration':0.85,
      'hillshade-highlight-color': rise ? 'rgba(255,170,95,0.6)' : 'rgba(255,125,70,0.62)','hillshade-shadow-color':'rgba(22,18,58,0.72)','hillshade-accent-color':'rgba(70,35,55,0.35)'};
    for (const k in P) try{ map.setPaintProperty('hs',k,P[k]); }catch(_){}
    map.setPaintProperty('sat','raster-brightness-max',0.8); map.setPaintProperty('sat','raster-saturation',-0.2); map.setPaintProperty('sat','raster-contrast',0.12);
  }catch(e){ console.warn('sun', e); }
  S.brg = pos.az/D2R; S.look = Math.max(-4, Math.min(6, pos.el/D2R + 1)); setAuto(false); schedule(); }
$$('v360sun').onclick = () => setSun((SUN.mode + 1) % 3);
})();
