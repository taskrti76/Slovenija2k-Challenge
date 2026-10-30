// ===================== Trails, huts, routing, drawing =====================
// ---------- pure part (graph, search, route building) ----------
const TB = [46.20, 13.38, 46.57, 14.86]; // s,w,n,e
const SACN = {hiking:1,mountain_hiking:2,demanding_mountain_hiking:3,alpine_hiking:4,demanding_alpine_hiking:5,difficult_alpine_hiking:6};
const GAP_M = 35;
const FIX = (typeof window!=='undefined'&&window.DATA_FIX)||{starts:[],ferratas:[],closed:[]};
// closed paths (e.g. Žrelo): left out of routing, still drawn on the map
const isClosed = (t, g) => !!t.name && (FIX.closed||[]).some(c => c.name===t.name && g.length && Math.abs(g[0].lat-c.lat)*111e3<c.r && Math.abs(g[0].lon-c.lon)*77e3<c.r);
const hav = (a,b,c,d) => { const R=6371000, r=Math.PI/180, x=(d-b)*r*Math.cos((a+c)/2*r), y=(c-a)*r; return R*Math.hypot(x,y); };

const ROADRE = /^(primary|secondary|tertiary|unclassified|residential|living_street|service|road|primary_link|secondary_link|tertiary_link)$/;
function wayKind(t, marked){
  if (ROADRE.test(t.highway||'')) return 'r';
  if (t.highway === 'via_ferrata' || t.sac_scale === 'difficult_alpine_hiking' && /ferrata/i.test(t.name||'')) return 'f';
  if (t.highway === 'track') return 't';
  return marked ? 'm' : 'p';
}
function wayFactor(t, kind){
  if (kind==='r') return /^(primary|secondary)/.test(t.highway) ? 2.4 : /^tertiary/.test(t.highway) ? 2.0 : 1.7; // walkable, but paths preferred
  let f = kind==='m' ? 1.0 : kind==='t' ? 1.05 : kind==='f' ? 1.25 : 1.3;
  const s = SACN[t.sac_scale] || 0;
  if (s >= 6) f *= 1.6; else if (s === 5) f *= 1.3; else if (s === 4) f *= 1.1;
  if (/^(bad|horrible|no)$/.test(t.trail_visibility||'')) f *= 1.6;
  return f;
}

// ways: [{id,tags,geometry:[{lat,lon}]}], marked: Set(wayId)
function buildGraph(ways, marked){
  const key = new Map(), LA = [], LO = [];
  const nid = (la,lo) => { const k = Math.round((la-46)*1e7)*2e7 + Math.round((lo-13)*1e7);
    let i = key.get(k); if (i === undefined){ i = LA.length; key.set(k,i); LA.push(la); LO.push(lo); } return i; };
  const eu=[], ev=[], ew=[], el=[], ey=[], W=[];
  for (const w of ways){
    const g = (w.geometry||[]).filter(Boolean); if (g.length < 2) continue;
    if (isClosed(w.tags||{}, g)) continue;
    const t = w.tags||{}, kind = wayKind(t, marked.has(w.id)), f = wayFactor(t, kind), wi = W.length;
    W.push({id:w.id, kind, sac:SACN[t.sac_scale]||0, name:t.name||'', vis:/^(bad|horrible|no)$/.test(t.trail_visibility||''), rel:w.rel||null});
    let p = nid(g[0].lat, g[0].lon);
    for (let k=1;k<g.length;k++){ const c = nid(g[k].lat, g[k].lon); if (c===p) continue;
      const L = hav(LA[p],LO[p],LA[c],LO[c]); eu.push(p); ev.push(c); el.push(L); ew.push(L*f); ey.push(wi); p = c; }
  }
  // --- gap bridging: OSM paths often stop a few metres short of the way they join.
  // Connect every dead end to the nearest point ON another way's line (splitting that segment), not just to its nodes,
  // because straight roads can have nodes hundreds of metres apart.
  { const nn=LA.length, deg=new Int32Array(nn), wof=new Int32Array(nn).fill(-1), CB=0.0004, EG=new Map();
    for (let e=0;e<eu.length;e++){ deg[eu[e]]++; deg[ev[e]]++; wof[eu[e]]=ey[e]; wof[ev[e]]=ey[e]; }
    const cell=(y,x)=>y*1e6+x;
    const addE=e=>{ const y0=Math.floor(Math.min(LA[eu[e]],LA[ev[e]])/CB), y1=Math.floor(Math.max(LA[eu[e]],LA[ev[e]])/CB),
        x0=Math.floor(Math.min(LO[eu[e]],LO[ev[e]])/CB), x1=Math.floor(Math.max(LO[eu[e]],LO[ev[e]])/CB);
      if ((y1-y0+1)*(x1-x0+1)>400) return;
      for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){ const k=cell(y,x); let a=EG.get(k); if(!a) EG.set(k,a=[]); a.push(e); } };
    for (let e=0;e<eu.length;e++) addE(e);
    const gw=W.length; W.push({id:0,kind:'g',sac:0,name:'',vis:false});
    const KX=111320*Math.cos(46.4*Math.PI/180), KY=111320;
    for (let i=0;i<nn;i++){ if (deg[i]!==1) continue;
      const px=LO[i]*KX, py=LA[i]*KY, cy=Math.floor(LA[i]/CB), cx=Math.floor(LO[i]/CB);
      let be=-1, bd=GAP_M, bt=0; const seen=new Set();
      for (let y=cy-1;y<=cy+1;y++) for (let x=cx-1;x<=cx+1;x++){ const a=EG.get(cell(y,x)); if(!a) continue;
        for (const e of a){ if (seen.has(e)) continue; seen.add(e); const u=eu[e], v=ev[e];
          if (ey[e]===wof[i] || u===i || v===i || W[ey[e]].kind==='g') continue;
          const ax=LO[u]*KX, ay=LA[u]*KY, dx=LO[v]*KX-ax, dy=LA[v]*KY-ay, L2=dx*dx+dy*dy;
          let tt=L2?((px-ax)*dx+(py-ay)*dy)/L2:0; tt=tt<0?0:tt>1?1:tt;
          const d=Math.hypot(ax+tt*dx-px, ay+tt*dy-py); if (d<bd){ bd=d; be=e; bt=tt; } } }
      if (be<0) continue;
      const u=eu[be], v=ev[be], segL=el[be]; let tgt;
      if (bt*segL<4) tgt=u; else if ((1-bt)*segL<4) tgt=v;
      else { // split segment be at the projection point
        tgt=LA.length; LA.push(LA[u]+(LA[v]-LA[u])*bt); LO.push(LO[u]+(LO[v]-LO[u])*bt);
        const f=segL?ew[be]/segL:1, L1=hav(LA[u],LO[u],LA[tgt],LO[tgt]), Lb=hav(LA[tgt],LO[tgt],LA[v],LO[v]);
        ev[be]=tgt; el[be]=L1; ew[be]=L1*f;
        eu.push(tgt); ev.push(v); el.push(Lb); ew.push(Lb*f); ey.push(ey[be]); addE(eu.length-1); }
      if (tgt===i) continue;
      eu.push(i); ev.push(tgt); el.push(bd); ew.push(bd*2+10); ey.push(gw); deg[i]++; } }
  const n = LA.length, m = eu.length, off = new Int32Array(n+1);
  for (let e=0;e<m;e++){ off[eu[e]+1]++; off[ev[e]+1]++; }
  for (let i=0;i<n;i++) off[i+1] += off[i];
  const pos = off.slice(0,n), adj = new Int32Array(2*m), wt = new Float32Array(2*m), len = new Float32Array(2*m), wy = new Int32Array(2*m);
  for (let e=0;e<m;e++){
    let q = pos[eu[e]]++; adj[q]=ev[e]; wt[q]=ew[e]; len[q]=el[e]; wy[q]=ey[e];
    q = pos[ev[e]]++; adj[q]=eu[e]; wt[q]=ew[e]; len[q]=el[e]; wy[q]=ey[e];
  }
  // node touched only by roads? (used to prefer snapping onto paths)
  const ntype = new Uint8Array(n); for (let e=0;e<m;e++){ const b = W[ey[e]].kind==='r' ? 1 : 2; ntype[eu[e]] |= b; ntype[ev[e]] |= b; }
  const lat = Float64Array.from(LA), lon = Float64Array.from(LO), grid = new Map(), C = 0.005;
  for (let i=0;i<n;i++){ const k = Math.floor(lat[i]/C)*100000 + Math.floor(lon[i]/C); let a = grid.get(k); if(!a) grid.set(k, a=[]); a.push(i); }
  const comp = new Int32Array(n).fill(-1), csize = []; { const st = new Int32Array(n);
    for (let s=0;s<n;s++){ if (comp[s]>=0) continue; let sp=0, sz=0; st[sp++]=s; comp[s]=csize.length;
      while (sp){ const u=st[--sp]; sz++; for (let q=off[u];q<off[u+1];q++){ const v=adj[q]; if (comp[v]<0){ comp[v]=csize.length; st[sp++]=v; } } }
      csize.push(sz); } }
  return {n, lat, lon, off, adj, wt, len, wy, W, grid, C, comp, csize, roadOnly: i => ntype[i]===1};
}
// roadPen: extra metres charged for road-only nodes (prefer a nearby path); noRoad: never snap to roads
function nearestNode(g, la, lo, maxM, roadPen=0, noRoad=false){
  const C=g.C, r=Math.ceil(maxM/380)+1, cy=Math.floor(la/C), cx=Math.floor(lo/C); let best=-1, bd=Infinity;
  for (let y=cy-r;y<=cy+r;y++) for (let x=cx-r;x<=cx+r;x++){ const a=g.grid.get(y*100000+x); if(!a) continue;
    for (const i of a){ const d=hav(la,lo,g.lat[i],g.lon[i]); if (d>maxM) continue; const ro=g.roadOnly&&g.roadOnly(i);
      if (ro&&noRoad) continue; const sm=g.csize&&g.csize[g.comp[i]]<300 ? 60 : 0; const s=d+(ro?roadPen:0)+sm; if (s<bd){ bd=s; best=i; } } }
  return best;
}
class Heap { constructor(){ this.k=[]; this.v=[]; }
  get size(){ return this.k.length; }
  push(k,v){ const K=this.k,V=this.v; let i=K.length; K.push(k); V.push(v);
    while(i>0){ const p=(i-1)>>1; if(K[p]<=k) break; K[i]=K[p]; V[i]=V[p]; i=p; } K[i]=k; V[i]=v; }
  pop(){ const K=this.k,V=this.v, top=V[0], lk=K.pop(), lv=V.pop(); const n=K.length;
    if(n){ let i=0; for(;;){ let c=2*i+1; if(c>=n) break; if(c+1<n&&K[c+1]<K[c]) c++; if(K[c]>=lk) break; K[i]=K[c]; V[i]=V[c]; i=c; } K[i]=lk; V[i]=lv; }
    return top; } }
