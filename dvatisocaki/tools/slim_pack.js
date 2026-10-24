// slim a dvat-osm pack: drop urban footways / service roads not touching trails, far parkings; Douglas-Peucker keeping junctions
const K=require('../src/pack.js'), fs=require('fs');
const [,, inF, outF, TOL='3'] = process.argv; const tol=+TOL;
(async()=>{
  const pk=await K.gunzipJSON(fs.readFileSync(inF)), d=K.decodePack(pk);
  const marked=new Set(d.poi.elements.find(e=>e.type==='relation').members.map(x=>x.ref));
  const ways=d.trails.elements, key=p=>Math.round(p.lat*1e6)+','+Math.round(p.lon*1e6);
  const isTrail=w=>/^(path|track|via_ferrata|bridleway)$/.test(w.tags.highway)||marked.has(w.id);
  // coordinates used by trails / by any way (junction detection)
  const trailPts=new Set(), useCnt=new Map();
  for(const w of ways){ const tr=isTrail(w); w.geometry.forEach((p,i)=>{ const k=key(p); if(tr) trailPts.add(k); useCnt.set(k,(useCnt.get(k)||0)+(i===0||i===w.geometry.length-1?2:1)); }); }
  // grid of trail points for proximity tests
  const G=new Map(), C=0.005; for(const k of trailPts){ const [a,b]=k.split(',').map(Number); const gk=Math.floor(a/1e6/C)+':'+Math.floor(b/1e6/C); if(!G.has(gk)) G.set(gk,[]); G.get(gk).push([a/1e6,b/1e6]); }
  const nearTrail=(la,lo,m)=>{ const cy=Math.floor(la/C), cx=Math.floor(lo/C); for(let y=cy-1;y<=cy+1;y++) for(let x=cx-1;x<=cx+1;x++){ const a=G.get(y+':'+x); if(!a) continue; for(const [p,q] of a){ if(Math.hypot((p-la)*111320,(q-lo)*76700)<m) return true; } } return false; };
  let dropW=0, dropS=0;
  const keep=ways.filter(w=>{ const h=w.tags.highway;
    if(h==='footway'&&!marked.has(w.id)){ if(!w.geometry.some(p=>trailPts.has(key(p)))){ dropW++; return false; } }
    if(h==='service'){ if(!w.geometry.some(p=>trailPts.has(key(p))) && !nearTrail(w.geometry[0].lat,w.geometry[0].lon,150) && !nearTrail(w.geometry[w.geometry.length-1].lat,w.geometry[w.geometry.length-1].lon,150)){ dropS++; return false; } }
    return true; });
  // Douglas-Peucker, never removing points shared with other ways (junctions)
  const KX=76700, KY=111320; let before=0, after=0;
  function dp(g){ const n=g.length; if(n<3) return g; const keepIdx=new Uint8Array(n); keepIdx[0]=keepIdx[n-1]=1;
    for(let i=1;i<n-1;i++) if((useCnt.get(key(g[i]))||0)>1) keepIdx[i]=1;
    const st=[]; let s=0; for(let i=1;i<n;i++) if(keepIdx[i]){ st.push([s,i]); s=i; }
    while(st.length){ const [a,b]=st.pop(); if(b-a<2) continue; const ax=g[a].lon*KX, ay=g[a].lat*KY, bx=g[b].lon*KX, by=g[b].lat*KY, dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy)||1; let md=-1, mi=-1;
      for(let i=a+1;i<b;i++){ const d=Math.abs((g[i].lon*KX-ax)*dy-(g[i].lat*KY-ay)*dx)/L; if(d>md){ md=d; mi=i; } }
      if(md>tol){ keepIdx[mi]=1; st.push([a,mi],[mi,b]); } }
    return g.filter((_,i)=>keepIdx[i]); }
  for(const w of keep){ before+=w.geometry.length; w.geometry=dp(w.geometry); after+=w.geometry.length; }
  // parkings / trailheads only near trails
  let dropP=0; const poi=d.poi.elements.filter(e=>{ if(e.type==='relation') return true; const t=e.tags||{};
    if(t.amenity==='parking'&&!nearTrail(e.lat,e.lon,500)){ dropP++; return false; } return true; });
  const np=K.encodePack({elements:poi},{elements:keep}); np.rb=pk.rb; np.ext=pk.ext; np.date=pk.date;
  const buf=Buffer.from(await K.gzipJSON(np)); fs.writeFileSync(outF,buf);
  console.log(`ways ${ways.length} -> ${keep.length} (dropped ${dropW} footways, ${dropS} service roads), points ${before} -> ${after}, parkings dropped ${dropP}, file ${(buf.length/1e6).toFixed(2)} MB`);
})();
