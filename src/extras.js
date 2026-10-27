// ===================== language (SL / EN), first-use guide, installable app + offline areas =====================
(function(){
const $x = id => document.getElementById(id);
const LS = (k, v) => { try{ if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(_){ return null; } };

// ---------- 1) language: Slovene is the source text; English is applied to the DOM as it renders ----------
let LANG = LS('dvat3d_lang') || ((navigator.language||'sl').toLowerCase().startsWith('sl') ? 'sl' : 'en');
window.LANG = LANG;
const RANGE_EN = {'Julijske Alpe':'Julian Alps','Kamniško-Savinjske Alpe':'Kamnik–Savinja Alps','Karavanke':'Karawanks','Predalpe':'Prealps','Pohorje':'Pohorje','Snežnik':'Snežnik'};
const EN = Object.assign({}, RANGE_EN, {
  'Dvatisočaki':'Slovenian 2000ers', 'Podlaga':'Base map', 'Sloji':'Layers', 'Relief (barvna višina)':'Relief (colour by height)', 'Satelit (Esri)':'Satellite (Esri)',
  'Snežna karta (sneg + izohipse)':'Snow map (snow + contours)', 'Senčenje reliefa':'Hillshade', 'Waymarked Trails (slika)':'Waymarked Trails (image)', 'Imena vrhov':'Peak names',
  'Državna meja':'National border', 'Višina snega (model, dnevno)':'Snow depth (model, daily)', 'Poti in koče (OSM)':'Trails & huts (OSM)', 'Poti (markirane + neoznačene)':'Trails (marked + unmarked)',
  'Koče, bivaki, izviri':'Huts, bivouacs, springs', 'Parkirišča / izhodišča':'Parking / trailheads', 'Ferate (oznake + težavnost)':'Via ferratas (signs + grade)', 'Riši pot':'Draw a route', 'Končaj risanje':'Finish drawing', 'Velikost besedila':'Text size',
  'Pretiravanje višin':'Height exaggeration', '1.0 = realno':'1.0 = real', 'Klik na teren':'Click on terrain', 'Klikni kamorkoli za višino DEM.':'Click anywhere for the terrain height.',
  'Napredno':'Advanced', 'Osveži podatke OSM':'Refresh OSM data', 'Naloži ceste':'Load roads', 'Razširi na 20 km (PC)':'Extend to 20 km (PC)', 'Izvozi paket podatkov':'Export data pack',
  'Varčni način (starejše naprave)':'Saving mode (older devices)', 'Izklopi senčenje, Waymarked sloj, ostrino 360° (samo Nizka), oddaljene ploščice in meglo; poti šele ob približanju.':'Turns off hillshade, the Waymarked layer, sharp 360° (Low only), distant tiles and fog; trails only when zoomed in.',
  'Manjša ločljivost, manj poti pri oddaljenem pogledu, brez senčenja. Stran se ponovno naloži.':'Lower resolution, fewer trails when zoomed out, no hillshade. The page reloads.',
  'Moji vrhovi':'My peaks', '2000+ m':'2000+ m', '1500–2000 m':'1500–2000 m', 'Vsi':'All', 'Neobiskani':'Not visited', 'Obiskani':'Visited', 'Išči vrh …':'Search peak …', 'Po gorstvih':'By range',
  'Izvozi':'Export', 'Uvozi':'Import', 'shranjeno v brskalniku':'saved in this browser', 'prominentnih dvatisočakov':'prominent 2000 m peaks', 'Vsi nad 2000 m (s podvrhi)':'All above 2000 m (incl. subpeaks)',
  'Vsi 1500–2000 m':'All 1500–2000 m', 'prominentnih vrhov 1500–2000 m (≥100 m)':'prominent peaks 1500–2000 m (≥100 m)', 'prominentnih vrhov':'prominent peaks', 'Vsi vrhovi':'All peaks',
  'Ni zadetkov.':'No results.', 'Seznam vrhov (odpri / zapri)':'Peak list (open / close)', '▲ Seznam vrhov':'▲ Peak list', 'Karta':'Map', 'Vrhovi':'Peaks', 'Riši':'Draw',
  'Poti na vrh':'Routes to the top', '360° razgled':'360° view', 'Obiskal sem':'I was there', 'Pomoč':'Help', 'rang po prominenci':'rank by prominence', 'približna lega':'approximate position',
  'obiskan':'visited', 'cesta':'road', 'markirana pot':'marked trail', 'neoznačena / slaba pot':'unmarked / faint trail', 'ferata':'via ferrata',
  'GPX':'GPX', 'Uredi kot svojo':'Edit as my own', '⛰ Od strani':'⛰ Side view', 'Pogled na izbrano pot od strani':'Look at the selected route from the side',
  'Samodejno iz OSM: preveri pred turo. T-lestvica = SAC.':'Generated from OSM: check before you go. T scale = SAC.', 'Markirana planinska pot (Knafelčeva markacija)':'Marked mountain trail (Knafelc blaze)',
  'Pokaži poti':'Show routes', 'Do vrha ni vrisane poti - zadnji del (črtkano) je ravna črta':'No mapped trail to the top - the last part (dashed) is a straight line', 'Skrij seznam poti':'Hide route list', 'Pripravljam omrežje poti …':'Preparing the trail network …', 'Ni izhodišča v dosegu.':'No trailhead within reach.',
  'Do vrha v OSM ni vrisane poti (brezpotje).':'No mapped trail to the top in OSM (off-trail).', 'markirana pot':'marked trail',
  '✎ Risanje poti':'✎ Route drawing', 'Klik na karto = nova točka':'Click on the map = new point', 'Razveljavi':'Undo', 'Izbriši zadnjo':'Delete last', 'Obrni':'Reverse', 'Počisti':'Clear', 'Shrani':'Save',
  'Sledi potem in cestam':'Follow trails and roads', 'Barva:':'Colour:', '▾ Višinski profil':'▾ Height profile', '▸ Pokaži profil':'▸ Show profile', 'Računam profil …':'Calculating profile …', 'Skrij':'Hide',
  'Shrani kot novo':'Save as new', 'Moje poti':'My routes', 'Moja pot':'My route', 'Ime poti:':'Route name:',
  'Vleci točko = premakni · klik na črto = vrini točko · klik na točko = izberi; Delete / desni klik / dvoklik = izbriši · Ctrl+Z razveljavi. Polna črta = po poti, črtkana = ravna črta.':'Drag a point = move · click the line = insert a point · click a point = select; Delete / right-click / double-click = delete · Ctrl+Z undo. Solid line = along trails, dashed = straight.',
  'modra':'blue', 'rumena':'yellow', 'zelena':'green', 'oranžna':'orange', 'vijolična':'purple', 'črna':'black', 'cian':'cyan',
  '❄ Višina snega':'❄ Snow depth', 'Skrij legendo':'Hide legend', 'Pokaži legendo':'Show legend', 'Skrij / pokaži legendo':'Hide / show legend', 'Dan prej':'Previous day', 'Dan pozneje':'Next day',
  'Model ICON-D2 (DWD, mreža ~2 km) prek Open-Meteo. Ocena, ne meritev; ostri grebeni so zglajeni.':'ICON-D2 model (DWD, ~2 km grid) via Open-Meteo. An estimate, not a measurement; sharp ridges are smoothed.',
  'Model ICON-D2 (DWD) · Open-Meteo. Celice: 8 km pod 1000 m, 4 km do 1500 m, 2 km do 2000 m, 1 km nad 2000 m.':'ICON-D2 model (DWD) · Open-Meteo. Cells: 8 km below 1000 m, 4 km to 1500 m, 2 km to 2000 m, 1 km above 2000 m.',
  'Snežna karta: model ICON-D2 razporejen po višini terena (lokalna odvisnost sneg–višina), strmine >35° manj snega. Izohipse: Mapterhorn DEM. Ocena, ne meritev.':'Snow map: ICON-D2 model spread over terrain height (local snow–height relation), less snow on slopes >35°. Contours: Mapterhorn DEM. An estimate, not a measurement.',
  'Pripravljam mrežo po nadmorski višini …':'Preparing the elevation grid …', 'Nalagam dnevne podatke o snegu …':'Loading daily snow data …',
  'Kakovost slike':'Image quality', 'Nizka':'Low', 'Srednja':'Medium', 'Visoka':'High', '⟳ Vrti':'⟳ Spin', '✕ Izhod':'✕ Exit', 'Približaj':'Zoom in', 'Oddalji':'Zoom out', '☀ Dan':'☀ Day',
  'Sončni vzhod / zahod danes s tega vrha':'Sunrise / sunset today from this summit',
  'Vleci = obrni se / poglej gor-dol · kolešček ali +/− = približaj · presledek = vrti · klik na ime = skoči na vrh':'Drag = turn / look up-down · wheel or +/− = zoom · space = spin · click a name = jump to that peak',
  'Naprava je videti počasna. Vklopim varčni način?':'This device seems slow. Turn on saving mode?', 'Vklopi':'Turn on', 'Ne':'No', 'Zapri':'Close',
  'Nalagam podatke o poteh …':'Loading trail data …', 'Nalagam vgrajene podatke …':'Loading built-in data …', 'Gradim omrežje poti za to območje …':'Building the trail network for this area …',
  'Planinska koča':'Mountain hut', 'Bivak / zavetišče':'Bivouac / shelter', 'Parkirišče':'Parking', 'Izhodišče':'Trailhead', 'Izvir':'Spring', 'spletna stran':'website',
  'Teren še ni naložen.':'Terrain not loaded yet.', 'Podatki se še nalagajo.':'Data is still loading.', 'Počakaj, da se poti naložijo.':'Wait for the trails to load.',
  'Visoka kakovost je na telefonu lahko prezahtevna — če slika izgine, izberi Srednjo.':'High quality can be too much for a phone — if the image disappears, choose Medium.',
  'Lega še ni določena':'Position not determined yet', 'Približna lega (±150 m)':'Approximate position (±150 m)',
  // extras
  'Aplikacija in brez signala':'App & offline', 'Namesti aplikacijo':'Install app', 'Prenesi to območje za brez signala':'Download this area for offline use', 'Izbriši shranjena območja':'Delete saved areas',
  'Vrhovi (':'Peaks (', 'Vrhovi 1500–2000\u00a0m (':'Peaks 1500–2000\u00a0m (', 'Vrhovi 1500–2000 m (':'Peaks 1500–2000 m (',
  'Vodič':'Guide', 'Ferata':'Via ferrata', 'lahka':'easy', 'Ime poti':'Route name', 'Prekliči':'Cancel', 'Izbriši':'Delete', 'Naprej':'Next', 'Nazaj':'Back', 'Preskoči':'Skip', 'Začni':'Start', 'Konec':'Done'
});
const RX = [
  [/^iz (.+)$/, 'from $1'], [/^čez (.+)$/, 'via $1'], [/^pri (.+)$/, 'near $1'],
  [/^(\d+) prominentnih$/, '$1 prominent'], [/^Vsi vrhovi \((\d+)\)$/, 'All peaks ($1)'],
  [/^(\d+) prominentnih dvatisočakov · s podvrhi (\d+) · \+ (\d+) vrhov 1500–2000 m$/, '$1 prominent 2000 m peaks · $2 with subpeaks · + $3 peaks 1500–2000 m'],
  [/^· (\d+) m · (\d+) (?:poti|pot)$/, '· $1 m · $2 routes'], [/^Prominenca: (.+)$/, 'Prominence: $1'], [/^Izbrišem "(.+)"\?$/, 'Delete "$1"?'], [/^zadnjih (\d+) m brez poti$/, 'last $1 m without a trail'],
  [/^🌅 Vzhod (.+)$/, '🌅 Sunrise $1'], [/^🌇 Zahod (.+)$/, '🌇 Sunset $1'], [/^(🌅|🌇) računam …$/, '$1 calculating …'],
  [/^Nalagam model … (.+) točk$/, 'Loading model … $1 points'],
  [/^Poti: ([\d.]+) odsekov(?: · ceste: ([\d.]+))? · koče\/bivaki: (\d+) · izhodišča: (\d+) · (.+)$/, (m,a,b,c,d,e)=>`Trails: ${a} segments${b?` · roads: ${b}`:''} · huts/bivouacs: ${c} · trailheads: ${d} · ${e.replace('vgrajeno','built-in').replace('paket','pack')}`]
];
const TOK = [[' · lahka',' · easy'],[' brez poti',' without a trail'],[' · zadnjih ',' · last '],[' · prominenca ',' · prominence '],[' · podvrh',' · subpeak'],[' · sončni vzhod ',' · sunrise '],[' · sončni zahod ',' · sunset '],[' markirano',' marked'],[' km ceste',' km road'],[' · ferata',' · via ferrata'],[' (napoved)',' (forecast)'],[' (danes)',' (today)'],[' celic s snegom',' cells with snow'],[', največ ',', max '],[' · snežna karta',' · snow map']];
function tr(s){
  const k = s.trim(); if (!k) return null; let o = EN[k];
  if (o == null) for (const [r, v] of RX){ if (r.test(k)){ o = k.replace(r, v); break; } }
  if (o == null && /·/.test(k)){ let x = k; for (const [a, b] of TOK) x = x.split(a).join(b); for (const r in RANGE_EN) x = x.split(r).join(RANGE_EN[r]); if (x !== k) o = x; }
  return o == null || o === k ? null : s.replace(k, o); }
let busy = false;
function trNode(n){
  if (n.nodeType === 3){ const p = n.parentElement; if (!p || p.closest('script,style,#q,.nm,.maplibregl-ctrl-attrib')) return; const o = tr(n.nodeValue); if (o != null) n.nodeValue = o; return; }
  if (n.nodeType !== 1 || n.closest && n.closest('script,style')) return;
  for (const a of ['title','placeholder','aria-label']){ const v = n.getAttribute && n.getAttribute(a); if (v){ const o = tr(v); if (o != null) n.setAttribute(a, o); } }
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let c;
  while ((c = w.nextNode())){ if (c.nodeType === 3) trNode(c); else for (const a of ['title','placeholder','aria-label']){ const v = c.getAttribute(a); if (v){ const o = tr(v); if (o != null) c.setAttribute(a, o); } } } }
window.T = s => LANG === 'en' ? (tr(s) ?? s) : s;
if (LANG === 'en'){
  document.documentElement.lang = 'en';
  trNode(document.body);
  new MutationObserver(ms => { if (busy) return; busy = true; try{ for (const m of ms){ if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trNode); } } finally { busy = false; } })
    .observe(document.body, {childList:true, subtree:true, characterData:true});
  const _alert = window.alert, _confirm = window.confirm, _prompt = window.prompt;
  window.alert = m => _alert(T(String(m))); window.confirm = m => _confirm(T(String(m))); window.prompt = (m, d) => _prompt(T(String(m)), d);
}
// language switch (top of the side panel + inside the guide)
const panelH = document.querySelector('.panel h1');
if (panelH){ const b = document.createElement('div'); b.id = 'langsw';
  b.innerHTML = `<button data-l="sl" class="${LANG==='sl'?'on':''}">SL</button><button data-l="en" class="${LANG==='en'?'on':''}">EN</button>`;
  b.onclick = e => { const l = e.target.closest('button'); if (l) setLang(l.dataset.l); }; panelH.append(b); }
function setLang(l){ if (l === LANG) return; LS('dvat3d_lang', l); location.reload(); }

// ---------- 2) first-use guide ----------
const PHONE = () => innerWidth <= 700;
const STEPS = [
  {t:'Dobrodošli na Dvatisočakih', d:'3D karta vseh slovenskih vrhov nad 2000 m (in 1500–2000 m) na LiDAR terenu. Kratek vodič v 6 korakih — lahko ga kadarkoli preskočiš.', lang:true},
  {t:'Seznam vrhov', d:'Glavni seznam: 98 prominentnih dvatisočakov. Odkljukaj, kar si že osvojil — napredek se shrani v tem brskalniku (Izvozi / Uvozi za prenos).', sel:()=>PHONE()?'#tabbar [data-t="peaks"]':'#ptab'},
  {t:'Klikni vrh na karti', d:'Odpre se okno z višino in prominenco. »Poti na vrh« pokaže poti s parkirišč (PZS oznaka, T-lestvica, čas hoje, GPX). »360° razgled« te postavi na vrh.', sel:()=>'#map', center:true},
  {t:'Riši svojo pot', d:'Klikaj točke — pot sama sledi potem in cestam. Točke lahko premikaš in brišeš; izvoz v GPX.', sel:()=>PHONE()?'#tabbar [data-t="draw"]':'#drawBtn'},
  {t:'Podlage in sloji', d:'Relief, satelit, OpenTopoMap ali snežna karta; sloji za poti, koče, sneg. Tu je tudi velikost besedila in jezik.', sel:()=>PHONE()?'#tabbar [data-t="layers"]':'.panel .grp'},
  {t:'Kot aplikacija, tudi brez signala', d:'V »Napredno → Aplikacija in brez signala« lahko stran namestiš na začetni zaslon in preneseš območje (teren, poti, vrhovi) za hribe brez signala.', sel:()=>PHONE()?'#tabbar [data-t="layers"]':'#appgrp'},
  {t:'Srečno na poti!', d:'Podatki so samodejni (OSM, LiDAR, model snega) — pred turo vedno preveri razmere. Vodič ponoviš v Napredno → Vodič.'}
];
Object.assign(EN, {
  'Dobrodošli na Dvatisočakih':'Welcome to Slovenian 2000ers',
  '3D karta vseh slovenskih vrhov nad 2000 m (in 1500–2000 m) na LiDAR terenu. Kratek vodič v 6 korakih — lahko ga kadarkoli preskočiš.':'A 3D map of all Slovenian peaks above 2000 m (and 1500–2000 m) on LiDAR terrain. A short 6-step guide — skip it any time.',
  'Seznam vrhov':'Peak list',
  'Glavni seznam: 98 prominentnih dvatisočakov. Odkljukaj, kar si že osvojil — napredek se shrani v tem brskalniku (Izvozi / Uvozi za prenos).':'The main list: the 98 prominent 2000 m peaks. Tick the ones you have climbed — progress is saved in this browser (Export / Import to move it).',
  'Klikni vrh na karti':'Click a peak on the map',
  'Odpre se okno z višino in prominenco. »Poti na vrh« pokaže poti s parkirišč (PZS oznaka, T-lestvica, čas hoje, GPX). »360° razgled« te postavi na vrh.':'A window shows height and prominence. "Routes to the top" lists routes from parkings (PZS marking, T scale, walking time, GPX). "360° view" puts you on the summit.',
  'Riši svojo pot':'Draw your own route',
  'Klikaj točke — pot sama sledi potem in cestam. Točke lahko premikaš in brišeš; izvoz v GPX.':'Click points — the line follows trails and roads by itself. Move or delete points; export to GPX.',
  'Podlage in sloji':'Base maps and layers',
  'Relief, satelit, OpenTopoMap ali snežna karta; sloji za poti, koče, sneg. Tu je tudi velikost besedila in jezik.':'Relief, satellite, OpenTopoMap or the snow map; layers for trails, huts, snow. Text size and language are here too.',
  'Kot aplikacija, tudi brez signala':'As an app, even without signal',
  'V »Napredno → Aplikacija in brez signala« lahko stran namestiš na začetni zaslon in preneseš območje (teren, poti, vrhovi) za hribe brez signala.':'In "Advanced → App & offline" you can install the site to your home screen and download an area (terrain, trails, peaks) for mountains without signal.',
  'Srečno na poti!':'Have a good hike!',
  'Podatki so samodejni (OSM, LiDAR, model snega) — pred turo vedno preveri razmere. Vodič ponoviš v Napredno → Vodič.':'The data is automatic (OSM, LiDAR, snow model) — always check conditions before you go. Replay the guide in Advanced → Guide.'
});
let step = 0, ov = null;
function tour(start){ step = start || 0; if (!ov){ ov = document.createElement('div'); ov.id = 'tour'; ov.innerHTML = '<div class="th"></div><div class="tc"></div>'; document.body.append(ov); }
  document.body.classList.remove('menu'); showStep(); }
function endTour(){ if (ov){ ov.remove(); ov = null; } LS('dvat3d_tour_done', '1'); }
function showStep(){
  const S = STEPS[step], hole = ov.querySelector('.th'), card = ov.querySelector('.tc');
  let r = null; if (S.sel){ const el = document.querySelector(S.sel()); if (el){ const b = el.getBoundingClientRect(); if (b.width && b.height) r = b; } }
  if (r && S.center){ const w = Math.min(260, r.width*0.5), h = Math.min(200, r.height*0.4); r = {left:r.left+r.width/2-w/2, top:r.top+r.height/2-h/2, width:w, height:h}; }
  if (r){ hole.style.cssText = `display:block;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px`; } else hole.style.cssText = 'display:block;left:50%;top:40%;width:0;height:0';
  card.innerHTML = `<div class="ts">${step+1} / ${STEPS.length}</div><h3>${T(S.t)}</h3><p>${T(S.d)}</p>`+
    (S.lang ? `<div class="tl"><button data-l="sl" class="${LANG==='sl'?'on':''}">Slovenščina</button><button data-l="en" class="${LANG==='en'?'on':''}">English</button></div>` : '')+
    `<div class="tbtns"><button class="sk">${T(step===STEPS.length-1?'Konec':'Preskoči')}</button><span></span>${step?`<button class="bk">${T('Nazaj')}</button>`:''}${step<STEPS.length-1?`<button class="nx">${T(step?'Naprej':'Začni')}</button>`:''}</div>`;
  card.querySelector('.sk').onclick = endTour; const nx = card.querySelector('.nx'), bk = card.querySelector('.bk');
  if (nx) nx.onclick = () => { step++; showStep(); }; if (bk) bk.onclick = () => { step--; showStep(); };
  card.querySelectorAll('.tl button').forEach(b => b.onclick = () => { LS('dvat3d_tour_step', '1'); setLang(b.dataset.l); });
  // place the card next to the highlighted element (or centred)
  const cw = Math.min(360, innerWidth-24); card.style.width = cw+'px';
  let x = innerWidth/2-cw/2, y = innerHeight/2-120;
  if (r && !S.center){ const right = r.left+r.width+16, left = r.left-cw-16;
    if (PHONE()){ x = 12; y = Math.max(12, r.top-12-240); }
    else if (right+cw < innerWidth) { x = right; y = Math.max(12, Math.min(innerHeight-260, r.top)); }
    else if (left > 0) { x = left; y = Math.max(12, Math.min(innerHeight-260, r.top)); } }
  else if (r && S.center){ y = Math.min(innerHeight-260, r.top+r.height+16); }
  card.style.left = x+'px'; card.style.top = y+'px'; }
window.startTour = () => tour(0);
addEventListener('resize', () => { if (ov) showStep(); });
// first visit: start after the map is up (resume at step 2 after a language switch from the guide)
if (!LS('dvat3d_tour_done')){ const st = LS('dvat3d_tour_step') ? 1 : 0; LS('dvat3d_tour_step', ''); setTimeout(() => tour(st), 1200); }

// ---------- 3) installable app + offline areas ----------
const grp = document.createElement('div'); grp.id = 'appgrp';
grp.innerHTML = `<b style="display:block;margin:10px 0 4px;font-size:.86em;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)">Aplikacija in brez signala</b>
  <button class="btn" id="instBtn" style="display:none">Namesti aplikacijo</button><div id="instHint" style="display:none;font-size:.82em;color:var(--mute);margin:4px 0"></div>
  <button class="btn btn2" id="offBtn">Prenesi to območje za brez signala</button><div id="offInfo" style="font-size:.82em;color:var(--mute);margin:4px 0"></div>
  <button class="btn btn2" id="offDel">Izbriši shranjena območja</button>
  <button class="btn btn2" id="tourBtn" style="margin-top:8px">Vodič</button>`;
const adv = document.querySelector('details.adv'); if (adv) adv.insertBefore(grp, adv.querySelector('#tstatus'));
$x('tourBtn').onclick = () => { if (adv) adv.open = false; tour(0); };
let deferred = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
// the browser only offers its install prompt sometimes (not when the app is already installed, shortly after an uninstall,
// or in some browsers at all) -> the button is always there and falls back to instructions
if (!standalone) $x('instBtn').style.display = '';
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
addEventListener('appinstalled', () => { deferred = null; const h=$x('instHint'); h.style.display=''; h.textContent=T('Aplikacija je nameščena — najdeš jo na začetnem zaslonu.'); });
$x('instBtn').onclick = async () => {
  if (deferred){ deferred.prompt(); await deferred.userChoice; deferred = null; return; }
  const h = $x('instHint'); h.style.display = '';
  h.textContent = /iphone|ipad|ipod/i.test(navigator.userAgent) ? T('iPhone: Safari → Deli (□↑) → Dodaj na začetni zaslon.')
    : /samsungbrowser/i.test(navigator.userAgent) ? T('Samsung Internet: meni ☰ → Dodaj stran na → Začetni zaslon.')
    : T('Brskalnik je trenutno ne ponudi sam: meni ⋮ → Namesti aplikacijo / Dodaj na začetni zaslon. Če je že nameščena, jo najprej odstrani.'); };
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)){ const h = $x('instHint'); h.style.display = ''; h.textContent = T('iPhone: Safari → Deli (□↑) → Dodaj na začetni zaslon.'); }
EN['iPhone: Safari → Deli (□↑) → Dodaj na začetni zaslon.'] = 'iPhone: Safari → Share (□↑) → Add to Home Screen.';
Object.assign(EN, {'strmo':'steep', 'meja snega':'snow line', 'Hitri teren (test)':'Fast terrain (test)',
  'Hitrejše nalaganje in manj zatikanja: 3D oblika iz grobejših podatkov, slika in senčenje ostaneta ostra. Primerjaj vklop/izklop na istem mestu.':'Faster loading, less lag: 3D shape from coarser height data, the picture and shading stay sharp. Compare on/off at the same spot.'});