// single-source search; target>=0 => A* to target
function search(g, src, maxCost, target=-1){
  const dist = new Float64Array(g.n).fill(Infinity), pe = new Int32Array(g.n).fill(-1), done = new Uint8Array(g.n), h = new Heap();
  const H = target>=0 ? i => hav(g.lat[i],g.lon[i],g.lat[target],g.lon[target]) : () => 0;
  dist[src]=0; h.push(H(src),src);
  while(h.size){ const u=h.pop(); if(done[u]) continue; done[u]=1; if(u===target) break; const du=dist[u]; if(du>maxCost) break;
    for(let q=g.off[u];q<g.off[u+1];q++){ const v=g.adj[q], nd=du+g.wt[q]; if(nd<dist[v]){ dist[v]=nd; pe[v]=q; h.push(nd+H(v),v); } } }
  return {dist, pe};
}
// walk back from node t to search source; returns {nodes (t->src), edges}
function trace(g, pe, t){ const nodes=[t], edges=[]; let u=t, guard=0;
  while(pe[u]>=0 && guard++<1e6){ const q=pe[u]; edges.push(q); // find from-node: q belongs to CSR row of from-node
    let lo=0, hi=g.n; while(lo<hi){ const mid=(lo+hi)>>1; if(g.off[mid+1]<=q) lo=mid+1; else hi=mid; } u=lo; nodes.push(u); }
  return {nodes, edges};
}
// hiking relations: long-distance ones (SPP, E6/E7, Via Alpina …) are not used to name a route
let RELS=[]; // [{name,ref,operator,network,from,to,'osmc:symbol'}]
const LONGRE=/slovensk\w* planinsk\w* pot|\bSPP\b|via alpina|\bE ?[67]\b|alpe.adria|transverzal|koroška planinska|kamniško.savinjska planinska|razširjena|evropsk|pot kurirjev|pot prijateljstva|juliana trail|via dinarica|planinska pot\b.*\d/i;
const relLong=r=>!!r&&(/^(nwn|iwn)$/.test(r.network||'')||LONGRE.test(r.name||''));
const relForeign=r=>!!r&&(/\b(CAI|SAF|ÖAV|OeAV|ÖTK|Alpenverein|Naturfreunde|Club Alpino)\b/i.test(r.operator||'')||/Wanderweg|Klettersteig|sentiero|via ferrata|^\d{3}[a-z]?$/i.test(r.name||r.ref||'')||/^\d{3}[a-z]?$/i.test(r.ref||'')||/^(it|at)\b/i.test(r.network||''));
const relPZS=r=>!!r&&!relForeign(r)&&(/red_round|white_dot|red:white|knafel/i.test(r['osmc:symbol']||'')||/\bPZS\b|planinsk\w* (zveza|društvo|drustvo)|^PD\b/i.test(r.operator||''));
const relName=r=>r?(r.name||r.ref||''):'';
function pathStats(g, edges){
  let L=0, mk=0, rd=0, sac=0, fer=false, pz=0; const names=new Map(), rc=new Map();
  for(const q of edges){ const w=g.W[g.wy[q]], l=g.len[q]; L+=l; if(w.kind==='m'||(w.rel&&w.rel.some(ri=>!relLong(RELS[ri])))) mk+=l; if(w.kind==='r') rd+=l; if(w.kind==='f') fer=true; if(w.sac>sac) sac=w.sac;
    if(w.name) names.set(w.name,(names.get(w.name)||0)+l);
    if(w.rel){ let p=false, fr=true; for(const ri of w.rel){ const R=RELS[ri]; if(relPZS(R)) p=true; if(!relForeign(R)) fr=false; if(!relLong(R)) rc.set(ri,(rc.get(ri)||0)+l); } if(p||(w.kind==='m'&&!fr)) pz+=l; } }
  const top=[...rc].sort((a,b)=>b[1]-a[1]).filter(x=>x[1]>=0.35*L).slice(0,4).map(x=>x[0]), cov=new Map(top.map(r=>[r,rc.get(r)/L]));
  return {len:L, marked:L?mk/L:0, road:rd, sac, ferrata:fer, names:[...names].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]), rels:top, cov, pzs:L?pz/L:0};
}
// Dijkstra restricted to edges accepted by ok(q)
function searchF(g, src, maxCost, ok, wf){
  const dist=new Float64Array(g.n).fill(Infinity), pe=new Int32Array(g.n).fill(-1), done=new Uint8Array(g.n), h=new Heap(), seen=[];
  dist[src]=0; h.push(0,src);
  while(h.size){ const u=h.pop(); if(done[u]) continue; done[u]=1; seen.push(u); const du=dist[u]; if(du>maxCost) break;
    for(let q=g.off[u];q<g.off[u+1];q++){ if(!ok(q)) continue; const v=g.adj[q], nd=du+(wf?wf(q):g.len[q]); if(nd<dist[v]){ dist[v]=nd; pe[v]=q; h.push(nd,v); } } }
  return {dist, pe, seen};
}
// official (named, non-long) hiking relations near the summit -> extra routes:
// summit -> (shortest way) -> first point of the relation -> along the relation (small gaps bridged) to its far end
// -> if that end is not in the valley, on to the nearest parking. Catches famous variants such as "Pot čez Prag"
// (ends at Kredarica) or "Čez Plemenice" (ends at Luknja).
function relationRoutes(g, s, base, starts, nearEnd, RMAX=7000){
  if(!RELS.length) return [];
  const entry=new Map();
  for(let u=0;u<g.n;u++){ const du=base.dist[u]; if(!(du<=RMAX)) continue;
    for(let q=g.off[u];q<g.off[u+1];q++){ const w=g.W[g.wy[q]]; if(!w.rel) continue;
      for(const ri of w.rel){ if(relLong(RELS[ri])) continue; const e=entry.get(ri); if(e==null||base.dist[e]>du) entry.set(ri,u); } } }
  const startAt=new Map(); for(const st of starts) if(st.node>=0) startAt.set(st.node,st);
  const out=[];
  for(const [ri,en] of [...entry].sort((a,b)=>base.dist[a[1]]-base.dist[b[1]]).slice(0,40)){
    const inR=q=>{ const w=g.W[g.wy[q]]; return !!(w.rel&&w.rel.includes(ri)); };
    const res=searchF(g,en,30000,q=>true,q=>inR(q)||g.W[g.wy[q]].kind==='g'?g.len[q]:g.len[q]*6);
    const rdeg=u=>{ let k=0; for(let q=g.off[u];q<g.off[u+1];q++) if(inR(q)) k++; return k; };
    const ends=res.seen.filter(u=>{ const k=rdeg(u); return k===1 && res.dist[u]>600 && base.dist[u]>base.dist[en]+400; }).sort((a,b)=>res.dist[b]-res.dist[a]);
    const head=trace(g,base.pe,en); const taken=[];
    for(const e of ends){ if(taken.length>=2) break; const tr=trace(g,res.pe,e);
      if(taken.some(t=>{ let k=0; for(const x of tr.nodes) if(t.has(x)&&res.dist[x]>300) k++; return k/tr.nodes.length>0.3; })) continue;
      taken.push(new Set(tr.nodes));
      let nodes=tr.nodes.concat(head.nodes.slice(1)), edges=tr.edges.concat(head.edges), end=e, st=startAt.get(e)||null;
      const ne=nearEnd(g.lat[e],g.lon[e]); if(ne<0) continue; // relation ends on another peak
      if(!ne){ // continue down to the nearest parking
        const r2=search(g,e,9000); let bn=-1, bd=Infinity; for(const [n] of startAt) if(r2.dist[n]<bd&&base.dist[n]>base.dist[e]){ bd=r2.dist[n]; bn=n; }
        if(bn<0) continue; const tail=trace(g,r2.pe,bn); nodes=tail.nodes.concat(nodes.slice(1)); edges=tail.edges.concat(edges); end=bn; st=startAt.get(bn); }
      const set=new Set(nodes); if(set.size<nodes.length*0.9) continue; // doubles back on itself
      out.push({ri, end, st, nodes, edges, set}); }
  }
  return out;
}
// via ferratas near the summit (e.g. Via Italiana on Mangart): summit -> top of the ferrata -> along it -> down to the nearest parking
function ferrataRoutes(g, s, base, starts, RMAX=4000){
  const isF=q=>g.W[g.wy[q]].kind==='f', seenF=new Set(), out=[], startAt=new Map(); for(const st of starts) if(st.node>=0) startAt.set(st.node,st);
  for(let u=0;u<g.n;u++){ if(!(base.dist[u]<=RMAX)||seenF.has(u)) continue; let has=false; for(let q=g.off[u];q<g.off[u+1];q++) if(isF(q)) has=true; if(!has) continue;
    const comp=searchF(g,u,8000,isF); comp.seen.forEach(x=>seenF.add(x));
    let en=u; for(const x of comp.seen) if(base.dist[x]<base.dist[en]) en=x;            // ferrata point closest to the summit
    const fr=searchF(g,en,8000,isF); let far=en; for(const x of fr.seen) if(hav(g.lat[x],g.lon[x],g.lat[s],g.lon[s])>hav(g.lat[far],g.lon[far],g.lat[s],g.lon[s])) far=x;
    if(far===en||fr.dist[far]<80) continue;
    const r2=search(g,far,9000); let bn=-1, bd=Infinity; for(const [n] of startAt) if(r2.dist[n]<bd&&hav(g.lat[n],g.lon[n],g.lat[s],g.lon[s])>hav(g.lat[far],g.lon[far],g.lat[s],g.lon[s])){ bd=r2.dist[n]; bn=n; }
    if(bn<0) continue;
    const head=trace(g,base.pe,en), mid=trace(g,fr.pe,far), tail=trace(g,r2.pe,bn);
    const nodes=tail.nodes.concat(mid.nodes.slice(1),head.nodes.slice(1)), edges=tail.edges.concat(mid.edges,head.edges);
    const W=g.W[g.wy[mid.edges[0]]]; out.push({end:bn, st:startAt.get(bn), nodes, edges, set:new Set(nodes), fname:W.name||'', frel:W.rel?W.rel.find(ri=>!relLong(RELS[ri])):undefined}); }
  return out; }
function peakRoutes(g, la, lo, starts, opt={}){
  const s = nearestNode(g, la, lo, opt.snap||250, 0, true); if (s<0) return null;
  const {dist, pe} = search(g, s, opt.maxCost||30000);
  const cand = starts.filter(st=>st.node>=0 && dist[st.node]<Infinity).sort((a,b)=>dist[a.node]-dist[b.node]);
  const acc = [];
  for (const st of cand){
    if (acc.length >= (opt.max||7)) break;
    const tr = trace(g, pe, st.node); const set = new Set(tr.nodes);
    if (acc.some(a => set.has(a.start.node) || hav(a.start.lat,a.start.lon,st.lat,st.lon) < 250)) continue; // extension / same lot
    let worst = 0; for (const a of acc){ let k=0; for(const x of tr.nodes) if(a.set.has(x)) k++; worst=Math.max(worst,k/tr.nodes.length); }
    if (worst > 0.8) continue;
    acc.push({start:st, set, nodes:tr.nodes, edges:tr.edges, cost:dist[st.node],
      coords: tr.nodes.map(i=>[g.lon[i],g.lat[i]]), stats: pathStats(g, tr.edges)});
  }
  // add official relation routes not already covered
  const best=acc.length?Math.min(...acc.map(a=>a.stats.len)):Infinity, near=opt.nearEnd||(()=>true);
  for (const rr of relationRoutes(g, s, {dist, pe}, starts, near)){
    if (acc.length >= (opt.max||7)+4) break;
    const st=pathStats(g, rr.edges);
    if (st.len > Math.max(2.2*best, best+6000)) continue;            // absurd detours
    const dup=acc.find(a=>{ let k=0; for(const x of rr.nodes) if(a.set.has(x)) k++; return k/rr.nodes.length>0.7 && a.stats.ferrata===st.ferrata && Math.abs(a.stats.sac-st.sac)<2; });
    if (dup) continue;
    acc.push({start:rr.st?{...rr.st}:{node:rr.end, name:'', lat:g.lat[rr.end], lon:g.lon[rr.end], kind:'rel'}, rel:rr.ri, set:rr.set, nodes:rr.nodes, edges:rr.edges, cost:st.len, coords: rr.nodes.map(i=>[g.lon[i],g.lat[i]]), stats: st});
  }
  for (const fr of ferrataRoutes(g, s, {dist, pe}, starts)){
    const st=pathStats(g, fr.edges); if (st.len > Math.max(2.5*best, best+7000)) continue;
    if (acc.some(a=>a.stats.ferrata && [...fr.set].filter(x=>a.set.has(x)).length>0.8*fr.set.size)) continue;
    acc.push({start:{...fr.st}, rel:fr.frel!=null?fr.frel:undefined, fname:fr.fname, set:fr.set, nodes:fr.nodes, edges:fr.edges, cost:st.len, coords:fr.nodes.map(i=>[g.lon[i],g.lat[i]]), stats:st});
  }
  // label: relation that covers most of the route; bonus if it names this peak, small bonus for PZS marking
  const pn=(opt.peakName||'').toLowerCase().split(/[ (]/)[0];
  for (const a of acc){ if (a.rel!=null) continue; let bs=0;
    for (const ri of a.stats.rels){ const R=RELS[ri], cv=a.stats.cov.get(ri)||0; if(cv<0.5) continue; const sc=cv+(pn&&relName(R).toLowerCase().includes(pn)?0.5:0)+(relPZS(R)?0.1:0); if(sc>bs){ bs=sc; a.rel=ri; } } }
  // drop absurd detours, then near-duplicates (same start area and mostly the same way), keep at most max+2
  const good=acc.filter(a=>a.stats.marked>=0.6).length;
  let keep=acc.filter(a=>(a.stats.len<=Math.max(2.2*best,best+6000)||acc.length<=3)&&!(good>=4&&a.rel==null&&a.stats.marked<0.4));
  keep.sort((a,b)=>(b.rel!=null)-(a.rel!=null)||a.stats.len-b.stats.len);
  const fin=[];
  for (const a of keep){ if (fin.length>=(opt.max||7)+2) break;
    if (fin.some(f=>{ if(hav(f.start.lat,f.start.lon,a.start.lat,a.start.lon)>=600) return false; const ov=[...a.set].filter(x=>f.set.has(x)).length/a.set.size;
      const differs=a.stats.ferrata!==f.stats.ferrata || Math.abs(a.stats.sac-f.stats.sac)>=2 || (a.rel!=null&&f.rel!=null&&a.rel!==f.rel); // e.g. Via Italiana vs normal way
      return ov>0.85 || (ov>0.5 && !differs); })) continue;
    fin.push(a); }
  keep=fin.sort((a,b)=>a.stats.len-b.stats.len);
  return {summit:s, routes:keep};
}
function nearCands(g, la, lo, maxM, roadPen){ // best node per connected piece within maxM
  const C=g.C, r=Math.ceil(maxM/380)+1, cy=Math.floor(la/C), cx=Math.floor(lo/C), best=new Map();
  for (let y=cy-r;y<=cy+r;y++) for (let x=cx-r;x<=cx+r;x++){ const a=g.grid.get(y*100000+x); if(!a) continue;
    for (const i of a){ const d=hav(la,lo,g.lat[i],g.lon[i]); if (d>maxM) continue; const s=d+(g.roadOnly(i)?roadPen:0);
      const c=g.comp[i], o=best.get(c); if (!o||s<o.s) best.set(c,{i,s}); } }
  return best;
}
function routeBetween(g, a, b, snap=150){
  const A=nearCands(g,a[1],a[0],snap,60), B=nearCands(g,b[1],b[0],snap,60); let s=-1, t=-1, bs=Infinity;
  for (const [c,x] of A){ const y=B.get(c); if (y && x.s+y.s<bs){ bs=x.s+y.s; s=x.i; t=y.i; } }
  if(s<0||t<0) return null;
  const {dist,pe}=search(g,s,1e6,t); if(dist[t]===Infinity) return null;
  const tr=trace(g,pe,t); const c=tr.nodes.reverse().map(i=>[g.lon[i],g.lat[i]]);
  return [a,...c,b];
}
// DIN 33466 walking time (h)
function walkTime(km, up, down){ const h=km/4, v=up/300+down/500; return Math.max(h,v)+Math.min(h,v)/2; }
function ascentOf(z){ if(z.length<2) return {up:0,down:0}; const s=z.map((_,i)=>{let a=0,n=0;for(let k=-2;k<=2;k++){const v=z[i+k];if(v!=null){a+=v;n++;}}return a/n;});
  let up=0,down=0,ref=s[0]; for(const v of s){ if(v-ref>=3){up+=v-ref;ref=v;} else if(ref-v>=3){down+=ref-v;ref=v;} } return {up,down}; }
function toGPX(name, coords, ele, wpts=[]){
  const x=s=>String(s).replace(/[<&>"]/g,c=>({'<':'&lt;','&':'&amp;','>':'&gt;','"':'&quot;'}[c]));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Dvatisocaki" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${x(name)}</name></metadata>\n`+
    wpts.map(w=>`<wpt lat="${w.lat.toFixed(6)}" lon="${w.lon.toFixed(6)}">${w.ele!=null?`<ele>${w.ele.toFixed(1)}</ele>`:''}<name>${x(w.name)}</name></wpt>`).join('\n')+
    `\n<trk><name>${x(name)}</name><trkseg>\n`+coords.map((c,i)=>`<trkpt lat="${c[1].toFixed(6)}" lon="${c[0].toFixed(6)}">${ele&&ele[i]!=null?`<ele>${ele[i].toFixed(1)}</ele>`:''}</trkpt>`).join('\n')+`\n</trkseg></trk>\n</gpx>\n`;
}
if (typeof module !== 'undefined') module.exports = {setRels:x=>{RELS=x;}, relationRoutes, relLong, relPZS, nearCands, wayKind, buildGraph, nearestNode, search, trace, peakRoutes, routeBetween, pathStats, walkTime, ascentOf, toGPX, hav, Heap};

// ---------- browser part ----------
if (typeof window !== 'undefined') (function(){
const el = id => document.getElementById(id);
// canvas that works in every browser (OffscreenCanvas 2D is missing/limited in some Firefox/Safari versions)
window.mkCtx = (w,h,opt) => { if (typeof document!=='undefined'){ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',opt); if (x) return x; }
  return new OffscreenCanvas(w,h).getContext('2d',opt); };
// decode a terrarium tile from a Blob -> Float32Array heights (createImageBitmap options vary by browser)
window.decodeTerrarium = async (blob, S) => { let b; try{ b=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'}); }catch(_){ b=await createImageBitmap(blob); }
  const c=mkCtx(S,S,{willReadFrequently:true}); c.drawImage(b,0,0); const d=c.getImageData(0,0,S,S).data, h=new Float32Array(S*S);
  for(let j=0;j<h.length;j++) h[j]=d[4*j]*256+d[4*j+1]+d[4*j+2]/256-32768; return h; };
const bb = TB.join(',');
const Q_POI = `[out:json][timeout:120];(nwr["tourism"~"^(alpine_hut|wilderness_hut)$"](${bb});nwr["amenity"="shelter"]["shelter_type"~"^(basic_hut|lean_to|rock_shelter)$"](${bb});nwr["amenity"="parking"](${bb});node["highway"="trailhead"](${bb});node["natural"="spring"](${bb});node["place"~"^(village|hamlet|isolated_dwelling|locality)$"](${bb}););out center tags;rel["route"="hiking"](${bb});out body;`;
const Q_TRAILS = `[out:json][timeout:240][maxsize:536870912];way["highway"~"^(path|track|via_ferrata|bridleway|footway)$"](${bb});out tags geom qt;`;
const Q_ROADS = `[out:json][timeout:240][maxsize:536870912];way["highway"~"^(primary|secondary|tertiary|unclassified|service|road)$"]["service"!~"parking_aisle|driveway|drive-through|alley"]["access"!~"^(no|private)$"](${bb});out tags geom qt;`;
const OVP = ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

// IndexedDB cache
let dbp; const idbOpen=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('dvat3d',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
const idbGet=async k=>{try{const db=await idbOpen();return await new Promise(r=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(null);});}catch(e){return null;}};
const idbSet=async(k,v)=>{try{const db=await idbOpen();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r;t.onerror=r;});}catch(e){}};
const okOverpass = d => d && Array.isArray(d.elements) && d.elements.length>0 && !/error|timed out|out of memory/i.test(d.remark||'');
async function overpass(q, key, force){
  if(!force && key){ const c=await idbGet(key); if(c&&okOverpass(c.d)&&Date.now()-c.t<30*864e5) return c.d; }
  for(const u of OVP){ for(let a=0;a<2;a++){ try{ const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q)});
      if(r.status===429||r.status===504){ await new Promise(s=>setTimeout(s,3000*(a+1))); continue; } if(!r.ok) break;
      const d=await r.json(); if(!okOverpass(d)){ console.warn('overpass empty/err',d&&d.remark); break; }
      if(key) idbSet(key,{t:Date.now(),d}); return d; }catch(e){ break; } } }
  if(!key) return null; const c=await idbGet(key); return c&&okOverpass(c.d)?c.d:null;
}
// roads in 16 small boxes around the peaks (one big request often fails with "out of memory" / rate limits)
const ROAD_BOXES = [[46.28, 13.32, 46.32, 14.0], [46.32, 13.32, 46.4, 14.04], [46.4, 13.36, 46.44, 14.84], [46.24, 13.4, 46.28, 13.88], [46.44, 13.48, 46.48, 14.88], [46.48, 13.52, 46.52, 14.52], [46.2, 13.56, 46.24, 13.88], [46.16, 13.64, 46.2, 13.84], [46.52, 13.64, 46.56, 14.08], [46.56, 13.88, 46.6, 14.0], [46.36, 14.08, 46.4, 14.84], [46.32, 14.2, 46.36, 14.8], [46.28, 14.32, 46.32, 14.76], [46.24, 14.48, 46.28, 14.6], [46.48, 14.64, 46.56, 14.88], [46.56, 14.72, 46.6, 14.84]];
let ROAD_DONE=new Set();   // box indices whose roads we have (from pack or download)
async function fetchRoads(force, onProg){
  const ck=await idbGet('roads_v4'); const out=new Map(((ck&&ck.d)||[]).map(w=>[w.id,w]));
  ((ck&&ck.boxes)||[]).forEach(i=>ROAD_DONE.add(i)); let fails=0;
  const todo=ROAD_BOXES.map((_,i)=>i).filter(i=>force||!ROAD_DONE.has(i));
  for(let k=0;k<todo.length;k++){ const i=todo[k]; if(window.__extRunning) break;
    onProg&&onProg(k+1, todo.length);
    const b=ROAD_BOXES[i].join(',');
    const q=`[out:json][timeout:120];way["highway"~"^(primary|secondary|tertiary|unclassified|service|road)$"]["service"!~"parking_aisle|driveway|drive-through|alley"]["access"!~"^(no|private)$"](${b});out tags geom qt;`;
    let d=null;
    for(let a=0;a<5&&!d;a++){ const u=OVP[a%2]; // main server first, then mirror; patient waits when busy
      try{ const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q)});
        if(r.ok){ const j=await r.json(); if(j&&Array.isArray(j.elements)&&!/error|timed out|out of memory/i.test(j.remark||'')) d=j; else await new Promise(s=>setTimeout(s,5000)); }
        else await new Promise(s=>setTimeout(s,(r.status===429||r.status===504?12000:4000)*(a+1))); }
      catch(e){ await new Promise(s=>setTimeout(s,3000)); } }
    if(d){ ROAD_DONE.add(i); for(const x of d.elements) if(x.type==='way') out.set(x.id,x); } else fails++;
    idbSet('roads_v4',{t:Date.now(), d:[...out.values()], boxes:[...ROAD_DONE]});
    await new Promise(s=>setTimeout(s,2000));
  }
  ROADS_FAILED=ROAD_BOXES.length-ROAD_DONE.size;
  return [...out.values()];
}
let ROADS_FAILED=0;

