// ---------- compact OSM pack (shared by packer tool + site) ----------
const PK_SAC = ['', 'hiking','mountain_hiking','demanding_mountain_hiking','alpine_hiking','demanding_alpine_hiking','difficult_alpine_hiking'];
// poi/trails = raw Overpass JSON (same queries as the site)
// v2: + hiking relations (name/ref/operator/network/from/to/osmc) and per-way relation membership (w.rel)
const PK_RELT = ['name','ref','operator','network','from','to','osmc:symbol'];
function encodePack(poi, trails){
  const marked = new Set(), R=[], wrel=new Map();
  for (const e of poi.elements) if (e.type==='relation'){ const t=e.tags||{}, real=!t._pseudo && (t.name||t.ref);
    const ri=real?R.push(PK_RELT.map(k=>t[k]||''))-1:-1;
    for (const m of e.members||[]) if (m.type==='way'){ marked.add(m.ref); if(ri>=0){ let a=wrel.get(m.ref); if(!a) wrel.set(m.ref,a=[]); if(!a.includes(ri)) a.push(ri); } } }
  const names=[], nIdx=new Map(), K=[], S=[], V=[], N=[], L=[], XY=[], RL=[], FS={}; let px=0, py=0;
  for (const w of trails.elements){ if (w.type!=='way') continue; const g=(w.geometry||[]).filter(Boolean); if (g.length<2) continue;
    const t=w.tags||{}; const k = /^(primary|secondary|tertiary|unclassified|residential|living_street|service|road)/.test(t.highway||'')?(/^(primary|secondary)/.test(t.highway)?'R':/^tertiary/.test(t.highway)?'T':/^(service|residential|living_street)$/.test(t.highway)?'s':'r'):t.highway==='via_ferrata'?'f':t.highway==='track'?'t':marked.has(w.id)?'m':t.highway==='footway'?'w':'p';
    K.push(k); S.push(Math.max(0,PK_SAC.indexOf(t.sac_scale))); V.push(/^(bad|horrible|no)$/.test(t.trail_visibility||'')?1:0);
    let ni=-1; if (t.name){ ni=nIdx.get(t.name); if(ni===undefined){ ni=names.length; nIdx.set(t.name,ni); names.push(t.name); } } N.push(ni);
    if (t.via_ferrata_scale!=null && t.via_ferrata_scale!=='') FS[K.length-1]=String(t.via_ferrata_scale);
    L.push(g.length); const a=wrel.get(w.id); RL.push(!a?-1:a.length===1?a[0]:a);
    for (const p of g){ const x=Math.round(p.lon*1e6), y=Math.round(p.lat*1e6); XY.push(x-px, y-py); px=x; py=y; } }
  const P=[];
  for (const e of poi.elements){ if (e.type==='relation') continue; const t=e.tags||{}, la=e.lat??e.center?.lat, lo=e.lon??e.center?.lon; if (la==null) continue;
    let k=null;
    if (t.place) k='place'; else if (t.tourism==='alpine_hut') k='hut'; else if (t.tourism==='wilderness_hut'||t.amenity==='shelter') k='biv';
    else if (t.amenity==='parking'){ if (t.access==='private') continue; k='park'; } else if (t.highway==='trailhead') k='th'; else if (t.natural==='spring') k='spring';
    if (!k) continue;
    P.push([k, t.name||'', Math.round(la*1e6), Math.round(lo*1e6), t.ele||'', t.website||t['contact:website']||'']); }
  return {v:2, date:new Date().toISOString(), w:{k:K.join(''), s:S, vis:V, n:N, names, len:L, xy:XY, rel:RL, fs:FS}, p:P, r:R};
}
// back to Overpass-like structures the site already understands
function decodePack(pk){
  const W=pk.w, ways=[], marked=[], R=pk.r||[], rm=R.map(()=>[]); let o=0, x=0, y=0;
  for (let i=0;i<W.len.length;i++){ const k=W.k[i], g=new Array(W.len[i]);
    for (let j=0;j<g.length;j++){ x+=W.xy[o++]; y+=W.xy[o++]; g[j]={lat:y/1e6, lon:x/1e6}; }
    const tags={highway:k==='t'?'track':k==='f'?'via_ferrata':k==='w'?'footway':k==='R'?'secondary':k==='T'?'tertiary':k==='r'?'unclassified':k==='s'?'service':'path'};
    if (W.fs && W.fs[i]!=null) tags.via_ferrata_scale=W.fs[i];
    if (W.s[i]) tags.sac_scale=PK_SAC[W.s[i]]; if (W.vis[i]) tags.trail_visibility='bad'; if (W.n[i]>=0) tags.name=W.names[W.n[i]];
    const rl=W.rel?W.rel[i]:-1, rs=rl==null||rl===-1?null:Array.isArray(rl)?rl:[rl];
    ways.push({type:'way', id:i+1, tags, geometry:g, rel:rs}); if (rs) for(const r of rs) rm[r].push({type:'way',ref:i+1}); else if (k==='m') marked.push({type:'way',ref:i+1}); }
  const els = pk.p.map(([k,name,la,lo,ele,web])=>{ const tags={};
    if (name) tags.name=name; if (ele) tags.ele=ele; if (web) tags.website=web;
    if (k==='place') tags.place='locality'; else if (k==='hut') tags.tourism='alpine_hut'; else if (k==='biv') tags.tourism='wilderness_hut';
    else if (k==='park') tags.amenity='parking'; else if (k==='th') tags.highway='trailhead'; else if (k==='spring') tags.natural='spring';
    return {type:'node', lat:la/1e6, lon:lo/1e6, tags}; });
  R.forEach((r,i)=>{ const tags={route:'hiking'}; PK_RELT.forEach((k,j)=>{ if(r[j]) tags[k]=r[j]; }); els.push({type:'relation', id:i, tags, members:rm[i]}); });
  els.push({type:'relation', tags:{route:'hiking',_pseudo:1}, members:marked}); // marked ways without named relation
  return {poi:{elements:els}, trails:{elements:ways}, date:pk.date, rb:pk.rb||[], ext:!!pk.ext, rels:R.map(r=>Object.fromEntries(PK_RELT.map((k,j)=>[k,r[j]])))};
}
async function gzipJSON(obj){ const s=new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip')); return await new Response(s).arrayBuffer(); }
async function gunzipJSON(buf){ const s=new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return JSON.parse(await new Response(s).text()); }
if (typeof module !== 'undefined') module.exports = {encodePack, decodePack, gzipJSON, gunzipJSON};