Object.assign(EN, {'Samsung Internet: meni ☰ → Dodaj stran na → Začetni zaslon.':'Samsung Internet: menu ☰ → Add page to → Home screen.',
  'Brskalnik je trenutno ne ponudi sam: meni ⋮ → Namesti aplikacijo / Dodaj na začetni zaslon. Če je že nameščena, jo najprej odstrani.':'The browser is not offering it right now: menu ⋮ → Install app / Add to Home screen. If it is already installed, remove it first.',
  'Aplikacija je nameščena — najdeš jo na začetnem zaslonu.':'App installed — find it on your home screen.'});
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol.startsWith('http')){
  // automatic updates: look for a new version on start, every 20 min and whenever the app comes back to the foreground;
  // the new service worker takes over at once and the page reloads itself - right away if you are just looking at the map,
  // otherwise (360, drawing, an open window) as soon as you finish or switch away from the app
  const hadCtrl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}).then(reg => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 20 * 60e3); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(e => console.warn('sw', e));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  let reloading = false;
  const busy = () => document.body.classList.contains('in360') || window.DRAW_ON || document.querySelector('#wxBig, .dlg.on, #tour.on, input:focus, textarea:focus');
  const go = () => { if (reloading) return; reloading = true; try{ sessionStorage.setItem('dvat3d_updated', '1'); }catch(_){} location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtrl || reloading) return;                 // first install: nothing to refresh
    if (!busy()) return go();
    document.addEventListener('visibilitychange', () => { if (document.hidden) go(); });
    const iv = setInterval(() => { if (!busy()){ clearInterval(iv); go(); } }, 5000); });
  try{ if (sessionStorage.getItem('dvat3d_updated')){ sessionStorage.removeItem('dvat3d_updated'); setTimeout(() => window.toastErr && toastErr(T('Stran je posodobljena na novo različico.')), 1500); } }catch(_){}
}
Object.assign(EN, {'Na voljo je nova različica — osveži stran.':'A new version is available — reload the page.', 'Stran je posodobljena na novo različico.':'Updated to the new version.'});
RX.push([/^360 se je prejšnjič sesul — kakovost znižana na (.+)\.$/, '360 crashed last time — quality lowered to $1.'],
  [/^Grafični pomnilnik je poln — 360 zaprt, kakovost znižana na (.+)\.$/, 'Graphics memory is full — 360 closed, quality lowered to $1.']);