// ===== 20 km extension: trails + roads + huts/parking for everything within 20 km of a peak =====
const EXT_BOXES = [[45.96, 13.5, 46.08, 13.68], [45.96, 13.68, 46.08, 13.86], [46.08, 13.14, 46.2, 13.32], [46.08, 13.32, 46.2, 13.5], [46.08, 13.5, 46.2, 13.68], [46.08, 13.68, 46.2, 13.86], [46.08, 13.86, 46.2, 14.04], [46.08, 14.22, 46.2, 14.4], [46.08, 14.4, 46.2, 14.58], [46.08, 14.58, 46.2, 14.76], [46.08, 14.76, 46.2, 14.94], [46.2, 13.14, 46.32, 13.32], [46.2, 13.32, 46.32, 13.5], [46.2, 13.5, 46.32, 13.68], [46.2, 13.68, 46.32, 13.86], [46.2, 13.86, 46.32, 14.04], [46.2, 14.04, 46.32, 14.22], [46.2, 14.22, 46.32, 14.4], [46.2, 14.4, 46.32, 14.58], [46.2, 14.58, 46.32, 14.76], [46.2, 14.76, 46.32, 14.94], [46.2, 14.94, 46.32, 15.12], [46.32, 13.14, 46.44, 13.32], [46.32, 13.32, 46.44, 13.5], [46.32, 13.5, 46.44, 13.68], [46.32, 13.68, 46.44, 13.86], [46.32, 13.86, 46.44, 14.04], [46.32, 14.04, 46.44, 14.22], [46.32, 14.22, 46.44, 14.4], [46.32, 14.4, 46.44, 14.58], [46.32, 14.58, 46.44, 14.76], [46.32, 14.76, 46.44, 14.94], [46.32, 14.94, 46.44, 15.12], [46.44, 13.14, 46.56, 13.32], [46.44, 13.32, 46.56, 13.5], [46.44, 13.5, 46.56, 13.68], [46.44, 13.68, 46.56, 13.86], [46.44, 13.86, 46.56, 14.04], [46.44, 14.04, 46.56, 14.22], [46.44, 14.22, 46.56, 14.4], [46.44, 14.4, 46.56, 14.58], [46.44, 14.58, 46.56, 14.76], [46.44, 14.76, 46.56, 14.94], [46.44, 14.94, 46.56, 15.12], [46.56, 13.32, 46.68, 13.5], [46.56, 13.5, 46.68, 13.68], [46.56, 13.68, 46.68, 13.86], [46.56, 13.86, 46.68, 14.04], [46.56, 14.04, 46.68, 14.22], [46.56, 14.22, 46.68, 14.4], [46.56, 14.4, 46.68, 14.58], [46.56, 14.58, 46.68, 14.76], [46.56, 14.76, 46.68, 14.94], [46.56, 14.94, 46.68, 15.12], [46.68, 13.86, 46.8, 14.04], [46.68, 14.58, 46.8, 14.76], [46.68, 14.76, 46.8, 14.94]];
let EXT_DONE=false;
const TRAILRE=/^(path|track|via_ferrata|bridleway|footway)$/;
const ROADQ='["highway"~"^(primary|secondary|tertiary|unclassified|service|road)$"]["service"!~"parking_aisle|driveway|drive-through|alley"]["access"!~"^(no|private)$"]';
function extQuery(b,roadsOnly){ if(roadsOnly) return `[out:json][timeout:120];way${ROADQ}(${b});out tags geom qt;`;
  return `[out:json][timeout:180];(way["highway"~"^(path|track|via_ferrata|bridleway|footway)$"](${b});way${ROADQ}(${b}););out tags geom qt;`+
  `(nwr["tourism"~"^(alpine_hut|wilderness_hut)$"](${b});nwr["amenity"="shelter"]["shelter_type"~"^(basic_hut|lean_to|rock_shelter)$"](${b});nwr["amenity"="parking"](${b});node["highway"="trailhead"](${b});node["natural"="spring"](${b});node["place"~"^(village|hamlet|isolated_dwelling|locality)$"](${b}););out center tags;`+
  `rel["route"="hiking"](${b});out body;`; }
const SRV_BAD=new Map(); // server -> time until which we avoid it
async function overpassBox(q, prefer){
  for(let round=0; round<3; round++){
    for(let s=0;s<OVP.length;s++){ const u=OVP[(prefer+s)%OVP.length]; if((SRV_BAD.get(u)||0)>Date.now()) continue;
      try{ const ac=new AbortController(), to=setTimeout(()=>ac.abort(),200000);
        const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),signal:ac.signal}); clearTimeout(to);
        if(r.ok){ const j=await r.json(); if(j&&Array.isArray(j.elements)&&!/error|timed out|out of memory/i.test(j.remark||'')) return j; SRV_BAD.set(u,Date.now()+20000); }
        else SRV_BAD.set(u,Date.now()+(r.status===429||r.status===504?30000:60000)); }
      catch(e){ SRV_BAD.set(u,Date.now()+60000); } }
    await new Promise(s=>setTimeout(s,5000));
  }
  return null;
}
const OLD_AREA=[46.20,13.38,46.57,14.86];
const inOld=b=>b[0]>=OLD_AREA[0]&&b[1]>=OLD_AREA[1]&&b[2]<=OLD_AREA[2]&&b[3]<=OLD_AREA[3];
let extRunning=false;
window.extDownload=async()=>{
  if(extRunning) return; if(!window.__osmRaw){ toastErr&&toastErr('Počakaj, da se poti naložijo.'); return; }
  extRunning=true; const btn=el('extBtn'); if(btn) btn.disabled=true;
  const st=(await idbGet('ext_v1'))||{done:[],ways:[],poi:[],rel:[]};
  const W=new Map(st.ways.map(w=>[w.id,w])), Pm=new Map(st.poi.map(x=>[x.type+x.id,x])), R=new Set(st.rel), done=new Set(st.done);
  const pre=()=>el('tstatus').textContent.replace(/ · 20 km.*$/,'');
  window.__extRunning=true; const t0=Date.now(), start=done.size;
  const queue=EXT_BOXES.map((_,i)=>i).filter(i=>!done.has(i)).sort((x,y)=>inOld(EXT_BOXES[x])-inOld(EXT_BOXES[y]));
  const show=()=>{ const n=done.size-start, el2=(Date.now()-t0)/60000, left=queue.length+active;
    const eta=n?Math.ceil(el2/n*left):null; status(`${pre()} · 20 km: ${done.size}/${EXT_BOXES.length}${eta!=null?` · še ~${eta} min`:''} …`); };
  let active=0, saving=Promise.resolve();
  const save=()=>{ saving=saving.then(()=>idbSet('ext_v1',{done:[...done],ways:[...W.values()],poi:[...Pm.values()],rel:[...R]})); return saving; };
  async function worker(w){ while(queue.length){ const i=queue.shift(); active++; show();
      const ro=inOld(EXT_BOXES[i]); const d=await overpassBox(extQuery(EXT_BOXES[i].join(','),ro), w); active--;
      if(d){ for(const x of d.elements){
          if(x.type==='relation'){ for(const m of x.members||[]) if(m.type==='way') R.add(m.ref); continue; }
          const h=(x.tags||{}).highway||'';
          if(x.type==='way'&&x.geometry&&(TRAILRE.test(h)||ROADRE.test(h))) W.set(x.id,{type:'way',id:x.id,tags:x.tags,geometry:x.geometry});
          else if(x.tags) Pm.set(x.type+x.id,x); }
        done.add(i); if(done.size%5===0) save(); }
      show(); } }
  show(); await Promise.all([0,1,2].map(worker)); window.__extRunning=false;
  await idbSet('ext_v1',{done:[...done],ways:[...W.values()],poi:[...Pm.values()],rel:[...R]});
  const miss=EXT_BOXES.length-done.size;
  // merge with current data (pack ways have renumbered ids -> offset them; drop duplicates by geometry)
  const raw=window.__osmRaw;
  const sig=w=>{ const g=w.geometry, a=g[0], z=g[g.length-1]; return g.length+':'+a.lat.toFixed(5)+','+a.lon.toFixed(5)+':'+z.lat.toFixed(5)+','+z.lon.toFixed(5); };
  const newWays=[...W.values()], have=new Set(newWays.map(sig)), OFF=3e12;
  const oldMarked=new Set(); for(const e of raw.poi.elements) if(e.type==='relation') for(const m of e.members||[]) if(m.type==='way') oldMarked.add(m.ref);
  const keepOld=raw.tr.elements.filter(w=>w.geometry&&w.geometry.length>1&&!have.has(sig(w)));
  const oldRefs=[]; keepOld.forEach(w=>{ const nid=OFF+w.id; if(oldMarked.has(w.id)) oldRefs.push(nid); w.id=nid; });
  const pk=k=>{ const t=k.tags||{}; return (t.name||'')+'|'+(t.tourism||t.amenity||t.natural||t.highway||t.place||'')+'|'+(k.lat??k.center?.lat??0).toFixed(4)+','+(k.lon??k.center?.lon??0).toFixed(4); };
  const newPoi=[...Pm.values()], havePoi=new Set(newPoi.map(pk));
  const oldPoi=raw.poi.elements.filter(e=>e.type!=='relation'&&!havePoi.has(pk(e)));
  const poi={elements:newPoi.concat(oldPoi,[{type:'relation',tags:{route:'hiking'},members:[...R].map(r=>({type:'way',ref:r})).concat(oldRefs.map(r=>({type:'way',ref:r})))}])};
  const tr={elements:newWays.concat(keepOld)};
  window.__osmRaw={poi,tr}; EXT_DONE=miss===0; if(EXT_DONE) ROAD_BOXES.forEach((_,i)=>ROAD_DONE.add(i));
  status('Gradim omrežje …'); await new Promise(r=>setTimeout(r,30));
  await build(poi,tr,RAWSRC.replace(/ \+ ceste.*$/,'')+' + 20 km'+(miss?` (manjka ${miss}/${EXT_BOXES.length} — ponovno klikni Razširi)`:' ✓'));
  if(miss) toastErr&&toastErr(`20 km: ${miss} od ${EXT_BOXES.length} območij se ni naložilo (strežnik zaseden). Klikni Razširi ponovno — nadaljuje.`);
  extRunning=false; if(btn) btn.disabled=false;
};
window.reloadRoads=()=>{ if(!window.__osmRaw) return; addRoads(false); };

