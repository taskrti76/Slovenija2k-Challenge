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
  'Državna meja':'National border', 'Vode (reke, potoki, jezera, slapovi)':'Water (rivers, streams, lakes, waterfalls)', 'pred sneženjem – velja model':'before the last snowfall - model used', 'od takrat':'since then', 'Kraji (mesta, vasi)':'Places (towns, villages)', 'Izohipse (plastnice)':'Contour lines', '⛰ Nadmorska višina':'⛰ Elevation', '🏆 Lestvica':'🏆 Leaderboard', 'Lestvica':'Leaderboard', 'Nadmorska višina':'Elevation', 'Višina snega':'Snow depth', 'Višina snega (model, dnevno)':'Snow depth (model, daily)', 'Poti in koče (OSM)':'Trails & huts (OSM)', 'Poti (markirane + neoznačene)':'Trails (marked + unmarked)',
  'Koče, bivaki, izviri':'Huts, bivouacs, springs', 'Parkirišča / izhodišča':'Parking / trailheads', 'Ferate (oznake + težavnost)':'Via ferratas (signs + grade)', 'Riši pot':'Draw a route', 'Končaj risanje':'Finish drawing', 'Velikost besedila':'Text size',
  'Pretiravanje višin':'Height exaggeration', '1.0 = realno':'1.0 = real', 'Klik na teren':'Click on terrain', 'Klikni kamorkoli za višino DEM.':'Click anywhere for the terrain height.',
  'Napredno':'Advanced', 'Osveži podatke OSM':'Refresh OSM data', 'Naloži ceste':'Load roads', 'Razširi na 20 km (PC)':'Extend to 20 km (PC)', 'Izvozi paket podatkov':'Export data pack',
  'Varčni način (starejše naprave)':'Saving mode (older devices)', 'Izklopi senčenje, Waymarked sloj, ostrino 360° (samo Nizka), oddaljene ploščice in meglo; poti šele ob približanju.':'Turns off hillshade, the Waymarked layer, sharp 360° (Low only), distant tiles and fog; trails only when zoomed in.',
  'Manjša ločljivost, manj poti pri oddaljenem pogledu, brez senčenja. Stran se ponovno naloži.':'Lower resolution, fewer trails when zoomed out, no hillshade. The page reloads.',
  'Moji vrhovi':'My peaks', '2000+ m':'2000+ m', '1500–2000 m':'1500–2000 m', 'Vsi':'All', 'Neobiskani':'Not visited', 'Obiskani':'Visited', 'Išči vrh …':'Search peak …', 'Po gorstvih':'By range',
  'Izvozi':'Export', 'Uvozi':'Import', 'shranjeno v brskalniku':'saved in this browser', 'prominentnih dvatisočakov':'prominent 2000 m peaks', 'Vsi nad 2000 m (s podvrhi)':'All above 2000 m (incl. subpeaks)',
  'Vsi 1500–2000 m':'All 1500–2000 m', 'prominentnih vrhov 1500–2000 m (≥100 m)':'prominent peaks 1500–2000 m (≥100 m)', 'prominentnih vrhov':'prominent peaks', 'Vsi vrhovi':'All peaks',
  'Ni zadetkov.':'No results.', 'Seznam vrhov (odpri / zapri)':'Peak list (open / close)', 'Karta in sloji (odpri / zapri)':'Map & layers (open / close)', '◧ Karta in sloji':'◧ Map & layers', '▲ Seznam vrhov':'▲ Peak list', 'Karta':'Map', 'Vrhovi':'Peaks', 'Riši':'Draw',
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
  'Snežna karta: kje je sneg pove satelit Copernicus Sentinel-2 (zadnji jasen posnetek ≤10 dni, 40 m), kjer je bilo oblačno pa Copernicus GFSC (radar Sentinel-1 + Sentinel-2, 60 m); globino naš sezonski model snežne odeje (vsako uro od 1. oktobra: dež ali sneg po mokri temperaturi in meji sneženja, gostota novega snega, sesedanje, taljenje s temperaturo in soncem na ravnem, severnem in južnem pobočju; vsakih 250 m višine, celice ~4 km; dnevno popravljen s satelitom, 2× na dan z meritvami ARSO). Strmine >35° manj snega. Izohipse: Mapterhorn DEM. Ocena, ne meritev.':'Snow map: where snow lies comes from the Copernicus Sentinel-2 satellite (newest clear image ≤10 days, 40 m), under clouds Copernicus GFSC (Sentinel-1 radar + Sentinel-2, 60 m); depth from our season snowpack model (hourly since 1 October: rain or snow from wet-bulb temperature and the snowfall level, new-snow density, settling, melt from temperature and sun on flat, north- and south-facing ground; every 250 m of height, ~4 km cells; corrected daily with the satellite and twice a day with ARSO measurements). Less snow on slopes >35°. Contours: Mapterhorn DEM. An estimate, not a measurement.',
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
  'nalagam …':'loading …', 'naloženo v':'loaded in', 'hiter pregled':'quick view', 'Vodič':'Guide', 'Ferata':'Via ferrata', 'lahka':'easy', 'Ime poti':'Route name', 'Prekliči':'Cancel', 'Izbriši':'Delete', 'Naprej':'Next', 'Nazaj':'Back', 'Preskoči':'Skip', 'Začni':'Start', 'Konec':'Done'
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
const TOK = [[' · lahka',' · easy'],[' brez poti',' without a trail'],[' · zadnjih ',' · last '],[' · prominenca ',' · prominence '],[' · podvrh',' · subpeak'],[' · sončni vzhod ',' · sunrise '],[' · sončni zahod ',' · sunset '],[' markirano',' marked'],[' km ceste',' km road'],[' · ferata',' · via ferrata'],['⚠ nad tvojo mejo','⚠ above your limit'],[' (napoved)',' (forecast)'],[' (danes)',' (today)'],[' celic s snegom',' cells with snow'],[', največ ',', max '],[' · snežna karta',' · snow map'],[' · satelit ',' · satellite '],[' · sezonski model snežne odeje',' · season snowpack model'],[' % brez oblakov)',' % cloud-free)']];
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
const PHONE = () => PHONE_UI();
const STEPS = [
  {t:'Dobrodošli na Dvatisočakih', d:'3D karta vseh slovenskih vrhov nad 2000 m (in 1500–2000 m) na LiDAR terenu: poti, vreme, sneg in 360° razgled. Kratek vodič v 15 korakih — lahko ga kadarkoli preskočiš.', lang:true},
  {t:'Seznam vrhov', d:'98 prominentnih dvatisočakov (ali vsi vrhovi). Odkljukaj, kar si že osvojil — napredek se shrani v tem brskalniku (Izvozi / Uvozi za prenos). Iskanje, gorstva in filtri obiskani / neobiskani. Na telefonu ga odpre jeziček »︿ Vrhovi« pod rdečim gumbom (tapni ali povleci gor).', sel:()=>'#drawer', open:'peaks'},
  {t:'Klikni vrh na karti', d:'Okno pokaže višino, prominenco, težavnost normalne poti (lahka / zahtevna / zelo zahtevna) in vreme za danes. Od tu odpreš poti na vrh ali 360° razgled.', sel:()=>'#map', center:true, open:'map'},
  {t:'Poti na vrh', d:'Poti z izhodišč (parkirišč): PZS oznaka in ime poti, koče na poti, T-lestvica, ferate, čas hoje po tvoji kondiciji in višinski profil. »⛰ Od strani« zasuka karto na pobočje poti, »GPX« jo prenese. »⚠ nad tvojo mejo« pomeni težje od tvojega profila.', sel:()=>'#rcard', demo:'routes', open:'map'},
  {t:'360° razgled z vrha', d:'Postavi te na vrh: vleci za obračanje, klik na ime skoči na drug vrh. »☀ Dan« pokaže sončni vzhod in zahod — sonce se skrije za grebeni, kot v resnici.', sel:()=>'.maplibregl-popup .p360', demo:'p360', open:'map'},
  {t:'Vreme na vrhovih', d:'Ocena dneva 0–100 za vsak vrh (07–17 h): nevihte, veter, padavine, oblaki, nov sneg in mraz na vrhu. Težji vrh = strožja ocena. Na karti zelena / oranžna / rdeča; ⤢ odpre velik pregled po urah za 4 dni.', sel:()=>'#wxChk', open:'layers'},
  {t:'Snežna karta', d:'Koliko snega je kje: satelit Sentinel-2 pove, kje sneg leži, naš model (vsak dan, popravljen z meritvami ARSO) pa koliko ga je — danes in 4 dni naprej. Z miško (ali dotikom) prebereš globino.', sel:()=>'input[name=base][value=snow]', open:'layers'},
  {t:'Riši svojo pot', d:'Klikaj točke — pot sama sledi potem in cestam. Točke lahko premikaš in brišeš; izvoz v GPX. Višinski profil pokaže strmino, vrsto poti in čas; za večdnevno turo s prenočitvami odpri rdeči gumb → 🗓 Načrtovalnik.', sel:()=>'#fab .fb', open:'map'},
  {t:'Podlage in sloji', d:'Relief, satelit, OpenTopoMap ali snežna karta; sloji za poti, koče, parkirišča, ferate, sneg in vreme; velikost besedila. Na računalniku se plošča skrije z modrim jezičkom ob levem robu. Na telefonu: rdeči gumb → ◧ Karta in sloji.', sel:()=>'.panel .grp', open:'layers'},
  {t:'Rdeči gumb in nastavitve', d:'Rdeči gumb spodaj na sredini odpre meni v krogih: ◧ Karta in sloji, 👤 Moj profil, ⚙ Nastavitve, ✏️ Riši pot, 🗓 Načrtovalnik, 🏆 Lestvica, prijatelji, skupine, 📍 GPS vrhovi. Jeziček »︿ Vrhovi« pod njim odpre seznam vrhov. V ⚙ Nastavitvah: izkušnje z zimo, kondicija in najtežja pot, ki ti je še prijetna (vpliva na oceno vremena in opozorila), račun, obvestila, zemljevidi brez signala in ta vodič.', sel:()=>'#fab .fb', open:'map'},
  {t:'👤 Moj profil', d:'Vse tvoje na enem mestu: števci, ⭐ seznam želja (☆ v oknu vrha), tvoji vzponi z datumi, narisane poti (na karto ali GPX), prijatelji, skupine in značke. Deluje tudi brez računa.', sel:()=>'#fab .fb', open:'map'},
  {t:'🗺 Brez signala in aplikacija', d:'⚙ Nastavitve → Zemljevidi brez signala: shrani trenutni pogled ali celo pogorje (teren, 3D, plastnice, vode, imena krajev — poti, koče, vrhovi in zadnja napoved se shranijo sami). Seznam pokaže velikost, območja posodobiš ali izbrišeš. 📱 Android aplikacija z rdečim gumbom → 📍 GPS vrhovi sama potrdi vrh, ko stojiš na njem (✓).', sel:()=>'#fab .fb', open:'map'},
  {t:'Namigi', wide:true, d:'• <b>Legende</b> (višina, sneg): na računalniku jih primeš za naslov in premakneš, dvoklik na naslov jih vrne na mesto; – jih skrči v majhen gumb.<br>• <b>Nagib in sever</b>: desni gumb miške ali dva prsta nagneta karto, kompas jo obrne proti severu, 2D/3D preklopi pogled.<br>• <b>Moji vrhovi</b>: klik na ime v seznamu te odpelje do vrha; pod »Obiskal sem« dodaš datum (☐ danes), pot in opombo; »✓ Šel sem po tej poti« v kartici poti odkljuka vrh s to potjo.<br>• <b>Deljenje</b>: ✎ Riši → Moje poti → ⤴ (povezava ali javno). 🏆 Lestvica je ob tvojem napredku v seznamu vrhov in v meniju (rdeči gumb).<br>• Okna poti in profila na računalniku prav tako premikaš za naslov.'},
  {t:'Srečno na poti!', d:'Podatki so samodejni (OSM, LiDAR, vremenski model, satelit, model snega) — pred turo vedno preveri razmere. Stran se sama posodobi. Vodič ponoviš v ⚙ Nastavitvah (na telefonu tudi rdeči gumb → ❓ Vodič).'},
  {t:'Račun (neobvezno)', d:'Z računom (uporabniško ime + geslo) imaš osvojene vrhove, datume in poti, svoje narisane poti in nastavitve na telefonu in računalniku, poti lahko deliš s povezavo, se pridružiš lestvici ter dodaš prijatelje in skupine (skupni načrti tur). Brez računa vse deluje in se shrani v tem brskalniku. Račun urediš v ⚙ Nastavitve.', acc:true}
];
Object.assign(EN, {
  'Dobrodošli na Dvatisočakih':'Welcome to Slovenian 2000ers',
  '3D karta vseh slovenskih vrhov nad 2000 m (in 1500–2000 m) na LiDAR terenu: poti, vreme, sneg in 360° razgled. Kratek vodič v 15 korakih — lahko ga kadarkoli preskočiš.':'A 3D map of all Slovenian peaks above 2000 m (and 1500–2000 m) on LiDAR terrain: routes, weather, snow and a 360° view. A short 15-step guide — skip it any time.',
  'Seznam vrhov':'Peak list',
  '98 prominentnih dvatisočakov (ali vsi vrhovi). Odkljukaj, kar si že osvojil — napredek se shrani v tem brskalniku (Izvozi / Uvozi za prenos). Iskanje, gorstva in filtri obiskani / neobiskani. Na telefonu ga odpre jeziček »︿ Vrhovi« pod rdečim gumbom (tapni ali povleci gor).':'The 98 prominent 2000 m peaks (or all peaks). Tick the ones you have climbed — progress is saved in this browser (Export / Import to move it). Search, ranges and visited / not visited filters. On a phone the »︿ Peaks« tab under the red button opens it (tap or swipe up).',
  'Klikni vrh na karti':'Click a peak on the map',
  'Okno pokaže višino, prominenco, težavnost normalne poti (lahka / zahtevna / zelo zahtevna) in vreme za danes. Od tu odpreš poti na vrh ali 360° razgled.':'The window shows height, prominence, the difficulty of the normal route (easy / demanding / very demanding) and today\'s weather. From here open the routes or the 360° view.',
  'Poti na vrh':'Routes to the top',
  'Poti z izhodišč (parkirišč): PZS oznaka in ime poti, koče na poti, T-lestvica, ferate, čas hoje po tvoji kondiciji in višinski profil. »⛰ Od strani« zasuka karto na pobočje poti, »GPX« jo prenese. »⚠ nad tvojo mejo« pomeni težje od tvojega profila.':'Routes from trailheads (parkings): PZS marking and route name, huts on the way, T scale, via ferratas, walking time for your fitness and a height profile. "⛰ Side view" turns the map to face the route, "GPX" downloads it. "⚠ above your limit" means harder than your profile.',
  '360° razgled z vrha':'360° view from the summit',
  'Postavi te na vrh: vleci za obračanje, klik na ime skoči na drug vrh. »☀ Dan« pokaže sončni vzhod in zahod — sonce se skrije za grebeni, kot v resnici.':'Puts you on the summit: drag to turn, click a name to jump to that peak. "☀ Day" shows sunrise and sunset — the sun hides behind ridges, like in reality.',
  'Vreme na vrhovih':'Summit weather',
  'Ocena dneva 0–100 za vsak vrh (07–17 h): nevihte, veter, padavine, oblaki, nov sneg in mraz na vrhu. Težji vrh = strožja ocena. Na karti zelena / oranžna / rdeča; ⤢ odpre velik pregled po urah za 4 dni.':'A 0–100 day rating for every peak (07–17 h): storms, wind, precipitation, cloud, new snow and cold on the summit. Harder peak = stricter rating. Green / amber / red on the map; ⤢ opens a big hourly view for 4 days.',
  'Snežna karta':'Snow map',
  'Koliko snega je kje: satelit Sentinel-2 pove, kje sneg leži, naš model (vsak dan, popravljen z meritvami ARSO) pa koliko ga je — danes in 4 dni naprej. Z miško (ali dotikom) prebereš globino.':'How much snow is where: the Sentinel-2 satellite shows where snow lies, our model (daily, corrected with ARSO measurements) how deep it is — today and 4 days ahead. Hover (or tap) to read the depth.',
  'Riši svojo pot':'Draw your own route',
  'Klikaj točke — pot sama sledi potem in cestam. Točke lahko premikaš in brišeš; izvoz v GPX. Višinski profil pokaže strmino, vrsto poti in čas; za večdnevno turo s prenočitvami odpri rdeči gumb → 🗓 Načrtovalnik.':'Click points — the line follows trails and roads by itself. Move or delete points; export to GPX. The height profile shows steepness, kind of way and time; for a multi-day trip with overnights open the red button → 🗓 Trip planner.',
  'Podlage in sloji':'Base maps and layers',
  'Relief, satelit, OpenTopoMap ali snežna karta; sloji za poti, koče, parkirišča, ferate, sneg in vreme; velikost besedila. Na računalniku se plošča skrije z modrim jezičkom ob levem robu. Na telefonu: rdeči gumb → ◧ Karta in sloji.':'Relief, satellite, OpenTopoMap or the snow map; layers for trails, huts, parkings, via ferratas, snow and weather; text size. On a computer the panel hides with the blue tab on the left edge. On a phone: red button → ◧ Map & layers.',
  'Rdeči gumb in nastavitve':'The red button and settings',
  'Rdeči gumb spodaj na sredini odpre meni v krogih: ◧ Karta in sloji, 👤 Moj profil, ⚙ Nastavitve, ✏️ Riši pot, 🗓 Načrtovalnik, 🏆 Lestvica, prijatelji, skupine, 📍 GPS vrhovi. Jeziček »︿ Vrhovi« pod njim odpre seznam vrhov. V ⚙ Nastavitvah: izkušnje z zimo, kondicija in najtežja pot, ki ti je še prijetna (vpliva na oceno vremena in opozorila), račun, obvestila, zemljevidi brez signala in ta vodič.':'The red button at the bottom centre opens the menu in circles: ◧ Map & layers, 👤 My profile, ⚙ Settings, ✏️ Draw route, 🗓 Trip planner, 🏆 Leaderboard, friends, groups, 📍 GPS summits. The »︿ Peaks« tab under it opens the peak list. In ⚙ Settings: winter experience, fitness and the hardest route you are comfortable with (used by the weather rating and warnings), account, notifications, offline maps and this guide.',
  '👤 Moj profil':'👤 My profile',
  'Vse tvoje na enem mestu: števci, ⭐ seznam želja (☆ v oknu vrha), tvoji vzponi z datumi, narisane poti (na karto ali GPX), prijatelji, skupine in značke. Deluje tudi brez računa.':'Everything of yours in one place: counts, ⭐ wishlist (☆ in a peak window), your climbs with dates, drawn routes (on the map or GPX), friends, groups and badges. Works without an account too.',
  '🗺 Brez signala in aplikacija':'🗺 Offline and the app',
  '⚙ Nastavitve → Zemljevidi brez signala: shrani trenutni pogled ali celo pogorje (teren, 3D, plastnice, vode, imena krajev — poti, koče, vrhovi in zadnja napoved se shranijo sami). Seznam pokaže velikost, območja posodobiš ali izbrišeš. 📱 Android aplikacija z rdečim gumbom → 📍 GPS vrhovi sama potrdi vrh, ko stojiš na njem (✓).':'⚙ Settings → Offline maps: save the current view or a whole range (terrain, 3D, contours, water, place names — trails, huts, peaks and the last forecast are kept anyway). The list shows the size; update or delete areas. 📱 The Android app with red button → 📍 GPS summits confirms a summit by itself when you stand on it (✓).',
  'Srečno na poti!':'Have a good hike!',
  'Namigi':'Tips',
  '• <b>Legende</b> (višina, sneg): na računalniku jih primeš za naslov in premakneš, dvoklik na naslov jih vrne na mesto; – jih skrči v majhen gumb.<br>• <b>Nagib in sever</b>: desni gumb miške ali dva prsta nagneta karto, kompas jo obrne proti severu, 2D/3D preklopi pogled.<br>• <b>Moji vrhovi</b>: klik na ime v seznamu te odpelje do vrha; pod »Obiskal sem« dodaš datum (☐ danes), pot in opombo; »✓ Šel sem po tej poti« v kartici poti odkljuka vrh s to potjo.<br>• <b>Deljenje</b>: ✎ Riši → Moje poti → ⤴ (povezava ali javno). 🏆 Lestvica je ob tvojem napredku v seznamu vrhov in v meniju (rdeči gumb).<br>• Okna poti in profila na računalniku prav tako premikaš za naslov.':'• <b>Legends</b> (height, snow): on a computer drag them by the title, double-click the title to put them back; – shrinks them to a small button.<br>• <b>Tilt and north</b>: right mouse button or two fingers tilt the map, the compass turns it back to north, 2D/3D switches the view.<br>• <b>My peaks</b>: click a name in the list to fly there; under "Obiskal sem" add the date (☐ today), route and a note; "✓ Šel sem po tej poti" in a route card ticks the peak with that route.<br>• <b>Sharing</b>: ✎ Draw → My routes → ⤴ (link or public). 🏆 Leaderboard sits next to your progress in the peak list and in the menu (red button).<br>• Route and profile windows on a computer also move by their title.',
  'Račun (neobvezno)':'Account (optional)',
  'Z računom (uporabniško ime + geslo) imaš osvojene vrhove, datume in poti, svoje narisane poti in nastavitve na telefonu in računalniku, poti lahko deliš s povezavo, se pridružiš lestvici ter dodaš prijatelje in skupine (skupni načrti tur). Brez računa vse deluje in se shrani v tem brskalniku. Račun urediš v ⚙ Nastavitve.':'With an account (username + password) your climbed peaks, dates and routes, your drawn routes and settings are on your phone and computer, you can share routes by link, join the leaderboard and add friends and groups (shared tour plans). Without one everything works and is saved in this browser. Manage it in ⚙ Settings.',
  'Ne zdaj':'Not now',
  'Podatki so samodejni (OSM, LiDAR, vremenski model, satelit, model snega) — pred turo vedno preveri razmere. Stran se sama posodobi. Vodič ponoviš v ⚙ Nastavitvah (na telefonu tudi rdeči gumb → ❓ Vodič).':'The data is automatic (OSM, LiDAR, weather model, satellite, snow model) — always check conditions before you go. The site updates itself. Replay the guide from ⚙ Settings (on a phone also red button → ❓ Guide).'
});
let step = 0, ov = null, ui0 = null;
// each step opens what it talks about (map & layers sheet, peak list) so the real thing is lit up; the end puts things back
const B = () => document.body.classList, DR = () => document.getElementById('drawer');
function uiSet(o){ const d = DR(); if (!o) return false; const was = [B().contains('lclosed'), B().contains('menu'), !!(d && d.classList.contains('open'))];
  if (PHONE()){ B().toggle('menu', o === 'layers'); if (d) d.classList.toggle('open', o === 'peaks'); }
  else { B().toggle('lclosed', o !== 'layers'); if (d) d.classList.toggle('open', o === 'peaks'); }   // only what the step talks about
  const now = [B().contains('lclosed'), B().contains('menu'), !!(d && d.classList.contains('open'))]; return now.some((v, i) => v !== was[i]); }
