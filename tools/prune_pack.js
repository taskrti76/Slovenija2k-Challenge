// Drop trails/roads/POIs far from every peak (whole ways only - nothing is cut at the edge).
// node --max-old-space-size=6000 tools/prune_pack.js in.json.gz out.json.gz [trail_km=12] [road_km=15]
const K=require('../src/pack.js'), fs=require('fs'), path=require('path');
const [,, inF, outF, TK='12', RK='15'] = process.argv;
const R=path.join(__dirname,'..'), P=[...JSON.parse(fs.readFileSync(path.join(R,'src/peaks_final.json'))), ...JSON.parse(fs.readFileSync(path.join(R,'src/peaks_extra.json')))].filter(p=>p.lat!=null);
const C=0.1, grid=new Map(); for(const p of P){ const k=Math.floor(p.lat/C)+':'+Math.floor(p.lon/C); if(!grid.has(k)) grid.set(k,[]); grid.get(k).push(p); }
function dist(la,lo,maxKm){ const cy=Math.floor(la/C), cx=Math.floor(lo/C), r=Math.ceil(maxKm/8)+1; let best=1e9;
  for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){ const a=grid.get(y+':'+x); if(!a) continue; for(const p of a){ const d=Math.hypot((p.lat-la)*111.3,(p.lon-lo)*77); if(d<best) best=d; } } return best; }
(async()=>{
  const pk=await K.gunzipJSON(fs.readFileSync(inF)), d=K.decodePack(pk);
  const ROAD=/^(primary|secondary|tertiary|unclassified|service|residential|living_street|road)$/;
  let drop={trail:0,road:0}; const keep=d.trails.elements.filter(w=>{ const road=ROAD.test(w.tags.highway), lim=road?+RK:+TK;
    for(let i=0;i<w.geometry.length;i+=Math.max(1,Math.floor(w.geometry.length/20))){ const q=w.geometry[i]; if(dist(q.lat,q.lon,lim)<=lim) return true; }
    const q=w.geometry[w.geometry.length-1]; if(dist(q.lat,q.lon,lim)<=lim) return true;
    drop[road?'road':'trail']++; return false; });
  let dp=0; const poi=d.poi.elements.filter(e=>{ if(e.type==='relation') return true; if(dist(e.lat,e.lon,+RK)<=+RK) return true; dp++; return false; });
  const np=K.encodePack({elements:poi},{elements:keep}); np.rb=pk.rb; np.ext=pk.ext; np.date=pk.date;
  const buf=Buffer.from(await K.gzipJSON(np)); fs.writeFileSync(outF,buf);
  console.log(`ways ${d.trails.elements.length} -> ${keep.length} (-${drop.trail} trails >${TK} km, -${drop.road} roads >${RK} km), POIs -${dp}, relations ${np.r.length}, ${(buf.length/1e6).toFixed(2)} MB`);
})();
