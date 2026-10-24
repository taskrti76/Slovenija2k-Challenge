// ---------- compact OSM pack (shared by packer tool + site) ----------
const PK_SAC = ['', 'hiking','mountain_hiking','demanding_mountain_hiking','alpine_hiking','demanding_alpine_hiking','difficult_alpine_hiking'];
// poi/trails = raw Overpass JSON (same queries as the site)
function encodePack(poi, trails){
  const marked = new Set();
  for (const e of poi.elements) if (e.type==='relation') for (const m of e.members||[]) if (m.type==='way') marked.add(m.ref);
  const names=[], nIdx=new Map(), K=[], S=[], V=[], N=[], L=[], XY=[]; let px=0, py=0;
  for (const w of trails.elements){ if (w.type!=='way') continue; const g=(w.geometry||[]).filter(Boolean); if (g.length<2) continue;
    const t=w.tags||{}; const k = /^(primary|secondary|tertiary|unclassified|residential|living_street|service|road)/.test(t.highway||'')?(/^(primary|secondary)/.test(t.highway)?'R':/^tertiary/.test(t.highway)?'T':/^(service|residential|living_street)$/.test(t.highway)?'s':'r'):t.highway==='via_ferrata'?'f':t.highway==='track'?'t':marked.has(w.id)?'m':t.highway==='footway'?'w':'p';
    K.push(k); S.push(Math.max(0,PK_SAC.indexOf(t.sac_scale))); V.push(/^(bad|horrible|no)$/.test(t.trail_visibility||'')?1:0);
    let ni=-1; if (t.name){ ni=nIdx.get(t.name); if(ni===undefined){ ni=names.length; nIdx.set(t.name,ni); names.push(t.name); } } N.push(ni);
    L.push(g.length);
    for (const p of g){ const x=Math.round(p.lon*1e6), y=Math.round(p.lat*1e6); XY.push(x-px, y-py); px=x; py=y; } }
  const P=[];
  for (const e of poi.elements){ if (e.type==='relation') continue; const t=e.tags||{}, la=e.lat??e.center?.lat, lo=e.lon??e.center?.lon; if (la==null) continue;
    let k=null;
    if (t.place) k='place'; else if (t.tourism==='alpine_hut') k='hut'; else if (t.tourism==='wilderness_hut'||t.amenity==='shelter') k='biv';
    else if (t.amenity==='parking'){ if (t.access==='private') continue; k='park'; } else if (t.highway==='trailhead') k='th'; else if (t.natural==='spring') k='spring';
    if (!k) continue;
    P.push([k, t.name||'', Math.round(la*1e6), Math.round(lo*1e6), t.ele||'', t.website||t['contact:website']||'']); }
  return {v:1, date:new Date().toISOString(), w:{k:K.join(''), s:S, vis:V, n:N, names, len:L, xy:XY}, p:P};
}
// back to Overpass-like structures the site already understands
function decodePack(pk){
  const W=pk.w, ways=[], marked=[]; let o=0, x=0, y=0;
  for (let i=0;i<W.len.length;i++){ const k=W.k[i], g=new Array(W.len[i]);
    for (let j=0;j<g.length;j++){ x+=W.xy[o++]; y+=W.xy[o++]; g[j]={lat:y/1e6, lon:x/1e6}; }
    const tags={highway:k==='t'?'track':k==='f'?'via_ferrata':k==='w'?'footway':k==='R'?'secondary':k==='T'?'tertiary':k==='r'?'unclassified':k==='s'?'service':'path'};
    if (W.s[i]) tags.sac_scale=PK_SAC[W.s[i]]; if (W.vis[i]) tags.trail_visibility='bad'; if (W.n[i]>=0) tags.name=W.names[W.n[i]];
    ways.push({type:'way', id:i+1, tags, geometry:g}); if (k==='m') marked.push({type:'way',ref:i+1}); }
  const els = pk.p.map(([k,name,la,lo,ele,web])=>{ const tags={};
    if (name) tags.name=name; if (ele) tags.ele=ele; if (web) tags.website=web;
    if (k==='place') tags.place='locality'; else if (k==='hut') tags.tourism='alpine_hut'; else if (k==='biv') tags.tourism='wilderness_hut';
    else if (k==='park') tags.amenity='parking'; else if (k==='th') tags.highway='trailhead'; else if (k==='spring') tags.natural='spring';
    return {type:'node', lat:la/1e6, lon:lo/1e6, tags}; });
  els.push({type:'relation', tags:{route:'hiking'}, members:marked}); // marked flags travel as one pseudo relation
  return {poi:{elements:els}, trails:{elements:ways}, date:pk.date, rb:pk.rb||[], ext:!!pk.ext};
}
async function gzipJSON(obj){ const s=new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip')); return await new Response(s).arrayBuffer(); }
async function gunzipJSON(buf){ const s=new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return JSON.parse(await new Response(s).text()); }
if (typeof module !== 'undefined') module.exports = {encodePack, decodePack, gzipJSON, gunzipJSON};