function uiRestore(){ if (!ui0) return; const d = DR(); B().toggle('lclosed', ui0[0]); B().toggle('menu', ui0[1]); if (d) d.classList.toggle('open', ui0[2]); ui0 = null; }
function tour(start){ step = start || 0; const d0 = DR(); ui0 = [B().contains('lclosed'), B().contains('menu'), !!(d0 && d0.classList.contains('open'))]; const sw = document.getElementById('setWin'); if (sw) sw.classList.remove('on'); if (!ov){ ov = document.createElement('div'); ov.id = 'tour'; ov.innerHTML = '<div class="th"></div><div class="tc"></div>'; document.body.append(ov); }
  document.body.classList.remove('menu'); clearUI(); showStep(); }
// the guide starts on a clean map: side panels and every window closed (put back at the end)
function clearUI(){ try{ popClose(); if (window.closeRoutes) closeRoutes(); if (window.DRAW_ON && window.stopDraw) stopDraw();
    ['lbPage', 'accWin'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
    ['potwLb', 'wxBig'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    const sh = document.querySelector('#shCard.on .x'); if (sh) sh.click(); }catch(_){}
  const d = DR(); if (!PHONE()) B().add('lclosed'); if (d) d.classList.remove('open'); B().remove('menu'); }
function endTour(){ if (ov){ ov.remove(); ov = null; } demo(null); uiRestore(); LS('dvat3d_tour_done', '1'); }
// routes and 360 are shown on Triglav: the map flies there, its routes / its window open, the real thing is lit up
let curDemo = null; const TRI = 'triglav-2864';
const popClose = () => document.querySelectorAll('.maplibregl-popup .maplibregl-popup-close-button').forEach(b => b.click());
function demo(d){ if (d === curDemo) return false;
  if (curDemo === 'routes' && window.closeRoutes) closeRoutes(); if (curDemo === 'p360') popClose(); curDemo = d;
  const P = typeof byId !== 'undefined' && byId[TRI]; if (!d || !P) return false;
  if (d === 'routes'){ popClose(); map.flyTo({center:[P.lon, P.lat], zoom:12.5, pitch:50, bearing:-15, duration:1400});
    Promise.resolve(window.peakRoutesUI && peakRoutesUI(TRI)).then(() => setTimeout(() => ov && curDemo === 'routes' && placeStep(), 1000)); setTimeout(() => ov && placeStep(), 1600); return true; }
  if (d === 'p360'){ if (window.openPeak) openPeak(TRI, true); setTimeout(() => ov && curDemo === 'p360' && placeStep(), 1900); return true; }
  return false; }
let stT = 0;
function showStep(){ const S = STEPS[step], o = typeof S.open === 'function' ? S.open() : S.open;
  clearTimeout(stT); const dm = demo(S.demo || null); if (uiSet(o) || dm){ placeStep(); ov.querySelector('.th').style.display = 'none'; stT = setTimeout(placeStep, 320); } else placeStep(); }   // wait for the sheet to slide in
function placeStep(){ if (!ov) return;
  const S = STEPS[step], hole = ov.querySelector('.th'), card = ov.querySelector('.tc');
  let r = null; if (S.sel){ let el = document.querySelector(S.sel()); if (el && el.matches('input') && el.closest('label')) el = el.closest('label'); if (el && el.closest('.panel')) el.scrollIntoView({block:'center'}); if (el){ const b = el.getBoundingClientRect(); if (b.width && b.height) r = b; } }
  // map steps: light up the whole map (minus the open side panels on PC), card in the middle
  if (r && S.center && !PHONE()){ const pn = document.querySelector('.panel'), dr = document.getElementById('drawer');
    const l = !document.body.classList.contains('lclosed') && pn ? Math.max(r.left, pn.getBoundingClientRect().right) : r.left, rt = dr && dr.classList.contains('open') ? Math.min(r.right, dr.getBoundingClientRect().left) : r.right;
    r = {left:l+8, top:r.top+8, width:rt-l-16, height:r.height-16}; }
  else if (r && S.center) r = {left:r.left+8, top:r.top+8, width:r.width-16, height:r.height-16};
  // phone: a window that fills most of the screen (peak list, route sheet) - only its top part is lit, the card gets the rest
  if (r && !S.center && PHONE() && r.height > innerHeight * 0.5){ const top = Math.max(r.top, 0); r = {left:r.left, top, width:r.width, height:Math.max(130, innerHeight * 0.4 - top)}; }
  if (r){ hole.style.cssText = `display:block;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px`; } else hole.style.cssText = 'display:block;left:50%;top:40%;width:0;height:0';
  if (card.dataset.step !== String(step)){ card.dataset.step = step;   // same step again (sheet slid in, routes loaded): only move it
  card.innerHTML = `<div class="ts">${step+1} / ${STEPS.length}</div><h3>${T(S.t)}</h3><p>${T(S.d)}</p>`+
      (S.lang ? `<div class="tl"><button data-l="sl" class="${LANG==='sl'?'on':''}">Slovenščina</button><button data-l="en" class="${LANG==='en'?'on':''}">English</button></div>` : '')+
      (S.acc && window.accountStepButtons ? `<div class="tacc">${window.accountStepButtons(endTour).map((b,i)=>`<button data-a="${i}">${b[0]}</button>`).join('')}</div>` : '')+
      `<div class="tbtns"><button class="sk">${T(step===STEPS.length-1?(S.acc?'Ne zdaj':'Konec'):'Preskoči')}</button><span></span>${step?`<button class="bk">${T('Nazaj')}</button>`:''}${step<STEPS.length-1?`<button class="nx">${T(step?'Naprej':'Začni')}</button>`:''}</div>`;
    card.querySelector('.sk').onclick = endTour;
    if (S.acc && window.accountStepButtons){ const A = window.accountStepButtons(endTour); card.querySelectorAll('.tacc button').forEach(b => b.onclick = () => A[+b.dataset.a][1]()); } const nx = card.querySelector('.nx'), bk = card.querySelector('.bk');
    if (nx) nx.onclick = () => { step++; showStep(); }; if (bk) bk.onclick = () => { step--; showStep(); };
    card.querySelectorAll('.tl button').forEach(b => b.onclick = () => { LS('dvat3d_tour_step', '1'); setLang(b.dataset.l); }); }
  // place the card next to the highlighted element, never over it: beside it on a computer, else in the larger free band above or
  // below it (the card scrolls inside if the band is short); map steps: in the middle of the lit map
  const cw = Math.min(S.wide ? 560 : 360, innerWidth-24); card.style.width = cw+'px'; card.style.maxHeight = '';
  let x = innerWidth/2-cw/2, y = innerHeight/2-120, ch = card.offsetHeight;
  if (r && !S.center){ const right = r.left+r.width+16, left = r.left-cw-16, fitY = () => Math.max(12, Math.min(innerHeight-12-ch, r.top));
    if (!PHONE() && right+cw < innerWidth-8){ x = right; y = fitY(); }
    else if (!PHONE() && left > 8){ x = left; y = fitY(); }
    else { const above = r.top - 18, below = innerHeight - (r.top + r.height) - 18, up = above > below, room = Math.max(150, (up ? above : below) - 12);
      if (ch > room){ card.style.maxHeight = room+'px'; ch = room; }
      x = Math.max(12, Math.min(innerWidth-12-cw, r.left + r.width/2 - cw/2)); y = up ? Math.max(12, r.top - 12 - ch) : Math.min(innerHeight - 12 - ch, r.top + r.height + 12); } }
  else if (r && S.center){ x = r.left+r.width/2-cw/2; y = Math.max(12, r.top+r.height/2-ch/2); }
  if (y + ch > innerHeight - 12) y = Math.max(12, innerHeight - 12 - ch);
  card.style.left = x+'px'; card.style.top = y+'px'; }
window.startTour = () => tour(0);
addEventListener('resize', () => { if (ov) showStep(); });
// first visit: start after the map is up (resume at step 2 after a language switch from the guide)
if (!LS('dvat3d_tour_done')){ const st = LS('dvat3d_tour_step') ? 1 : 0; LS('dvat3d_tour_step', ''); setTimeout(() => tour(st), 1200); }

// ---------- 3) installable app + offline areas ----------
const grp = document.createElement('div'); grp.id = 'appgrp';
grp.innerHTML = `<b style="display:block;margin:10px 0 4px;font-size:.86em;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)">Aplikacija in brez signala</b>
  <div class="appbtns"><a class="btn" id="apkBtn" style="display:none" href="https://github.com/taskrti76/Slovenija2k-Challenge/releases/latest/download/dvatisocaki.apk">📱 Android aplikacija</a><button class="btn btn2" id="instBtn" style="display:none">⭐ Spletna aplikacija</button></div>
  <div id="apkHint" class="apph" style="display:none">📱 Android aplikacija (APK): GPS sam potrdi vrh, ko stojiš na njem (✓), tudi z ugasnjenim zaslonom. Ni iz Google Play — ob namestitvi dovoli »nameščanje iz neznanih virov«.</div>
  <div id="pwaHint" class="apph" style="display:none">⭐ Spletna aplikacija: ikona na začetnem zaslonu kar iz brskalnika — brez prenosa, tudi za iPhone in računalnik. Vse deluje, razen potrjevanja vrhov z GPS.</div><div id="instHint" style="display:none;font-size:.82em;color:var(--mute);margin:4px 0"></div>
  <div id="offMgr"></div>
  <button class="btn btn2" id="tourBtn" style="margin-top:8px">Vodič</button>`;
const adv = document.querySelector('details.adv'); if (adv) adv.insertBefore(grp, adv.querySelector('#tstatus'));
$x('tourBtn').onclick = () => { if (adv) adv.open = false; tour(0); };
let deferred = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
// the browser only offers its install prompt sometimes (not when the app is already installed, shortly after an uninstall,
// or in some browsers at all) -> the button is always there and falls back to instructions
const inApp = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
if (!standalone && !inApp){ $x('instBtn').style.display = ''; $x('pwaHint').style.display = ''; }
if (!inApp && !/iphone|ipad|ipod/i.test(navigator.userAgent)){ $x('apkBtn').style.display = ''; $x('apkHint').style.display = ''; }   // Android + computers (to send to a phone)
Object.assign(EN, {'📱 Android aplikacija':'📱 Android app', '⭐ Spletna aplikacija':'⭐ Web app',
  '📱 Android aplikacija (APK): GPS sam potrdi vrh, ko stojiš na njem (✓), tudi z ugasnjenim zaslonom. Ni iz Google Play — ob namestitvi dovoli »nameščanje iz neznanih virov«.':'📱 Android app (APK): GPS confirms a summit by itself when you stand on it (✓), also with the screen off. Not from Google Play — allow "install unknown apps" when installing.',
  '⭐ Spletna aplikacija: ikona na začetnem zaslonu kar iz brskalnika — brez prenosa, tudi za iPhone in računalnik. Vse deluje, razen potrjevanja vrhov z GPS.':'⭐ Web app: a home-screen icon straight from the browser — no download, also for iPhone and computers. Everything works except confirming summits by GPS.'});
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
Object.assign(EN, {'strmo':'steep', 'meja snega':'snow line', 'satelit: sneg':'satellite: snow', 'satelit: kopno':'satellite: no snow', 'Hitri teren (test)':'Fast terrain (test)',
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
// ---------- 🗺 offline maps: saved areas (manager in ⚙ Nastavitve → Aplikacija in brez signala) ----------
// One area = everything the map needs there without signal: terrain (relief, hillshade, 3D, contours, snow model) z8–14
// (whole ranges z8–13), OpenFreeMap vector tiles (rivers, lakes, place names) z8–14 + their index. Trails, huts, peaks, routes,
// weather / snow / avalanche data and the app itself are kept by the service worker anyway. Not included: satellite and
// OpenTopoMap (their terms forbid bulk downloads; tiles you looked at stay cached) and live weather for a clicked spot.
// All areas share one cache "dvat-offline" (the service worker looks in all caches), the list of areas is in localStorage.
const LL = (sl, en) => LANG === 'en' ? en : sl;
const RK = 'dvat3d_regions', OFM = 'https://tiles.openfreemap.org/planet';
const tX = (lo,z) => Math.floor((lo+180)/360*2**z), tY = (la,z) => { const r = la*Math.PI/180; return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z); };
let REG = []; try{ REG = JSON.parse(localStorage.getItem(RK) || '[]') || []; }catch(_){}
const saveReg = () => { try{ localStorage.setItem(RK, JSON.stringify(REG)); }catch(_){} };
let ofmTpl = null;
async function ofmTiles(){ if (ofmTpl) return ofmTpl; const r = await fetch(OFM); const j = await r.json(); ofmTpl = j.tiles[0]; return ofmTpl; }
function regUrls(b, zMax, tpl){ const [w, s, e, n] = b, L = [];
  for (let z = 8; z <= 14; z++) for (let x = tX(w,z); x <= tX(e,z); x++) for (let y = tY(n,z); y <= tY(s,z); y++){
    if (z <= zMax) L.push(`https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`);
    if (tpl) L.push(tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y)); }
  return L; }
const nearName = (lat, lon) => { let best = null, bd = 1e9; for (const p of PEAKS){ if (p.lat == null) continue; const d = (p.lat - lat) ** 2 + ((p.lon - lon) * .69) ** 2; if (d < bd){ bd = d; best = p; } } return best ? best.name.split(' (')[0] : ''; };
const PRESET = ['Julijske Alpe', 'Kamniško-Savinjske Alpe', 'Karavanke', 'Pohorje', 'Snežnik'];
const rangeBox = r => { const P = PEAKS.filter(p => p.range === r && p.lat != null); if (!P.length) return null; const m = .03;
  return [Math.min(...P.map(p => p.lon)) - m, Math.min(...P.map(p => p.lat)) - m, Math.max(...P.map(p => p.lon)) + m, Math.max(...P.map(p => p.lat)) + m]; };
const viewBox = () => { const b = map.getBounds(), c = map.getCenter(), mxLa = .115, mxLo = .165;   // ~25 × 25 km at most
  return [Math.max(b.getWest(), c.lng - mxLo), Math.max(b.getSouth(), c.lat - mxLa), Math.min(b.getEast(), c.lng + mxLo), Math.min(b.getNorth(), c.lat + mxLa)]; };
const mb = x => x >= 1e9 ? (x / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(x / 1e6)) + ' MB';
const est = urls => urls.reduce((a, u) => a + (u.includes('mapterhorn') ? 110e3 : 25e3), 0);
let job = null;   // running download {id, done, n, stop}
// all saved areas share one cache "dvat-offline": a tile two areas need is stored once; deleting an area removes only the tiles no
// other area uses. OB = bytes in that cache (the bar), each area keeps its own full size r.bytes (shared tiles included).
const OCN = 'dvat-offline', OBK = 'dvat3d_offbytes';
let OB = +(localStorage.getItem(OBK) || 0) || 0; const saveOB = () => { try{ localStorage.setItem(OBK, String(Math.max(0, Math.round(OB)))); }catch(_){} };
const sizeOf = async res => +res.headers.get('content-length') || (await res.clone().blob()).size;
const areaUrls = r => regUrls(r.b, r.z, r.tpl || null);
async function regDownload(r, fresh){
  if (job) return; if (!('caches' in window)){ offMsg(LL('Prenos območij ni podprt v tem brskalniku.', 'Area downloads are not supported in this browser.')); return; }
  try{ if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); }catch(_){}   // ask the browser not to clear it when space runs low
  if (!r.tpl) try{ r.tpl = await ofmTiles(); }catch(_){}
  const urls = areaUrls(r).concat(r.tpl ? [OFM] : []), k = await caches.open(OCN);
  if (!REG.includes(r)){ r.at = Date.now(); REG.push(r); saveReg(); }
  job = {id: r.id, done: 0, n: urls.length, fail: 0, bytes: 0, net: 0, stop: false}; offRender();
  const q = [...urls];
  await Promise.all(Array.from({length: 6}, async () => { while (q.length && !job.stop){ const u = q.shift();
    try{ const have = await k.match(u); let res = null;
      if (have && !fresh) res = have;   // already saved for another area (or earlier)
      else { const seen = fresh ? null : await caches.match(u);   // looked at before (viewed-tiles cache): copy instead of downloading
        res = seen || await fetch(u, {mode: 'cors', cache: fresh ? 'no-cache' : 'default'});
        if (res.ok || res.type === 'opaque'){ const sz = await sizeOf(res); if (have) OB -= await sizeOf(have); await k.put(u, res.clone()); OB += sz; if (!seen) job.net += sz; }
        else { job.fail++; res = null; } }
      if (res) job.bytes += await sizeOf(res); }
    catch(_){ job.fail++; }
    job.done++; if (job.done % 8 === 0){ offProg(); saveOB(); } } }));
  saveOB();
  const ok = !job.stop && job.fail < urls.length * .1;
  Object.assign(r, {n: urls.length - job.fail, bytes: job.bytes, at: Date.now(), ok}); saveReg();
  const shared = job.bytes - job.net > 2e6 ? ' ' + LL(`(${mb(job.bytes - job.net)} je bilo že shranjenega — ni prenešeno znova)`, `(${mb(job.bytes - job.net)} was already saved — not downloaded again)`) : '';
  const msg = job.stop ? LL('Prenos ustavljen — kar je prenešeno, ostane.', 'Download stopped — what was downloaded stays.')
    : ok ? LL(`Shranjeno: ${r.name}.`, `Saved: ${r.name}.`) + shared + ' ' + LL('Brez signala delujejo teren, 3D, plastnice, vode, imena krajev, poti, koče, vrhovi in zadnja vremenska napoved.', 'Offline you have terrain, 3D, contours, water, place names, trails, huts, peaks and the last forecast.')
    : LL('Del prenosa ni uspel — preveri povezavo in klikni ⟳ Posodobi.', 'Part of the download failed — check the connection and press ⟳ Update.');
  job = null; await offRender(); offMsg(msg); }   // after the list is drawn again, or the note would be wiped
async function regDelete(r){ const rest = REG.filter(x => x !== r), keep = new Set(rest.flatMap(areaUrls)); if (rest.length) keep.add(OFM);
  try{ const k = await caches.open(OCN);
    for (const u of areaUrls(r).concat([OFM])){ if (keep.has(u)) continue; const h = await k.match(u); if (h){ OB -= await sizeOf(h); await k.delete(u); } }
    if (!rest.length){ await caches.delete(OCN); OB = 0; } }catch(_){}
  saveOB(); REG = rest; saveReg(); offRender(); }
// areas saved by v0.56–0.59 had a cache each: move them into the shared one once (duplicates fall away)
(async () => { if (!('caches' in window)) return; try{ const old = (await caches.keys()).filter(n => n.startsWith('dvat-reg-')); if (!old.length) return;
  const k = await caches.open(OCN);
  for (const n of old){ const c = await caches.open(n), ks = await c.keys(); const r = REG.find(x => 'dvat-reg-' + x.id === n);
    for (const q of ks){ if (r && !r.tpl && /openfreemap\.org\/planet\/.+\/\d+\/\d+\/\d+/.test(q.url)) r.tpl = q.url.replace(/\/\d+\/\d+\/\d+(\.\w+)$/, '/{z}/{x}/{y}$1');
      if (await k.match(q)) continue; const res = await c.match(q); if (res){ await k.put(q, res); OB += await sizeOf(res); } }
    await caches.delete(n); }
  saveOB(); saveReg(); offRender(); }catch(_){} })();
function regShow(r){ closeSettingsWin(); const [w, s, e, n] = r.b, ring = [[w, s], [e, s], [e, n], [w, n], [w, s]];
  try{ const d = {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [ring]}};
    if (map.getSource('offreg')) map.getSource('offreg').setData(d);
    else { map.addSource('offreg', {type: 'geojson', data: d}); map.addLayer({id: 'offreg', type: 'line', source: 'offreg', paint: {'line-color': '#1976d2', 'line-width': 3, 'line-dasharray': [2, 1.5]}}); }
    clearTimeout(regShow.t); regShow.t = setTimeout(() => { try{ map.removeLayer('offreg'); map.removeSource('offreg'); }catch(_){} }, 8000); }catch(_){}
  map.fitBounds([[w, s], [e, n]], {padding: 40, duration: 900}); }