// DEM sampling (Mapterhorn terrarium, z13 ≈ 6.6 m)
const TZ=13, TSZ=512, tiles=new Map();
const tx=(lon,z)=>(lon+180)/360*2**z*TSZ, ty=(lat,z)=>{const r=lat*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z*TSZ;};
function demTile(z,x,y){ const k=`${z}/${x}/${y}`; if(tiles.has(k)) return tiles.get(k);
  const p=(async()=>{ const r=await fetch(`https://tiles.mapterhorn.com/${k}.webp`); if(!r.ok) throw 0; return decodeTerrarium(await r.blob(),TSZ); })();
  tiles.set(k,p); p.catch(()=>tiles.delete(k)); return p; }
async function elevations(coords){
  const need=new Set(); coords.forEach(([lo,la])=>need.add(Math.floor(tx(lo,TZ)/TSZ)+','+Math.floor(ty(la,TZ)/TSZ)));
  const T={}; await Promise.all([...need].map(async k=>{const [x,y]=k.split(',');try{T[k]=await demTile(TZ,+x,+y);}catch(e){T[k]=null;}}));
  return coords.map(([lo,la])=>{ const X=tx(lo,TZ)-.5, Y=ty(la,TZ)-.5, x0=Math.floor(X), y0=Math.floor(Y), fx=X-x0, fy=Y-y0;
    const v=(x,y)=>{const t=T[Math.floor(x/TSZ)+','+Math.floor(y/TSZ)]; return t?t[((y%TSZ)+TSZ)%TSZ*TSZ+((x%TSZ)+TSZ)%TSZ]:null;};
    const a=v(x0,y0),b=v(x0+1,y0),c=v(x0,y0+1),d=v(x0+1,y0+1); if([a,b,c,d].some(q=>q==null)) return a;
    return a*(1-fx)*(1-fy)+b*fx*(1-fy)+c*(1-fx)*fy+d*fx*fy; });
}
function densify(coords, step=20){ const o=[coords[0]];
  for(let i=1;i<coords.length;i++){ const [a,b]=[coords[i-1],coords[i]], d=hav(a[1],a[0],b[1],b[0]), n=Math.floor(d/step);
    for(let k=1;k<=n;k++){ const f=k/(n+1); o.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]); } o.push(b); } return o; }
async function profile(coords){
  const pts=densify(coords), z=await elevations(pts); let km=0; const dist=[0];
  for(let i=1;i<pts.length;i++){ km+=hav(pts[i-1][1],pts[i-1][0],pts[i][1],pts[i][0])/1000; dist.push(km); }
  const {up,down}=ascentOf(z); return {pts,z,dist,km,up,down};
}
function profileSVG(P, w=300, h=86){
  const zs=P.z.filter(v=>v!=null); if(!zs.length) return '';
  const mn=Math.min(...zs), mx=Math.max(...zs), sx=w/(P.km||1), sy=(h-14)/((mx-mn)||1);
  const pts=P.z.map((v,i)=>v==null?null:`${(P.dist[i]*sx).toFixed(1)},${(h-4-(v-mn)*sy).toFixed(1)}`).filter(Boolean);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block"><path d="M0,${h} L${pts.join(' L')} L${w},${h} Z" fill="rgba(212,42,31,.18)" stroke="#d42a1f" stroke-width="1.5"/>
    <text x="2" y="10" font-size="10" fill="currentColor">${Math.round(mx)} m</text><text x="2" y="${h-6}" font-size="10" fill="currentColor">${Math.round(mn)} m</text>
    <text x="${w-2}" y="${h-6}" font-size="10" text-anchor="end" fill="currentColor">${P.km.toFixed(1)} km</text></svg>`;
}
const fmtT=hh=>{ const m=Math.round(hh*60); return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')} h`; };
const SACT=['','T1','T2','T3','T4','T5','T6'];
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function download(name, text, type='application/gpx+xml'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); }
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

// ---------- icons ----------
function icon(kind){ const S=48, c=mkCtx(S,S);
  const rr=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
  c.lineWidth=4; c.strokeStyle='#fff';
  if(kind==='hut'){ rr(4,4,40,40,8); c.fillStyle='#b3261e'; c.fill(); c.stroke(); c.fillStyle='#fff';
    c.beginPath(); c.moveTo(24,11); c.lineTo(38,24); c.lineTo(34,24); c.lineTo(34,37); c.lineTo(14,37); c.lineTo(14,24); c.lineTo(10,24); c.closePath(); c.fill();
    c.fillStyle='#b3261e'; c.fillRect(21,28,6,9); }
  else if(kind==='biv'){ c.beginPath(); c.moveTo(24,4); c.lineTo(45,43); c.lineTo(3,43); c.closePath(); c.fillStyle='#e07b00'; c.fill(); c.stroke();
    c.fillStyle='#fff'; c.beginPath(); c.moveTo(24,20); c.lineTo(32,38); c.lineTo(16,38); c.closePath(); c.fill(); }
  else if(kind==='park'){ rr(6,6,36,36,7); c.fillStyle='#1f5fbf'; c.fill(); c.stroke(); c.fillStyle='#fff'; c.font='bold 28px system-ui,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('P',24,26); }
  else if(kind==='th'){ c.beginPath(); c.arc(24,24,18,0,7); c.fillStyle='#2e7d32'; c.fill(); c.stroke(); c.fillStyle='#fff'; c.beginPath(); c.moveTo(24,13); c.lineTo(34,32); c.lineTo(14,32); c.closePath(); c.fill(); }
  else if(kind==='spring'){ c.beginPath(); c.moveTo(24,6); c.bezierCurveTo(36,22,38,28,38,31); c.arc(24,31,14,0,Math.PI); c.bezierCurveTo(10,28,12,22,24,6); c.fillStyle='#1e88e5'; c.fill(); c.stroke(); }
  else if(kind==='ferr'){ rr(5,5,38,38,9); c.fillStyle='#e65100'; c.fill(); c.stroke(); // via ferrata: cable + rungs
    c.strokeStyle='#fff'; c.lineWidth=3.2; c.beginPath(); c.moveTo(14,36); c.lineTo(34,12); c.stroke(); c.lineWidth=2.6;
    for(const f of [.25,.5,.75]){ const x=14+20*f, y=36-24*f; c.beginPath(); c.moveTo(x-5,y-4); c.lineTo(x+5,y+4); c.stroke(); } }
  return c.getImageData(0,0,S,S); }

// ---------- drawing colour (selectable, remembered) ----------
const DCOLS=[['#2979ff','modra'],['#00b8d4','cian'],['#ff6d00','oranžna'],['#aa00ff','vijolična'],['#00c853','zelena'],['#ffd600','rumena'],['#111111','črna']];
let DCOL='#2979ff'; try{ const c=localStorage.getItem('dvat3d_dcol'); if(c&&DCOLS.some(x=>x[0]===c)) DCOL=c; }catch(_){}
// in-page dialog (text input, or yes/no when def===null) - replaces the browser's prompt()/confirm() boxes
window.askText=(title,def)=>new Promise(res=>{ const d=document.createElement('div'); d.className='dlg';
  d.innerHTML=`<form class="dlgc"><b>${title}</b>${def!==null?`<input type="text" maxlength="80">`:''}<div class="dlgb"><button type="button" class="c">Prekliči</button><button type="submit" class="o">${def!==null?'Shrani':'Izbriši'}</button></div></form>`;
  document.body.append(d); const inp=d.querySelector('input'); if(inp){ inp.value=def; setTimeout(()=>{ inp.focus(); inp.select(); },30); } else setTimeout(()=>d.querySelector('.o').focus(),30);
  const done=v=>{ d.remove(); res(v); };
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); done(inp?inp.value.trim():true); };
  d.querySelector('.c').onclick=()=>done(null); d.onclick=e=>{ if(e.target===d) done(null); };
  d.addEventListener('keydown',e=>{ if(e.key==='Escape') done(null); }); });
window.setDrawColor=c=>{ DCOL=c; try{ localStorage.setItem('dvat3d_dcol',c); }catch(_){}
  if(map.getLayer('dr-line')){ map.setPaintProperty('dr-line','line-color',c);
    map.setPaintProperty('dr-pts','circle-stroke-color',['case',['get','sel'],'#ffb300',['==',['get','r'],'m'],c,'#ffffff']); }
  document.documentElement.style.setProperty('--dcol',c); if(window.DRAW_ON) drawRender(); };
document.documentElement.style.setProperty('--dcol',DCOL);

// ---------- state ----------
let GRAPHSRC=null, GBUILD=null, STARTS_ALL=[];
// routing network is built for a region (~55 × 55 km) around the place you need it, not for all of Slovenia
// (whole country = 2 M nodes / 600 MB - too much for phones). Rebuilt when you ask for a peak or draw outside it.
const GR=0.25, GRL=0.36;
const inG=(la,lo,m=0)=>!!(G&&G.bb&&la>G.bb[0]+m&&la<G.bb[2]-m&&lo>G.bb[1]+m*1.4&&lo<G.bb[3]-m*1.4);
async function ensureGraph(la,lo,margin=0.1){
  if(la==null){ const c=map.getCenter(); la=c.lat; lo=c.lng; }
  if(inG(la,lo,margin)) return G; if(!GRAPHSRC) return null;
  if(GBUILD){ await GBUILD; if(inG(la,lo,margin)) return G; }
  GBUILD=(async()=>{ const prev=el('tstatus').textContent; status('Gradim omrežje poti za to območje …'); await new Promise(r=>setTimeout(r,30));
    const src=GRAPHSRC, bb=[la-GR,lo-GRL,la+GR,lo+GRL];
    if(!src.wb){ src.wb=new Float64Array(src.ways.length*4); src.ways.forEach((w,i)=>{ let a=90,b=180,c=-90,d=-180; for(const q of w.geometry||[]){ if(!q) continue; if(q.lat<a)a=q.lat; if(q.lat>c)c=q.lat; if(q.lon<b)b=q.lon; if(q.lon>d)d=q.lon; } src.wb.set([a,b,c,d],i*4); }); }
    const W=src.wb, sub=src.ways.filter((w,i)=>W[i*4]<=bb[2]&&W[i*4+2]>=bb[0]&&W[i*4+1]<=bb[3]&&W[i*4+3]>=bb[1]);
    const g=buildGraph(sub, src.marked); g.bb=bb;
    if(GRAPHSRC!==src){ GBUILD=null; return ensureGraph(la,lo,margin); } // data changed while building
    STARTS=STARTS_ALL.filter(s=>s.lat>bb[0]&&s.lat<bb[2]&&s.lon>bb[1]&&s.lon<bb[3]).map(s=>({...s,node:nearestNode(g,s.lat,s.lon,350,0,true)})).filter(s=>s.node>=0);
    G=g; GBUILD=null; status(prev); return g; })();
  return GBUILD;
}
window.ensureGraph=ensureGraph;
let G=null, STARTS=[], HUTS=[], PLACES=[], REL=new Map(), loading=false;
const EMPTY={type:'FeatureCollection',features:[]};
const status=t=>{ const s=el('tstatus'); if(s) s.textContent=t; };