// offline area: terrain tiles (relief, hillshade, 3D all come from the DEM) for the visible area, zoom 8–14, max ~25 × 25 km.
// Trails, huts, peaks and the app itself are cached automatically. Satellite / OpenTopoMap are only cached as you view them
// (their terms do not allow bulk downloading).
const TZ = [8,9,10,11,12,13,14];
const tX = (lo,z) => Math.floor((lo+180)/360*2**z), tY = (la,z) => { const r = la*Math.PI/180; return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z); };
function areaTiles(){ const b = map.getBounds(); let s = b.getSouth(), n = b.getNorth(), w = b.getWest(), e = b.getEast();
  const c = map.getCenter(), mxLa = 0.115, mxLo = 0.165; // ~25 km box at most
  s = Math.max(s, c.lat-mxLa); n = Math.min(n, c.lat+mxLa); w = Math.max(w, c.lng-mxLo); e = Math.min(e, c.lng+mxLo);
  const L = []; for (const z of TZ) for (let x = tX(w,z); x <= tX(e,z); x++) for (let y = tY(n,z); y <= tY(s,z); y++) L.push(`https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`);
  return L; }
async function showUsage(){ try{ const k = await caches.open('dvat-region'), n = (await k.keys()).length; let u = '';
  if (navigator.storage && navigator.storage.estimate){ const est = await navigator.storage.estimate(); u = ` · ${(est.usage/1e6).toFixed(0)} MB`; }
  $x('offInfo').textContent = n ? `${T('Shranjeno')}: ${n} ${T('ploščic terena')}${u}` : ''; }catch(_){} }
