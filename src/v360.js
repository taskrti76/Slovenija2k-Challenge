// ===================== 360° summit view =====================
(function(){
const $$ = id => document.getElementById(id);
const S = {on:false, raf:0};
const DIRS = ['S','SV','V','JV','J','JZ','Z','SZ'];
const HANDLERS = ['dragPan','dragRotate','scrollZoom','touchZoomRotate','touchPitch','keyboard','doubleClickZoom','boxZoom'];
const HEAVY = ['cont-line','cont-lbl','pk','pk-lbl','hs','tr-road-c','tr-road','tr-track','tr-path','tr-mark-c','tr-mark','tr-ferr','poi-hut','poi-park','poi-spring','rt-alt','rt-sel-c','rt-sel','my-rt','dr-line-c','dr-line','dr-hit','dr-pts','border-casing'];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

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
  placeLabels();
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
function setAuto(on){
  S.auto = on; $$('v360auto').classList.toggle('on', on); cancelAnimationFrame(S.raf);
  if (on){ let t0 = performance.now(); const step = t => { if (!S.on || !S.auto) return; S.brg += (t - t0) * 0.006; t0 = t; apply(); S.raf = requestAnimationFrame(step); }; S.raf = requestAnimationFrame(step); }
}
function goTo(p){
  S.p = p; S.eye = Math.max(p.elev, p.dem_h || 0) + 5; S.look = -6; setAuto(false);
  $$('v360name').textContent = `${p.name} · ${Math.round(p.elev)} m`;
  buildLabels(); fitFov();
  S.flying = true;
  map.flyTo(Object.assign(cam(), {duration:1600, essential:true}));
  const done = () => { if (!S.flying || S.p !== p) return; S.flying = false; if (!S.on) return; ready = true; apply(); };
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
  S.maxZoom = map.getMaxZoom(); map.setMaxZoom(24); S.bounds = map.getMaxBounds(); map.setMaxBounds(null);
  map.setMaxPitch(150); if (map.setCenterClampedToGround) map.setCenterClampedToGround(false);
  map.getCanvasContainer().style.touchAction='none';
  document.body.classList.add('in360'); document.body.classList.remove('menu'); if (typeof drawer!=='undefined') drawer.classList.remove('open');
  goTo(p);
}
window.exit360 = () => {
  if (!S.on) return; S.on = false; setAuto(false); stopInertia(); const P = S.prev; movingPR=false;
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
  document.body.classList.remove('in360'); map.getCanvasContainer().style.touchAction=''; LBL.innerHTML=''; LB=[];
  map.jumpTo(Object.assign({}, P.cam, {pitch: Math.min(P.cam.pitch, P.maxPitch)}));
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
const MOBILE = matchMedia('(pointer:coarse)').matches;
let qi = window.LITE_ON ? 0 : 1; if(!window.LITE_ON) try{ const r=localStorage.getItem('dvat3d_q360'); const s=parseInt(r,10); if (r!==null && s>=0 && s<Q.length) qi=s; }catch(_){}
let movingPR=false;
function setPR(pr){ if (map.setPixelRatio && Math.abs(map.getPixelRatio()-pr)>0.01) map.setPixelRatio(pr); }
function applyQuality(){ const q=Q[qi];
  setPR(Math.min(devicePixelRatio, movingPR?Math.min(1,q.pr):q.pr));
  try{ map.setSourceTileLodParams(q.sat[0], q.sat[1], 'sat'); map.setSourceTileLodParams(q.dem[0], q.dem[1], 'dem_terrain'); }catch(_){}
  $$('v360q').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===qi)); }
$$('v360q').innerHTML=(window.LITE_ON?Q.slice(0,1):Q).map((q,i)=>`<button data-i="${i}">${q.n}${window.LITE_ON?' (varčno)':''}</button>`).join('');
$$('v360q').onclick = e => { const b=e.target.closest('button'); if(!b) return; qi=+b.dataset.i;
  if (MOBILE && qi===2) toastErr && toastErr('Visoka kakovost je na telefonu lahko prezahtevna — če slika izgine, izberi Srednjo.');
  try{ localStorage.setItem('dvat3d_q360', qi); }catch(_){}
  if (S.on){ applyQuality(); schedule(); } };
$$('v360q').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===qi));
applyQuality.restore = ()=>{};
// adaptive resolution: render lighter while turning, full sharpness ~0.35 s after you stop
let still=0;
window.__v360moving = () => { if (!S.on || qi===0) return; clearTimeout(still);
  if (!movingPR){ movingPR=true; setPR(Math.min(devicePixelRatio,1)); }
  still=setTimeout(()=>{ if (!S.on || S.auto) return; movingPR=false; setPR(Math.min(devicePixelRatio,Q[qi].pr)); }, 350); };
$$('v360in').onclick = () => zoomBy(1/1.35); $$('v360out').onclick = () => zoomBy(1.35);
$$('v360auto').onclick = () => { setAuto(!S.auto); if (!S.auto && window.__v360moving) window.__v360moving(); };
$$('v360exit').onclick = () => exit360();
})();