function addLayers(){
  for(const k of ['hut','biv','park','th','spring','ferr']) try{ if(!map.hasImage('i-'+k)) map.addImage('i-'+k, icon(k), {pixelRatio:2}); }catch(e){ console.error('icon',k,e); toastErr&&toastErr('ikona '+k+': '+e.message); }
  const before = map.getLayer('pk') ? 'pk' : undefined;
  const add=(l)=>{ if(!map.getLayer(l.id)) map.addLayer(l, before); };
  if(!map.getSource('trails-v')) map.addSource('trails-v',{type:'geojson',data:EMPTY,tolerance:window.LITE_ON?1.2:0.5,attribution:'Poti, koče, ceste: © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors (ODbL)'});
  // roads: thick grey, width by class (h: 3 main, 2 local, 1 service)
  add({id:'tr-road-c',type:'line',source:'trails-v',minzoom:9,filter:['==',['get','k'],'r'],layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-color':'rgba(255,255,255,.55)','line-width':['interpolate',['linear'],['zoom'],9,['match',['get','h'],3,2.5,2,1.6,0.8],13,['match',['get','h'],3,7,2,5.5,3.5],16,['match',['get','h'],3,12,2,9,6]]}});
  add({id:'tr-road',type:'line',source:'trails-v',minzoom:9,filter:['==',['get','k'],'r'],layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-color':['match',['get','h'],3,'#5f5a54',2,'#77726b','#8e8982'],'line-width':['interpolate',['linear'],['zoom'],9,['match',['get','h'],3,1.6,2,1,0.5],13,['match',['get','h'],3,5,2,3.8,2.2],16,['match',['get','h'],3,9,2,7,4.5]]}});
  add({id:'tr-track',type:'line',source:'trails-v',minzoom:11.5,filter:['==',['get','k'],'t'],layout:{'line-join':'round'},
    paint:{'line-color':'#8a5a2b','line-width':['interpolate',['linear'],['zoom'],12,0.8,16,2],'line-dasharray':[4,2],'line-opacity':.8}});
  add({id:'tr-path',type:'line',source:'trails-v',minzoom:11,filter:['==',['get','k'],'p'],layout:{'line-join':'round'},
    paint:{'line-color':['case',['>=',['get','s'],4],'#3b1a12','#9c2a1c'],'line-width':['interpolate',['linear'],['zoom'],11,0.8,16,2.2],
      'line-dasharray':['case',['==',['get','v'],1],['literal',[0.6,2]],['>=',['get','s'],4],['literal',[1,1.6]],['literal',[2.5,1.6]]]}});
  add({id:'tr-mark-c',type:'line',source:'trails-v',minzoom:10,filter:['==',['get','k'],'m'],layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-color':'rgba(255,255,255,.9)','line-width':['interpolate',['linear'],['zoom'],10,2.4,16,5]}});
  add({id:'tr-mark',type:'line',source:'trails-v',minzoom:10,filter:['==',['get','k'],'m'],layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-color':'#d42a1f','line-width':['interpolate',['linear'],['zoom'],10,1.2,16,2.8]}});
  add({id:'tr-ferr',type:'line',source:'trails-v',minzoom:11,filter:['==',['get','k'],'f'],layout:{'line-cap':'round'},
    paint:{'line-color':'#111','line-width':['interpolate',['linear'],['zoom'],11,1.5,16,3.2],'line-dasharray':[0.5,1.4]}});
  // routes
  if(!map.getSource('routes')) map.addSource('routes',{type:'geojson',data:EMPTY});
  add({id:'rt-alt',type:'line',source:'routes',filter:['all',['!',['get','sel']],['!',['has','gap']]],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#ff8f00','line-width':3,'line-opacity':.75}});
  add({id:'rt-sel-c',type:'line',source:'routes',filter:['all',['get','sel'],['!',['has','gap']]],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':8}});
  add({id:'rt-sel',type:'line',source:'routes',filter:['all',['get','sel'],['!',['has','gap']]],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#1565c0','line-width':4.5}});
  add({id:'rt-gap',type:'line',source:'routes',filter:['has','gap'],layout:{'line-cap':'round'},paint:{'line-color':['case',['get','sel'],'#1565c0','#ff8f00'],'line-width':3,'line-dasharray':[1,1.6]}}); // last bit without a mapped trail
  // my routes + drawing
  if(!map.getSource('myroutes')) map.addSource('myroutes',{type:'geojson',data:EMPTY});
  add({id:'my-rt',type:'line',source:'myroutes',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#6a1b9a','line-width':3.5,'line-opacity':.85}});
  if(!map.getSource('draw')) map.addSource('draw',{type:'geojson',data:EMPTY});
  const top=l=>{ if(!map.getLayer(l.id)) map.addLayer(l); };
  top({id:'dr-line-c',type:'line',source:'draw',filter:['==',['geometry-type'],'LineString'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':7}});
  top({id:'dr-line',type:'line',source:'draw',filter:['==',['geometry-type'],'LineString'],layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-color':DCOL,'line-width':4.5,'line-dasharray':['case',['get','f'],['literal',[1,0]],['literal',[2,1.2]]]}});
  top({id:'dr-hit',type:'line',source:'draw',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#000','line-width':16,'line-opacity':0.01}});
  top({id:'dr-pts',type:'circle',source:'draw',filter:['==',['geometry-type'],'Point'],paint:{
    'circle-radius':['case',['get','sel'],8,['==',['get','r'],'m'],5.5,7],
    'circle-color':['match',['get','r'],'s','#2e7d32','e','#c62828','#ffffff'],
    'circle-stroke-color':['case',['get','sel'],'#ffb300',['==',['get','r'],'m'],DCOL,'#ffffff'],'circle-stroke-width':2.5,'circle-pitch-alignment':'viewport'}});
  // POIs
  if(!map.getSource('poi')) map.addSource('poi',{type:'geojson',data:EMPTY});
  if(window.LITE_ON) for(const [id,z] of [['tr-road-c',11],['tr-road',11],['tr-track',13],['tr-path',12.5],['tr-mark-c',11],['tr-mark',11],['tr-ferr',12]]) if(map.getLayer(id)) map.setLayerZoomRange(id,z,24);
  add({id:'poi-spring',type:'symbol',source:'poi',minzoom:13,filter:['==',['get','t'],'spring'],layout:{'icon-image':'i-spring','icon-size':.55,'icon-allow-overlap':true}});
  add({id:'poi-park',type:'symbol',source:'poi',minzoom:11,filter:['any',['==',['get','t'],'park'],['==',['get','t'],'th']],
    layout:{'icon-image':['concat','i-',['get','t']],'icon-size':.6,'icon-allow-overlap':['step',['zoom'],false,13,true]}});
  add({id:'poi-hut',type:'symbol',source:'poi',minzoom:9.5,filter:['any',['==',['get','t'],'hut'],['==',['get','t'],'biv']],
    layout:{'icon-image':['concat','i-',['get','t']],'icon-size':['interpolate',['linear'],['zoom'],10,.55,14,.8],'icon-allow-overlap':true,
      'text-field':['step',['zoom'],'',11.5,['get','name']],'text-font':['Noto Sans Bold'],'text-size':11*(window.MAPK?window.MAPK():1),'text-anchor':'top','text-offset':[0,1],'text-optional':true,'text-max-width':10},
    paint:{'text-color':['case',['==',['get','t'],'hut'],'#8e1b14','#a35400'],'text-halo-color':'rgba(255,255,255,.9)','text-halo-width':1.5}});
  if(!map.getSource('ferr')) map.addSource('ferr',{type:'geojson',data:EMPTY});
  add({id:'ferr-sign',type:'symbol',source:'ferr',minzoom:10.5,layout:{'icon-image':'i-ferr','icon-size':['interpolate',['linear'],['zoom'],11,.5,14,.75],'icon-allow-overlap':true,
      'text-field':['step',['zoom'],'',12,['get','t']],'text-font':['Noto Sans Bold'],'text-size':11*(window.MAPK?window.MAPK():1),'text-anchor':'top','text-offset':[0,1.1],'text-optional':true,'text-max-width':12},
    paint:{'text-color':'#bf360c','text-halo-color':'rgba(255,255,255,.92)','text-halo-width':1.6}});
  for(const id of ['poi-hut','poi-park','poi-spring']){
    map.on('click',id,e=>{ if(window.DRAW_ON) return; e.preventDefault(); poiPopup(e.features[0]); });
    map.on('mouseenter',id,()=>map.getCanvas().style.cursor=window.DRAW_ON?'crosshair':'pointer');
    map.on('mouseleave',id,()=>map.getCanvas().style.cursor=window.DRAW_ON?'crosshair':'');
  }
}
const TNAME={hut:'Planinska koča',biv:'Bivak / zavetišče',park:'Parkirišče',th:'Izhodišče',spring:'Izvir'};
function poiPopup(f){ const p=f.properties;
  new maplibregl.Popup({offset:12,maxWidth:'260px'}).setLngLat(f.geometry.coordinates).setHTML(
    `<b>${p.name||TNAME[p.t]}</b><br><span style="color:#666">${TNAME[p.t]}${p.ele?' · '+p.ele+' m':''}</span>${p.web?`<br><a href="${p.web}" target="_blank" rel="noopener">spletna stran</a>`:''}`).addTo(map); }

async function loadData(force){
  if(loading) return; loading=true;
  let poi=null, tr=null, src='OSM v živo';
  const tag=document.getElementById('osmpack'), b64=tag?tag.textContent.trim():'', ext=tag&&tag.dataset.src;
  if(!force&&(b64.length>100||ext)){
    status(ext&&b64.length<=100?'Nalagam podatke o poteh …':'Nalagam vgrajene podatke …');
    try{ let buf;
      if(b64.length>100) buf=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;
      else { const r=await fetch(ext); if(!r.ok) throw new Error('HTTP '+r.status); buf=await r.arrayBuffer(); } // a server may already have un-gzipped it -> handled below
      const u8=new Uint8Array(buf,0,2), d=decodePack(u8[0]===0x1f&&u8[1]===0x8b?await gunzipJSON(buf):JSON.parse(new TextDecoder().decode(buf)));
      poi=d.poi; tr=d.trails; src=(b64.length>100?'vgrajeno':'paket')+', OSM '+d.date.slice(0,10); (d.rb||[]).forEach(i=>ROAD_DONE.add(i)); if(d.ext){ EXT_DONE=true; ROAD_BOXES.forEach((_,i)=>ROAD_DONE.add(i)); } }catch(e){ console.warn('pack',e); }
  }
  if(!poi||!tr){
    status('Nalagam poti in koče iz OSM (prvič ~10–40 s) …');
    [poi,tr]=await Promise.all([overpass(Q_POI,'poi_v1',force), overpass(Q_TRAILS,'trails_v1',force)]);
  }
  if(!poi||!tr){ status('OSM ni dosegljiv — poskusi kasneje (Osveži).'); loading=false; return; }
  window.__osmRaw={poi,tr};
  await build(poi,tr,src);
  loading=false;
  RAWSRC=src;
  addRoads(force);
}
let RAWSRC='';
async function addRoads(force){
  const raw=window.__osmRaw; if(!raw) return;
  if(!force && ROAD_DONE.size>=ROAD_BOXES.length) return;
  const pre=el('tstatus').textContent.replace(/ · (nalagam )?ceste.*$/,'');
  const rw=await fetchRoads(force,(i,n)=>status(`${pre} · nalagam ceste ${i}/${n} …`));
  const sig=w=>{ const g=w.geometry, a=g[0], z=g[g.length-1]; return g.length+':'+a.lat.toFixed(5)+','+a.lon.toFixed(5)+':'+z.lat.toFixed(5)+','+z.lon.toFixed(5); };
  const have=new Set(raw.tr.elements.filter(w=>ROADRE.test((w.tags||{}).highway||'')).map(sig));
  const add=(rw||[]).filter(w=>w.geometry&&w.geometry.length>1&&!have.has(sig(w)));
  add.forEach(w=>{ if(w.id<1e12) w.id=1e12+w.id; });
  const miss=ROADS_FAILED?` (manjka ${ROADS_FAILED}/${ROAD_BOXES.length} območij — Nastavitve → Naloži ceste)`:'';
  if(!add.length){ status(pre.replace(/ \+ ceste.*$/,'')+' + ceste'+miss); if(ROADS_FAILED) toastErr&&toastErr(`Ceste: ${ROADS_FAILED} od ${ROAD_BOXES.length} območij še manjka (strežnik zaseden). Nastavitve → Naloži ceste nadaljuje.`); return; }
  const tr={elements:raw.tr.elements.concat(add)}; window.__osmRaw={poi:raw.poi,tr};
  await build(raw.poi,tr,RAWSRC.replace(/ \+ ceste.*$/,'')+' + ceste'+miss);
  if(ROADS_FAILED) toastErr&&toastErr(`Ceste: ${ROADS_FAILED} od ${ROAD_BOXES.length} območij še manjka (strežnik zaseden). Nastavitve → Naloži ceste nadaljuje.`);
}
async function build(poi,tr,src){
  if(!map.getSource('trails-v')||!map.getSource('poi')) addLayers();
  // relations -> marked way ids
  const marked=new Set(); REL=new Map();
  RELS=[]; const wr=new Map();
  for(const e of poi.elements) if(e.type==='relation'){ const t=e.tags||{}, ri=(!t._pseudo&&(t.name||t.ref))?RELS.push(t)-1:-1;
    for(const m of e.members||[]) if(m.type==='way'){ marked.add(m.ref); if(!REL.has(m.ref)) REL.set(m.ref,t); if(ri>=0){ let a=wr.get(m.ref); if(!a) wr.set(m.ref,a=[]); if(!a.includes(ri)) a.push(ri); } } }
  for(const w of tr.elements) if(w.type==='way'&&wr.has(w.id)) w.rel=wr.get(w.id);
  const ways=tr.elements.filter(e=>e.type==='way');
  G=null; GRAPHSRC={ways,marked}; GBUILD=null; // routing network is built lazily on first use (keeps page load fast on phones)
  // trails layer
  const feats=[];
  for(const w of ways){ const g=(w.geometry||[]).filter(Boolean); if(g.length<2) continue; const t=w.tags||{}, k=wayKind(t,marked.has(w.id));
    if(t.highway==='footway'&&k!=='m') continue; // urban footways: graph only
    const h=k!=='r'?0:/^(primary|secondary|tertiary)/.test(t.highway)?3:/^(service|residential|living_street)$/.test(t.highway)?1:2;
    feats.push({type:'Feature',properties:{k,h,s:SACN[t.sac_scale]||0,v:/^(bad|horrible|no)$/.test(t.trail_visibility||'')?1:0},geometry:{type:'LineString',coordinates:g.map(p=>[p.lon,p.lat])}}); }
  map.getSource('trails-v').setData({type:'FeatureCollection',features:feats});
  // via ferrata signs: one per named ferrata (way name, else its hiking route), with difficulty (OSM via_ferrata_scale 1-6 = A-F) and SAC grade
  { const FG={}, VF='ABCDEF';
    // OSM via_ferrata_scale is written many ways ("3", "2+", "2-3", "1.5", "C", "B/C"): numbers 1-6 -> A-F, x.5 -> X/Y
    const vfNum=v=>{ const m=String(v).match(/[0-6](?:\.5)?|[A-Fa-f]/g); if(!m) return -1; return Math.max(...m.map(x=>/[A-F]/i.test(x)?VF.indexOf(x.toUpperCase())+1:+x)); };
    const vfTxt=v=>{ const t=String(v).trim(); if(t==='0') return 'lahka';
      return t.replace(/([1-6])\.5/g,(m,a)=>VF[a-1]+'/'+VF[a]).replace(/[1-6]/g,d=>VF[d-1]).replace(/-/g,'–'); };
    // one sign per ferrata: pieces of the same path are joined - same name within 1.5 km, or touching (ends within 40 m) where at
    // most one name is involved (unnamed bits join the path they continue). Differently named paths stay separate. Grade = hardest piece.
    const FP=[];
    for(const w of ways){ const t=w.tags||{}; if(t.highway!=='via_ferrata'&&t.via_ferrata_scale==null) continue; const g=(w.geometry||[]).filter(Boolean); if(g.length<2) continue;
      let nm=t.name||''; if(!nm&&w.rel) for(const ri of w.rel){ const R=RELS[ri]; if(R&&R.name&&!relLong(R)){ nm=R.name; break; } }
      let L=0; for(let i=1;i<g.length;i++) L+=hav(g[i-1].lat,g[i-1].lon,g[i].lat,g[i].lon);
      FP.push({g, nm, L, sac:SACN[t.sac_scale]||0, fs:t.via_ferrata_scale!=null?vfNum(t.via_ferrata_scale):-1, raw:t.via_ferrata_scale!=null?String(t.via_ferrata_scale):''}); }
    const par=FP.map((_,i)=>i), nmOf=FP.map(f=>f.nm), root=i=>par[i]===i?i:(par[i]=root(par[i]));
    const join=(a,b)=>{ a=root(a); b=root(b); if(a===b) return; if(nmOf[a]&&nmOf[b]&&nmOf[a]!==nmOf[b]) return; par[a]=b; nmOf[b]=nmOf[b]||nmOf[a]; };
    FP.forEach((f,i)=>{ if(!f.nm) return; FP.forEach((h,k)=>{ if(k>i&&h.nm===f.nm&&hav(f.g[0].lat,f.g[0].lon,h.g[0].lat,h.g[0].lon)<1500) join(i,k); }); });
    const EG=new Map(), ck=(la,lo)=>Math.floor(la/0.0006)+','+Math.floor(lo/0.0009);
    FP.forEach((f,i)=>{ for(const e of [f.g[0],f.g[f.g.length-1]]){ const y=Math.floor(e.lat/0.0006), x=Math.floor(e.lon/0.0009);
      for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(const [k,q] of EG.get((y+a)+','+(x+b))||[]) if(hav(e.lat,e.lon,q.lat,q.lon)<40) join(i,k);
      const kk=ck(e.lat,e.lon); let arr=EG.get(kk); if(!arr) EG.set(kk,arr=[]); arr.push([i,e]); } });
    FP.forEach((f,i)=>{ const r=root(i); let o=FG[r]; if(!o) o=FG[r]={names:new Map(),best:f.g,bl:0,len:0,sac:0,fs:-1};
      o.len+=f.L; if(f.L>o.bl){ o.bl=f.L; o.best=f.g; } if(f.nm) o.names.set(f.nm,(o.names.get(f.nm)||0)+f.L); o.sac=Math.max(o.sac,f.sac); if(f.fs>o.fs||(f.fs===o.fs&&/\+/.test(f.raw))){ o.fs=f.fs; o.raw=f.raw; } });
    const hardest=(f,raw)=>{ if(f<0) return ''; if(f===0) return 'lahka'; const m=[...String(raw||'').matchAll(/([0-6](?:\.5)?)\s*([+-]?)/g)].find(x=>+x[1]===f);
      return (Number.isInteger(f)?VF[f-1]:VF[Math.floor(f)-1]+'/'+VF[Math.floor(f)])+(m&&m[2]?(m[2]==='-'?'–':'+'):''); };
    const ff=[]; for(const o of Object.values(FG)){ o.name=[...o.names].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]).join(' / '); if(!o.name&&o.len<120) continue;
      if((FIX.closed||[]).some(c=>o.names.has(c.name))) o.name+=' (del zaprt)';
      const q=o.best[Math.floor(o.best.length/2)]; o.fsTxt=hardest(o.fs,o.raw);
      const fx=(FIX.ferratas||[]).find(f=>hav(q.lat,q.lon,f[0],f[1])<f[2]); if(fx){ if(fx[3]) o.name=fx[3]; if(fx[4]){ o.fs=0; o.fsTxt=fx[4]; } }
      const grade=[o.fs>=0?o.fsTxt:'', o.sac?SACT[o.sac]:''].filter(Boolean).join(' · ');
      ff.push({type:'Feature',properties:{t:[o.name||'Ferata', grade].filter(Boolean).join('\n'),len:Math.round(o.len)},geometry:{type:'Point',coordinates:[q.lon,q.lat]}}); }
    if(map.getSource('ferr')) map.getSource('ferr').setData({type:'FeatureCollection',features:ff}); }
  // POIs
  const pf=[]; STARTS=[]; HUTS=[]; PLACES=[];
  for(const e of poi.elements){ if(e.type==='relation') continue; const t=e.tags||{}, la=e.lat??e.center?.lat, lo=e.lon??e.center?.lon; if(la==null) continue;
    let k=null;
    if(t.place){ PLACES.push({name:t.name,lat:la,lon:lo}); continue; }
    if(t.tourism==='alpine_hut') k='hut'; else if(t.tourism==='wilderness_hut'||t.amenity==='shelter') k='biv';
    else if(t.amenity==='parking') k='park'; else if(t.highway==='trailhead') k='th'; else if(t.natural==='spring') k='spring';
    if(!k) continue;
    if(k==='park'||k==='th'){ if(t.access==='private') continue; STARTS.push({node:-1,name:t.name||'',lat:la,lon:lo,kind:k}); }
    if(k==='hut'||k==='biv') HUTS.push({name:t.name||TNAME[k],lat:la,lon:lo});
    pf.push({type:'Feature',properties:{t:k,name:t.name||'',ele:t.ele||'',web:t.website||t['contact:website']||''},geometry:{type:'Point',coordinates:[lo,la]}});
  }
  // nearest named place within 4 km: grid of ~5 km buckets instead of comparing every parking with every place (was ~0.5 s on load)
  const PG=new Map(), pk=(la,lo)=>Math.floor(la/0.045)+','+Math.floor(lo/0.065);
  for(const p of PLACES) if(p.name){ const k=pk(p.lat,p.lon); let a=PG.get(k); if(!a) PG.set(k,a=[]); a.push(p); }
  for(const s of STARTS) if(!s.name){ let best=null,bd=4000; const a0=Math.floor(s.lat/0.045), b0=Math.floor(s.lon/0.065);
    for(let a=a0-1;a<=a0+1;a++) for(let b=b0-1;b<=b0+1;b++) for(const p of PG.get(a+','+b)||[]){ const d=hav(s.lat,s.lon,p.lat,p.lon); if(d<bd){bd=d;best=p.name;} }
    s.name=best?`pri ${best}`:'parkirišče'; }
  for(const s of STARTS){ const f=(FIX.starts||[]).find(f=>hav(s.lat,s.lon,f[0],f[1])<f[2]); if(f) s.name=f[3]; }
  STARTS_ALL=STARTS; STARTS=[];
  map.getSource('poi').setData({type:'FeatureCollection',features:pf});
  const nr=feats.filter(f=>f.properties.k==='r').length;
  status(`Poti: ${(feats.length-nr).toLocaleString('sl')} odsekov${nr?` · ceste: ${nr.toLocaleString('sl')}`:''} · koče/bivaki: ${HUTS.length} · izhodišča: ${STARTS_ALL.length} · ${src}`);
}

// ---------- routes per peak ----------
const rcard=()=>el('rcard');
let RT=null; // {peak, routes:[{...,P}] , sel}
window.__dbg=()=>({RT,STARTS,HUTS,G,peakRoutes,search,trace,nearestNode,pathStats}); // for tests
// start of an official-relation route: its from/to tag (the one that is not the peak), else nearest named place
function relStartName(r,p){ const R=RELS[r.rel], pn=(p.name||'').toLowerCase().split(/[ (]/)[0];
  for(const k of ['from','to']){ const v=R&&R[k]; if(v&&!(pn&&v.toLowerCase().includes(pn))) return v; }
  let best='', bd=2500; for(const x of [...HUTS,...PLACES,...STARTS]){ if(!x.name) continue; const d=hav(x.lat,x.lon,r.start.lat,r.start.lon); if(d<bd){ bd=d; best=x.name; } }
  return best?('pri '+best):'konca poti'; }
const hutNear=st=>{ let best='', bd=700; for(const h of HUTS){ if(!h.name||/^Bivak \/|^Planinska koča$/.test(h.name)) continue; const d=hav(h.lat,h.lon,st.lat,st.lon); if(d<bd){ bd=d; best=h.name; } } return best?'pri '+best:''; };
// height profiles: all routes, or only the selected one in varčni način
async function routeProfiles(){ const cur=RT; if(!cur) return;
  for(const r of [...cur.routes]){ if(r.P||(window.LITE_ON&&r!==cur.routes[cur.sel])) continue; r.P=await profile(r.coords);
    // longer than 11 h of walking (DIN 33466) -> remove, unless it is the only way up
    if(r.P&&walkTime(r.P.km,r.P.up,r.P.down)>11&&cur.routes.length>1){ const keep=cur.routes[cur.sel]; cur.routes=cur.routes.filter(x=>x!==r); cur.sel=Math.max(0,cur.routes.indexOf(keep===r?cur.routes[0]:keep)); if(RT===cur) setRoutesLayer(); }
    if(RT===cur) renderRoutes(); } }
function setRoutesLayer(){ map.getSource('routes').setData(!RT?EMPTY:{type:'FeatureCollection',features:RT.routes.flatMap((r,i)=>{ const g=r.gap>25, c=g?r.coords.slice(0,-1):r.coords;
  const f=[{type:'Feature',properties:{sel:i===RT.sel},geometry:{type:'LineString',coordinates:c}}];
  if(g) f.push({type:'Feature',properties:{sel:i===RT.sel,gap:true},geometry:{type:'LineString',coordinates:r.coords.slice(-2)}}); return f; })}); }
function hutsAlong(coords){ const out=[]; for(const h of HUTS){ for(let i=0;i<coords.length;i+=3){ if(hav(h.lat,h.lon,coords[i][1],coords[i][0])<120){ out.push([i,h.name]); break; } } } return out.sort((a,b)=>a[0]-b[0]).map(x=>x[1]).filter((n,i,a)=>a.indexOf(n)===i); } // in order from the start
window.peakRoutesUI = async function(id){
  const p=byId[id]; if(!p) return; if(popup) popup.remove();
  const c=rcard(); c.style.display='block'; document.body.classList.remove('menu');
  if(!inG(p.lat,p.lon,0.17)){ c.innerHTML=`<div class="rh"><b>${p.name}</b><button class="x" onclick="closeRoutes()">×</button></div><div class="rm">Pripravljam omrežje poti …</div>`;
    if(!GRAPHSRC){ if(!loading) loadData(); return; } await ensureGraph(p.lat,p.lon,0.17); if(!G) return; }
  // an extra (relation) route must end in the valley: at a parking, or at a hut ≥3 km away - never on another peak
  // every route starts at a parking/trailhead (≤300 m); relation routes that end elsewhere (also at a hut) are continued to the nearest parking
  const nearStart=(la,lo)=>{ let b=null,bd=300; for(const x of STARTS){ const d=hav(x.lat,x.lon,la,lo); if(d<bd){ bd=d; b={...x}; } } for(const h of HUTS){ const d=hav(h.lat,h.lon,la,lo); if(d<bd){ bd=d; b={name:h.name,lat:h.lat,lon:h.lon,kind:'hut'}; } } return b; };
  const nearPark=(la,lo)=>STARTS.some(x=>hav(x.lat,x.lon,la,lo)<300);
  const nearEnd=(la,lo)=>PEAKS.some(q=>q.lat!=null&&q!==p&&hav(q.lat,q.lon,la,lo)<400)?-1:nearPark(la,lo)?1:0; // routes ending at a hut are continued down to a parking
  const res=peakRoutes(G,p.lat,p.lon,STARTS,{snap:250,maxCost:30000,max:7,nearEnd,peakName:p.name});
  if(!res||!res.routes.length){ RT=null; setRoutesLayer();
    c.innerHTML=`<div class="rh"><b>${p.name}</b> · ${Math.round(p.elev)} m<button class="x" onclick="closeRoutes()">×</button></div>
      <div class="rm">${res?'Ni izhodišča v dosegu.':'Do vrha v OSM ni vrisane poti (brezpotje).'}<br>Pot lahko vrišeš sam: <button class="lnk" onclick="startDraw()">Riši pot</button></div>`; return; }
  const MAXKM=22; // > ~11 h walking: dropped (checked again with the height profile)
  res.routes=res.routes.filter((r,i,a)=>r.stats.len/1000<=MAXKM||a.length===1);
  res.routes.forEach(r=>{ const pk=[p.lon,p.lat], last=r.coords[r.coords.length-1]; r.gap=Math.round(hav(last[1],last[0],p.lat,p.lon)); r.coords=[...r.coords,pk];
    if(r.start.kind==='rel'){ const ns=nearStart(r.start.lat,r.start.lon); if(ns) r.start={...ns,node:r.start.node}; }
    // join the drawn line to the actual parking / hut point
    const c0=r.coords[0]; if(r.start.lat!=null&&hav(r.start.lat,r.start.lon,c0[1],c0[0])>10) r.coords.unshift([r.start.lon,r.start.lat]);
    if(!r.start.name||/^pri /.test(r.start.name)) r.start.name=(r.start.kind==='hut'?r.start.name:'')||hutNear(r.start)||r.start.name||relStartName(r,p);
    const sn=r.start.name.replace(/^pri /,''); r.huts=hutsAlong(r.coords).filter(h=>h!==sn); });
  RT={peak:p, routes:res.routes, sel:0, min:false}; setRoutesLayer(); renderRoutes(); fitRoutes();
  await routeProfiles();
};
window.rerenderRoutes = () => { if (RT) renderRoutes(); };
// difficulty class of a route / peak (used by the weather rating), as PZS marks paths in Slovenia: 1 lahka (T1–T2), 2 zahtevna (T3),
// 3 zelo zahtevna (T4–T6 or ferrata) - OSM in Slovenia tags the 'zelo zahtevna' paths (Triglav, Jalovec, Mangart ...) mostly as T4
window.routeClass = r => r ? (r.stats.ferrata || r.stats.sac >= 4 ? 3 : r.stats.sac >= 3 ? 2 : 1) : null;
window.selRouteClass = id => RT && RT.peak && RT.peak.id === id && RT.routes[RT.sel] ? window.routeClass(RT.routes[RT.sel]) : null;
// tools/peak_tech.js: routes of a peak without touching the UI
window.__peakTech = async function(id){ const p=byId[id]; if(!p||p.lat==null) return null;
  if(!inG(p.lat,p.lon,0.17)){ if(!GRAPHSRC) return null; await ensureGraph(p.lat,p.lon,0.17); if(!G) return null; }
  const nearPark=(la,lo)=>STARTS.some(x=>hav(x.lat,x.lon,la,lo)<300);
  const nearEnd=(la,lo)=>PEAKS.some(q=>q.lat!=null&&q!==p&&hav(q.lat,q.lon,la,lo)<400)?-1:nearPark(la,lo)?1:0;
  const res=peakRoutes(G,p.lat,p.lon,STARTS,{snap:250,maxCost:30000,max:7,nearEnd,peakName:p.name});
  if(!res) return {none:true}; const R=res.routes.filter((r,i,a)=>r.stats.len/1000<=22||a.length===1);
  return {routes:R.map(r=>({sac:r.stats.sac,fer:!!r.stats.ferrata,km:+(r.stats.len/1000).toFixed(1),cls:window.routeClass(r)}))}; };
// lines of all routes to a peak (same routes the route card shows; no UI) - used for snow along the way
const RL=new Map();
window.__peakRouteLines = async function(id){ if(RL.has(id)) return RL.get(id); const p=byId[id]; if(!p||p.lat==null) return [];
  if(!inG(p.lat,p.lon,0.17)){ if(!GRAPHSRC){ if(!loading) loadData(); return null; } await ensureGraph(p.lat,p.lon,0.17); if(!G) return null; }
  const nearPark=(la,lo)=>STARTS.some(x=>hav(x.lat,x.lon,la,lo)<300);
  const nearEnd=(la,lo)=>PEAKS.some(q=>q.lat!=null&&q!==p&&hav(q.lat,q.lon,la,lo)<400)?-1:nearPark(la,lo)?1:0;
  const res=peakRoutes(G,p.lat,p.lon,STARTS,{snap:250,maxCost:30000,max:7,nearEnd,peakName:p.name});
  const RR=res?res.routes.filter((r,i,a)=>r.stats.len/1000<=22||a.length===1):[], L=RR.map(r=>r.coords); RL.set(id,L); RN.set(id,RR.map(routeLabel)); return L; };
// names of those routes, as the route card writes them ("iz Krme · Tominškova pot") - for "climbed by which route"
const RN=new Map();
window.__peakRouteNames = async function(id){ if(!RN.has(id)) await window.__peakRouteLines(id); return RN.get(id)||[]; };
function routeLabel(r){ const s=r.stats, ri=r.rel!=null?r.rel:s.rels&&s.rels[0], R=ri!=null?RELS[ri]:null, nm=R?relName(R):r.fname;
  return 'iz '+r.start.name.replace(/^pri /,'')+(nm?' · '+nm:''); }
// fit routes into the part of the map not covered by the route card (phone: card is a bottom sheet)
function routePad(){ const c=rcard(), W=innerWidth, H=innerHeight;
  const pad=DESK()?{top:60,bottom:60,right:60,left:Math.min(W*0.45,(c.offsetLeft||274)+(c.offsetWidth||340)+30)}
    :{top:56,left:24,right:24,bottom:Math.min(H*0.6,(c.offsetHeight||0)+70)};
  if(pad.top+pad.bottom>H-120) pad.bottom=Math.max(40,H-120-pad.top); return pad; }
function fitRoutes(){ if(!RT) return; const b=new maplibregl.LngLatBounds(); RT.routes.forEach(r=>r.coords.forEach(x=>b.extend(x)));
  map.fitBounds(b,{padding:routePad(),maxZoom:14,duration:900,...(DESK()?{}:{pitch:Math.min(map.getPitch(),45)})}); }
// look at the selected route from the side: camera perpendicular to the route's main direction, on the lower (valley) side
window.sideView=()=>{ if(!RT) return; const r=RT.routes[RT.sel], C=r.coords; if(!C||C.length<2) return;
  const KX=76700, KY=111320; let mx=0,my=0; for(const [lo,la] of C){ mx+=lo; my+=la; } mx/=C.length; my/=C.length;
  let sxx=0,syy=0,sxy=0; for(const [lo,la] of C){ const x=(lo-mx)*KX, y=(la-my)*KY; sxx+=x*x; syy+=y*y; sxy+=x*y; }
  const ax=0.5*Math.atan2(2*sxy,sxx-syy), axisB=90-ax*180/Math.PI; // bearing of main direction
  const b=new maplibregl.LngLatBounds(); C.forEach(x=>b.extend(x)); const ctr=b.getCenter();
  const at=(brg,d)=>{ const t=brg*Math.PI/180; return {lng:ctr.lng+Math.sin(t)*d/KX, lat:ctr.lat+Math.cos(t)*d/KY}; };
  const hSide=brg=>{ let h=0,n=0; for(const d of [1200,2500,4000]){ const e=map.queryTerrainElevation(at(brg,d)); if(e!=null){ h+=e; n++; } } return n?h/n:null; };
  let side=axisB+90; const h1=hSide(axisB+90), h2=hSide(axisB-90); if(h1!=null&&h2!=null&&h2<h1) side=axisB-90;
  // face of the mountain the trail climbs: direction summit -> upper half of the route; camera stands out on that side looking at the summit
  const pk=C[C.length-1], U=C.slice(Math.floor(C.length*0.4),-1); let fx=0,fy=0;
  for(const [lo,la] of U){ const x=(lo-pk[0])*KX, y=(la-pk[1])*KY, d=Math.hypot(x,y); if(d>30){ fx+=x/d; fy+=y/d; } }
  if(Math.hypot(fx,fy)>0.3*U.length) side=Math.atan2(fx,fy)*180/Math.PI;
  const bearing=((side+180)%360+360)%360, flat=window.__dim&&window.__dim.d===2;
  const cam=map.cameraForBounds(b,{padding:routePad(),bearing,maxZoom:15}); if(!cam) return;
  map.stop(); const cur=map.getBearing(); let tb=bearing; while(tb-cur>180) tb-=360; while(tb-cur<-180) tb+=360; // shortest turn
  map.easeTo({center:cam.center, zoom:cam.zoom-(flat?0:0.5), bearing:tb, pitch:flat?0:Math.min(map.getMaxPitch(),window.LITE_ON?55:60),
    duration:window.LITE_ON?1000:2000, easing:x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2, essential:true}); };
window.routesMin=()=>{ if(!RT) return; RT.min=!RT.min; renderRoutes(); fitRoutes(); };
function renderRoutes(){
  const c=rcard(), p=RT.peak, hd=`<div class="rh"><b>${p.name}</b> · ${Math.round(p.elev)} m · ${RT.routes.length} ${RT.routes.length===1?'pot':'poti'}<button class="x mn" onclick="routesMin()" title="${RT.min?'Pokaži poti':'Skrij seznam poti'}">${RT.min?'▴':'▾'}</button><button class="x" onclick="closeRoutes()">×</button></div>`;
  c.classList.toggle('rmin',!!RT.min);
  if(RT.min){ const r=RT.routes[RT.sel], s=r.stats, P=r.P;
    c.innerHTML=hd+`<div class="rs" onclick="routesMin()" style="cursor:pointer">iz ${r.start.name.replace(/^pri /,'')} · ${(s.len/1000).toFixed(1)} km${P?` · ↑${Math.round(P.up)} m · ${fmtT(walkTime(P.km,P.up,P.down)*((window.PROFILE&&window.PROFILE.fitK)||1))}`:''} · ${SACT[s.sac]||'T?'}</div>`; return; }
  c.innerHTML=hd+
    RT.routes.map((r,i)=>{ const s=r.stats, P=r.P;
      const ri=r.rel!=null?r.rel:s.rels&&s.rels[0], R=ri!=null?RELS[ri]:null;
      return `<div class="ri${i===RT.sel?' on':''}" data-i="${i}"><div><b>iz ${r.start.name.replace(/^pri /,'')}</b>${r.huts.length?` <span class="via">čez ${r.huts.slice(0,2).join(', ')}</span>`:''}</div>
        ${!R&&r.fname?`<div class="rp">⛓ ${esc(r.fname)}</div>`:''}${R||s.pzs>0.6?`<div class="rp">${s.pzs>0.6||relPZS(R)?'<span class="pzs" title="Markirana planinska pot (Knafelčeva markacija)">PZS</span>':''}${R?` ${esc(relName(R))}${R.ref&&R.name?` <span class="via">(${esc(R.ref)})</span>`:''}`:' markirana pot'}</div>`:''}
        <div class="rs">${(s.len/1000).toFixed(1)} km${P?` · ↑${Math.round(P.up)} m · ${fmtT(walkTime(P.km,P.up,P.down)*((window.PROFILE&&window.PROFILE.fitK)||1))}`:' · …'} · ${SACT[s.sac]||'T?'}${s.ferrata?' · ferata':''}${window.PROFILE&&((window.PROFILE.maxT&&s.sac>window.PROFILE.maxT)||(s.ferrata&&window.PROFILE.ferrata===false))?' · <span style="color:#c62f28;font-weight:700" title="Težje od meje v tvojem profilu (⚙ Nastavitve)">⚠ nad tvojo mejo</span>':''} · ${Math.round(s.marked*100)}% markirano${s.road>300?` · ${(s.road/1000).toFixed(1)} km ceste`:''}${r.gap>25?` · <span title="Do vrha ni vrisane poti - zadnji del (črtkano) je ravna črta">zadnjih ${r.gap} m brez poti</span>`:''}</div></div>`; }).join('')+
    (RT.routes[RT.sel].P?`<div class="prof">${profileSVG(RT.routes[RT.sel].P)}</div>`:'')+
    `<div class="rb"><button onclick="routeGPX()">GPX</button><button onclick="routeToDraw()">Uredi kot svojo</button><button onclick="sideView()" title="Pogled na izbrano pot od strani">⛰ Od strani</button><button onclick="routeClimbed()" title="Odkljukaj vrh in shrani to pot kot tvojo">✓ Šel sem po tej poti</button></div>
     <div class="rnote">Samodejno iz OSM: preveri pred turo. T-lestvica = SAC.</div>`;
  c.querySelectorAll('.ri').forEach(d=>d.onclick=()=>{ RT.sel=+d.dataset.i; setRoutesLayer(); if(!DESK()) RT.min=true; renderRoutes(); sideView(); routeProfiles(); });
}
window.routeClimbed=()=>{ if(!RT) return; const r=RT.routes[RT.sel]; window.climbedVia&&window.climbedVia(RT.peak.id, routeLabel(r)); };
window.closeRoutes=()=>{ RT=null; setRoutesLayer(); rcard().style.display='none'; };
window.routeGPX=()=>{ const r=RT.routes[RT.sel], P=r.P; const nm=`${RT.peak.name} iz ${r.start.name.replace(/^pri /,'')}`;
  download(slug(nm)+'.gpx', toGPX(nm, P?P.pts:r.coords, P?P.z:null, [{lat:RT.peak.lat,lon:RT.peak.lon,ele:RT.peak.elev,name:RT.peak.name},{lat:r.start.lat,lon:r.start.lon,name:r.start.name}])); };

// ---------- drawing (editable waypoints) ----------
// D.pts = waypoints; D.segs[i] = {c:coords from pts[i] to pts[i+1], f:followed-trail}
const D={pts:[],segs:[],follow:true,P:null,hist:[],sel:-1,edit:-1,min:false};
const MYKEY='dvat3d_myroutes_v1';
let MY=[]; try{ MY=JSON.parse(localStorage.getItem(MYKEY)||'[]'); }catch(e){}
const newId=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
const saveMy0=()=>{ try{ localStorage.setItem(MYKEY,JSON.stringify(MY)); }catch(e){} };
const saveMy=()=>{ MY.forEach(r=>{ if(!r.id) r.id=newId(); }); saveMy0(); window.onMyRoutes&&window.onMyRoutes(); };
// for the account sync (account.js): read / replace my routes
window.MYR={get:()=>MY, newId, set:list=>{ MY=list; saveMy0(); myRender(); if(window.DRAW_ON) drawRender(); },
  add:(name,coords)=>{ MY.push({id:newId(),name,coords,date:Date.now()}); saveMy(); myRender(); }};
const drawCoords=()=>!D.segs.length?D.pts.slice():D.segs.reduce((a,s,i)=>a.concat(i?s.c.slice(1):s.c),[]);
const pushHist=()=>{ D.hist.push(JSON.stringify({p:D.pts,s:D.segs})); if(D.hist.length>100) D.hist.shift(); };
function makeSeg(a,b){ const c=(D.follow&&G&&inG(a[1],a[0])&&inG(b[1],b[0]))?routeBetween(G,a,b,150):null; return {c:c||[a,b], f:!!c}; }
map.on('moveend',()=>{ if(!window.DRAW_ON) return; const c=map.getCenter(); if(!inG(c.lat,c.lng,0.1)) ensureGraph(c.lat,c.lng); });
function setDrawData(){
  const n=D.pts.length, f=D.segs.map((s,i)=>({type:'Feature',properties:{si:i,f:s.f},geometry:{type:'LineString',coordinates:s.c}}));
  D.pts.forEach((p,i)=>f.push({type:'Feature',properties:{i,r:i===0?'s':i===n-1?'e':'m',sel:i===D.sel},geometry:{type:'Point',coordinates:p}}));
  map.getSource('draw').setData({type:'FeatureCollection',features:f});
}
const DESK=()=>innerWidth>700;
let PROFMIN=false; try{ PROFMIN=localStorage.getItem('dvat3d_profmin')==='1'; }catch(_){}
window.profToggle=()=>{ PROFMIN=!PROFMIN; try{ localStorage.setItem('dvat3d_profmin',PROFMIN?'1':'0'); }catch(_){} drawRender(); };
// movable windows (PC): drag by the title bar, position remembered per window
function makeMovable(id,handle='.rh'){ const card=el(id); if(!card) return; const key='dvat3d_pos_'+id;
  const clampPos=(x,y)=>[Math.max(0,Math.min(innerWidth-80,x)),Math.max(0,Math.min(innerHeight-40,y))];
  const apply=()=>{ if(!DESK()){ card.style.left=''; card.style.top=''; card.style.bottom=''; card.style.right=''; return; } try{ const s=JSON.parse(localStorage.getItem(key)||'null'); if(s){ const [x,y]=clampPos(s[0],s[1]); card.style.left=x+'px'; card.style.top=y+'px'; card.style.bottom='auto'; card.style.right='auto'; } }catch(_){} };
  apply(); addEventListener('resize',apply);
  card.addEventListener('pointerdown',e=>{ if(!DESK()) return; const h=e.target.closest(handle); if(!h||e.target.closest('button,input,label')) return;
    e.preventDefault(); const r=card.getBoundingClientRect(), ox=e.clientX-r.left, oy=e.clientY-r.top; card.classList.add('dragging');
    const mv=ev=>{ const [x,y]=clampPos(ev.clientX-ox, ev.clientY-oy); card.style.left=x+'px'; card.style.top=y+'px'; card.style.bottom='auto'; card.style.right='auto'; };
    const up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); card.classList.remove('dragging');
      try{ localStorage.setItem(key,JSON.stringify([parseInt(card.style.left),parseInt(card.style.top)])); }catch(_){} };
    addEventListener('pointermove',mv); addEventListener('pointerup',up); });
  card.addEventListener('dblclick',e=>{ if(!DESK()||!e.target.closest(handle)||e.target.closest('button')) return; try{ localStorage.removeItem(key); }catch(_){} card.style.left=''; card.style.top=''; card.style.bottom=''; card.style.right=''; });
}
makeMovable('dcard'); makeMovable('rcard'); makeMovable('dprof','.ps'); makeMovable('snowleg','.lh');
function drawRender(){
  setDrawData();
  const card=el('dcard'), strip=el('dprof');
  if(!window.DRAW_ON){ card.style.display='none'; strip.style.display='none'; return; } card.style.display='block';
  const c=drawCoords(); let km=0; for(let i=1;i<c.length;i++) km+=hav(c[i-1][1],c[i-1][0],c[i][1],c[i][0])/1000; const P=D.P;
  const stats=D.pts.length?`<span><b>${km.toFixed(2)}</b> km</span>${P?`<span>↑ <b>${Math.round(P.up)}</b> m</span><span>↓ <b>${Math.round(P.down)}</b> m</span><span>⏱ <b>${fmtT(walkTime(P.km,P.up,P.down)*((window.PROFILE&&window.PROFILE.fitK)||1))}</b></span>`:''}`:'<span>Klik na karto = nova točka</span>';
  // desktop: elevation profile as a strip along the bottom (gpx.studio style)
  strip.style.display='none'; // profile now lives inside the drawing window
  const profBlock=`<div class="ps">${stats}</div>`+(c.length>1?`<div class="phd"><button class="lnk pt" onclick="profToggle()">${PROFMIN?'▸ Pokaži profil':'▾ Višinski profil'}</button></div>`+
      (PROFMIN?'':(P?`<div class="prof">${profileSVG(P,DESK()?316:300,70)}</div>`:'<div class="pw">Računam profil …</div>')):'');
  card.classList.toggle('mini',D.min);
  const tool=(fn,ic,lab,dis,extra='')=>`<button class="tb" onclick="${fn}" ${dis?'disabled':''} title="${lab}" ${extra}><span>${ic}</span><em>${lab}</em></button>`;
  const tools=tool('drawUndo()','↶','Razveljavi',!D.hist.length)+
    tool('drawDelSel()','🗑',D.sel>=0?'Izbriši izbrano':'Izbriši zadnjo',!D.pts.length)+
    tool('drawReverse()','⇄','Obrni',D.pts.length<2)+
    tool('drawClear()','✕','Počisti',!D.pts.length)+
    tool('drawGPX()','⬇','GPX',c.length<2)+
    tool('drawSave()','💾',D.edit>=0?'Shrani':'Shrani',c.length<2);
  if(D.min){
    card.innerHTML=`<div class="rh"><button class="lnk" onclick="drawMin(false)" aria-label="Razširi">▴</button><b>✎ ${km.toFixed(2)} km${P?` · ↑${Math.round(P.up)} m`:''}</b>
      <button class="lnk" onclick="drawUndo()" ${D.hist.length?'':'disabled'}>↶</button><button class="lnk" onclick="drawDelSel()" ${D.pts.length?'':'disabled'}>🗑</button><button class="x" onclick="stopDraw()">×</button></div>`;
    return; }
  card.innerHTML=`<div class="rh"><button class="lnk" onclick="drawMin(true)" aria-label="Skrij">▾</button><b>${D.edit>=0?'✎ '+MY[D.edit].name:'✎ Risanje poti'}</b><button class="x" onclick="stopDraw()">×</button></div>
    <div class="tbar">${tools}</div>
    <label class="sw"><input type="checkbox" id="dfollow" ${D.follow?'checked':''}><i></i> Sledi potem in cestam</label>
    <div class="cols">Barva: ${DCOLS.map(([c,n])=>`<button class="cs${c===DCOL?' on':''}" style="background:${c}" title="${n}" aria-label="${n}" onclick="setDrawColor('${c}')"></button>`).join('')}</div>
    ${profBlock}
    ${D.edit>=0?'<div class="rb"><button onclick="drawSaveNew()">Shrani kot novo</button></div>':''}
    <details class="hlp"><summary>Pomoč</summary>Vleci točko = premakni · klik na črto = vrini točko · klik na točko = izberi; Delete / desni klik / dvoklik = izbriši · Ctrl+Z razveljavi. Polna črta = po poti, črtkana = ravna črta.</details>
    ${MY.length?`<div class="rg2">Moje poti</div>`+MY.map((r,i)=>`<div class="my"><span>${r.name}</span><button title="Pokaži" onclick="myShow(${i})">↗</button><button title="Uredi" onclick="myEdit(${i})">✎</button><button onclick="myGPX(${i})">GPX</button><button title="Deli (povezava / javno)" onclick="myShare&&myShare(${i})">${r.vis==='public'?'🌐':r.vis==='link'?'🔗':'⤴'}</button><button title="Izbriši" onclick="myDel(${i})">✕</button></div>`).join(''):''}`;
  el('dfollow').onchange=e=>{ D.follow=e.target.checked; };
}
addEventListener('resize',()=>{ if(window.DRAW_ON) drawRender(); });
let profTimer=null;
function drawChanged(){ D.P=null; drawRender(); clearTimeout(profTimer); const c=drawCoords(); if(c.length<2) return;
  profTimer=setTimeout(async()=>{ D.P=await profile(c); drawRender(); },300); }
window.startDraw=()=>{ ensureGraph(); window.DRAW_ON=true; document.body.classList.add('drawing'); document.body.classList.remove('menu'); if(popup) popup.remove(); map.getCanvas().style.cursor='crosshair'; map.doubleClickZoom.disable(); el('drawBtn').textContent='Končaj risanje'; drawRender(); };
window.stopDraw=()=>{ window.DRAW_ON=false; document.body.classList.remove('drawing'); D.sel=-1; map.getCanvas().style.cursor=''; map.doubleClickZoom.enable(); el('drawBtn').textContent='Riši pot'; drawRender(); };
window.drawMin=v=>{ D.min=v; drawRender(); };
window.drawUndo=()=>{ const h=D.hist.pop(); if(!h) return; const s=JSON.parse(h); D.pts=s.p; D.segs=s.s; D.sel=-1; drawChanged(); };
window.drawClear=()=>{ if(!D.pts.length) return; pushHist(); D.pts=[]; D.segs=[]; D.sel=-1; D.edit=-1; drawChanged(); };
window.drawReverse=()=>{ pushHist(); D.pts.reverse(); D.segs=D.segs.reverse().map(s=>({c:s.c.slice().reverse(),f:s.f})); D.sel=-1; drawChanged(); };
function delPoint(i){
  if(i<0||i>=D.pts.length) return; pushHist(); const n=D.pts.length;
  if(n===1){ D.pts=[]; D.segs=[]; }
  else if(i===0){ D.pts.shift(); D.segs.shift(); }
  else if(i===n-1){ D.pts.pop(); D.segs.pop(); }
  else { const s=makeSeg(D.pts[i-1],D.pts[i+1]); D.pts.splice(i,1); D.segs.splice(i-1,2,s); }
  D.sel=-1; drawChanged();
}
window.drawDelSel=()=>delPoint(D.sel>=0?D.sel:D.pts.length-1);
function addPoint(p){ pushHist(); const prev=D.pts[D.pts.length-1]; D.pts.push(p); if(prev) D.segs.push(makeSeg(prev,p)); D.sel=-1; drawChanged(); }
function insertPoint(si,p){ pushHist(); const a=D.pts[si], b=D.pts[si+1]; D.pts.splice(si+1,0,p); D.segs.splice(si,1,makeSeg(a,p),makeSeg(p,b)); D.sel=si+1; drawChanged(); }
function movePoint(i,p,final){
  D.pts[i]=p;
  if(i>0) D.segs[i-1]=final?makeSeg(D.pts[i-1],p):{c:[D.pts[i-1],p],f:false};
  if(i<D.pts.length-1) D.segs[i]=final?makeSeg(p,D.pts[i+1]):{c:[p,D.pts[i+1]],f:false};
  final?drawChanged():setDrawData();
}
function loadIntoEditor(coords, idx){
  // keep geometry, add a draggable waypoint every ~1 km so the route can be reshaped locally
  const pts=[coords[0]], cuts=[0]; let acc=0;
  for(let i=1;i<coords.length;i++){ acc+=hav(coords[i-1][1],coords[i-1][0],coords[i][1],coords[i][0]);
    if(acc>=1000&&i<coords.length-1){ pts.push(coords[i]); cuts.push(i); acc=0; } }
  pts.push(coords[coords.length-1]); cuts.push(coords.length-1);
  D.pts=pts; D.segs=cuts.slice(1).map((c,k)=>({c:coords.slice(cuts[k],c+1),f:true})); D.hist=[]; D.sel=-1; D.edit=idx;
}
window.drawGPX=()=>{ const c=drawCoords(), P=D.P, nm=D.edit>=0?MY[D.edit].name:'Moja pot'; download(slug(nm)+'.gpx', toGPX(nm, P?P.pts:c, P?P.z:null)); };
const packCoords=()=>drawCoords().map(([a,b])=>[+a.toFixed(6),+b.toFixed(6)]);
window.drawSave=()=>{ if(D.edit>=0){ MY[D.edit].coords=packCoords(); MY[D.edit].date=Date.now(); saveMy(); myRender(); drawRender(); return; } drawSaveNew(); };
window.drawSaveNew=async()=>{ const n=await askText('Ime poti', 'Moja pot '+(MY.length+1)); if(!n) return; MY.push({name:n,coords:packCoords(),date:Date.now()}); D.edit=MY.length-1; saveMy(); myRender(); drawRender(); };
window.myShow=i=>{ const b=new maplibregl.LngLatBounds(); MY[i].coords.forEach(x=>b.extend(x)); map.fitBounds(b,{padding:80,maxZoom:15}); };
window.myEdit=i=>{ loadIntoEditor(MY[i].coords,i); if(!window.DRAW_ON) startDraw(); myShow(i); drawChanged(); };
window.coordsGPX=async(name,coords)=>{ const P=await profile(coords); download(slug(name)+'.gpx', toGPX(name,P.pts,P.z)); };
window.myGPX=async i=>{ const r=MY[i], P=await profile(r.coords); download(slug(r.name)+'.gpx', toGPX(r.name,P.pts,P.z)); };
window.myDel=async i=>{ if(!(await askText(`Izbrišem "${MY[i].name}"?`, null))) return; MY.splice(i,1); if(D.edit===i) D.edit=-1; else if(D.edit>i) D.edit--; saveMy(); myRender(); drawRender(); };
window.routeToDraw=()=>{ const r=RT.routes[RT.sel]; loadIntoEditor(r.coords,-1); closeRoutes(); startDraw(); drawChanged(); };
function myRender(){ if(map.getSource('myroutes')) map.getSource('myroutes').setData({type:'FeatureCollection',features:MY.map(r=>({type:'Feature',properties:{name:r.name},geometry:{type:'LineString',coordinates:r.coords}}))}); }

// pointer interaction: drag points, click line to insert, click map to append
let drag=null, suppressClick=0;
const HIT=matchMedia('(pointer:coarse)').matches?20:9;
const hitAt=pt=>{ if(!map.getLayer('dr-pts')) return {}; const a=map.queryRenderedFeatures([[pt.x-HIT,pt.y-HIT],[pt.x+HIT,pt.y+HIT]],{layers:['dr-pts']});
  if(a.length) return {pt:a[0].properties.i}; const b=map.queryRenderedFeatures([[pt.x-HIT+2,pt.y-HIT+2],[pt.x+HIT-2,pt.y+HIT-2]],{layers:['dr-hit']}); return b.length?{seg:b[0].properties.si}:{}; };
function dragStart(e){
  if(!window.DRAW_ON) return; const h=hitAt(e.point); if(h.pt==null) return;
  e.preventDefault(); drag={i:h.pt, moved:false, x:e.point.x, y:e.point.y}; map.dragPan.disable();
}
function dragMove(e){
  if(drag){ if(!drag.moved&&Math.hypot(e.point.x-drag.x,e.point.y-drag.y)<4) return;
    if(!drag.moved){ pushHist(); drag.moved=true; } movePoint(drag.i,[e.lngLat.lng,e.lngLat.lat],false); return; }
  if(!window.DRAW_ON) return; const h=hitAt(e.point); map.getCanvas().style.cursor=h.pt!=null?'move':h.seg!=null?'copy':'crosshair';
}
function dragEnd(e){
  if(!drag) return; const d=drag; drag=null; map.dragPan.enable(); suppressClick=Date.now();
  if(d.moved) movePoint(d.i,[e.lngLat.lng,e.lngLat.lat],true);
  else { D.sel=D.sel===d.i?-1:d.i; drawRender(); }
}
map.on('mousedown',dragStart); map.on('touchstart',e=>{ if(e.points&&e.points.length===1) dragStart(e); });
map.on('mousemove',dragMove); map.on('touchmove',e=>{ if(drag) dragMove(e); });
map.on('mouseup',dragEnd); map.on('touchend',e=>{ if(drag){ e.lngLat=e.lngLat||map.unproject(e.point); dragEnd(e); } });
map.on('contextmenu',e=>{ if(!window.DRAW_ON) return; const h=hitAt(e.point); if(h.pt!=null){ e.preventDefault(); delPoint(h.pt); } });
map.on('dblclick',e=>{ if(!window.DRAW_ON) return; const h=hitAt(e.point); if(h.pt!=null){ e.preventDefault(); delPoint(h.pt); } });
function drawClick(e){
  if(!window.DRAW_ON||Date.now()-suppressClick<250) return; const h=hitAt(e.point);
  if(h.pt!=null) return; // handled by drag/select
  const p=[e.lngLat.lng,e.lngLat.lat];
  if(h.seg!=null) insertPoint(h.seg,p); else addPoint(p);
}

// ---------- 2D / 3D ----------
class DimControl{ onAdd(m){ this.b=document.createElement('button'); this.b.className='dimbtn'; this.b.type='button'; this.b.title='Preklopi 2D/3D';
    this.c=document.createElement('div'); this.c.className='maplibregl-ctrl maplibregl-ctrl-group'; this.c.append(this.b); this.d=3; this.b.textContent='2D'; // style already has terrain; no map calls before the style is ready
    this.b.onclick=()=>this.set(this.d===3?2:3); return this.c; }
  set(d,init){ if(!map.isStyleLoaded()){ map.once('load',()=>this.set(d,init)); return; } this.d=d; this.b.textContent=d===3?'2D':'3D';
    if(d===2){ map.setTerrain(null); map.setSky && map.setSky({'sky-color':'#9cc3e6'}); if(!init) map.easeTo({pitch:0,bearing:0,duration:700}); map.setMaxPitch(0); map.dragRotate.disable(); map.touchZoomRotate.disableRotation(); }
    else { map.setMaxPitch(window.LITE_ON?70:85); map.dragRotate.enable(); map.touchZoomRotate.enableRotation(); map.setTerrain({source:'dem_terrain',exaggeration:+el('exag').value}); if(!init) map.easeTo({pitch:60,duration:700}); }
    el('exag').disabled=d===2; }
  onRemove(){ this.c.remove(); } }
window.__dim=new DimControl(); map.addControl(window.__dim,'top-right');
map.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true}),'top-right');

// ---------- wiring ----------
map.on('load',()=>{
  try{ addLayers(); }catch(e){ console.error(e); toastErr('sloji poti: '+e.message); }
  try{ myRender(); }catch(e){ console.error(e); }
  loadData().catch(e=>{ console.error(e); toastErr('poti: '+e.message); loading=false; });
});
map.on('click',drawClick);
el('trv').onchange=e=>['tr-road-c','tr-road','tr-track','tr-path','tr-mark-c','tr-mark','tr-ferr'].forEach(id=>vis(id,e.target.checked));
el('huts').onchange=e=>['poi-hut','poi-spring'].forEach(id=>vis(id,e.target.checked));
el('parks').onchange=e=>vis('poi-park',e.target.checked);
el('ferrs').onchange=e=>vis('ferr-sign',e.target.checked);
el('drawBtn').onclick=()=>window.DRAW_ON?stopDraw():startDraw();
el('reload').onclick=()=>loadData(true);
el('exportPack').onclick=async()=>{ const r=window.__osmRaw; if(!r){ toastErr('Podatki se še nalagajo.'); return; }
  status('Pakiram …'); const pk=encodePack(r.poi,r.tr); pk.rb=[...ROAD_DONE]; if(EXT_DONE) pk.ext=1; const buf=await gzipJSON(pk);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/gzip'})); a.download='dvat-osm.json.gz'; a.click();
  status(`Paket: ${(buf.byteLength/1e6).toFixed(1)} MB — pošlji ga za vgradnjo v stran.`); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&window.DRAW_ON){ if(D.sel>=0){ D.sel=-1; drawRender(); } else stopDraw(); } if((e.key==='Delete'||e.key==='Backspace')&&window.DRAW_ON&&D.sel>=0&&!/input|textarea/i.test(document.activeElement.tagName)){ e.preventDefault(); delPoint(D.sel); } if((e.ctrlKey||e.metaKey)&&e.key==='z'&&window.DRAW_ON){ e.preventDefault(); drawUndo(); } });
})();