Object.assign(EN, {'Shranjeno':'Saved', 'ploščic terena':'terrain tiles', 'Prenašam':'Downloading', 'Območje shranjeno. Brez signala delujejo teren, relief, senčenje, poti, koče in vrhovi.':'Area saved. Offline you have terrain, relief, hillshade, trails, huts and peaks.',
  'Prenos ni uspel — preveri povezavo.':'Download failed — check your connection.', 'Prenos območij ni podprt v tem brskalniku.':'Area download is not supported in this browser.'});
$x('offBtn').onclick = async () => {
  if (!('caches' in window)){ $x('offInfo').textContent = T('Prenos območij ni podprt v tem brskalniku.'); return; }
  const L = areaTiles(), k = await caches.open('dvat-region'), info = $x('offInfo'); let done = 0, fail = 0; const q = [...L];
  for (const u of ['tilejson.json']) q.unshift('https://tiles.mapterhorn.com/' + u);
  await Promise.all(Array.from({length:6}, async () => { while (q.length){ const u = q.shift();
    try{ if (!(await k.match(u))){ const r = await fetch(u, {mode:'cors'}); if (r.ok) await k.put(u, r); else fail++; } }catch(_){ fail++; }
    done++; if (done % 10 === 0) info.textContent = `${T('Prenašam')} … ${done} / ${L.length+1}`; } }));
  info.textContent = fail > L.length/3 ? T('Prenos ni uspel — preveri povezavo.') : T('Območje shranjeno. Brez signala delujejo teren, relief, senčenje, poti, koče in vrhovi.');
  setTimeout(showUsage, 4000); };
$x('offDel').onclick = async () => { try{ await caches.delete('dvat-region'); }catch(_){} showUsage(); };
if ('caches' in window) showUsage();
// MapLibre's own button tooltips in Slovene
})();