const closeSettingsWin = () => { const w = document.getElementById('setWin'); if (w) w.classList.remove('on'); };
const offMsg = t => { const i = $x('offInfo'); if (i) i.textContent = t || ''; };
const offProg = () => { const i = $x('offInfo'); if (i && job) i.innerHTML = `${LL('Prenašam','Downloading')} … ${job.done} / ${job.n} · ${mb(job.bytes)} <a id="offStop">${LL('ustavi','stop')}</a>`;
  const st = $x('offStop'); if (st) st.onclick = () => { if (job) job.stop = true; }; };
async function offRender(){ const M = $x('offMgr'); if (!M) return;
  let legacy = 0; try{ if ('caches' in window && await caches.has('dvat-region')) legacy = (await (await caches.open('dvat-region')).keys()).length; }catch(_){}
  // bar: what is saved out of everything there is to save (all five ranges, ~estimate); free space on the device as a note
  const reg = OB || REG.reduce((a, r) => a + (r.bytes || 0), 0), all = PRESET.reduce((a, r) => { const b = rangeBox(r); return a + (b ? est(regUrls(b, 13, '{z}/{x}/{y}')) : 0); }, 0);
  const bar = `<div class="offbar" title="${mb(reg)} / ~${mb(all)}"><i class="a" style="width:${Math.min(100, reg / Math.max(1, all) * 100).toFixed(1)}%"></i></div>
    <div class="offleg"><span>${LL('Shranjeno','Saved')} <b>${mb(reg)}</b> ${LL('od','of')} ~${mb(all)} (${LL('vsa pogorja','all ranges')})</span></div>`;
  let use = ''; try{ if (navigator.storage && navigator.storage.estimate){ const e = await navigator.storage.estimate(); if (e.quota) use = `${LL('Prostora v napravi še','Free on this device')}: ${mb(Math.max(0, e.quota - (e.usage || 0)))}`; } }catch(_){}
  const tr = window.T || (x => x), have = new Set(REG.filter(r => r.range).map(r => r.range));
  M.innerHTML = `<div class="offh">🗺 ${LL('Zemljevidi brez signala','Offline maps')}</div>
    ${REG.length || legacy ? '' : `<div class="hint">${LL('Še nič shranjenega. Shrani pogled ali celo pogorje — potem karta tam deluje tudi brez signala.','Nothing saved yet. Save the view or a whole range — the map then works there without signal.')}</div>`}
    ${REG.map((r, i) => `<div class="offr${job && job.id === r.id ? ' busy' : ''}"><div class="on"><b>${r.range ? '⛰ ' : '📍 '}${esc2(r.name)}</b><small>${new Date(r.at || Date.now()).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'sl-SI')} · ${mb(r.bytes || 0)} · ${LL('podrobnost','detail')} z${r.z}${r.ok === false ? ' · ⚠ ' + LL('nepopolno','incomplete') : ''}</small></div>
      <button data-a="show" data-i="${i}" title="${LL('Pokaži na karti','Show on the map')}">👁</button><button data-a="upd" data-i="${i}" title="${LL('Posodobi','Update')}">⟳</button><button data-a="ren" data-i="${i}" title="${LL('Preimenuj','Rename')}">✎</button><button data-a="del" data-i="${i}" title="${LL('Izbriši','Delete')}">🗑</button></div>`).join('')}
    ${legacy ? `<div class="offr"><div class="on"><b>${LL('Starejša shranjena območja','Older saved areas')}</b><small>${legacy} ${LL('ploščic terena','terrain tiles')}</small></div><button data-a="legacy" title="${LL('Izbriši','Delete')}">🗑</button></div>` : ''}
    <button class="btn" id="offBtn">＋ ${LL('Shrani trenutni pogled','Save the current view')}</button>
    <div class="hint">${LL('ali celo pogorje:','or a whole range:')}</div><div class="chips offpre">${PRESET.map(r => `<button data-r="${r}"${have.has(r) ? ' class="on"' : ''}>${esc2(tr(r))}</button>`).join('')}</div>
    <div id="offInfo" class="hint"></div>${bar}${offMini()}<div class="hint">${use}${use ? ' · ' : ''}${LL('Satelit in OpenTopoMap se shranita samo, kar si pogledal (pogoji uporabe).','Satellite and OpenTopoMap keep only what you looked at (terms of use).')}</div>`;
  M.querySelectorAll('.offr button').forEach(bt => bt.onclick = () => { const r = REG[+bt.dataset.i], a = bt.dataset.a;
    if (a === 'legacy'){ caches.delete('dvat-region').then(offRender); return; }
    if (a === 'show') regShow(r); else if (a === 'upd') regDownload(r, true);
    else if (a === 'ren'){ const n = prompt(LL('Ime območja','Area name'), r.name); if (n && n.trim()){ r.name = n.trim().slice(0, 40); saveReg(); offRender(); } }
    else if (a === 'del'){ if (bt.dataset.sure){ regDelete(r); } else { bt.dataset.sure = 1; bt.textContent = LL('Res?','Sure?'); setTimeout(() => { if (bt.isConnected){ delete bt.dataset.sure; bt.textContent = '🗑'; } }, 3000); } } });
  const ask = async (r, urls) => { const i = $x('offInfo'); i.textContent = '…'; let miss = urls;   // only what is not saved yet counts
    try{ const k = await caches.open(OCN), m = []; for (const u of urls) if (!(await k.match(u))) m.push(u); miss = m; }catch(_){}
    i.innerHTML = `${esc2(r.name)}: ~${mb(est(miss))} (${miss.length} ${LL('ploščic','tiles')}${miss.length < urls.length ? `, ${urls.length - miss.length} ${LL('že shranjenih','already saved')}` : ''}). <a id="offGo">${LL('Prenesi','Download')}</a> · <a id="offNo">${LL('prekliči','cancel')}</a>`;
    $x('offGo').onclick = () => regDownload(r); $x('offNo').onclick = () => offMsg(''); };
  $x('offBtn').onclick = async () => { if (job) return; const b = viewBox(), c = map.getCenter(); let tpl = null; try{ tpl = await ofmTiles(); }catch(_){}
    const r = {id: Date.now().toString(36), name: LL('Okolica: ', 'Around ') + nearName(c.lat, c.lng), b, z: 14, tpl}; ask(r, regUrls(b, 14, tpl)); };
  M.querySelectorAll('.offpre button').forEach(bt => bt.onclick = async () => { if (job) return; const rg = bt.dataset.r, b = rangeBox(rg); if (!b) return;
    const old = REG.find(x => x.range === rg); if (old){ regShow(old); return; }
    let tpl = null; try{ tpl = await ofmTiles(); }catch(_){}
    const r = {id: Date.now().toString(36), name: tr(rg), range: rg, b, z: 13, tpl}; ask(r, regUrls(b, 13, tpl)); });
  M.querySelectorAll('.offmini [data-ri]').forEach(g => g.onclick = () => regShow(REG[+g.dataset.ri]));
  M.querySelectorAll('.offmini [data-pr]').forEach(g => g.onclick = () => { const b = M.querySelector(`.offpre button[data-r="${g.dataset.pr}"]`); if (b) b.click(); });
  const all2 = $x('offAll'); if (all2) all2.onclick = () => regShowAll();
  if (job) offProg(); }
// overview of Slovenia: border, the five ranges (dashed = not saved yet, click = save), saved areas in blue (click = show on the map),
// the current view in red
const MB0 = [13.3, 45.38, 16.65, 46.92], MW = 300, MH = Math.round(MW * (MB0[3] - MB0[1]) / ((MB0[2] - MB0[0]) * Math.cos(46.2 * Math.PI / 180)));
const mx = lo => ((lo - MB0[0]) / (MB0[2] - MB0[0]) * MW).toFixed(1), my = la => ((MB0[3] - la) / (MB0[3] - MB0[1]) * MH).toFixed(1);
const mrect = (b, a) => `<rect x="${mx(b[0])}" y="${my(b[3])}" width="${(mx(b[2]) - mx(b[0])).toFixed(1)}" height="${(my(b[1]) - my(b[3])).toFixed(1)}" ${a}/>`;
let borderD = null;
function offMini(){ const tr = window.T || (x => x);
  if (!borderD) try{ const src = map.getStyle().sources.border, C = src && src.data && src.data.geometry.coordinates;
    borderD = C ? C.map(l => 'M' + l.filter((_, i) => i % 3 === 0 || i === l.length - 1).map(p => mx(p[0]) + ' ' + my(p[1])).join('L')).join('') : ''; }catch(_){ borderD = ''; }
  const have = new Set(REG.filter(r => r.range).map(r => r.range)), v = viewBox();
  return `<div class="offmini"><svg viewBox="0 0 ${MW} ${MH}" role="img" aria-label="${LL('Pregled shranjenih območij','Overview of saved areas')}">
    <path d="${borderD}" fill="none" stroke="#7d8a85" stroke-width="1.2"/>
    ${PRESET.map(r => { const b = rangeBox(r); return b && !have.has(r) ? `<g data-pr="${r}" class="pr">${mrect(b, 'fill="rgba(25,118,210,.04)" stroke="#90a4ae" stroke-dasharray="4 3"')}<text x="${mx((b[0] + b[2]) / 2)}" y="${my((b[1] + b[3]) / 2)}">${esc2(tr(r))}</text></g>` : ''; }).join('')}
    ${REG.map((r, i) => `<g data-ri="${i}" class="sv">${mrect(r.b, 'fill="rgba(25,118,210,.28)" stroke="#1976d2" stroke-width="1.5"')}<text x="${mx((r.b[0] + r.b[2]) / 2)}" y="${my((r.b[1] + r.b[3]) / 2)}">${esc2(r.range ? tr(r.range) : r.name.replace(/^(Okolica|Around):? ?/, ''))}</text></g>`).join('')}
    ${mrect(v, 'fill="none" stroke="#c62828" stroke-width="1.5"')}
  </svg><div class="offleg"><span><i class="a"></i>${LL('shranjeno','saved')}</span><span><i class="p"></i>${LL('pogorje (klik = shrani)','range (click = save)')}</span><span><i class="v"></i>${LL('trenutni pogled','current view')}</span>${REG.length ? `<a id="offAll">${LL('vse na karti','all on the map')}</a>` : ''}</div></div>`; }
function regShowAll(){ if (!REG.length) return; closeSettingsWin();
  const d = {type: 'FeatureCollection', features: REG.map(r => { const [w, s, e, n] = r.b; return {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}}; })};
  try{ if (map.getSource('offreg')) map.getSource('offreg').setData(d);
    else { map.addSource('offreg', {type: 'geojson', data: d}); map.addLayer({id: 'offreg', type: 'line', source: 'offreg', paint: {'line-color': '#1976d2', 'line-width': 3, 'line-dasharray': [2, 1.5]}}); }
    clearTimeout(regShow.t); regShow.t = setTimeout(() => { try{ map.removeLayer('offreg'); map.removeSource('offreg'); }catch(_){} }, 10000); }catch(_){}
  const W = Math.min(...REG.map(r => r.b[0])), S = Math.min(...REG.map(r => r.b[1])), E = Math.max(...REG.map(r => r.b[2])), N = Math.max(...REG.map(r => r.b[3]));
  map.fitBounds([[W, S], [E, N]], {padding: 40, duration: 900}); }
const esc2 = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.offRender = offRender; offRender();
// 📴 no connection: no "retry" - the map simply runs from what is saved; a small note on top says so, and ticks / GPS ✓ wait
const net = document.createElement('div'); net.id = 'netPill'; document.body.append(net);
function netUI(){ const off = navigator.onLine === false; document.body.classList.toggle('offline', off);
  net.textContent = off ? LL(`📴 Brez povezave — način brez signala${REG.length ? ` (${REG.length} ${REG.length === 1 ? 'shranjeno območje' : 'shranjena območja'})` : ''}`, `📴 No connection — offline mode${REG.length ? ` (${REG.length} saved area${REG.length === 1 ? '' : 's'})` : ''}`) : ''; }
addEventListener('offline', netUI);
addEventListener('online', () => { netUI(); net.textContent = LL('✓ Spet povezano — pošiljam spremembe', '✓ Back online — sending changes'); document.body.classList.add('offline', 'netback');
  setTimeout(() => document.body.classList.remove('offline', 'netback'), 3500); });
netUI();
const netCss = document.createElement('style'); netCss.textContent = `#netPill{display:none;position:fixed;z-index:27;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);background:#37474f;color:#fff;border-radius:999px;padding:6px 13px;font:600 13px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;pointer-events:none}
body.offline #netPill{display:block}body.netback #netPill{background:#2e7d32}body.offline.gpson #gpsPill{top:calc(46px + env(safe-area-inset-top))}`;
document.head.append(netCss);
// fresh list (sizes, storage) every time the settings window opens
addEventListener('load', () => { const w = document.getElementById('setWin'); if (w) new MutationObserver(() => { if (w.classList.contains('on')) offRender(); }).observe(w, {attributes: true, attributeFilter: ['class']}); });
const offCss = document.createElement('style'); offCss.textContent = `#offMgr .offh{font-weight:700;margin:10px 0 4px}
#offMgr .offr{display:flex;align-items:center;gap:4px;border:1px solid #dfe4e1;border-radius:10px;padding:6px 6px 6px 10px;margin:5px 0}#offMgr .offr.busy{border-color:#1976d2;background:#f2f7fd}
#offMgr .offr .on{flex:1;min-width:0}#offMgr .offr .on b{display:block;font-size:.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#offMgr .offr .on small{color:#5b6461;font-size:.8em}
#offMgr .offr button{border:0;background:#eef2f0;border-radius:8px;min-width:32px;height:30px;cursor:pointer;font-size:.9em;padding:0 6px}#offMgr .offr button:hover{background:#dde4e0}
#offMgr .offbar{display:flex;height:10px;border-radius:5px;background:#e3e8e5;overflow:hidden;margin:8px 0 4px}#offMgr .offbar i{display:block;height:100%;min-width:2px}#offMgr .offbar .a,#offMgr .offleg .a{background:#1976d2}
#offMgr .offleg .p{background:none;border:1px dashed #90a4ae}#offMgr .offleg .v{background:none;border:1.5px solid #c62828}
#offMgr .offmini{margin:8px 0 2px;border:1px solid #e3e8e5;border-radius:10px;padding:6px;background:#f8faf9}#offMgr .offmini svg{width:100%;height:auto;display:block}
#offMgr .offmini text{font:600 8px system-ui,sans-serif;fill:#1d2321;text-anchor:middle;dominant-baseline:middle;pointer-events:none;paint-order:stroke;stroke:#f8faf9;stroke-width:2.5px}
#offMgr .offmini g{cursor:pointer}#offMgr .offmini g.pr:hover rect{fill:rgba(25,118,210,.14)}#offMgr .offmini g.sv:hover rect{fill:rgba(25,118,210,.45)}
#setWin .appbtns{display:flex;gap:6px}#setWin .appbtns .btn{flex:1;display:flex!important;align-items:center;justify-content:center;text-align:center;margin:4px 0!important;width:auto!important;min-height:42px;box-sizing:border-box;text-decoration:none}
#setWin .appbtns .btn[style*="display:none"]{display:none!important}#setWin .apph{font-size:.82em;color:#4a524f;margin:3px 0}
#offMgr .offleg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.8em;color:#4a524f}#offMgr .offleg i{display:inline-block;width:9px;height:9px;border-radius:2px;background:#e3e8e5;margin-right:4px;vertical-align:-1px}
#offMgr .offpre{margin:4px 0}#offMgr .offpre button.on{background:#e8f1fb;color:#1d2321;border-color:#1976d2}#offMgr a{color:#1565c0;cursor:pointer;text-decoration:underline}`;
document.head.append(offCss);
// MapLibre's own button tooltips in Slovene
})();
