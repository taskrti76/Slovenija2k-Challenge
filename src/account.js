// ===================== accounts: username + password (+ Cloudflare Turnstile), all inside ⚙ Nastavitve =====================
// Supabase Auth needs an email, so the page signs up <username>@uporabnik.dvatisocaki.invalid (".invalid" can never receive mail;
// "Confirm email" is off). The database takes the username from that address (supabase/01_schema.sql), so it cannot be faked.
// No library: a few fetch calls to Supabase Auth (GoTrue) and the database API (PostgREST). Keys here are public by design.
// Kept in the account (offline-first - everything also works without one, saved in this browser):
//   ticked peaks + date / route / note of each climb · ⚙ Moj profil settings · my drawn routes (private / link / public)
// Also: public profile + leaderboard (only users who switch it on), shared route links (?pot=…), profile links (?u=…).
(function(){
const SB = 'https://txprpjrwnrchevknvxci.supabase.co', KEY = 'sb_publishable_yYpHRC0Rdo0L1Mpq3xS9ZQ_HewnusvY';
const TS_KEY = '0x4AAAAAAFr5h2NZFQOFHE6y', DOM = 'uporabnik.dvatisocaki.invalid';
const L = (sl, en) => window.LANG === 'en' ? en : sl;
const $a = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(_){ return null; } };
const put = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
const toast = m => (window.toastOk || window.toastErr || (() => {}))(m);   // green note; errors keep using toastErr
const VERK = 'dvat3d_ver', VQK = 'dvat3d_vq', GTK = 'dvat3d_gps';   // GPS-confirmed summits (app), queue for the server, tracker on/off
let VER = get(VERK) || {}, VQ = get(VQK) || [], gWatch = null, gAcc = null;
const AK = 'dvat3d_auth', SK = 'dvat3d_sync', VK = 'dvat3d_vinfo', PK = 'dvat3d_profile_t';
let S = get(AK);                         // session {access_token, refresh_token, expires_at, uid, username, display_name, public}
let SY = get(SK) || {};                  // {uid, merged, dirty:{peak: 0 ticked / 1 unticked}, idirty:{peak:1}, known:{routeId:1}, at}
let VI = get(VK) || {};                  // climb details {peak: {d:'YYYY-MM-DD', r:'route', n:'note'}}
for (const [o, n] of Object.entries(ID_MOVED)) if (VI[o]){ if (!VI[n]) VI[n] = VI[o]; delete VI[o]; put(VK, VI); }   // merged duplicate peaks
const USER_RE = /^(?![.])(?!.*\.\.)[a-z0-9_.-]{3,24}(?<![.])$/;
const N_PROM = PEAKS.filter(p => p.tier !== '1500' && p.rank != null).length;

// ---------- Supabase calls ----------
class ApiErr extends Error {}
async function call(path, {method = 'GET', body, auth = true, headers = {}} = {}){
  const h = Object.assign({apikey: KEY, 'Content-Type': 'application/json'}, headers);
  if (auth){ const t = await token(); if (!t){ const e = new ApiErr('not signed in'); e.status = 401; throw e; } h.Authorization = 'Bearer ' + t; }
  const r = await fetch(SB + path, {method, headers: h, body: body != null ? JSON.stringify(body) : undefined, cache: 'no-store'});
  const txt = await r.text(); let j = null; try{ j = txt ? JSON.parse(txt) : null; }catch(_){}
  if (!r.ok){ const e = new ApiErr((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status)); e.status = r.status; e.code = j && (j.error_code || j.code); throw e; }
  return j; }
const rpc = (fn, args, auth = false) => call('/rest/v1/rpc/' + fn, {method: 'POST', body: args || {}, auth});
const keep = j => { S = Object.assign({}, S || {}, {access_token: j.access_token, refresh_token: j.refresh_token,
  expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), uid: (j.user && j.user.id) || (S && S.uid)}); put(AK, S); };
let refreshing = null;
async function token(){
  if (!S || !S.refresh_token) return null;
  if (S.expires_at - 60 > Date.now() / 1000) return S.access_token;
  if (!refreshing) refreshing = (async () => {
    try{ keep(await call('/auth/v1/token?grant_type=refresh_token', {method: 'POST', auth: false, body: {refresh_token: S.refresh_token}})); return S.access_token; }
    catch(e){ if (e.status === 400 || e.status === 401 || e.status === 403){ S = null; put(AK, null); paint(); } return null; }   // session ended elsewhere
    finally { refreshing = null; } })();
  return refreshing; }
const errText = e => {
  const c = String(e.code || ''), m = (e.message || '').toLowerCase();
  if (c === 'invalid_credentials' || m.includes('invalid login')) return L('Napačno uporabniško ime ali geslo.', 'Wrong username or password.');
  if (c === 'user_already_exists' || c === 'email_exists' || m.includes('already registered')) return L('To uporabniško ime je že zasedeno.', 'This username is taken.');
  if (c.startsWith('captcha') || m.includes('captcha')) return L('Preverjanje »nisem robot« ni uspelo – poskusi znova.', 'The "not a robot" check failed - try again.');
  if (c === 'weak_password' || m.includes('password')) return L('Geslo je prešibko (vsaj 8 znakov).', 'Password too weak (at least 8 characters).');
  if (e.status === 429 || c.includes('rate')) return L('Preveč poskusov – počakaj nekaj minut.', 'Too many attempts - wait a few minutes.');
  if (m.includes('database error')) return L('Uporabniško ime ni veljavno.', 'Invalid username.');
  if (c === 'PGRST202' || c === '42P01' || c === '42703') return L('Ta del še ni nastavljen v bazi (supabase/02–05 .sql).', 'Not set up in the database yet (supabase/02–05 .sql).');
  if (m.includes('no such user')) return L('Uporabnik s tem imenom ne obstaja.', 'No user with that name.');
  if (m.includes('that is you')) return L('To si ti.', 'That is you.');
  if (m.includes('too many requests')) return L('Danes si poslal že veliko prošenj – poskusi jutri.', 'You sent many requests today - try tomorrow.');
  if (m.includes('too many friends')) return L('Doseženo največje število prijateljev (300).', 'Friend limit reached (300).');
  if (m.includes('not your friend')) return L('Povabiš lahko samo svoje prijatelje.', 'You can only invite your friends.');
  if (m.includes('group is full')) return L('Skupina je polna (50).', 'The group is full (50).');
  if (m.includes('too many groups')) return L('Preveč skupin (največ 30, ustvariš lahko 10).', 'Too many groups (max 30, you can create 10).');
  if (m.includes('only the owner')) return L('To lahko naredi samo lastnik skupine.', 'Only the group owner can do that.');
  if (m.includes('not a member')) return L('Nisi (več) član te skupine.', 'You are not (any more) a member of this group.');
  if (e instanceof TypeError) return L('Ni povezave s strežnikom.', 'No connection to the server.');
  return L('Napaka: ', 'Error: ') + e.message; };

async function signUp(user, pass, name, captcha){
  const j = await call('/auth/v1/signup', {method: 'POST', auth: false,
    body: {email: `${user}@${DOM}`, password: pass, data: {display_name: name || user}, gotrue_meta_security: {captcha_token: captcha}}});
  if (!j || !j.access_token) throw new ApiErr(L('Račun je ustvarjen, a prijava ni uspela – prijavi se.', 'Account created but sign-in failed - please sign in.'));
  keep(j); S.username = user; S.display_name = name || user; put(AK, S); }
async function signIn(user, pass, captcha){
  keep(await call('/auth/v1/token?grant_type=password', {method: 'POST', auth: false,
    body: {email: `${user}@${DOM}`, password: pass, gotrue_meta_security: {captcha_token: captcha}}}));
  S.username = user; put(AK, S); }
function forgetLocal(){   // this browser forgets the account's data (it stays in the account)
  S = null; put(AK, null); SY = {}; put(SK, null); VI = {}; put(VK, null); put(PK, null); VER = {}; put(VERK, null); VQ = []; put(VQK, null);
  SO.fr = null; SO.circle = null; SO.badge = {requests: 0, invites: 0}; document.body.classList.remove('socdot');
  window.TICKS && TICKS.set([]); window.MYR && MYR.set([]); }
async function signOut(){
  if (Object.keys(SY.dirty || {}).length || Object.keys(SY.idirty || {}).length) try{ await sync(); }catch(_){}
  try{ await call('/auth/v1/logout', {method: 'POST'}); }catch(_){}
  forgetLocal(); paint(); }

// ---------- climb details (date / route / note), also without an account ----------
const fmtD = d => d ? new Date(d + 'T12:00').toLocaleDateString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {day: 'numeric', month: 'numeric', year: 'numeric'}) : '';
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const relist = () => window.TICKS && TICKS.set([...TICKS.get()]);
window.VINFO = {
  get: id => VI[id] || null, today,
  short: id => { const v = VI[id], g = VER[id] ? ` <span class="vgps" title="${L('Vrh potrjen z GPS','Summit confirmed by GPS')}">✓</span>` : '';
    if (!v || (!v.d && !v.r)) return g; return g + ` <span class="vi">${esc([v.d && fmtD(v.d), v.r].filter(Boolean).join(' · '))}</span>`; },
  set(id, info){ const v = {d: (info.d || '').slice(0, 10) || null, r: (info.r || '').trim().slice(0, 160) || null, n: (info.n || '').trim().slice(0, 1000) || null};
    if (!v.d && !v.r && !v.n) delete VI[id]; else VI[id] = v; put(VK, VI);
    if (S){ SY.idirty = SY.idirty || {}; SY.idirty[id] = 1; saveSY(); setState('wait'); schedule(); } relist(); } };
window.climbedVia = (id, label) => { const p = byId[id]; if (!p) return;
  if (!visited.has(id)) toggleV(id, true);
  VINFO.set(id, Object.assign({}, VI[id] || {}, {r: label, d: (VI[id] && VI[id].d) || today()}));
  toast(`✓ ${p.name}: ${label}`); };
// in the peak window, under "Obiskal sem": "📅 12. 8. 2026 · iz Krme · Tominškova pot ✎", editable
window.visitBox = (p, cb) => {
  const box = document.createElement('div'); box.className = 'vbox';
  // "☐ danes": one tap = climbed today (no date is set by ticking alone)
  const todayBox = (checked, cls) => `<label class="vtd ${cls || ''}"><input type="checkbox" ${checked ? 'checked' : ''}> ${L('danes','today')}</label>`;
  const show = () => { const v = VI[p.id];
    if (!cb.checked){ box.innerHTML = ''; if (VER[p.id]){ delete VER[p.id]; put(VERK, VER); } return; }
    const has = v && (v.d || v.r || v.n);
    box.innerHTML = has ? `<span class="vtxt">📅 ${esc([v.d ? fmtD(v.d) : L('brez datuma','no date'), v.r].filter(Boolean).join(' · '))}${v.n ? ` · <i>${esc(v.n)}</i>` : ''}</span> <a class="vlnk">✎</a>${!v.d ? ' ' + todayBox(false, 'q') : ''}`
      : `<a class="vlnk">📅 ${L('dodaj datum in pot', 'add date and route')}</a> ${todayBox(false, 'q')}`;
    if (VER[p.id]) box.insertAdjacentHTML('afterbegin', `<div class="vgl"><span class="vgps">✓</span> ${L('Potrjeno z GPS','Confirmed by GPS')} · ${esc(new Date(VER[p.id]).toLocaleString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}))}</div>`);
    box.querySelector('.vlnk').onclick = edit;
    const q = box.querySelector('.vtd.q input'); if (q) q.onchange = () => { if (q.checked){ VINFO.set(p.id, Object.assign({}, VI[p.id] || {}, {d: today()})); show(); } }; };
  const edit = async () => { const v = VI[p.id] || {}, lid = 'vrl' + Math.random().toString(36).slice(2), isT = v.d === today();
    box.innerHTML = `<div class="vform"><label>${L('Datum','Date')}<span class="vdr"><input type="date" class="vd" max="${today()}" value="${esc(v.d || '')}">${todayBox(isT)}</span></label>
      <label>${L('Pot','Route')}<input type="text" class="vr" list="${lid}" maxlength="160" value="${esc(v.r || '')}" placeholder="${L('npr. iz Krme','e.g. from Krma')}"><datalist id="${lid}"></datalist></label>
      <label>${L('Opomba','Note')}<input type="text" class="vn" maxlength="200" value="${esc(v.n || '')}"></label>
      <div class="vb"><button class="vs">${L('Shrani','Save')}</button><button class="vc">${L('Prekliči','Cancel')}</button></div></div>`;
    const vd = box.querySelector('.vd'), td = box.querySelector('.vtd input');
    td.onchange = () => { vd.value = td.checked ? today() : ''; }; vd.oninput = () => { td.checked = vd.value === today(); };
    box.querySelector('.vs').onclick = () => { VINFO.set(p.id, {d: vd.value, r: box.querySelector('.vr').value, n: box.querySelector('.vn').value}); show(); };
    box.querySelector('.vc').onclick = show;
    try{ const names = window.__peakRouteNames ? await window.__peakRouteNames(p.id) : []; const dl = box.querySelector('datalist');
      if (dl) dl.innerHTML = [...new Set(names)].map(n => `<option value="${esc(n)}">`).join(''); }catch(_){} };
  cb.addEventListener('change', () => setTimeout(show, 0)); show(); return box; };

// ---------- 📍 GPS summit check (only in the Android app: the phone's location, also with the screen off) ----------
// Within 50 m of a summit (GPS accuracy 50 m or better, height roughly right) the peak is ticked and marked ✓ "confirmed by GPS".
// With an account the fix goes to the server (verify_ascent, 07_verify.sql), which checks it again; without signal it waits.
// The app loads this page from the web, so only Capacitor's native bridge is there (no @capacitor/core): no registerPlugin ->
// plugins are called through the bridge's nativePromise / nativeCallback (what registerPlugin does inside).
const CAPN = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()), IN_APP = CAPN || / Dvat2000App/.test(navigator.userAgent);
const capPlugin = (name, cbMethods = []) => { const C = window.Capacitor; if (!C) return null;
  if (C.registerPlugin) return C.registerPlugin(name);
  if (!C.nativePromise) return null;
  return new Proxy({}, {get: (_, m) => (opts, cb) => cbMethods.includes(m) ? Promise.resolve(C.nativeCallback(name, m, opts || {}, cb)) : C.nativePromise(name, m, opts || {})}); };
const BGL = CAPN ? capPlugin('BackgroundGeolocation', ['addWatcher']) : null, LNO = CAPN ? capPlugin('LocalNotifications') : null;
const hav = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); };
function gpsFix(l){ gAcc = l.accuracy; gpsUI(); if (!(l.accuracy <= 50)) return;
  let best = null, bd = 50; for (const p of PEAKS){ if (p.lat == null || p.coord_status !== 'ok' || Math.abs(p.lat - l.latitude) > .002) continue;
    const d = hav(l.latitude, l.longitude, p.lat, p.lon); if (d <= bd){ bd = d; best = p; } }
  if (!best || VER[best.id]) return;
  if (l.altitude != null && Math.abs(l.altitude - best.elev) > 150) return;   // GPS height is rough (and above the ellipsoid, ~+47 m here)
  const at = new Date(l.time || Date.now()).toISOString();
  VER[best.id] = at; put(VERK, VER); VQ.push({pid: best.id, lat: l.latitude, lon: l.longitude, acc: Math.round(l.accuracy), at}); put(VQK, VQ);
  if (!visited.has(best.id)) toggleV(best.id, true);
  VINFO.set(best.id, Object.assign({}, VI[best.id] || {}, {d: (VI[best.id] && VI[best.id].d) || at.slice(0, 10)}));
  toast(`📍 ${best.name} — ${L('vrh potrjen z GPS!','summit confirmed by GPS!')}`); if (S) schedule(500);
  if (LNO && document.hidden) LNO.schedule({notifications: [{id: Math.floor(Date.now() / 1000) % 2e9, title: `📍 ${best.name}`, body: L('Vrh potrjen z GPS! ✓', 'Summit confirmed by GPS! ✓')}]}).catch(() => {}); }
async function flushVQ(){ if (!VQ.length) return; const keep = [];
  for (const q of VQ){ try{ await rpc('verify_ascent', q, true); }
    catch(e){ const m = String(e.message || ''); if (/too far|inaccurate|unknown peak|bad time/.test(m)){ delete VER[q.pid]; continue; }   // the server says no
      keep.push(q); if (e.status === 401) throw e; } }
  VQ = keep; put(VQK, VQ); put(VERK, VER); }
async function gpsStart(){ if (gWatch) return;
  if (!BGL){ toastErr(L('GPS vtičnik aplikacije ni dosegljiv — namesti najnovejšo različico aplikacije (Nastavitve → 📱 Android aplikacija).', 'The app\'s GPS plugin is not reachable — install the latest app version (Settings → 📱 Android app).')); return; }
  try{ await LNO.requestPermissions(); }catch(_){}   // Android 13+: needed for the notification while tracking
  try{ gWatch = await BGL.addWatcher({backgroundTitle: L('Spremljam vrhove', 'Watching for summits'), backgroundMessage: L('Ko prideš na vrh, ga potrdim z GPS.', 'When you reach a summit it is confirmed by GPS.'),
      requestPermissions: true, stale: false, distanceFilter: 10}, (loc, err) => {
      if (err){ if (err.code === 'NOT_AUTHORIZED'){ gpsStop(); toastErr(L('Dovoli dostop do lokacije (nastavitve telefona → aplikacije → 2000-čaki).', 'Allow location access (phone settings → apps → 2000-čaki).')); try{ BGL.openSettings(); }catch(_){} } return; }
      if (loc) gpsFix(loc); });
    put(GTK, 1); toast(L('📍 Spremljam vrhove — na vrhu se potrdi sam.', '📍 Watching for summits — confirmed automatically on top.')); }
  catch(e){ gWatch = null; toastErr(L('GPS ni na voljo: ', 'GPS not available: ') + (e.message || e)); }
  gpsUI(); }
async function gpsStop(){ const id = gWatch; gWatch = null; gAcc = null; put(GTK, 0); if (id) try{ await BGL.removeWatcher({id}); }catch(_){} gpsUI(); }
const gPill = document.createElement('button'); gPill.id = 'gpsPill'; document.body.append(gPill);
gPill.onclick = () => { if (gWatch && confirmTwice(gPill)) gpsStop(); };
function gpsUI(){ document.body.classList.toggle('gpson', !!gWatch);
  gPill.innerHTML = gWatch ? `📍 ${L('Spremljam vrhove','Watching summits')}${gAcc != null ? ` · ±${Math.round(gAcc)} m` : ''}` : ''; }
if (BGL && get(GTK)) setTimeout(gpsStart, 1500);
// app updates: the page inside the app is always the newest website; the app shell itself (APK) is checked once a day against the
// latest GitHub release and, if newer, a bar offers the download (Android then asks once to install it over the old one - an app
// from outside Google Play cannot replace itself silently). The APK tells its version in the user agent (" Dvat2000App/1.0.N").
if (IN_APP) setTimeout(async () => { const mine = (navigator.userAgent.match(/ Dvat2000App\/([\d.]+)/) || [])[1] || '0', K = 'dvat3d_appchk';
  const c = get(K); let latest = c && Date.now() - c.t < 864e5 ? c.v : null;
  if (!latest) try{ const j = await (await fetch('https://api.github.com/repos/taskrti76/Slovenija2k-Challenge/releases/latest')).json(); latest = String(j.tag_name || '').replace(/^app-v/, ''); put(K, {t: Date.now(), v: latest}); }catch(_){ return; }
  const n = v => v.split('.').map(Number), newer = (a, b) => { const x = n(a), y = n(b); for (let i = 0; i < 3; i++){ if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  if (!latest || !newer(latest, mine) || get('dvat3d_appskip') === latest) return;
  const bar = document.createElement('div'); bar.id = 'appUpd';
  bar.innerHTML = `📱 ${L(`Nova različica aplikacije (${esc(latest)})`, `New app version (${esc(latest)})`)} <a href="https://github.com/taskrti76/Slovenija2k-Challenge/releases/latest/download/dvatisocaki.apk">${L('Posodobi','Update')}</a><button aria-label="${L('Zapri','Close')}">×</button>`;
  bar.querySelector('button').onclick = () => { put('dvat3d_appskip', latest); bar.remove(); };
  bar.querySelector('a').onclick = () => setTimeout(() => { bar.innerHTML = L('Prenašam … ko se prenese, tapni obvestilo in »Namesti«.', 'Downloading … when done, tap the notification and "Install".'); setTimeout(() => bar.remove(), 9000); }, 100);
  document.body.append(bar); }, 4000);

// ---------- sync ----------
let syncing = false, again = false, syncT = 0, state = '';
const saveSY = () => put(SK, SY);
function schedule(ms = 1500){ clearTimeout(syncT); syncT = setTimeout(sync, ms); }
const fresh = () => { if (SY.uid !== S.uid) SY = {uid: S.uid, merged: false}; SY.dirty = SY.dirty || {}; SY.idirty = SY.idirty || {}; SY.known = SY.known || {}; };
window.onTicks = (ids, on) => { if (!S) return; fresh(); ids.forEach(id => SY.dirty[id] = on ? 0 : 1); saveSY(); setState('wait'); schedule(); };
window.onPrefs = () => { put(PK, Date.now()); if (S){ setState('wait'); schedule(); } };
window.onMyRoutes = () => { if (S){ setState('wait'); schedule(); } };
async function syncProfile(){
  let r; try{ r = await call(`/rest/v1/profiles?id=eq.${S.uid}&select=username,display_name,prefs,prefs_at,public,listed`); }
  catch(e){ try{ r = await call(`/rest/v1/profiles?id=eq.${S.uid}&select=username,display_name,prefs,prefs_at,public`); }   // 04 not run yet
    catch(e2){ r = await call(`/rest/v1/profiles?id=eq.${S.uid}&select=username,display_name`); } }   // 02 not run yet
  const pr = r && r[0]; if (!pr) return;
  Object.assign(S, {username: pr.username || S.username, display_name: pr.display_name, public: !!pr.public, listed: pr.listed !== false}); put(AK, S);
  if (!('prefs_at' in pr) || !window.PREFS) return;
  const lt = get(PK) || 0, st = pr.prefs_at ? Date.parse(pr.prefs_at) : 0;
  if (pr.prefs && st > lt){ PREFS.set(pr.prefs); put(PK, st); }
  else if (lt > st) await call(`/rest/v1/profiles?id=eq.${S.uid}`, {method: 'PATCH', headers: {Prefer: 'return=minimal'},
    body: {prefs: PREFS.get(), prefs_at: new Date(lt).toISOString()}}); }
async function syncAscents(){
  try{ await flushVQ(); }catch(e){ if (e.status === 401) throw e; }
  let rows, hasV = true; try{ rows = await call('/rest/v1/ascents?select=peak_id,deleted,climbed_on,route_name,note,verified_at&limit=5000'); }
  catch(e){ if (e.status === 401) throw e; hasV = false; rows = await call('/rest/v1/ascents?select=peak_id,deleted,climbed_on,route_name,note&limit=5000'); }   // 07 not run yet
  if (hasV){ const wait = new Set(VQ.map(q => q.pid)); for (const r of rows){ if (r.verified_at && !r.deleted) VER[r.peak_id] = r.verified_at; else if (!wait.has(r.peak_id)) delete VER[r.peak_id]; } put(VERK, VER); }
  rows.forEach(r => { if (ID_MOVED[r.peak_id]) r.peak_id = ID_MOVED[r.peak_id]; });   // merged duplicate (until 03_peaks.sql moves it in the account)
  const srv = new Map(rows.map(r => [r.peak_id, r]));
  if (!SY.merged){   // first login in this browser: what was ticked / noted here before goes into the account
    for (const id of TICKS.get()){ const r = srv.get(id); if ((!r || r.deleted) && !(id in SY.dirty)) SY.dirty[id] = 0; }
    for (const id in VI){ const r = srv.get(id); if (!r || (!r.climbed_on && !r.route_name && !r.note)) SY.idirty[id] = 1; }
    SY.merged = true; saveSY(); }
  for (const [id, r] of srv) if (!SY.idirty[id]){   // details from the account (another device) unless changed here
    if (r.climbed_on || r.route_name || r.note) VI[id] = {d: r.climbed_on, r: r.route_name, n: r.note}; else delete VI[id]; }
  put(VK, VI);
  const local = TICKS.get(), ids = [...new Set([...Object.keys(SY.dirty), ...Object.keys(SY.idirty)])];
  const up = ids.map(id => { const v = VI[id] || {}, srvOn = srv.get(id) && !srv.get(id).deleted;
    const on = id in SY.dirty ? SY.dirty[id] === 0 : (local.has(id) || srvOn);
    return {user_id: S.uid, peak_id: id, deleted: !on, climbed_on: v.d || null, route_name: v.r || null, note: v.n || null, _d: SY.dirty[id], _i: SY.idirty[id]}; });
  for (let i = 0; i < up.length; i += 500){ const part = up.slice(i, i + 500);
    await call('/rest/v1/ascents?on_conflict=user_id,peak_id', {method: 'POST', headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
      body: part.map(({_d, _i, ...r}) => r)});
    for (const r of part){ srv.set(r.peak_id, r); if (SY.dirty[r.peak_id] === r._d) delete SY.dirty[r.peak_id]; if (SY.idirty[r.peak_id] === r._i) delete SY.idirty[r.peak_id]; } }
  saveSY();
  // the page shows the account + changes made here that are not sent yet (a tick during this sync stays)
  const want = new Set([...srv].filter(([, r]) => !r.deleted).map(([k]) => k));
  for (const [id, d] of Object.entries(SY.dirty)) d ? want.delete(id) : want.add(id);
  const now = TICKS.get(); if (want.size !== now.size || [...want].some(id => !now.has(id))) TICKS.set([...want]); else relist(); }
async function syncRoutes(){
  if (!window.MYR) return;
  const rows = await call('/rest/v1/routes?select=id,name,line,km,visibility,share_token,deleted,updated_at&limit=1000');
  let MY = MYR.get().slice(); const byRid = new Map(MY.map(r => [r.id, r])), seen = new Set();
  if (!SY.merged_r){ MY.forEach(r => { if (!r.id) r.id = MYR.newId(); r.sat = 0; }); SY.merged_r = true; }
  for (const s of rows){ seen.add(s.id); const l = byRid.get(s.id), dirty = l && (l.date || 0) > (l.sat || 0);
    if (s.deleted){ if (l && !dirty) MY = MY.filter(x => x !== l); delete SY.known[s.id]; continue; }
    if (!l){ if (SY.known[s.id]) continue;   // deleted here, not sent yet
      MY.push({id: s.id, name: s.name, coords: decodeLine(s.line), date: 1, sat: 1, sut: s.updated_at, vis: s.visibility, tok: s.share_token}); SY.known[s.id] = 1; continue; }
    SY.known[s.id] = 1;
    if (!dirty && s.updated_at !== l.sut) Object.assign(l, {name: s.name, coords: decodeLine(s.line), vis: s.visibility, tok: s.share_token, sut: s.updated_at}); }
  // deleted here -> mark deleted in the account
  for (const id of Object.keys(SY.known)) if (!MY.some(r => r.id === id)){
    if (seen.has(id)) await call(`/rest/v1/routes?id=eq.${id}`, {method: 'PATCH', headers: {Prefer: 'return=minimal'}, body: {deleted: true}});
    delete SY.known[id]; }
  // new / changed here -> up
  const up = MY.filter(r => !r.sat || (r.date || 0) > r.sat);
  for (const r of up){ const line = encodeLine(r.coords);
    const res = await call('/rest/v1/routes?on_conflict=id&select=share_token,updated_at', {method: 'POST', headers: {Prefer: 'resolution=merge-duplicates,return=representation'},
      body: [{id: r.id, user_id: S.uid, name: (r.name || 'Pot').slice(0, 120), line, km: +lineKm(r.coords).toFixed(2), peak_ids: routePeaks(r.coords), visibility: r.vis || 'private', deleted: false}]});
    const x = res && res[0]; r.sat = r.date || Date.now(); if (x){ r.tok = x.share_token; r.sut = x.updated_at; } SY.known[r.id] = 1; }
  saveSY(); MYR.set(MY); }
async function sync(){
  if (!S || !window.TICKS) return; if (syncing){ again = true; return; } syncing = true; setState('busy');
  try{ fresh();
    try{ await syncProfile(); }catch(e){ if (e.status === 401) throw e; }
    await syncAscents();
    try{ await syncRoutes(); }catch(e){ if (e.status === 401) throw e; console.warn('routes sync', e); }
    SY.at = Date.now(); saveSY(); paint(); refreshBadge();
    setState(Object.keys(SY.dirty).length || Object.keys(SY.idirty).length ? 'wait' : 'ok');
  }catch(e){ setState(e.status === 401 ? 'out' : 'off'); if (e.status !== 401) schedule(60000); }
  finally { syncing = false; if (again){ again = false; schedule(300); } } }
addEventListener('online', () => S && schedule(200));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S && Date.now() - (SY.at || 0) > 60000) schedule(200); });

// ---------- route lines: encoded polyline (1e-5° ≈ 1 m), length, peaks on the way ----------
function encodeLine(c){ let pts = c; const enc = P => { let out = '', la = 0, lo = 0;
    const e = v => { v = v < 0 ? ~(v << 1) : v << 1; let s = ''; while (v >= 0x20){ s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
    for (const [x, y] of P){ const a = Math.round(y * 1e5), b = Math.round(x * 1e5); out += e(a - la) + e(b - lo); la = a; lo = b; } return out; };
  let s = enc(pts), tol = 2;
  while (s.length > 55000 && tol < 200){ pts = simplify(c, tol); s = enc(pts); tol *= 2; }   // very long lines: thin out (metres)
  return s; }
function decodeLine(s){ const out = []; let i = 0, la = 0, lo = 0; if (!s) return out;
  const d = () => { let r = 0, sh = 0, b; do { b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20); return r & 1 ? ~(r >> 1) : r >> 1; };
  while (i < s.length){ la += d(); lo += d(); out.push([lo / 1e5, la / 1e5]); } return out; }
const hv = (a, b) => { const R = 6371000, r = Math.PI / 180, dla = (b[1] - a[1]) * r, dlo = (b[0] - a[0]) * r;
  const x = Math.sin(dla / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dlo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const lineKm = c => { let m = 0; for (let i = 1; i < c.length; i++) m += hv(c[i - 1], c[i]); return m / 1000; };
function simplify(c, tol){ if (c.length < 3) return c; const keep = new Uint8Array(c.length); keep[0] = keep[c.length - 1] = 1; const st = [[0, c.length - 1]];
  const kx = 111320 * Math.cos(c[0][1] * Math.PI / 180), ky = 110540;
  while (st.length){ const [a, b] = st.pop(); let mx = 0, mi = -1; const ax = c[a][0] * kx, ay = c[a][1] * ky, bx = c[b][0] * kx, by = c[b][1] * ky, L2 = (bx - ax) ** 2 + (by - ay) ** 2;
    for (let i = a + 1; i < b; i++){ const px = c[i][0] * kx, py = c[i][1] * ky; let t = L2 ? ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay)); if (d > mx){ mx = d; mi = i; } }
    if (mx > tol){ keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return c.filter((_, i) => keep[i]); }
function routePeaks(c){ if (!c || !c.length) return []; let w = 180, s = 90, e = -180, n = -90;
  for (const [x, y] of c){ if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  const out = []; for (const p of PEAKS){ if (p.lat == null || p.lon < w - 0.003 || p.lon > e + 0.003 || p.lat < s - 0.002 || p.lat > n + 0.002) continue;
    for (const q of c) if (hv(q, [p.lon, p.lat]) < 120){ out.push(p.id); break; } if (out.length >= 50) break; }
  return out; }

// ---------- look ----------
const css = document.createElement('style'); css.textContent = `
#accBox{margin:0 0 4px}
#accBox .tabs{display:flex;border:1px solid #c9cfcc;border-radius:9px;overflow:hidden;margin:0 0 6px}
#accBox .tabs button{flex:1;border:0;background:#fff;color:#1d2321;font:600 1em system-ui,sans-serif;padding:8px;cursor:pointer}
#accBox .tabs button.on{background:#1d2321;color:#fff}
#accBox label.f{display:block;font-weight:600;font-size:.9em;margin:9px 0 3px}
#accBox input[type=text],#accBox input[type=password]{width:100%;box-sizing:border-box;font:inherit;padding:9px 10px;border:1px solid #b9c1bd;border-radius:8px;background:#fff;color:#1d2321}
#accBox input:focus{outline:2px solid #1565c0;outline-offset:-1px}
#accBox .ah{font-size:.8em;color:#5b6461;margin-top:3px;line-height:1.35}
#accBox .warn{font-size:.82em;background:#fff6e0;border:1px solid #f0d58a;border-radius:8px;padding:7px 9px;margin:10px 0 0;color:#5a4400}
#accBox .err{color:#b3261e;font-size:.88em;min-height:1.1em;margin:6px 0 0}
#accBox .go{width:100%;margin-top:8px;padding:10px;border-radius:9px;border:0;background:#1d2321;color:#fff;font:600 1em system-ui,sans-serif;cursor:pointer}
#accBox .go:disabled{opacity:.5;cursor:default}
#accBox .alt{padding:8px 12px;border-radius:9px;border:1px solid #8a948f;background:#fff;color:#1d2321;font:600 .92em system-ui,sans-serif;cursor:pointer}
#accBox .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
#accBox .danger{border-color:#d9a5a1;color:#b3261e}
#accBox #accSoc{width:100%;text-align:left}
#fab{position:absolute;z-index:9;left:calc(var(--lw,0px) + 16px);bottom:58px;width:54px;height:54px;transition:left .25s}
#fab .fb{position:absolute;inset:0;border-radius:50%;border:0;background:#1d2321;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35);transition:transform .2s;z-index:2}
#fab .fb:hover{filter:brightness(1.15)}#fab.open .fb{transform:rotate(90deg);background:#c62828}#fab .fb .bdg{position:absolute;top:-2px;right:-4px;margin:0}
#fab .fo{position:absolute;left:3px;top:3px;width:48px;height:48px;border-radius:50%;border:0;background:#fff;color:#1d2321;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.3);
  display:flex;align-items:center;justify-content:center;transform:translate(0,0) scale(.3);opacity:0;transition:transform .22s cubic-bezier(.3,1.4,.6,1),opacity .15s;padding:0}
#fab.open .fo{transform:translate(var(--x),var(--y)) scale(1);opacity:1}
#fab .fo .oi{font-size:21px;line-height:1}#fab .fo .ol{position:absolute;top:calc(100% + 2px);left:50%;transform:translateX(-50%);white-space:nowrap;font:600 11px system-ui,sans-serif;color:#1d2321;
  background:rgba(255,255,255,.92);border-radius:6px;padding:1px 5px;pointer-events:none}
#fab .fo .bdg{position:absolute;top:-3px;right:-5px;margin:0}
#fab.open .fo:hover,#fab.open .fo:focus-visible,#fab.open .fo:active{background:#1976d2;color:#fff;z-index:6;transform:translate(var(--x),var(--y)) scale(1.18);box-shadow:0 6px 18px rgba(25,118,210,.45);outline:none}
#fab .fo:hover .ol,#fab .fo:focus-visible .ol,#fab .fo:active .ol{background:#1976d2;color:#fff}
#fabBg{position:fixed;inset:0;z-index:8;background:rgba(0,0,0,.18);display:none}#fabBg.on{display:block}
body.in360 #fab,body.drawing #fab{display:none}
@media (max-width:700px){ #fab{left:calc(12px + env(safe-area-inset-left));bottom:calc(var(--tab) + 14px)} body.menu #fab{display:none} }
#accBox .ts{margin-top:10px;min-height:65px}
#accBox .me{display:flex;gap:12px;align-items:center;margin:2px 0 6px}
#accBox .av{width:42px;height:42px;border-radius:50%;background:#1565c0;color:#fff;display:flex;align-items:center;justify-content:center;font:700 1.15em system-ui,sans-serif;flex:none}
#accBox .st{font-size:.85em;color:#5b6461}
#accBox .chk{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;font-size:.92em;font-weight:400}
#accBox .chk input{margin-top:3px}
#dfoot .fnote{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#accBox .ah a{color:#1565c0}
#dfoot .fnote a,.vlnk,.prt a{color:inherit;text-decoration:underline;cursor:pointer}
.it .nm .vi{color:var(--mute);font-size:.82em;margin-left:6px}
.vgps{display:inline-flex;align-items:center;justify-content:center;width:1.25em;height:1.25em;border-radius:50%;background:#1976d2;color:#fff;font-size:.72em;font-weight:800;vertical-align:.1em}
.vgl{font-size:.88em;color:#1565c0;font-weight:600;margin:2px 0 4px}
#gpsPill{display:none;position:fixed;z-index:25;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);border:0;border-radius:999px;background:#1976d2;color:#fff;font:600 13px system-ui,sans-serif;padding:6px 12px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
body.gpson #gpsPill{display:block}
#gpsPill.sure{background:#c62828}
#appUpd{position:fixed;z-index:26;left:50%;transform:translateX(-50%);bottom:calc(var(--tab,0px) + 14px + env(safe-area-inset-bottom));background:#1d2321;color:#fff;border-radius:12px;padding:9px 10px 9px 14px;font:600 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center;max-width:calc(100% - 24px)}
#appUpd a{background:#43a047;color:#fff;border-radius:8px;padding:5px 10px;text-decoration:none}#appUpd button{border:0;background:none;color:#fff;font-size:20px;cursor:pointer;opacity:.7}
.vbox{font-size:.88em;margin:2px 0 0 22px;color:#3d4643}.vbox .vlnk{color:#1565c0}
.vform label{display:block;font-size:.85em;margin:5px 0 0;color:#5b6461}.vform input{display:block;width:100%;box-sizing:border-box;font:inherit;padding:4px 6px;border:1px solid #b9c1bd;border-radius:6px;margin-top:1px}
.vform .vb{display:flex;gap:6px;margin-top:6px}
.vdr{display:flex;gap:8px;align-items:center}.vdr input[type=date]{flex:1}.vtd{display:inline-flex!important;gap:4px;align-items:center;white-space:nowrap;margin:0!important;color:#3d4643!important;font-size:.92em!important}.vtd input{width:auto!important;display:inline!important;margin:0!important}
.prt{font-size:.86em;margin-top:6px;border-top:1px solid #e3e7e5;padding-top:5px;color:#3d4643}.prt b{font-weight:600}.prt div{margin:2px 0}
#accWin{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:12px}
#accWin.on{display:flex}
#accWin .acard{background:#fff;color:#1d2321;border-radius:14px;width:min(460px,100%);max-height:100%;overflow:auto;padding:16px 18px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-size:calc(14px*var(--ui,1))}
#accWin h3{margin:0 0 8px;font-size:1.2em}#accWin .x{float:right;border:0;background:none;font-size:1.7em;line-height:1;cursor:pointer;color:#666}
#accWin .sub{color:#5b6461;font-size:.88em;margin:0 0 10px}
#accWin table{width:100%;border-collapse:collapse;font-size:.92em}#accWin td{padding:6px 4px;border-bottom:1px solid #eef1ef}#accWin td.n{text-align:right;white-space:nowrap;color:#3d4643}
#accWin tr.u{cursor:pointer}#accWin tr.u:hover{background:#f3f6f4}#accWin tr.me{background:#e8f0fb}
#accWin .pk{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #eef1ef;cursor:pointer}#accWin .pk span{color:#5b6461;font-size:.86em;text-align:right}
#accWin .opt{display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid #d6dbd8;border-radius:9px;margin:6px 0;cursor:pointer}
#accWin .opt.on{border-color:#1565c0;background:#eef4fc}#accWin .opt small{display:block;color:#5b6461}
#accWin .lnkbox{display:flex;gap:6px;margin-top:10px}#accWin .lnkbox input{flex:1;min-width:0;font:inherit;font-size:.85em;padding:7px;border:1px solid #b9c1bd;border-radius:8px}
#accWin .lnkbox button,#accWin .b{border:0;border-radius:8px;background:#1d2321;color:#fff;font:600 .9em system-ui,sans-serif;padding:7px 12px;cursor:pointer}
#shCard{position:absolute;left:50%;bottom:calc(64px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:8;background:#fff;color:#1d2321;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.28);padding:10px 12px;font-size:calc(13px*var(--ui,1));max-width:calc(100% - 24px);display:none}
#shCard.on{display:block}#shCard .r{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}#shCard button{border:1px solid #8a948f;border-radius:8px;background:#fff;font:600 .92em system-ui,sans-serif;padding:5px 9px;cursor:pointer}
#shCard .x{float:right;border:0;font-size:1.4em;line-height:1;padding:0 0 0 8px}
@media (max-width:700px){ #accWin{padding:0;align-items:stretch} #accWin .acard{border-radius:0;width:100%;padding-bottom:calc(18px + env(safe-area-inset-bottom))} }`;
document.head.append(css);

// ---------- account section inside ⚙ Nastavitve ----------
const box = $a('accBox'), setWin = $a('setWin');
let mode = 'in', tsId = null, tsTok = '';
const settingsOpen = () => setWin && setWin.classList.contains('on');
window.openAccount = m => { if (m) mode = m; (window.openSettings || (() => {}))(); draw(); setTimeout(() => box && box.scrollIntoView({block: 'start'}), 30); };
let tsP = null;
const tsLoad = () => tsP || (tsP = new Promise((res, rej) => { const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = res; s.onerror = () => { tsP = null; rej(new Error('turnstile')); };
  document.head.append(s); }));
const tsRemove = () => { if (tsId != null && window.turnstile) try{ turnstile.remove(tsId); }catch(_){} tsId = null; tsTok = ''; };
async function tsMount(){ const el = $a('accTs'); if (!el || tsId != null || !settingsOpen()) return; tsTok = '';
  try{ await tsLoad(); if (!document.contains(el) || tsId != null) return;
    tsId = turnstile.render(el, {sitekey: TS_KEY, language: window.LANG === 'en' ? 'en' : 'auto', appearance: 'always',
      callback: t => { tsTok = t; ready(); }, 'expired-callback': () => { tsTok = ''; ready(); }, 'error-callback': () => { tsTok = ''; ready(); }}); }
  catch(_){ el.innerHTML = `<div class="err">${L('Preverjanja »nisem robot« ni bilo mogoče naložiti (blokator oglasov?).', 'The "not a robot" check could not load (ad blocker?).')}</div>`; } }
const tsReset = () => { tsTok = ''; if (tsId != null && window.turnstile) try{ turnstile.reset(tsId); }catch(_){} ready(); };
function ready(){ const b = $a('accGo'); if (b) b.disabled = !tsTok; }
// Turnstile only while the settings window is open
if (setWin) new MutationObserver(() => { if (settingsOpen()){ if (!S) tsMount(); } else tsRemove(); }).observe(setWin, {attributes: true, attributeFilter: ['class']});

function draw(){
  if (!box) return; tsRemove();
  if (S){ const nm = S.display_name || S.username || '?', link = `${location.origin}${location.pathname}?u=${encodeURIComponent(S.username || '')}`;
    box.innerHTML = `<div class="me"><div class="av">${esc((nm.trim()[0] || '?').toUpperCase())}</div><div><b>${esc(nm)}</b><div class="st">@${esc(S.username || '')}</div></div></div>
      <div class="st" id="accSt"></div>
      <label class="f" for="accName">${L('Prikazno ime','Display name')}</label><input type="text" id="accName" maxlength="40" value="${esc(S.display_name || '')}">
      <label class="chk"><input type="checkbox" id="accList" ${S.listed !== false ? 'checked' : ''}><span>${L('Prikaži me na lestvici (ime in število osvojenih vrhov)','Show me on the leaderboard (name and number of climbed peaks)')}</span></label>
      <label class="chk"><input type="checkbox" id="accPub" ${S.public ? 'checked' : ''}><span>${L('Javni profil: drugi vidijo seznam mojih vrhov z datumi in potmi','Public profile: others can see my list of peaks with dates and routes')}</span></label>
      ${S.public ? `<div class="ah">${L('Povezava do profila:','Profile link:')} <a href="${esc(link)}" target="_blank">${esc(link.replace(/^https?:\/\//, ''))}</a></div>` : ''}
      <div class="err" id="accErr"></div>
      <div class="row"><button class="alt" id="accSoc">👥 ${L('Prijatelji in skupine','Friends & groups')}${badgeN() ? ` <i class="bdg">${badgeN()}</i>` : ''}</button></div>
      <div class="row"><button class="alt" id="accSave">${L('Shrani','Save')}</button><button class="alt" id="accOut">${L('Odjava','Log out')}</button><button class="alt" id="accExp">⬇ ${L('Izvozi moje podatke','Export my data')}</button></div>
      <div class="ah">${L('Ob odjavi ta brskalnik pozabi tvoje kljukice in poti – ostanejo v računu.','On log-out this browser forgets your ticks and routes - they stay in your account.')}</div>
      <div class="ah" style="margin-top:6px"><a href="privacy.html" target="_blank">${L('Zasebnost – kaj shranjujemo','Privacy - what we store')}</a></div>
      <details style="margin-top:10px"><summary style="cursor:pointer;color:#b3261e;font-size:.9em">${L('Izbriši račun','Delete account')}</summary>
        <div class="ah">${L('Izbriše račun, vrhove, poti, prijateljstva in članstva v skupinah. Za potrditev vpiši uporabniško ime.','Deletes the account, peaks, routes, friendships and group memberships. Type your username to confirm.')}</div>
        <input type="text" id="accDelU" autocomplete="off" placeholder="${esc(S.username || '')}"><div class="row"><button class="alt danger" id="accDel">${L('Trajno izbriši','Delete for good')}</button></div></details>`;
    paintState();
    $a('accSave').onclick = async () => { const v = $a('accName').value.trim().slice(0, 40), pub = $a('accPub').checked, lst = $a('accList').checked; $a('accErr').textContent = '';
      const patch = body => call(`/rest/v1/profiles?id=eq.${S.uid}`, {method: 'PATCH', body, headers: {Prefer: 'return=minimal'}});
      try{ try{ await patch({display_name: v || null, public: pub, listed: lst}); }
        catch(e){ if (lst !== (S.listed !== false)) throw e; await patch({display_name: v || null, public: pub}); }   // 04 not run yet
        S.display_name = v; S.public = pub; S.listed = lst; put(AK, S); paint(); draw(); toast(L('Shranjeno.', 'Saved.')); }catch(e){ $a('accErr').textContent = errText(e); } };
    $a('accSoc').onclick = () => { (window.closeSettings || (() => {}))(); soOpen(SO.badge.requests || !SO.badge.invites ? 'fr' : 'gr'); };
    $a('accOut').onclick = async () => { $a('accOut').disabled = true; await signOut(); draw(); };
    $a('accExp').onclick = async () => { $a('accErr').textContent = '';
      try{ const [pr, asc, rts] = await Promise.all([call(`/rest/v1/profiles?id=eq.${S.uid}&select=*`), call('/rest/v1/ascents?select=*&limit=5000'), call('/rest/v1/routes?select=*&limit=1000')]);
        const [fr, gr] = await Promise.all([rpc('my_friends', {}, true).catch(() => null), rpc('my_groups', {}, true).catch(() => null)]);
        const blob = new Blob([JSON.stringify({exported: new Date().toISOString(), profile: pr && pr[0], ascents: asc, routes: rts, friends: fr, groups: gr}, null, 1)], {type: 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dvatisocaki-${S.username}-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }catch(e){ $a('accErr').textContent = errText(e); } };
    $a('accDel').onclick = async () => { if ($a('accDelU').value.trim().toLowerCase() !== S.username){ $a('accErr').textContent = L('Uporabniško ime se ne ujema.', 'Username does not match.'); return; }
      try{ await rpc('delete_me', {}, true); forgetLocal(); paint(); draw(); toast(L('Račun je izbrisan.', 'Account deleted.')); }catch(e){ $a('accErr').textContent = errText(e); } };
    return; }
  const up = mode === 'up';
  box.innerHTML = `<div class="ah" style="margin:0 0 8px">${L('Neobvezno. Z računom imaš vrhove, poti in nastavitve na telefonu in računalniku ter lahko deliš poti.','Optional. With an account your peaks, routes and settings are on your phone and computer, and you can share routes.')}</div>
    <div class="tabs"><button data-m="in" class="${up ? '' : 'on'}">${L('Prijava','Sign in')}</button><button data-m="up" class="${up ? 'on' : ''}">${L('Nov račun','New account')}</button></div>
    <form id="accForm" autocomplete="on">
      <label class="f" for="accU">${L('Uporabniško ime','Username')}</label>
      <input type="text" id="accU" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" required>
      ${up ? `<div class="ah">${L('3–24 znakov: male črke a–z, številke, _ . - (brez šumnikov). Kasneje ga ni mogoče spremeniti.','3–24 characters: a–z, digits, _ . - . Cannot be changed later.')}</div>
      <label class="f" for="accN">${L('Prikazno ime','Display name')} <span style="font-weight:400;color:#5b6461">(${L('neobvezno, lahko s šumniki','optional')})</span></label>
      <input type="text" id="accN" maxlength="40" autocomplete="nickname">` : ''}
      <label class="f" for="accP">${L('Geslo','Password')}</label>
      <input type="password" id="accP" name="password" autocomplete="${up ? 'new-password' : 'current-password'}" required>
      ${up ? `<label class="f" for="accP2">${L('Ponovi geslo','Repeat password')}</label><input type="password" id="accP2" autocomplete="new-password" required>
      <div class="warn">${L('Gesla ne moremo poslati po e-pošti, ker računi nimajo e-pošte – zapiši si ga ali uporabi upravitelja gesel.','We cannot email your password - accounts have no email. Write it down or use a password manager.')}</div>
      <div class="ah" style="margin-top:6px">${L('Na lestvici boš prikazan z imenom in številom vrhov – to lahko izklopiš v nastavitvah računa. Seznam vrhov z datumi je zaseben, dokler ne vklopiš javnega profila.','You will appear on the leaderboard with your name and number of peaks - you can turn that off in your account settings. Your list of peaks with dates stays private unless you make your profile public.')}</div>` : ''}
      <div class="ts" id="accTs"></div>
      <div class="err" id="accErr"></div>
      <button class="go" id="accGo" type="submit" disabled>${up ? L('Ustvari račun','Create account') : L('Prijava','Sign in')}</button>
    </form>
    ${up ? '' : `<div class="ah" style="margin-top:8px">${L('Pozabljeno geslo? Piši skrbniku strani.','Forgot your password? Contact the site admin.')}</div>`}
    <div class="ah" style="margin-top:6px"><a href="privacy.html" target="_blank">${L('Zasebnost – kaj shranjujemo','Privacy - what we store')}</a></div>`;
  box.querySelector('.tabs').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.m !== mode){ mode = b.dataset.m; draw(); } };
  $a('accU').oninput = e => { const v = e.target.value.toLowerCase().replace(/\s/g, ''); if (v !== e.target.value) e.target.value = v; };
  $a('accForm').onsubmit = async e => { e.preventDefault(); const err = $a('accErr'); err.textContent = '';
    const u = $a('accU').value.trim().toLowerCase(), p = $a('accP').value;
    if (!USER_RE.test(u)){ err.textContent = L('Uporabniško ime: 3–24 znakov a–z, 0–9, _ . - (pika ne na začetku ali koncu).', 'Username: 3–24 of a–z, 0–9, _ . - (no dot at the start or end).'); return; }
    if (up && p.length < 8){ err.textContent = L('Geslo naj ima vsaj 8 znakov.', 'Password: at least 8 characters.'); return; }
    if (up && p !== $a('accP2').value){ err.textContent = L('Gesli se ne ujemata.', 'Passwords do not match.'); return; }
    if (!tsTok){ err.textContent = L('Najprej potrdi, da nisi robot.', 'Confirm you are not a robot first.'); return; }
    const go = $a('accGo'); go.disabled = true; go.textContent = '…';
    try{ up ? await signUp(u, p, ($a('accN').value || '').trim().slice(0, 40), tsTok) : await signIn(u, p, tsTok);
      fresh(); saveSY(); paint(); draw(); await sync(); draw();
      toast(up ? L('Račun je ustvarjen. Vrhovi, poti in nastavitve se shranjujejo vanj.', 'Account created. Peaks, routes and settings are now saved to it.') : L('Prijavljen si.', 'Signed in.'));
    }catch(e2){ err.textContent = errText(e2); go.textContent = up ? L('Ustvari račun','Create account') : L('Prijava','Sign in'); tsReset(); } };
  if (settingsOpen()) tsMount(); }

// sync state line (account section, peak list footer)
function setState(s){ state = s; paintState(); paintFoot(); }
const stateText = () => ({busy: L('☁ shranjujem …', '☁ saving …'), wait: L('☁ čaka na pošiljanje', '☁ waiting to send'),
  off: L('☁ brez povezave – shranim, ko bo spet na voljo', '☁ offline - will save when back online'), out: L('☁ seja je potekla – prijavi se znova', '☁ session ended - sign in again'),
  ok: L('☁ shranjeno v računu', '☁ saved to your account') + (SY.at ? ' · ' + new Date(SY.at).toLocaleTimeString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {hour: '2-digit', minute: '2-digit'}) : '')}[state] || '');
function paintState(){ const el = $a('accSt'); if (el) el.textContent = stateText(); }
function paintFoot(){ const f = document.querySelector('#dfoot .fnote'); if (!f) return;
  if (S){ const t = SY.at ? new Date(SY.at).toLocaleTimeString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
    const sh = {busy: '☁ …', wait: '☁ ⏳', off: L('☁ brez povezave', '☁ offline'), out: L('☁ prijavi se', '☁ sign in'), ok: '☁ ✓ ' + t}[state] || '☁';
    f.innerHTML = `<a id="accFoot">👤 ${esc(S.display_name || S.username || '')}</a> · <span title="${esc(stateText())}">${esc(sh)}</span>`; }
  else f.innerHTML = `${L('shranjeno v brskalniku', 'saved in this browser')} · <a id="accFoot">${L('prijava', 'sign in')}</a>`;
  $a('accFoot').onclick = () => openAccount('in'); }
function paint(){ paintFoot(); socBtns(); if (box && !box.querySelector('#accForm')) draw(); }
// ---------- ◉ round menu (bottom left of the map): settings, account, leaderboard, friends, groups, guide ----------
// tap -> the options pop out around it on an arc; tap outside / Esc / the button again -> closed
const fab = document.createElement('div'); fab.id = 'fab';
fab.innerHTML = `<button class="fb" aria-label="${L('Meni','Menu')}" aria-expanded="false"><span class="fi">☰</span></button>`;
document.body.append(fab);
const fabBg = document.createElement('div'); fabBg.id = 'fabBg'; document.body.append(fabBg);
const fabItems = () => [['⚙', L('Nastavitve','Settings'), () => (window.openSettings || (() => {}))()],
  ['👤', L('Moj profil','My profile'), () => meOpen()],
  ...(innerWidth > 700 ? [['✏️', window.DRAW_ON ? L('Končaj risanje','Stop drawing') : L('Riši pot','Draw route'), () => { const b = document.getElementById('drawBtn'); if (b) b.click(); }]] : []),
  ['🗓', L('Načrtovalnik','Trip planner'), () => window.planOpen && planOpen()],
  ['🏆', L('Lestvica','Leaderboard'), () => leaderboard()],
  ...(S ? [['👥', L('Prijatelji','Friends'), () => soOpen('fr'), SO.badge.requests], ['⛰', L('Skupine','Groups'), () => soOpen('gr'), SO.badge.invites]] : []),
  ...(IN_APP ? [['📍', gWatch ? L('Ustavi GPS','Stop GPS') : L('GPS vrhovi','GPS summits'), () => gWatch ? gpsStop() : gpsStart()]] : []),
  ['❓', L('Vodič','Guide'), () => window.startTour && startTour()]];
function fabClose(){ fab.classList.remove('open'); fabBg.classList.remove('on'); fab.querySelector('.fb').setAttribute('aria-expanded', 'false'); fab.querySelectorAll('.fo').forEach(o => o.remove()); }
// positions on a quarter circle up / right of the button (0° = right, -90° = up); more than 4 options -> two rings
// rings of 100 / 178 / 256 px hold 3 / 4 / 5 bubbles (≥ ~75 px apart, room for the label under each)
function fabPos(n){ const ring = (m, R, a0, a1) => [...Array(m)].map((_, k) => [R, m > 1 ? a0 + (a1 - a0) * k / (m - 1) : (a0 + a1) / 2]);
  if (n <= 3) return ring(n, 112, -90, -14);
  const cap = [3, 4, 5], R = [100, 178, 256], out = []; let left = n;
  for (let i = 0; i < 3 && left > 0; i++){ const m = Math.min(cap[i], left); out.push(...ring(m, R[i], i ? -84 : -90, i ? -8 : -14));   /* not down to 0°: the last label stays above the tab bar */ left -= m; }
  return out; }
function fabOpen(){ const it = fabItems(), P = fabPos(it.length);
  fab.querySelectorAll('.fo').forEach(o => o.remove());
  it.forEach(([ic, lab, fn, b], k) => { const R0 = P[k][0], a = P[k][1] * Math.PI / 180, o = document.createElement('button');
    o.className = 'fo'; o.style.setProperty('--x', Math.round(Math.cos(a) * R0) + 'px'); o.style.setProperty('--y', Math.round(Math.sin(a) * R0) + 'px'); o.style.transitionDelay = (k * 25) + 'ms';
    o.innerHTML = `<span class="oi">${ic}</span><span class="ol">${esc(lab)}</span>${b ? `<i class="bdg">${b}</i>` : ''}`; o.title = lab;
    o.onclick = e => { e.stopPropagation(); fabClose(); fn(); }; fab.append(o); });
  fabBg.classList.add('on'); fab.querySelector('.fb').setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => requestAnimationFrame(() => fab.classList.add('open'))); }
fab.querySelector('.fb').onclick = e => { e.stopPropagation(); fab.classList.contains('open') ? fabClose() : fabOpen(); };
fabBg.onclick = fabClose; addEventListener('keydown', e => { if (e.key === 'Escape' && fab.classList.contains('open')) fabClose(); });
window.openMenu = fabOpen;
function socBtns(){ const n = badgeN(), b = fab.querySelector('.fb'); let i = b.querySelector('.bdg');
  if (n && !i){ i = document.createElement('i'); i.className = 'bdg'; b.append(i); } if (i){ if (n) i.textContent = n; else i.remove(); } }

// ---------- small window (leaderboard, public profile, sharing) ----------
const win = document.createElement('div'); win.id = 'accWin'; win.innerHTML = '<div class="acard"></div>'; document.body.append(win);
const card = win.querySelector('.acard');
const modal = html => { card.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button>` + html; card.querySelector('.x').onclick = closeModal; win.classList.add('on'); document.body.classList.remove('menu'); };
const closeModal = () => win.classList.remove('on');
win.onclick = e => { if (e.target === win) closeModal(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && win.classList.contains('on')) closeModal(); });

// ---------- 🏆 leaderboard: a full page (phone) / big window (PC) ----------
// everybody with an account is listed with name + numbers (unless they switch it off); the list of peaks only for public profiles
const N_A2K = PEAKS.filter(p => p.tier !== '1500').length, N_P15 = PEAKS.filter(p => p.tier === '1500' && p.is_sub === 'no').length, N_ALL = PEAKS.length;
const BOARDS = [['p2000', L('Prominentni 2000','Prominent 2000'), N_PROM], ['a2000', L('Vsi nad 2000 m','All above 2000 m'), N_A2K],
  ['p1500', L('Prominentni 1500–2000','Prominent 1500–2000'), N_P15], ['all', L('Vsi vrhovi','All peaks'), N_ALL]];
const COLS = ['#1565c0', '#2e7d32', '#6a1b9a', '#c62828', '#ef6c00', '#00838f', '#5d4037', '#ad1457'];
const avc = u => COLS[[...String(u)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLS.length];
const av = (u, nm, sz = 34) => `<span class="lav" style="width:${sz}px;height:${sz}px;background:${avc(u)};font-size:${Math.round(sz * .42)}px">${esc(((nm || u || '?').trim()[0] || '?').toUpperCase())}</span>`;
const lb = document.createElement('div'); lb.id = 'lbPage'; document.body.append(lb);
const lbCss = document.createElement('style'); lbCss.textContent = `
#lbPage{position:fixed;inset:0;z-index:61;background:var(--lbdeco);background-color:#f3f5f4;display:none;justify-content:center;padding:0 env(safe-area-inset-right) 0 env(safe-area-inset-left)}
#lbPage.on{display:flex}
/* sides of the page on wide screens: mountain panorama at the bottom, contour lines above (generated, tools: none) */
#lbPage{--lbdeco:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 300' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3CclipPath id='f'%3E%3Cpath d='M0 300L0 141L18 128L36 115L54 104L72 86L90 76L108 59L126 52L144 69L162 79L180 95L198 105L216 121L234 132L252 129L270 116L288 105L306 93L324 74L342 81L360 97L378 109L396 121L413 129L431 147L449 154L467 147L485 138L503 132L521 119L539 105L557 103L575 112L593 111L611 115L629 129L647 139L665 146L683 155L701 161L719 168L737 168L755 170L773 170L791 171L809 172L827 171L845 172L863 170L881 170L899 169L917 164L935 159L953 153L971 142L989 137L1007 126L1025 115L1043 108L1061 102L1079 88L1097 98L1115 110L1133 122L1151 129L1169 136L1187 142L1204 123L1222 114L1240 93L1258 71L1276 56L1294 49L1312 64L1330 80L1348 95L1366 110L1384 131L1402 137L1420 124L1438 110L1456 95L1474 85L1492 75L1510 91L1528 99L1546 116L1564 130L1582 138L1600 147L1600 300Z'/%3E%3C/clipPath%3E%3C/defs%3E%3Cpath d='M0 300L0 141L18 128L36 115L54 104L72 86L90 76L108 59L126 52L144 69L162 79L180 95L198 105L216 121L234 132L252 129L270 116L288 105L306 93L324 74L342 81L360 97L378 109L396 121L413 129L431 147L449 154L467 147L485 138L503 132L521 119L539 105L557 103L575 112L593 111L611 115L629 129L647 139L665 146L683 155L701 161L719 168L737 168L755 170L773 170L791 171L809 172L827 171L845 172L863 170L881 170L899 169L917 164L935 159L953 153L971 142L989 137L1007 126L1025 115L1043 108L1061 102L1079 88L1097 98L1115 110L1133 122L1151 129L1169 136L1187 142L1204 123L1222 114L1240 93L1258 71L1276 56L1294 49L1312 64L1330 80L1348 95L1366 110L1384 131L1402 137L1420 124L1438 110L1456 95L1474 85L1492 75L1510 91L1528 99L1546 116L1564 130L1582 138L1600 147L1600 300Z' fill='%23c9d6e2'/%3E%3Cg clip-path='url(%23f)'%3E%3Cpath d='M0 0H1600V78L1500 84L1400 72L1290 86L1180 76L1080 92L900 70L700 90L560 80L440 88L330 76L230 86L120 70L0 84Z' fill='%23f4f8fb'/%3E%3C/g%3E%3Cpath d='M0 300L0 178L20 169L41 156L61 152L81 161L101 169L122 181L142 188L162 179L182 172L203 154L223 146L243 132L263 126L284 137L304 150L324 163L344 176L365 188L385 198L405 190L425 180L446 170L466 161L486 168L506 171L527 179L547 191L567 197L587 212L608 213L628 221L648 217L668 220L689 215L709 216L729 218L749 212L770 216L790 218L810 219L830 214L851 216L871 217L891 217L911 218L932 219L952 216L972 221L992 215L1013 207L1033 202L1053 193L1073 188L1094 177L1114 169L1134 152L1154 151L1175 159L1195 171L1215 178L1235 184L1256 193L1276 182L1296 173L1316 159L1337 153L1357 141L1377 129L1397 136L1418 150L1438 159L1458 175L1478 184L1499 180L1519 172L1539 161L1559 145L1580 156L1600 168L1600 300Z' fill='%2399afc2'/%3E%3Cpath d='M0 300L0 202L23 215L46 219L70 231L93 237L116 247L139 238L162 232L186 225L209 227L232 230L255 240L278 248L301 255L325 254L348 253L371 248L394 244L417 241L441 250L464 252L487 253L510 254L533 258L557 263L580 264L603 258L626 257L649 258L672 257L696 259L719 258L742 257L765 255L788 257L812 254L835 259L858 256L881 258L904 257L928 258L951 256L974 262L997 261L1020 261L1043 258L1067 257L1090 246L1113 242L1136 239L1159 234L1183 230L1206 226L1229 229L1252 231L1275 240L1299 237L1322 234L1345 224L1368 217L1391 211L1414 206L1438 210L1461 218L1484 225L1507 234L1530 226L1554 216L1577 208L1600 201L1600 300Z' fill='%235f7f6a'/%3E%3Cpath d='M0.0 187.50796986118613l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M69.56521739130434 217.37497573136216l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M139.1304347826087 223.69029628704337l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M208.69565217391303 212.7784055924463l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M278.2608695652174 233.5082131052706l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M347.82608695652175 238.66298388500485l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M417.39130434782606 227.44080724757356l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M486.95652173913044 238.75795427996886l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1113.0434782608695 227.834870668368l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1182.608695652174 216.46365608614565l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1252.1739130434783 217.2497606323057l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1321.7391304347825 220.47957485065356l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1391.304347826087 196.56864260361965l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1460.8695652173913 203.5758336740028l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1530.4347826086957 212.25607045599122l5 14h-10z' fill='%234b6b55'/%3E%3Cpath d='M1600.0 187.05224329526934l5 14h-10z' fill='%234b6b55'/%3E%3C/svg%3E") bottom center/max(100%,1600px) auto no-repeat,url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cg fill='none' stroke='%237a8f86' stroke-opacity='.22'%3E%3Cpath stroke-width='1' d='M226 132 224 133 222 135 220 138 219 140 218 144 218 146 218 150 218 154 218 158 218 162 218 166 218 170 217 174 217 178 216 182 215 184 214 187 212 189 210 191 208 192 205 194 202 195 200 196 196 198 194 199 191 200 188 202 186 203 184 204 182 206 180 209 178 212 178 214 177 218 177 222 178 226 178 228 179 232 180 234 182 238 182 240 184 243 185 246 187 248 188 250 190 253 192 256 194 258 196 260 198 261 202 262 206 261 208 260 211 258 213 256 215 254 216 252 218 249 219 246 220 244 221 240 222 237 223 234 224 230 224 228 225 224 226 220 226 218 227 214 228 212 230 208 231 206 233 204 235 202 238 200 240 199 242 198 246 196 248 195 250 194 253 192 255 190 256 188 258 184 258 180 258 178 258 176 257 172 256 168 256 166 255 162 254 158 253 156 252 152 251 150 250 146 249 144 248 141 246 138 245 136 243 134 240 132 238 131 234 131 230 131 226 132ZM268 82 266 82 262 84 260 86 258 88 256 90 255 92 254 94 252 98 251 100 250 102 248 106 247 108 245 110 243 112 240 114 238 115 235 116 232 117 228 118 226 118 222 119 220 120 216 122 214 123 212 125 210 128 210 130 209 134 209 138 209 142 209 146 210 150 210 154 210 156 210 160 210 164 210 167 210 170 209 174 208 176 206 180 205 182 203 184 201 186 199 188 196 190 194 191 192 192 188 194 186 195 184 196 181 198 178 200 176 202 174 204 173 206 172 208 170 212 170 216 170 220 171 224 172 228 173 230 174 234 175 236 176 240 177 242 178 244 179 248 180 250 182 254 183 256 184 259 185 262 186 264 188 268 189 270 190 273 192 276 193 278 196 279 200 278 202 277 204 276 207 274 210 272 212 270 214 268 216 266 217 264 219 262 220 260 222 256 223 254 224 250 225 248 226 244 227 242 228 238 228 236 229 232 230 229 231 226 232 223 233 220 234 218 236 215 238 213 240 211 242 209 244 208 247 206 250 205 252 204 256 202 258 201 260 200 263 198 265 196 266 194 268 190 268 186 267 182 267 178 266 175 265 172 264 168 264 166 263 162 262 159 261 156 261 152 260 148 260 146 259 142 259 138 260 134 260 132 262 129 264 126 266 124 268 123 270 122 274 120 276 119 278 118 281 116 283 114 285 112 286 110 288 106 288 104 288 100 288 98 287 94 286 92 284 89 282 87 280 85 278 84 274 82 272 82 268 82ZM186 293 184 295 182 297 180 300 180 302 179 306 180 309 181 312 184 314 186 315 188 314 191 312 192 309 193 306 193 302 193 298 192 295 190 292 186 293ZM173 0 174 2 176 4 179 6 182 8 184 9 188 9 192 8 194 7 196 6 198 4 200 1M201 320 202 317 203 314 204 311 205 308 206 304 206 302 207 298 208 294 209 292 210 289 212 286 213 284 214 282 216 280 218 277 220 274 221 272 222 270 224 267 225 264 226 262 227 258 228 256 229 252 230 249 231 246 232 242 232 240 234 236 234 234 236 230 236 228 238 225 240 222 241 220 243 218 245 216 248 214 250 213 252 212 256 211 258 210 262 209 265 208 268 207 271 206 274 204 276 202 277 200 278 198 278 194 278 192 277 188 276 184 275 182 274 178 273 176 272 172 272 170 271 166 270 164 269 160 269 156 268 152 268 148 269 144 270 140 271 138 272 136 274 133 276 131 278 130 281 128 284 126 286 125 288 123 290 122 292 120 294 118 296 115 297 112 298 110 299 106 298 102 298 99 297 96 296 93 295 90 294 88 292 85 290 82 288 80 286 78 284 76 282 75 280 73 277 72 274 71 270 71 266 71 264 72 260 74 258 75 256 77 254 79 252 81 250 84 248 86 247 88 246 90 244 93 242 96 240 98 238 100 236 102 234 104 232 105 230 106 226 108 224 108 220 109 217 110 214 111 210 111 207 112 204 113 202 114 200 117 199 120 199 124 199 128 200 132 200 134 201 138 202 142 202 144 203 148 203 152 204 156 204 160 204 164 203 168 202 172 201 174 200 176 198 179 196 181 194 183 192 184 189 186 186 188 184 189 182 190 178 192 176 193 174 194 171 196 169 198 167 200 166 202 164 206 164 208 163 212 163 216 164 220 164 222 165 226 166 228 167 232 168 234 170 238 170 240 172 244 173 246 174 250 175 252 176 256 176 258 177 262 178 266 178 270 177 274 176 278 175 280 174 283 173 286 172 288 170 292 169 294 168 298 168 300 168 304 168 308 168 310 170 314 170 316 172 319M67 0 67 4 68 6 70 10 72 12 74 14 76 16 78 17 81 18 84 19 88 19 90 18 94 16 96 14 98 12 99 10 100 6 100 4 100 1M158 0 159 2 160 5 162 8 163 10 165 12 166 14 168 16 170 18 172 20 175 22 178 24 180 25 184 26 186 26 190 26 194 26 196 26 200 24 202 23 204 22 206 20 208 18 210 15 212 12 213 10 214 8 216 4 217 2M267 0 267 4 268 8 268 10 269 14 270 16 271 20 272 22 273 26 274 28 275 32 276 34 277 38 276 41 275 44 273 46 270 48 268 49 266 50 263 52 260 54 258 55 256 57 254 58 251 60 249 62 247 64 245 66 243 68 242 70 240 72 238 75 236 78 234 80 233 82 231 84 229 86 227 88 224 90 222 91 219 92 216 93 212 93 208 93 204 92 202 92 198 91 195 90 192 89 190 88 186 86 184 86 180 84 178 84 174 84 172 84 169 86 167 88 166 92 167 96 167 100 168 102 170 106 171 108 172 110 174 114 176 116 177 118 178 120 180 123 182 126 183 128 184 130 186 134 187 136 188 139 189 142 190 144 191 148 192 152 192 156 191 160 191 164 190 166 188 169 186 172 184 174 182 175 180 177 178 178 174 180 172 181 169 182 166 183 164 184 160 186 158 187 156 188 154 190 152 192 150 195 149 198 148 200 147 204 147 208 148 212 148 214 149 218 150 221 151 224 152 226 153 230 154 232 156 236 157 238 158 241 159 244 160 248 161 250 161 254 162 258 162 262 161 266 160 270 159 272 158 276 157 278 156 281 155 284 154 287 153 290 153 294 152 298 153 302 153 306 154 310 155 312 156 316 157 318M100 320 99 316 98 314 96 310 94 308 92 306 90 305 88 304 84 303 80 303 76 304 74 305 72 306 70 308 68 311 67 314 66 318M217 320 218 318 219 314 220 312 222 308 222 306 224 303 225 300 226 298 228 295 230 292 231 290 232 287 233 284 234 282 235 278 236 274 236 272 237 268 238 264 238 262 239 258 239 254 240 251 241 248 242 244 242 242 244 238 245 236 246 234 248 231 250 229 252 228 254 226 258 224 260 224 264 223 268 223 272 223 276 223 280 224 283 224 286 224 290 225 294 225 297 224 300 222 301 220 302 218 303 214 303 210 302 207 301 204 300 201 299 198 298 196 296 192 295 190 294 188 292 185 291 182 290 180 288 177 287 174 286 171 285 168 284 164 284 162 284 158 284 154 284 152 286 148 288 146 289 144 291 142 294 140 296 139 298 137 300 136 303 134 306 132 308 130 310 128 312 126 313 124 314 122 316 118 316 116 317 112 317 108 317 104 316 101 315 98 314 95 313 92 312 90 310 86 309 84 308 82 306 78 305 76 304 74 302 71 300 68 299 66 298 63 296 60 295 58 294 54 293 52 293 48 294 45 296 42 297 40 298 38 300 36 302 32 303 30 304 26 304 24 305 20 304 16 304 13 303 10 302 6 301 4 300 2M299 320 298 318 296 316 294 314 292 312 289 310 286 308 284 308 280 307 276 307 274 308 270 310 269 312 268 314 267 318M60 0 60 2 61 6 62 9 64 12 65 14 66 16 68 18 70 20 72 22 75 24 78 25 81 26 84 27 88 27 92 26 94 26 98 24 100 23 102 21 104 19 106 16 107 14 108 10 108 8 109 4 109 0M150 0 152 3 153 6 155 8 156 10 158 14 160 16 161 18 163 20 164 22 166 24 168 26 170 28 173 30 176 32 178 33 181 34 184 35 188 35 192 35 196 34 198 34 202 33 204 32 207 30 210 28 212 26 214 24 216 22 217 20 218 18 220 14 221 12 222 10 224 6 225 4 226 1M255 0 256 2 257 6 258 9 259 12 260 16 261 18 261 22 262 25 262 28 262 32 262 34 260 38 259 40 258 42 256 44 254 46 252 48 249 50 247 52 245 54 243 56 241 58 240 60 238 62 236 65 234 67 232 70 231 72 229 74 227 76 225 78 223 80 220 82 218 83 214 84 212 84 208 84 206 84 202 83 199 82 196 81 194 80 190 78 188 77 186 76 183 74 180 73 178 72 174 70 171 70 168 70 166 70 163 72 160 74 159 76 158 78 157 82 156 86 156 90 157 94 158 97 159 100 160 103 162 106 163 108 164 110 166 114 167 116 169 118 170 120 172 123 174 126 176 128 177 130 178 132 180 136 181 138 182 140 184 144 184 146 185 150 185 154 185 158 184 161 183 164 182 166 180 168 177 170 174 172 172 173 170 174 166 176 164 176 160 178 158 178 154 180 152 181 150 182 147 184 145 186 143 188 142 190 140 193 139 196 138 200 138 202 137 206 137 210 138 214 138 216 139 220 140 222 142 226 143 228 144 231 146 234 147 236 148 239 149 242 150 244 151 248 152 252 152 254 152 258 152 260 151 264 150 268 149 270 148 274 147 276 146 280 145 282 145 286 144 290 144 294 144 298 145 302 146 306 146 308 147 312 148 314 150 318 150 320M320 82 318 79 316 76 315 74 314 71 313 68 312 66 310 62 310 60 310 56 310 52 310 49 311 46 311 42 312 38 312 36 313 32 313 28 313 24 312 20 312 18 311 14 310 10 310 8 308 4 307 2M0 131 2 128 3 126 4 124 6 120 6 118 7 114 8 110 8 108 8 104 8 100 8 98 7 94 6 92 4 89 3 86 1 84 0 82M109 320 108 316 108 314 106 310 106 308 104 305 102 302 100 300 98 299 96 297 93 296 90 295 86 294 82 295 78 295 75 296 72 297 70 298 67 300 65 302 63 304 62 306 60 310 60 312 59 316 60 320M227 320 228 317 230 314 231 312 232 310 234 308 236 306 238 304 240 302 242 299 244 296 244 294 245 290 245 286 244 282 244 278 244 276 244 272 244 268 244 264 244 262 244 258 245 254 246 250 246 248 248 244 248 242 250 239 252 236 254 234 256 233 258 232 262 230 264 230 268 229 272 230 275 230 278 230 282 231 284 232 288 233 292 234 294 234 298 235 302 234 304 233 306 232 308 230 310 227 311 224 312 220 312 216 311 212 310 208 310 206 308 202 308 200 306 196 305 194 304 192 302 188 301 186 300 184 298 181 297 178 296 176 294 172 294 170 293 166 292 162 293 158 294 154 295 152 297 150 299 148 302 146 304 144 306 143 308 142 311 140 313 138 316 136 318 134 319 132M306 320 305 318 304 315 302 312 300 310 298 308 296 306 294 304 292 303 290 301 287 300 284 299 282 298 278 297 274 297 270 297 266 297 262 298 260 298 256 300 254 302 253 304 253 308 253 312 254 315 255 318M54 0 54 2 55 6 56 9 57 12 58 14 60 18 61 20 63 22 64 24 66 26 69 28 72 30 74 31 76 32 80 33 84 33 88 34 92 33 96 33 98 32 102 31 104 30 107 28 109 26 111 24 113 22 114 20 116 16 116 14 117 10 118 7 118 4 119 0M141 0 142 2 144 5 146 8 147 10 148 12 150 15 152 18 153 20 155 22 156 24 158 27 160 30 161 32 162 34 164 36 166 39 168 42 169 44 170 48 168 51 166 52 164 54 160 56 158 58 156 60 154 62 152 64 151 66 150 69 149 72 149 76 148 80 149 84 149 88 150 92 150 94 151 98 152 100 154 104 155 106 156 109 158 112 159 114 160 116 162 119 164 122 166 124 167 126 168 128 170 131 172 134 173 136 174 138 176 142 177 144 178 148 178 152 177 156 176 159 174 162 172 164 170 166 168 167 165 168 162 169 159 170 156 171 152 172 150 173 146 174 144 175 142 176 140 178 138 180 136 182 134 185 132 188 131 190 130 193 129 196 128 198 127 202 126 204 125 208 124 210 122 214 121 216 120 218 118 221 116 223 114 226 113 228 111 230 110 234 110 236 110 240 110 243 111 246 112 249 114 252 115 254 117 256 119 258 121 260 123 262 125 264 126 266 128 270 128 272 129 276 129 280 129 284 130 288 130 290 131 294 132 298 132 300 134 304 134 306 136 309 137 312 138 314 140 317 141 320M320 25 319 22 319 18 318 16 317 12 316 9 315 6 314 3 313 0M0 146 2 144 4 142 6 140 8 137 10 134 11 132 12 130 14 127 15 124 17 122 18 119 20 116 22 114 24 112 26 111 28 110 32 108 34 108 38 107 42 106 44 106 48 105 50 104 54 102 56 100 58 98 59 96 60 92 60 90 60 88 59 84 58 82 56 78 55 76 53 74 51 72 48 70 46 69 44 68 40 67 36 66 34 66 30 66 26 66 22 65 18 65 14 64 12 63 10 61 8 59 6 56 5 54 4 50 4 48 3 44 2 40 2 38 1 34 1 30 0 26M119 320 119 316 119 312 118 308 118 306 116 302 116 300 114 297 112 294 110 292 108 290 106 289 104 288 100 286 97 286 94 286 90 286 88 286 84 287 80 288 78 288 74 290 72 290 68 292 66 293 64 295 62 296 60 298 58 300 56 304 55 306 54 310 54 312 54 316 54 320M313 320 312 318 310 314 309 312 307 310 306 308 304 305 302 303 300 301 298 299 296 297 294 296 291 294 288 292 286 291 282 290 280 289 276 288 274 288 270 287 266 286 264 285 261 284 258 282 256 280 255 278 254 276 252 272 252 270 251 266 251 262 251 258 251 254 252 251 253 248 254 246 256 243 258 240 260 239 262 238 266 237 270 236 274 237 278 238 280 238 284 239 286 240 290 241 292 242 296 243 300 244 304 244 308 243 310 242 312 240 314 238 316 234 317 232 318 228 318 226 318 222 318 218 318 214 318 212 317 208 316 204 315 202 314 198 313 196 312 193 311 190 310 188 308 184 307 182 306 179 305 176 304 173 303 170 303 166 304 162 305 160 306 158 308 155 310 154 312 152 315 150 317 148 320 146M240 10 242 10 244 12 246 14 248 18 248 20 249 24 249 28 248 31 246 34 245 36 244 38 242 40 240 42 238 44 236 46 234 48 232 51 230 54 229 56 228 58 226 61 224 64 223 66 221 68 219 70 216 72 214 73 210 74 206 73 202 72 200 71 197 70 194 68 192 66 190 65 188 63 186 61 184 58 183 56 182 54 182 52 184 50 188 48 190 48 194 46 196 46 200 44 202 44 206 42 208 42 212 40 214 39 216 38 219 36 221 34 223 32 224 30 226 27 228 24 229 22 230 20 232 16 234 14 235 12 238 10 240 10ZM42 0 42 2 43 6 43 10 44 13 45 16 46 20 46 22 47 26 48 30 48 34 46 38 44 40 42 40 38 41 34 40 32 40 28 38 26 37 24 36 22 34 20 32 18 29 16 26 15 24 14 22 12 18 11 16 10 13 9 10 8 8 7 4 6 2M0 258 2 256 3 254 4 252 6 248 7 246 8 242 8 240 9 236 9 232 9 228 10 224 10 220 9 216 9 212 9 208 9 204 8 200 8 197 8 194 7 190 7 186 7 182 8 178 8 176 10 172 10 170 12 167 14 164 15 162 16 160 18 157 19 154 20 152 22 149 23 146 25 144 26 141 28 138 29 136 31 134 32 132 34 130 37 128 39 126 42 125 44 124 48 122 50 121 54 120 56 119 60 118 62 117 65 116 68 114 70 113 72 111 74 109 76 106 76 104 77 100 77 96 77 92 77 88 76 85 75 82 74 78 74 76 73 72 72 70 71 66 70 62 70 58 71 54 73 52 76 51 78 50 82 49 86 48 88 48 92 47 96 47 100 46 104 46 106 46 110 46 114 46 117 46 120 47 123 48 126 50 128 52 129 54 130 57 131 60 132 64 132 66 133 70 134 74 134 76 135 80 136 84 136 86 137 90 138 93 139 96 140 100 141 102 142 106 143 108 144 111 145 114 146 116 148 120 149 122 150 124 152 128 153 130 154 133 155 136 156 140 156 142 156 144 154 148 152 150 150 151 148 152 144 154 142 154 138 156 136 157 134 158 131 160 129 162 127 164 125 166 124 168 122 171 120 174 120 176 118 179 117 182 116 184 114 187 113 190 111 192 110 194 108 197 106 199 104 201 102 203 100 205 98 207 96 210 94 212 93 214 91 216 90 219 89 222 88 226 88 228 88 232 88 236 88 239 88 242 88 246 89 250 89 254 88 258 88 260 87 264 86 266 84 268 82 271 80 272 78 274 75 276 72 278 70 279 67 280 64 282 62 283 60 284 56 286 54 288 52 289 50 291 48 293 46 296 45 298 44 300 43 304 42 307 42 310 42 314 42 318M320 309 319 306 318 304 316 301 315 298 313 296 312 293 310 290 309 288 308 286 306 283 304 280 303 278 302 276 301 272 302 270 305 268 308 267 310 266 313 264 316 262 318 260 320 258M5 320 4 318 4 318 3 316 2 314 2 313 1 312 1 310 0 309M34 0 34 4 34 8 34 12 33 16 32 18 28 20 25 18 23 16 21 14 20 12 18 9 16 6 15 4 14 2M13 320 12 317 10 314 10 312 8 309 7 306 6 304 4 300 4 298 2 294 1 292 1 288 0 284 0 280 2 276 3 274 4 272 6 268 7 266 8 264 10 260 11 258 12 254 12 252 13 248 14 244 14 240 14 238 14 234 15 230 15 226 15 222 15 218 15 214 15 210 15 206 15 202 15 198 16 194 16 191 16 188 17 184 18 182 19 178 20 176 21 172 22 170 24 166 25 164 26 161 27 158 28 156 29 152 30 150 32 147 33 144 35 142 36 140 38 137 40 135 42 133 44 132 47 130 50 129 52 128 56 126 58 126 62 124 64 124 68 122 70 122 74 120 76 119 78 118 80 116 82 114 84 111 85 108 85 104 85 100 85 96 85 92 84 89 83 86 83 82 82 78 82 76 81 72 81 68 82 64 83 62 85 60 87 58 90 57 92 56 96 55 100 54 104 54 108 55 112 56 114 57 116 58 119 60 121 62 122 64 124 68 125 70 126 73 127 76 128 79 129 82 130 86 130 88 131 92 132 95 133 98 134 102 134 104 136 108 136 110 137 114 138 117 139 120 140 124 140 126 141 130 141 134 140 136 138 139 136 141 134 143 132 144 129 146 127 148 124 150 123 152 121 154 120 156 118 160 117 162 116 164 115 168 114 170 112 174 111 176 110 179 109 182 108 184 106 187 104 190 102 192 101 194 99 196 97 198 95 200 93 202 91 204 89 206 87 208 86 210 84 213 83 216 82 219 82 222 81 226 81 230 81 234 82 238 82 242 82 246 82 250 81 254 81 258 80 260 78 264 76 266 75 268 72 270 70 272 68 273 66 274 63 276 60 277 58 278 55 280 52 282 50 283 48 284 45 286 43 288 41 290 39 292 38 294 36 298 36 300 35 304 34 308 34 310 34 314 34 318M98 66 102 65 106 65 108 66 112 68 114 70 116 72 117 74 118 76 120 80 121 82 122 86 123 88 124 92 124 94 125 98 126 102 126 105 126 108 127 112 127 116 126 120 126 122 124 126 122 128 120 130 118 132 116 134 115 136 114 138 112 142 111 144 110 148 110 151 109 154 109 158 108 162 108 164 107 168 106 170 105 174 104 176 102 180 101 182 99 184 98 186 96 188 94 191 92 192 90 194 88 196 86 198 84 200 82 202 80 204 78 207 77 210 76 212 75 216 75 220 75 224 75 228 75 232 75 236 76 240 76 244 76 248 75 252 74 256 73 258 72 260 70 263 68 265 66 267 64 268 61 270 58 272 56 273 53 274 50 275 48 276 44 278 42 278 38 280 36 281 33 282 30 283 28 284 24 286 20 284 20 282 19 278 19 274 19 270 19 266 19 262 19 258 19 254 19 250 19 246 19 242 20 238 20 234 20 230 20 227 20 224 20 220 21 216 21 212 22 208 22 205 23 202 23 198 24 196 25 192 26 189 27 186 28 183 29 180 30 177 31 174 32 171 33 168 34 164 34 162 36 158 36 156 38 152 39 150 40 147 42 144 44 142 46 140 48 138 50 136 52 135 54 134 58 133 60 132 64 131 67 130 70 129 74 128 76 128 80 127 84 126 86 125 89 124 92 122 94 120 95 118 96 114 96 112 96 109 96 106 95 102 94 98 94 96 93 92 92 88 92 86 91 82 91 78 91 74 92 72 94 68 96 67 98 66ZM68 146 72 145 76 145 79 146 82 147 84 148 86 150 88 153 89 156 90 158 90 162 90 166 90 168 88 172 87 174 86 176 84 178 82 180 79 182 76 184 74 185 71 186 68 187 64 188 60 188 57 186 55 184 54 182 53 178 52 174 52 172 52 168 52 164 52 162 53 158 54 156 56 153 58 151 60 149 62 148 66 146 68 146ZM48 208 50 208 52 210 54 212 56 216 57 218 58 220 59 224 60 227 61 230 62 234 62 237 62 240 62 243 62 246 60 250 59 252 58 254 55 256 52 258 50 258 46 259 42 258 40 257 38 255 36 253 35 250 34 248 33 244 32 240 32 236 32 232 33 228 34 224 34 222 36 218 37 216 38 214 40 212 42 210 46 208 48 208Z'/%3E%3Cpath stroke-width='1.8' d='M232 154 231 156 230 158 229 162 229 166 229 170 230 173 231 176 232 178 234 180 238 181 241 180 243 178 244 176 245 172 245 168 244 164 243 162 242 159 240 156 238 154 236 153 232 154ZM202 206 200 206 196 207 194 208 191 210 189 212 187 214 186 216 185 220 185 224 185 228 186 230 187 234 188 236 190 239 192 242 193 244 195 246 198 248 200 249 204 249 207 248 210 246 211 244 213 242 214 239 215 236 216 233 216 230 217 226 217 222 217 218 216 214 216 212 214 209 212 207 209 206 206 205 202 206ZM79 0 79 2 80 3 81 4 82 5 84 5 85 4 86 3 87 2 86 0M165 0 166 3 168 6 170 8 172 10 174 12 176 14 178 15 180 16 184 18 186 18 190 18 192 18 196 17 198 16 201 14 203 12 204 10 206 7 208 4 209 2M86 320 86 319 85 318 84 317 82 316 80 317 79 318 79 320M209 320 210 318 211 314 212 312 213 308 214 305 215 302 216 299 217 296 218 294 220 290 221 288 222 286 224 283 226 280 227 278 228 275 229 272 230 270 231 266 232 263 233 260 234 256 234 254 235 250 236 246 236 244 238 240 238 238 240 234 241 232 242 230 244 227 246 224 248 223 250 221 252 220 256 218 258 217 262 216 265 216 268 216 272 215 276 215 280 215 284 214 286 213 288 212 290 210 291 206 290 202 290 200 289 196 288 194 286 190 285 188 284 185 283 182 282 180 280 176 280 174 278 170 278 168 277 164 276 160 276 158 276 154 276 151 277 148 278 144 279 142 281 140 283 138 285 136 288 134 290 132 292 131 294 130 296 128 299 126 301 124 303 122 304 120 306 116 307 114 307 110 308 106 307 102 306 98 306 96 304 92 303 90 302 88 300 84 299 82 298 80 296 77 294 74 292 72 290 70 288 68 286 66 284 64 282 63 280 62 276 61 272 61 268 61 265 62 262 63 260 64 257 66 254 68 252 70 250 72 248 74 246 76 245 78 243 80 242 82 240 85 238 88 236 90 234 92 232 94 230 96 228 97 226 98 222 100 220 100 216 101 212 101 208 102 204 101 200 101 196 101 192 100 188 100 184 102 183 104 183 108 184 112 185 114 186 117 187 120 188 122 190 126 191 128 192 132 193 134 194 137 195 140 196 144 196 146 197 150 198 154 198 158 198 162 197 166 196 169 194 172 193 174 191 176 189 178 187 180 184 182 182 183 180 184 176 186 174 187 171 188 168 190 166 191 164 192 162 194 160 196 158 199 157 202 156 205 156 208 156 212 156 214 157 218 158 222 158 224 160 228 161 230 162 234 163 236 164 239 165 242 166 245 167 248 168 252 169 254 169 258 170 262 169 266 169 270 168 273 167 276 166 279 165 282 164 284 162 288 162 290 161 294 160 298 160 300 160 304 160 306 161 310 162 314 163 316 164 319M284 5 283 8 283 12 285 14 288 16 290 14 291 10 290 8 288 6 284 5ZM48 0 49 4 50 8 50 10 51 14 52 16 54 20 55 22 56 25 58 28 59 30 61 32 63 34 66 36 68 37 70 38 74 40 77 40 80 40 84 41 88 40 92 40 94 40 98 39 102 39 105 38 108 37 111 36 114 35 116 34 118 32 121 30 123 28 125 26 126 24 128 22 130 19 133 18 135 18 138 20 140 21 142 24 143 26 144 28 146 32 147 34 147 38 147 42 146 45 145 48 144 51 143 54 142 58 142 60 141 64 141 68 141 72 141 76 141 80 142 84 142 86 143 90 144 93 145 96 146 100 147 102 148 105 149 108 150 110 152 114 153 116 154 118 156 121 158 124 159 126 160 128 162 131 164 134 165 136 166 138 168 142 168 144 169 148 168 152 167 154 166 156 164 158 160 160 158 161 155 162 152 163 148 164 146 164 142 166 140 167 137 168 134 170 132 172 130 174 129 176 128 178 126 181 124 184 123 186 122 189 121 192 120 194 118 197 116 200 115 202 113 204 112 206 110 208 108 210 106 212 104 214 102 217 100 220 99 222 98 224 97 228 96 231 96 234 96 238 96 242 96 244 97 248 97 252 97 256 98 260 97 264 96 268 95 270 94 272 92 274 89 276 86 278 84 279 81 280 78 281 76 282 72 284 70 285 68 286 64 288 62 289 60 290 58 292 56 294 54 296 52 298 50 302 49 304 48 308 48 310 48 314 48 318 48 320M0 162 2 160 4 158 5 156 7 154 9 152 11 150 12 148 14 145 16 142 17 140 18 138 20 135 22 132 23 130 25 128 26 126 28 124 30 122 33 120 36 118 38 117 42 116 44 115 48 114 50 114 54 112 56 111 59 110 62 108 64 107 66 105 68 102 68 100 69 96 69 92 69 88 68 84 68 82 66 78 65 76 64 73 62 70 61 68 60 66 58 64 56 62 54 60 51 58 48 57 46 56 42 55 38 54 36 54 32 53 29 52 26 51 23 50 20 48 18 46 16 44 14 42 13 40 12 38 10 34 9 32 8 28 7 26 6 22 6 20 4 16 4 14 2 10 2 8 0 4M320 194 319 190 318 186 317 184 317 180 316 176 316 174 316 172 317 168 318 165 320 162M0 243 2 240 2 238 3 234 4 230 4 228 4 224 4 220 4 216 4 214 3 210 3 206 2 202 2 200 1 196 0 194M319 320 318 318 316 314 315 312 314 310 312 307 310 304 309 302 308 300 306 298 304 295 302 293 300 291 298 289 296 288 293 286 290 284 288 283 285 282 282 281 279 280 276 279 273 278 270 277 268 276 266 274 264 272 262 270 260 266 259 264 259 260 259 256 260 253 261 250 263 248 266 246 268 245 272 245 276 245 279 246 282 247 284 248 288 249 290 250 294 252 296 252 300 253 304 254 308 253 311 252 314 250 316 249 318 247 320 244M64 138 68 137 72 136 76 136 80 136 84 137 88 138 90 139 92 140 95 142 96 144 98 148 99 150 100 154 100 158 100 162 99 166 98 170 97 172 96 175 95 178 93 180 92 182 90 184 88 186 86 188 83 190 81 192 78 194 76 196 74 198 72 200 70 202 69 204 68 207 67 210 67 214 67 218 67 222 68 226 68 228 69 232 69 236 69 240 69 244 69 248 68 252 67 254 66 257 64 259 62 261 60 263 58 264 55 266 52 267 49 268 46 269 42 269 38 268 36 268 33 266 31 264 30 262 28 258 27 256 26 252 26 249 26 246 25 242 25 238 25 234 26 230 26 226 26 224 27 220 27 216 28 213 29 210 30 206 31 204 32 201 34 198 35 196 36 193 37 190 38 188 39 184 40 180 40 178 41 174 41 170 42 166 42 164 43 160 44 158 45 154 46 152 48 149 50 146 52 144 54 143 56 141 58 140 62 139 64 138Z'/%3E%3C/g%3E%3C/svg%3E") 0 0/320px 320px repeat,linear-gradient(180deg,#e2ecf3,#f3f5f4 55%)}
#lbPage .lbc{background:#fff;color:#1d2321;width:min(1180px,100%);height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 0 30px rgba(0,0,0,.12);font-size:calc(14px*var(--ui,1))}
#lbPage .lbh{padding-top:calc(14px + env(safe-area-inset-top))}
#lbPage .lbx.bk{width:auto;border-radius:16px;padding:0 12px;font:600 .95em system-ui,sans-serif;white-space:nowrap}
#lbPage .lbh{padding:14px 18px 10px;border-bottom:1px solid #e6eae8;background:linear-gradient(180deg,#fff8e6,#fff)}
#lbPage .lbt{display:flex;align-items:center;gap:10px}#lbPage .lbt h3{margin:0;font-size:1.3em;flex:1}
#lbPage .lbx{border:0;background:rgba(0,0,0,.06);width:32px;height:32px;border-radius:50%;font-size:1.3em;cursor:pointer;color:#444}
#lbPage .lbs{color:#5b6461;font-size:.86em;margin:3px 0 10px}
#lbPage .lbtabs{display:flex;flex-wrap:wrap;gap:6px}
#lbPage .lbtabs button{flex:0 1 auto;border:1px solid #d3d9d6;background:#fff;color:#1d2321;border-radius:18px;padding:6px 12px;font:600 .88em system-ui,sans-serif;cursor:pointer;white-space:nowrap}
#lbPage .lbtabs button.on{background:#1d2321;border-color:#1d2321;color:#fff}
#lbPage .lbq{width:100%;box-sizing:border-box;margin-top:10px;font:inherit;padding:8px 12px;border:1px solid #c9d0cc;border-radius:10px}
#lbPage .lbm{flex:1;overflow:auto;overscroll-behavior:contain;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;padding:0 18px 18px;align-items:start}
#lbPage .lbb{padding:6px 0 12px;min-width:0}#lbPage .lbmain{min-width:0}
#potw{display:none;position:relative;margin:14px 0 4px;border-radius:14px;overflow:hidden;min-height:210px;background:#2c3e50;color:#fff}#potw.on{display:block}
#potw .ph{position:absolute;inset:0;background:center/cover no-repeat}#potw .ph::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.1) 70%)}
#potw .pt{position:relative;padding:18px 20px 34px;display:flex;flex-direction:column;gap:3px;max-width:60%}
#potw .pt small{font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:.75em;opacity:.9}#potw .pt b{font-size:1.9em;line-height:1.1}
#potw .pt span{opacity:.95}#potw .pt .bd b{font-size:1em}#potw .pt button{align-self:flex-start;margin-top:8px;border:0;border-radius:9px;background:#fff;color:#1d2321;font:600 .9em system-ui,sans-serif;padding:7px 12px;cursor:pointer}
#potw .cr{position:absolute;right:8px;bottom:6px;font-size:.7em;color:#fff;opacity:.85;text-decoration:none;max-width:70%;text-align:right;text-shadow:0 1px 2px #000}
#potw{cursor:zoom-in;touch-action:pan-y;user-select:none}#potw .pt{cursor:auto}#potw .ph{transition:background-image .25s}
#potw .pv,#potw .nx{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.38);color:#fff;font:600 24px/1 system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 0 3px}
#potw .pv{right:58px}#potw .nx{right:14px}#potw .pv:hover,#potw .nx:hover{background:rgba(0,0,0,.6)}
#potw .dots{position:absolute;left:50%;transform:translateX(-50%);bottom:24px;display:flex;gap:5px}#potw .dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.5);cursor:pointer}#potw .dots i.on{background:#fff}
#potw .zm{position:absolute;top:10px;right:12px;font-size:.8em;background:rgba(0,0,0,.38);border-radius:12px;padding:2px 9px;pointer-events:none}#potw .zm b{font-weight:600}
#potwLb{position:fixed;inset:0;z-index:90;background:rgba(10,12,14,.94);display:flex;align-items:center;justify-content:center;touch-action:pan-y;user-select:none}
#potwLb img{max-width:100%;max-height:calc(100% - 60px);object-fit:contain;pointer-events:none}
#potwLb .lt{position:absolute;left:0;right:0;bottom:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));color:#fff;font:14px system-ui,sans-serif;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
#potwLb .lt .n{opacity:.7}#potwLb .lt .cr{margin-left:auto;color:#fff;opacity:.75;font-size:.85em;text-decoration:none}
#potwLb button{position:absolute;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:50%;width:46px;height:46px;font:500 30px/1 system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 0 4px}
#potwLb button:hover{background:rgba(255,255,255,.28)}#potwLb .x{top:calc(12px + env(safe-area-inset-top));right:12px}#potwLb .pv{left:12px;top:50%;transform:translateY(-50%)}#potwLb .nx{right:12px;top:50%;transform:translateY(-50%)}
#lbPage .bdw{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 4px}#lbPage .bdg2{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}
#lbPage .bdg2 b{font-size:.76em;line-height:1.15;margin-top:3px}#lbPage .bdg2 small{font-size:.7em;color:#5b6461}#lbPage .bdg2.got small{color:#2e7d32;font-weight:600}
@media (max-width:980px){ #lbPage .bdw{grid-template-columns:repeat(4,1fr)} #potw .pt{max-width:100%} }
#lbPage .lba{position:sticky;top:12px;display:flex;flex-direction:column;gap:12px;padding-top:14px}
#lbPage .ac2{background:#f7f9f8;border:1px solid #e3e8e5;border-radius:12px;padding:10px 12px}
#lbPage .ac2 h4{margin:0 0 6px;font-size:.78em;text-transform:uppercase;letter-spacing:.06em;color:#5b6461}
#lbPage .ac2 .it{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #edf0ee;font-size:.92em}#lbPage .ac2 .it:last-child{border-bottom:0}
#lbPage .ac2 .it span{color:#5b6461;white-space:nowrap}#lbPage .ac2 a{color:#1565c0;cursor:pointer}
#lbPage .ac2 .pr{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:.9em;margin:5px 0}#lbPage .ac2 .pr .bar{grid-column:1/3;margin:0}
#lbPage .ac2 .big{display:flex;gap:10px;align-items:baseline;margin:2px 0 6px}#lbPage .ac2 .big b{font-size:1.9em;font-variant-numeric:tabular-nums}
#lbPage .ac2 .nb{color:#5b6461;font-size:.86em}
@media (max-width:980px){ #lbPage .lbm{grid-template-columns:1fr;gap:4px} #lbPage .lba{position:static;padding-top:4px} }
#lbPage .pod{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:10px;align-items:end;margin:12px 0 8px}
#lbPage .pd{background:#f6f8f7;border-radius:12px;padding:10px 6px 8px;text-align:center;cursor:pointer;border:1px solid #e3e8e5;min-width:0}
#lbPage .pd .md{font-size:1.5em;line-height:1}#lbPage .pd b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px}
#lbPage .pd .nn{font-size:1.35em;font-weight:800;font-variant-numeric:tabular-nums}#lbPage .pd small{color:#5b6461}
#lbPage .pd.g1{background:linear-gradient(180deg,#fff4cc,#fffaf0);border-color:#f0d68a;padding-top:16px}#lbPage .pd.g2{background:#f2f4f6}#lbPage .pd.g3{background:#fbf1e8}
#lbPage .lr{display:grid;grid-template-columns:34px 34px 1fr auto;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid #eef1ef;cursor:pointer;border-radius:8px}
#lbPage .lr:hover{background:#f4f7f5}#lbPage .lr.me{background:#e8f0fb}
#lbPage .rk{text-align:right;font-weight:700;color:#5b6461;font-variant-numeric:tabular-nums}
#lbPage .who{min-width:0}#lbPage .who b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#lbPage .who small{color:#5b6461;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lbPage .bar{height:5px;background:#e8ecea;border-radius:3px;margin-top:4px;overflow:hidden}#lbPage .bar i{display:block;height:100%;background:#c62828;border-radius:3px}
#lbPage .num{text-align:right;font-weight:800;font-variant-numeric:tabular-nums;min-width:56px}#lbPage .num small{display:block;font-weight:400;color:#5b6461}
#lbPage .lav{border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex:none}
#lbPage .more{display:block;margin:12px auto 0;border:1px solid #c9d0cc;background:#fff;border-radius:10px;padding:8px 16px;font:600 .9em system-ui,sans-serif;cursor:pointer}
#lbPage .lbf{border-top:1px solid #e6eae8;padding:10px 18px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center;background:#fafbfa;font-size:.92em}
#lbPage .lbf span{flex:1}#lbPage .lbf button{border:0;border-radius:9px;background:#1d2321;color:#fff;font:600 .9em system-ui,sans-serif;padding:8px 12px;cursor:pointer}
#lbPage .empty{color:#5b6461;text-align:center;padding:30px 10px}
#lbPage .pf{padding-top:8px}#lbPage .pfh{display:flex;gap:12px;align-items:center}#lbPage .pfh b{font-size:1.2em}
#lbPage .back{border:0;background:none;font:600 .95em system-ui,sans-serif;color:#1565c0;cursor:pointer;padding:6px 0}
#lbPage .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}#lbPage .grid div{background:#f6f8f7;border-radius:10px;padding:8px;text-align:center}
#lbPage .grid b{display:block;font-size:1.25em;font-variant-numeric:tabular-nums}#lbPage .grid small{color:#5b6461;font-size:.78em}
#lbPage .nb{color:#5b6461;font-size:.86em}#lbPage .mehero{display:flex;align-items:center;gap:12px;margin:14px 0 4px;flex-wrap:wrap}#lbPage .mehero .who{flex:1;min-width:140px}#lbPage .mehero .who b{display:block;font-size:1.3em}#lbPage .mehero .who small{color:#5b6461}
#lbPage .mehero .mebtn{display:flex;gap:6px;flex-wrap:wrap}#lbPage .lbb .ac2{margin-bottom:12px}#lbPage .lbb .ac2 a{color:#1565c0;cursor:pointer}#lbPage .ac2 .rmw{color:#9aa3a0!important;margin-left:6px}
#lbPage .ac2 .it .lav{vertical-align:middle;margin-right:4px}
.wish{float:right;border:0;background:none;font-size:1.35em;line-height:1;cursor:pointer;color:#9aa3a0;padding:2px 2px 0;margin-top:2px}.wish.on{color:#f2b400}
#lbPage .pk{display:flex;justify-content:space-between;gap:8px;padding:7px 2px;border-bottom:1px solid #eef1ef;cursor:pointer}#lbPage .pk span{color:#5b6461;font-size:.86em;text-align:right}
#lbPage .lbnav{flex:1;display:flex;gap:4px;flex-wrap:wrap;min-width:0}
#lbPage .lbnav button{border:0;background:transparent;color:#1d2321;font:700 1.08em system-ui,sans-serif;padding:6px 10px;border-radius:10px;cursor:pointer;white-space:nowrap;position:relative}
#lbPage .lbnav button.on{background:#1d2321;color:#fff}#lbPage .lbnav button:not(.on):hover{background:rgba(0,0,0,.06)}
.bdg{display:inline-block;min-width:17px;height:17px;line-height:17px;border-radius:9px;background:#d32f2f;color:#fff;font:700 11px system-ui,sans-serif;font-style:normal;text-align:center;padding:0 4px;margin-left:5px;vertical-align:2px;box-sizing:border-box}
body.socdot #lbBtn::after{content:'';width:8px;height:8px;border-radius:50%;background:#d32f2f;margin-left:2px}
#lbPage .sh{margin:16px 0 6px;font-size:.78em;text-transform:uppercase;letter-spacing:.06em;color:#5b6461}
#lbPage .sb{border:1px solid #8a948f;background:#fff;color:#1d2321;border-radius:9px;padding:6px 11px;font:600 .88em system-ui,sans-serif;cursor:pointer;white-space:nowrap}
#lbPage .sb.pri{background:#1d2321;border-color:#1d2321;color:#fff}#lbPage .sb.danger{border-color:#d9a5a1;color:#b3261e}#lbPage .sb.sure{background:#b3261e;border-color:#b3261e;color:#fff}
#lbPage .sb:disabled{opacity:.5;cursor:default}#lbPage .sbr{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
#lbPage .addf{display:flex;gap:6px;margin-top:12px}#lbPage .addf input,#lbPage .inp{flex:1;min-width:0;width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border:1px solid #c9d0cc;border-radius:9px;background:#fff;color:#1d2321;margin:3px 0}
#lbPage .ah2{font-size:.84em;color:#5b6461;margin:4px 0}
#lbPage .req{display:flex;gap:8px;align-items:center;padding:7px 4px;border-bottom:1px solid #eef1ef}#lbPage .req .who{flex:1}
#lbPage .gav{width:34px;height:34px;border-radius:10px;background:#e8efe9;display:inline-flex;align-items:center;justify-content:center;font-size:1.15em;flex:none}#lbPage .gav.big{width:52px;height:52px;font-size:1.6em}
#lbPage .lr.lgrp{grid-template-columns:34px 0 1fr auto}#lbPage .own{font-weight:600;color:#8a6d00;background:#fff4cc;border-radius:6px;padding:0 5px;font-size:.75em}
#lbPage .pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:2px 10px;margin:4px 0 8px}#lbPage .pick label{display:flex;gap:6px;align-items:center;padding:3px 0;cursor:pointer}#lbPage .pick small{color:#5b6461}
#lbPage .plan{display:flex;gap:12px;padding:10px 4px;border-bottom:1px solid #eef1ef}#lbPage .plan.past{opacity:.6}
#lbPage .pdt{width:52px;flex:none;text-align:center;background:#fff4f0;border:1px solid #f3d3c8;border-radius:10px;padding:5px 0;align-self:flex-start}#lbPage .pdt b{display:block;font-size:1.05em}#lbPage .pdt small{color:#5b6461;font-size:.78em}
#lbPage .pb{flex:1;min-width:0}#lbPage .pb>small{display:block;color:#5b6461}#lbPage .pb a{color:#1565c0;cursor:pointer}#lbPage .pn{font-size:.9em;margin:4px 0;white-space:pre-wrap}
#lbPage .pg{display:flex;align-items:center;gap:2px;margin-top:5px}#lbPage .pg small{color:#5b6461;margin-left:4px}#lbPage .pg .lav{border:2px solid #fff;margin-right:-6px}
#lbPage .newp{margin:6px 0;border:1px solid #e3e8e5;border-radius:10px;padding:6px 10px}#lbPage .newp summary{cursor:pointer;font-weight:600;padding:3px 0}
#lbPage .two{display:flex;gap:6px}#lbPage textarea.inp{resize:vertical}
#lbPage .kick{border:0;background:none;color:#b3261e;font-size:1.2em;cursor:pointer;padding:0 0 0 6px;vertical-align:middle}#lbPage .unv{color:#b3261e;cursor:pointer;font-size:.9em}
#lbPage .pk.rt b{color:#6a1b9a}#lbPage .pk span i{color:#3d4643}
@media (max-width:700px){ #lbPage .lbnav{flex-wrap:nowrap;gap:2px;overflow-x:auto;scrollbar-width:none} #lbPage .lbnav::-webkit-scrollbar{display:none} #lbPage .lbnav button{font-size:.82em;padding:6px 6px} #lbPage .two{flex-direction:column;gap:0} #lbPage .lbtabs{display:grid;grid-template-columns:1fr 1fr} #lbPage .lbtabs button{white-space:normal;padding:6px 8px} #lbPage{padding:0} #lbPage .lbc{border-radius:0;width:100%;height:100%} #lbPage .grid{grid-template-columns:repeat(2,1fr)} #lbPage .lr{grid-template-columns:28px 32px 1fr auto;gap:8px} }`;
document.head.append(lbCss);
const LB = {board: 'p2000', q: '', off: 0, rows: [], tot: 0, busy: false};
const boardMax = () => (BOARDS.find(b => b[0] === LB.board) || BOARDS[0])[2];
function lbShell(){
  lb.innerHTML = `<div class="lbc"><div class="lbh">${head('lb')}
    <div class="lbs" id="lbStats">…</div>${chips()}
    <input class="lbq" id="lbQ" type="search" placeholder="${L('Išči uporabnika …','Search users …')}" value="${esc(LB.q)}" autocomplete="off"></div>
    <div class="lbm"><div class="lbmain"><div id="potw"></div><div class="lbb" id="lbBody"></div></div><aside class="lba" id="lbAside"></aside></div><div class="lbf" id="lbFoot"></div></div>`;
  bindHead(() => { lbLoad(true); asideLB(); });
  let qt = 0; $a('lbQ').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { LB.q = e.target.value.trim().slice(0, 40); lbLoad(true); }, 300); };
  rpc('leaderboard_stats').then(j => { const el = $a('lbStats'); if (el && j) el.textContent = `${j.users} ${L('planincev','hikers')} · ${j.ascents} ${L('osvojenih vrhov','peaks climbed')} · ${j.month} ${L('ta mesec','this month')}`; })
    .catch(() => { const el = $a('lbStats'); if (el) el.textContent = ''; }); }
async function lbLoad(reset){
  if (LB.busy) return; LB.busy = true; if (reset){ LB.off = 0; LB.rows = []; $a('lbBody').innerHTML = `<div class="empty">…</div>`; }
  try{ const rows = await rpc('leaderboard2', {board: LB.board, q: LB.q, lim: 50, off: LB.off});
    LB.rows = LB.rows.concat(rows); LB.off += rows.length; LB.tot = rows.length ? rows[0].total_users : LB.tot; LB.more = rows.length === 50; lbList(); lbFoot(); }
  catch(e){ $a('lbBody').innerHTML = `<div class="empty">${esc(errText(e))}${e.code === 'PGRST202' ? '<br>(supabase/04_leaderboard.sql)' : ''}</div>`; }
  finally { LB.busy = false; } }
function lbList(){
  const M = boardMax(), R = LB.rows, top = !LB.q && R.length >= 3 && R[0].n > 0 ? R.slice(0, 3) : [];
  const row = r => `<div class="lr${S && S.username === r.username ? ' me' : ''}" data-u="${esc(r.username)}"><div class="rk">${r.rnk}.</div>${av(r.username, r.display_name)}
    <div class="who"><b>${esc(r.display_name || r.username)}</b><small>@${esc(r.username)}${r.last_climb ? ' · ' + L('zadnji vzpon','last climb') + ' ' + esc(fmtD(r.last_climb)) : ''}</small><div class="bar"><i style="width:${Math.min(100, r.n / M * 100).toFixed(1)}%"></i></div></div>
    <div class="num">${r.n}<small>/ ${M}</small></div></div>`;
  $a('lbBody').innerHTML = !R.length ? `<div class="empty">${LB.q ? L('Ni zadetkov.','No matches.') : L('Še nihče – bodi prvi!','Nobody yet - be the first!')}</div>`
    : (top.length ? `<div class="pod">${[1, 0, 2].map(i => { const r = top[i]; return `<div class="pd g${i + 1}" data-u="${esc(r.username)}"><div class="md">${['🥇','🥈','🥉'][i]}</div>${av(r.username, r.display_name, i ? 38 : 46)}<b>${esc(r.display_name || r.username)}</b><div class="nn">${r.n}</div><small>/ ${M}</small></div>`; }).join('')}</div>` : '')
      + R.slice(top.length).map(row).join('') + (LB.more ? `<button class="more" id="lbMore">${L('Pokaži več','Show more')}</button>` : '');
  $a('lbBody').querySelectorAll('[data-u]').forEach(d => d.onclick = () => lbProfile(d.dataset.u));
  const m = $a('lbMore'); if (m) m.onclick = () => lbLoad(false); }
async function lbFoot(){
  const f = $a('lbFoot'); if (!f) return;
  if (!S){ f.innerHTML = `<span>${L('Ustvari račun in se pridruži lestvici.','Create an account and join the leaderboard.')}</span><button id="lbJ">${L('Ustvari račun','Create account')}</button>`; $a('lbJ').onclick = () => { lbClose(); openAccount('up'); }; return; }
  if (S.listed === false){ f.innerHTML = `<span>${L('Nisi na lestvici.','You are not on the leaderboard.')}</span><button id="lbJ">${L('Nastavitve','Settings')}</button>`; $a('lbJ').onclick = () => { lbClose(); openAccount(); }; return; }
  let me = LB.rows.find(r => r.username === S.username);
  if (!me) try{ me = (await rpc('leaderboard2', {board: LB.board, q: S.username, lim: 5, off: 0})).find(r => r.username === S.username); }catch(_){}
  f.innerHTML = me ? `<span>${L('Ti','You')}: <b>${me.rnk}.</b> ${L('mesto od','place of')} ${LB.tot} · <b>${me.n}</b> / ${boardMax()}</span><button id="lbJ">${L('Moj profil','My profile')}</button>`
    : `<span>${L('Sinhroniziraj svoje vrhove, da se pojaviš na lestvici.','Sync your peaks to appear on the leaderboard.')}</span>`;
  const j = $a('lbJ'); if (j) j.onclick = () => lbProfile(S.username); }
async function lbProfile(u, back){
  const r0 = LB.rows.find(r => r.username === u), me = S && S.username === u;
  $a('lbBody').innerHTML = `<div class="pf"><button class="back" id="lbBack">‹ ${back ? L('Nazaj','Back') : L('Nazaj na lestvico','Back to the leaderboard')}</button><div id="pfBody"><div class="empty">…</div></div></div>`;
  $a('lbBack').onclick = back || lbList; lbTop();
  let F = null, j = null;
  if (S){ try{ F = await rpc('friend_profile', {uname: u}, true); }catch(_){} if (!me) await loadFriends().catch(() => {}); }
  if (!F) try{ j = await rpc('public_profile', {uname: u}); }catch(_){}
  const P = F || j, A = P ? P.ascents.filter(a => byId[a.peak_id]) : null;
  const cnt = A ? countsOf(A.map(a => a.peak_id)) : r0 ? r0 : null;
  const nm = (P && P.display_name) || (r0 && r0.display_name) || u;
  const st = S && !me && SO.fr ? ((SO.fr.find(f => f.username === u) || {}).state || 'none') : null;
  const fb = st === 'friend' ? `<button class="sb" id="pfRm">✕ ${L('Odstrani prijatelja','Remove friend')}</button>`
    : st === 'outgoing' ? `<button class="sb" id="pfRm">${L('Prošnja poslana · prekliči','Request sent · cancel')}</button>`
    : st === 'incoming' ? `<button class="sb pri" id="pfOk">✓ ${L('Sprejmi prijateljstvo','Accept friend request')}</button>`
    : st === 'none' ? `<button class="sb pri" id="pfAdd">➕ ${L('Dodaj prijatelja','Add friend')}</button>` : '';
  $a('pfBody').innerHTML = `<div class="pfh">${av(u, nm, 52)}<div><b>${esc(nm)}</b><div style="color:#5b6461">@${esc(u)}${r0 && r0.joined ? ' · ' + L('od','since') + ' ' + esc(fmtD(r0.joined)) : ''}${F && F.friends_since ? ' · 👥 ' + L('prijatelja od','friends since') + ' ' + esc(fmtD(F.friends_since.slice(0, 10))) : ''}</div></div></div>
    ${cnt ? countGrid(cnt) : ''}
    <div class="sbr">${fb}${A && A.length ? `<button class="sb" id="pfMap">🗺 ${L('Vrhovi na karti','Peaks on the map')}</button>` : ''}</div>
    ${F && F.routes.length && !me ? `<h4 class="sh">${L('Narisane poti','Drawn routes')} (${F.routes.length})</h4>` + F.routes.map(r => `<div class="pk rt" data-r="${esc(r.id)}"><b>↗ ${esc(r.name)}</b><span>${(+r.km || 0).toFixed(1)} km${r.peak_ids && r.peak_ids.length ? ' · ' + esc(r.peak_ids.filter(id => byId[id]).slice(0, 3).map(id => byId[id].name).join(', ')) : ''}</span></div>`).join('') : ''}
    ${A ? (A.length ? `<h4 class="sh">${L('Vrhovi','Peaks')} (${A.length})</h4>` + A.map(a => { const p = byId[a.peak_id]; return `<div class="pk" data-id="${esc(a.peak_id)}"><b>${esc(p.name)} <small style="font-weight:400;color:#5b6461">${Math.round(p.elev)} m</small></b><span>${esc([a.climbed_on && fmtD(a.climbed_on), a.route_name].filter(Boolean).join(' · '))}${a.note ? `<br><i>${esc(a.note)}</i>` : ''}</span></div>`; }).join('') : `<div class="empty">${L('Še brez vrhov.','No peaks yet.')}</div>`)
      : `<div class="empty">🔒 ${L('Seznam vrhov je zaseben.','The list of peaks is private.')}${me ? '<br>' + L('Vklopi »Javni profil« v nastavitvah računa.','Turn on "Public profile" in your account settings.') : st === 'none' ? '<br>' + L('Prijatelji vidijo vse – dodaj ga med prijatelje.','Friends see everything - add them as a friend.') : ''}</div>`}`;
  $a('pfBody').querySelectorAll('.pk[data-id]').forEach(d => d.onclick = () => { lbClose(); if (byId[d.dataset.id].lat != null) openPeak(d.dataset.id, true); });
  $a('pfBody').querySelectorAll('.pk[data-r]').forEach(d => d.onclick = async () => { try{ const x = await rpc('friend_route', {rid: d.dataset.r}, true); if (x){ lbClose(); showLine({name: x.name, who: '@' + x.username, coords: decodeLine(x.line), km: x.km}); } }catch(e){ toastErr(errText(e)); } });
  const again = () => lbProfile(u, back);
  const act = (id, fn) => { const b = $a(id); if (b) b.onclick = async () => { b.disabled = true; try{ await fn(); SO.frT = 0; SO.circle = null; await loadFriends(); refreshBadge(); again(); }catch(e){ b.disabled = false; toastErr(errText(e)); } }; };
  act('pfAdd', async () => { const r = await rpc('friend_request', {uname: u}, true); toast(r === 'accepted' ? L('Zdaj sta prijatelja.', 'You are friends now.') : L('Prošnja poslana.', 'Request sent.')); });
  act('pfOk', () => rpc('friend_respond', {uname: u, ok: true}, true));
  const rm = $a('pfRm'); if (rm){ act('pfRm', () => rpc('friend_remove', {uname: u}, true)); const doIt = rm.onclick; rm.onclick = () => { if (st !== 'friend' || confirmTwice(rm)) doIt(); }; }
  const mp = $a('pfMap'); if (mp) mp.onclick = () => { lbClose(); ringsShow(`${nm}: ${A.length} ${L('vrhov','peaks')}`, Object.fromEntries(A.map(a => [a.peak_id, {n: 1, of: 1, who: [a.climbed_on ? fmtD(a.climbed_on) : '✓']}]))); };
}
// its own page: opening adds a step to the browser history, so the phone's / browser's back button returns to the map
function lbShow(){ if (!lb.classList.contains('on')){ try{ history.pushState({lbp: 1}, ''); }catch(_){} } lb.classList.add('on'); document.body.classList.remove('menu'); }
function leaderboard(){ lbShell(); lbShow(); lbLoad(true); asideLB(); potw(); }
function lbClose(){ if (!lb.classList.contains('on')) return; if (history.state && history.state.lbp){ history.back(); return; } lb.classList.remove('on'); }
addEventListener('popstate', () => { if (lb.classList.contains('on') && !(history.state && history.state.lbp)) lb.classList.remove('on'); });
lb.onclick = e => { if (e.target === lb) lbClose(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('on')) lbClose(); });
async function profile(u){ lbShell(); lbShow(); LB.rows = []; asideLB(); await lbProfile(u, () => lbLoad(true)); }
window.showLeaderboard = leaderboard; window.showProfile = profile;
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#lbBtn')){ e.preventDefault(); leaderboard(); } });

// ---------- 👥 friends + groups (supabase/05_social.sql) ----------
// friends: mutual (request -> accept), see everything of each other; groups: private, invite only your friends; plans: date + route, "I'm going"
const SO = {fr: null, frT: 0, badge: {requests: 0, invites: 0}, circle: null, circleT: 0, re: null};
const plSl = (n, f) => window.LANG === 'en' ? (n === 1 ? f[4] : f[5]) : f[n % 100 === 1 ? 0 : n % 100 === 2 ? 1 : n % 100 === 3 || n % 100 === 4 ? 2 : 3];   // 1 član, 2 člana, 3 člani, 5 članov
const nMem = n => n + ' ' + plSl(n, ['član', 'člana', 'člani', 'članov', 'member', 'members']);
const nPlan = n => n + ' ' + plSl(n, ['načrt', 'načrta', 'načrti', 'načrtov', 'plan', 'plans']);
const badgeN = () => (SO.badge.requests || 0) + (SO.badge.invites || 0);
const PAGES = [['me', '👤', L('Moj profil','My profile')], ['lb', '🏆', L('Lestvica','Leaderboard')], ['fr', '👥', L('Prijatelji','Friends')], ['gr', '⛰', L('Skupine','Groups')]];
function head(p){ lb.dataset.p = p;
  return `<div class="lbt"><button class="lbx bk" aria-label="${L('Nazaj na karto','Back to the map')}">‹ ${L('Karta','Map')}</button><div class="lbnav">${PAGES.map(([k, i, t]) => { const n = k === 'fr' ? SO.badge.requests : k === 'gr' ? SO.badge.invites : 0;
    return `<button data-p="${k}" class="${k === p ? 'on' : ''}">${i} ${t}${n ? `<i class="bdg">${n}</i>` : ''}</button>`; }).join('')}</div></div>`; }
const chips = () => `<div class="lbtabs">${BOARDS.map(([k, t, m]) => `<button data-b="${k}" class="${k === LB.board ? 'on' : ''}">${t} <span style="opacity:.6">${m}</span></button>`).join('')}</div>`;
function bindHead(onBoard){
  lb.querySelector('.lbx').onclick = lbClose;
  lb.querySelector('.lbnav').onclick = e => { const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return;
    if (b.dataset.p === 'lb'){ lbShell(); lbLoad(true); asideLB(); potw(); } else if (b.dataset.p === 'me') meOpen(); else soOpen(b.dataset.p); };
  const t = lb.querySelector('.lbtabs'); if (t) t.onclick = e => { const b = e.target.closest('button'); if (!b || b.dataset.b === LB.board) return; LB.board = b.dataset.b;
    lb.querySelectorAll('.lbtabs button').forEach(x => x.classList.toggle('on', x === b)); onBoard(); }; }
const isP2 = p => p.tier !== '1500' && p.rank != null, isA2 = p => p.tier !== '1500', isP15 = p => p.tier === '1500' && p.is_sub === 'no';
const countsOf = ids => { const P = ids.map(id => byId[id]).filter(Boolean);
  return {prom2000: P.filter(isP2).length, all2000: P.filter(isA2).length, prom1500: P.filter(isP15).length, all1500: P.filter(p => p.tier === '1500').length}; };
const boardN = c => !c ? 0 : LB.board === 'a2000' ? c.all2000 : LB.board === 'p1500' ? c.prom1500 : LB.board === 'all' ? (c.all2000 || 0) + (c.all1500 || 0) : c.prom2000;
const boardPeaks = () => PEAKS.filter(LB.board === 'a2000' ? isA2 : LB.board === 'p1500' ? isP15 : LB.board === 'all' ? () => true : isP2);
const countGrid = c => `<div class="grid">${[[c.prom2000, N_PROM, L('prominentni 2000','prominent 2000')], [c.all2000, N_A2K, L('vsi nad 2000 m','all above 2000 m')],
  [c.prom1500, N_P15, L('prominentni 1500–2000','prominent 1500–2000')], [(c.all2000 || 0) + (c.all1500 || 0), N_ALL, L('vsi vrhovi','all peaks')]].map(([v, m, t]) => `<div><b>${v || 0}</b><small>/ ${m} · ${t}</small></div>`).join('')}</div>`;
async function loadFriends(force){ if (!S) return []; if (!force && SO.fr && Date.now() - SO.frT < 60000) return SO.fr;
  SO.fr = await rpc('my_friends', {}, true); SO.frT = Date.now(); return SO.fr; }
async function refreshBadge(){ if (!S){ SO.badge = {requests: 0, invites: 0}; document.body.classList.remove('socdot'); return; }
  try{ SO.badge = await rpc('social_badge', {}, true) || SO.badge; }catch(_){ return; }
  document.body.classList.toggle('socdot', badgeN() > 0); socBtns();
  const b = $a('accSoc'); if (b) b.innerHTML = `👥 ${L('Prijatelji in skupine','Friends & groups')}${badgeN() ? ` <i class="bdg">${badgeN()}</i>` : ''}`;
  lb.querySelectorAll('.lbnav button').forEach(x => { const n = x.dataset.p === 'fr' ? SO.badge.requests : x.dataset.p === 'gr' ? SO.badge.invites : 0;
    const i = x.querySelector('.bdg'); if (n && !i) x.insertAdjacentHTML('beforeend', `<i class="bdg">${n}</i>`); else if (i){ if (n) i.textContent = n; else i.remove(); } }); }
const busy = async (btn, fn, after) => { if (btn) btn.disabled = true; try{ await fn(); if (after) await after(); }catch(e){ toastErr(errText(e)); if (btn) btn.disabled = false; } };
const urow = (u, nm, rk, c, sub, extra = '') => { const M = boardPeaks().length, n = boardN(c);
  return `<div class="lr${S && S.username === u ? ' me' : ''}" data-u="${esc(u)}"><div class="rk">${rk}.</div>${av(u, nm)}
    <div class="who"><b>${esc(nm || u)}</b><small>@${esc(u)}${sub ? ' · ' + sub : ''}</small><div class="bar"><i style="width:${Math.min(100, n / M * 100).toFixed(1)}%"></i></div></div>
    <div class="num">${n}<small>/ ${M}</small>${extra}</div></div>`; };
const ranked = list => { const L2 = list.slice().sort((a, b) => boardN(b.c) - boardN(a.c) || String(a.u).localeCompare(b.u)); let r = 0, last = null;
  return L2.map((x, i) => { const n = boardN(x.c); if (n !== last){ r = i + 1; last = n; } return Object.assign({rk: r}, x); }); };
const myC = () => Object.assign(countsOf([...(window.TICKS ? TICKS.get() : [])]), {last_climb: Object.values(VI).map(v => v && v.d).filter(Boolean).sort().pop() || null});

function soShell(p){
  lb.innerHTML = `<div class="lbc"><div class="lbh">${head(p)}<div class="lbs">${p === 'fr' ? L('Prijatelji vidijo drug drugemu vse: vrhove z datumi, potmi in opombami ter narisane poti.','Friends see everything of each other: peaks with dates, routes and notes, and drawn routes.')
    : L('Skupine so zasebne. Povabiš lahko samo svoje prijatelje. Člani vidijo vrhove z datumi in skupne načrte.','Groups are private. You can only invite your friends. Members see peaks with dates and shared plans.')}</div>${chips()}</div>
    <div class="lbm"><div class="lbb" id="lbBody"><div class="empty">…</div></div><aside class="lba" id="lbAside"></aside></div><div class="lbf" id="lbFoot" style="display:none"></div></div>`;
  bindHead(() => { SO.re && SO.re(); SO.aside && SO.aside(); }); }
function soOpen(p){ lbShow(); soShell(p);
  if (!S){ $a('lbBody').innerHTML = `<div class="empty">${L('Prijatelji in skupine potrebujejo račun.','Friends and groups need an account.')}<br><br><button class="sb pri" id="soIn">${L('Prijava / nov račun','Sign in / new account')}</button></div>`;
    $a('soIn').onclick = () => { lbClose(); openAccount('in'); }; return; }
  refreshBadge(); (p === 'gr' ? grList : frList)(); (p === 'gr' ? asideGR : asideFR)(); }
window.showSocial = soOpen;

// friends page: add, requests, ranking of me + friends, sent requests
async function frList(){ SO.re = frList; const B = $a('lbBody');
  let F; try{ F = await loadFriends(true); }catch(e){ B.innerHTML = `<div class="empty">${esc(errText(e))}${e.code === 'PGRST202' ? '<br>(supabase/05_social.sql)' : ''}</div>`; return; }
  if (lb.dataset.p !== 'fr') return;
  const inc = F.filter(f => f.state === 'incoming'), out = F.filter(f => f.state === 'outgoing'), fr = F.filter(f => f.state === 'friend');
  const R = ranked([{u: S.username, nm: S.display_name, c: myC()}].concat(fr.map(f => ({u: f.username, nm: f.display_name, c: f.counts || {}}))));
  B.innerHTML = `<div class="addf"><input id="frU" type="text" autocapitalize="none" spellcheck="false" maxlength="24" placeholder="${L('uporabniško ime prijatelja','friend\'s username')}"><button class="sb pri" id="frGo">➕ ${L('Dodaj','Add')}</button></div>
    <div class="ah2">${L('Ali ga poišči na 🏆 lestvici in odpri njegov profil.','Or find them on the 🏆 leaderboard and open their profile.')}</div>
    ${inc.length ? `<h4 class="sh">${L('Prošnje zate','Requests for you')} (${inc.length})</h4>` + inc.map(f => `<div class="req" data-u="${esc(f.username)}">${av(f.username, f.display_name, 30)}<div class="who"><b>${esc(f.display_name || f.username)}</b><small>@${esc(f.username)}</small></div>
      <button class="sb pri" data-a="ok">✓ ${L('Sprejmi','Accept')}</button><button class="sb" data-a="no">${L('Zavrni','Decline')}</button></div>`).join('') : ''}
    <h4 class="sh">${L('Ti in prijatelji','You and your friends')} (${fr.length})</h4>
    ${R.map(x => urow(x.u, x.nm, x.rk, x.c, x.c.last_climb ? L('zadnji vzpon','last climb') + ' ' + esc(fmtD(x.c.last_climb)) : '')).join('')}
    ${fr.length ? '' : `<div class="empty">${L('Še nimaš prijateljev. Vpiši uporabniško ime zgoraj.','No friends yet. Type a username above.')}</div>`}
    ${out.length ? `<h4 class="sh">${L('Čakajo na odgovor','Waiting for an answer')} (${out.length})</h4>` + out.map(f => `<div class="req" data-u="${esc(f.username)}">${av(f.username, f.display_name, 30)}<div class="who"><b>${esc(f.display_name || f.username)}</b><small>@${esc(f.username)}</small></div>
      <button class="sb" data-a="rm">${L('Prekliči','Cancel')}</button></div>`).join('') : ''}`;
  const add = async () => { const u = $a('frU').value.trim().toLowerCase(); if (!u) return;
    await busy($a('frGo'), async () => { const r = await rpc('friend_request', {uname: u}, true);
      toast({accepted: L('Zdaj sta prijatelja.', 'You are friends now.'), already: L('Sta že prijatelja.', 'Already friends.'), pending: L('Prošnja je že poslana.', 'Request already sent.')}[r] || L('Prošnja poslana – ko jo sprejme, sta prijatelja.', 'Request sent - once accepted you are friends.')); SO.circle = null; }, frList); };
  $a('frGo').onclick = add; $a('frU').onkeydown = e => { if (e.key === 'Enter') add(); };
  B.querySelectorAll('.req button').forEach(b => b.onclick = () => { const u = b.closest('.req').dataset.u, a = b.dataset.a;
    busy(b, () => a === 'rm' ? rpc('friend_remove', {uname: u}, true) : rpc('friend_respond', {uname: u, ok: a === 'ok'}, true), async () => { SO.circle = null; await refreshBadge(); await frList(); }); });
  B.querySelectorAll('.lr[data-u]').forEach(d => d.onclick = () => lbProfile(d.dataset.u, () => soOpen('fr'))); }

// groups page: invites, my groups, new group
async function grList(){ SO.re = grList; const B = $a('lbBody');
  let G, F; try{ [G, F] = await Promise.all([rpc('my_groups', {}, true), loadFriends()]); }catch(e){ B.innerHTML = `<div class="empty">${esc(errText(e))}${e.code === 'PGRST202' ? '<br>(supabase/05_social.sql)' : ''}</div>`; return; }
  if (lb.dataset.p !== 'gr') return;
  const fr = F.filter(f => f.state === 'friend');
  B.innerHTML = `${G.invites.length ? `<h4 class="sh">${L('Povabila','Invitations')} (${G.invites.length})</h4>` + G.invites.map(g => `<div class="req" data-g="${esc(g.id)}"><span class="gav">⛰</span><div class="who"><b>${esc(g.name)}</b><small>${L('povabil','invited by')} @${esc(g.by)} · ${nMem(g.members)}</small></div>
      <button class="sb pri" data-a="ok">✓ ${L('Pridruži se','Join')}</button><button class="sb" data-a="no">${L('Zavrni','Decline')}</button></div>`).join('')
      + `<div class="ah2">${L('Člani skupine vidijo tvoje vrhove z datumi (poti in opombe vidijo samo prijatelji).','Group members see your peaks with dates (routes and notes only your friends).')}</div>` : ''}
    <h4 class="sh">${L('Moje skupine','My groups')} (${G.groups.length})</h4>
    ${G.groups.map(g => `<div class="lr lgrp" data-g="${esc(g.id)}"><span class="gav">⛰</span><span></span><div class="who"><b>${esc(g.name)}${g.role === 'owner' ? ' <small class="own">' + L('lastnik','owner') + '</small>' : ''}</b><small>${nMem(g.members)}${g.plans ? ' · 📅 ' + nPlan(g.plans) : ''}</small></div><div class="num">›</div></div>`).join('')
      || `<div class="empty">${L('Še nisi v nobeni skupini.','You are not in any group yet.')}</div>`}
    <h4 class="sh">＋ ${L('Nova skupina','New group')}</h4>
    ${fr.length ? `<input id="grN" class="inp" maxlength="60" placeholder="${L('ime skupine (npr. Koroški planinci)','group name (e.g. Weekend crew)')}">
      <div class="ah2">${L('Povabi prijatelje:','Invite friends:')}</div><div class="pick">${fr.map(f => `<label><input type="checkbox" value="${esc(f.username)}"> ${esc(f.display_name || f.username)} <small>@${esc(f.username)}</small></label>`).join('')}</div>
      <button class="sb pri" id="grGo">${L('Ustvari skupino','Create group')}</button>`
      : `<div class="empty">${L('Skupine se ustvarjajo med prijatelji – najprej dodaj prijatelja (👥).','Groups are made among friends - add a friend first (👥).')}</div>`}`;
  B.querySelectorAll('.req[data-g] button').forEach(b => b.onclick = () => { const g = b.closest('.req').dataset.g, ok = b.dataset.a === 'ok';
    busy(b, () => rpc('group_respond', {gid: g, ok}, true), async () => { SO.circle = null; await refreshBadge(); if (ok) grView(g); else grList(); }); });
  B.querySelectorAll(".lgrp").forEach(d => d.onclick = () => grView(d.dataset.g));
  const go = $a('grGo'); if (go) go.onclick = () => { const n = $a('grN').value.trim(); if (!n){ $a('grN').focus(); return; }
    const inv = [...B.querySelectorAll('.pick input:checked')].map(i => i.value); let id = null;
    busy(go, async () => { id = await rpc('group_create', {gname: n, invite: inv}, true); toast(L('Skupina ustvarjena.', 'Group created.')); }, () => grView(id)); }; }

// one group: plans, ranking, peaks of the group, invite, settings
async function grView(gid){ SO.re = () => grView(gid); const B = $a('lbBody');
  let G, F; try{ [G, F] = await Promise.all([rpc('group_detail', {gid}, true), loadFriends()]); }catch(e){ toastErr(errText(e)); return grList(); }
  if (!G){ toastErr(L('Nisi (več) član te skupine.', 'You are not (any more) a member of this group.')); return grList(); }
  const own = G.role === 'owner', today0 = today(), MY = window.MYR ? MYR.get() : [];
  const byU = {}; G.ascents.forEach(([u, p, d]) => { (byU[u] = byU[u] || []).push(p); });
  const R = ranked(G.members.map(m => ({u: m.username, nm: m.display_name, c: m.counts || {}, m})));
  const BP = boardPeaks(), cnt = {}; G.ascents.forEach(([u, p]) => { (cnt[p] = cnt[p] || new Set()).add(u); });
  const done = BP.filter(p => cnt[p.id]).length, none = BP.filter(p => !cnt[p.id]), N = G.members.length;
  const invitable = F.filter(f => f.state === 'friend' && !G.members.some(m => m.username === f.username) && !G.invited.includes(f.username));
  const nm = u => { const m = G.members.find(x => x.username === u); return (m && (m.display_name || m.username)) || u; };
  const plan = x => { const past = x.plan_on && x.plan_on < today0, me = x.going.includes(S.username), dt = x.plan_on ? new Date(x.plan_on + 'T12:00') : null;
    return `<div class="plan${past ? ' past' : ''}" data-p="${esc(x.id)}"><div class="pdt">${dt ? `<b>${dt.getDate()}. ${dt.getMonth() + 1}.</b><small>${dt.toLocaleDateString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {weekday: 'short'})}</small>` : '<b>?</b><small>' + L('brez datuma','no date') + '</small>'}</div>
      <div class="pb"><b>${esc(x.title)}</b><small>@${esc(x.by || '?')}${x.km ? ' · ' + (+x.km).toFixed(1) + ' km' : ''}${x.peak_ids.length ? ' · ' + x.peak_ids.filter(id => byId[id]).slice(0, 4).map(id => `<a data-pk="${esc(id)}">${esc(byId[id].name)}</a>`).join(', ') : ''}</small>
      ${x.note ? `<div class="pn">${esc(x.note)}</div>` : ''}
      <div class="pg">${x.going.length ? x.going.map(u => av(u, nm(u), 22)).join('') + ` <small>${x.going.length} ${L('gre','going')}</small>` : `<small>${L('še nihče ne gre','nobody going yet')}</small>`}</div>
      <div class="sbr">${past ? '' : `<button class="sb${me ? '' : ' pri'}" data-a="go">${me ? L('Ne grem','Not going') : '✓ ' + L('Grem','I\'m going')}</button>`}
        ${x.has_line ? `<button class="sb" data-a="map">🗺 ${L('Na karti','On the map')}</button>` : x.peak_ids.length ? `<button class="sb" data-a="pk">🗺 ${L('Vrh','Peak')}</button>` : ''}
        ${x.by === S.username || own ? `<button class="sb" data-a="del" title="${L('Izbriši','Delete')}">🗑</button>` : ''}</div></div></div>`; };
  const P = G.plans.filter(x => !x.plan_on || x.plan_on >= today0), Past = G.plans.filter(x => x.plan_on && x.plan_on < today0).reverse();
  B.innerHTML = `<div class="pf"><button class="back" id="lbBack">‹ ${L('Skupine','Groups')}</button>
    <div class="pfh"><span class="gav big">⛰</span><div><b>${esc(G.name)}</b><div style="color:#5b6461">${nMem(N)} · ${L('od','since')} ${esc(fmtD(G.created_at.slice(0, 10)))}</div></div></div>
    <h4 class="sh">📅 ${L('Načrti','Plans')}</h4>
    ${P.map(plan).join('') || `<div class="ah2">${L('Ni načrtov. Dodaj turo, da drugi vidijo, kam greš.','No plans. Add a tour so the others see where you are going.')}</div>`}
    <details class="newp"><summary>＋ ${L('Nov načrt','New plan')}</summary>
      <input id="plT" class="inp" maxlength="120" placeholder="${L('naslov (npr. Triglav čez Plemenice)','title (e.g. Triglav via Plemenice)')}">
      <div class="two"><input id="plD" class="inp" type="date" min="${today0}"><select id="plR" class="inp"><option value="">${L('— brez narisane poti —','— no drawn route —')}</option>${MY.map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join('')}</select></div>
      <input id="plP" class="inp" list="plPL" placeholder="${L('ali vrh (začni tipkati)','or a peak (start typing)')}"><datalist id="plPL">${PEAKS.filter(p => p.lat != null).map(p => `<option value="${esc(p.name)} (${Math.round(p.elev)} m)">`).join('')}</datalist>
      <textarea id="plN" class="inp" maxlength="1000" rows="2" placeholder="${L('opomba: zbor, prevoz, oprema …','note: meeting point, transport, gear …')}"></textarea>
      <div class="ah2">${L('Narisano pot narišeš v ✎ Riši; v načrt se shrani njena kopija.','Draw routes in ✎ Draw; the plan keeps a copy.')}</div>
      <button class="sb pri" id="plGo">${L('Dodaj načrt','Add plan')}</button></details>
    <h4 class="sh">🏆 ${L('Lestvica skupine','Group leaderboard')}</h4>
    ${R.map(x => urow(x.u, x.nm, x.rk, x.c, (x.m.role === 'owner' ? L('lastnik','owner') : '') + (!x.m.friend && x.u !== S.username ? (x.m.role === 'owner' ? ' · ' : '') + L('ni prijatelj','not a friend') : ''),
      own && x.u !== S.username ? `<button class="kick" data-k="${esc(x.u)}" title="${L('Odstrani iz skupine','Remove from group')}">×</button>` : '')).join('')}
    <h4 class="sh">⛰ ${L('Vrhovi skupine','Group peaks')}</h4>
    <div class="ah2"><b>${done}</b> / ${BP.length} ${L('je osvojil vsaj en član','climbed by at least one member')} · <b>${BP.filter(p => cnt[p.id] && cnt[p.id].size >= N).length}</b> ${L('vsi','by all')}</div>
    <div class="sbr"><button class="sb" id="grMap">🗺 ${L('Vrhovi skupine na karti','Group peaks on the map')}</button></div>
    ${none.length ? `<details class="newp"><summary>${L('Še nihče ni bil','Nobody yet')} (${none.length})</summary>${none.sort((a, b) => b.elev - a.elev).map(p => `<div class="pk" data-id="${esc(p.id)}"><b>${esc(p.name)}</b><span>${Math.round(p.elev)} m</span></div>`).join('')}</details>` : ''}
    ${invitable.length || G.invited.length ? `<h4 class="sh">✉ ${L('Povabi prijatelje','Invite friends')}</h4>` : ''}
    ${invitable.length ? `<div class="pick">${invitable.map(f => `<label><input type="checkbox" value="${esc(f.username)}"> ${esc(f.display_name || f.username)} <small>@${esc(f.username)}</small></label>`).join('')}</div><button class="sb pri" id="grInv">${L('Povabi','Invite')}</button>` : ''}
    ${G.invited.length ? `<div class="ah2">${L('Povabljeni, še niso odgovorili:','Invited, no answer yet:')} ${G.invited.map(u => `@${esc(u)}${own ? ` <a class="unv" data-k="${esc(u)}">${L('prekliči','cancel')}</a>` : ''}`).join(', ')}</div>` : ''}
    ${Past.length ? `<details class="newp"><summary>${L('Pretekli načrti','Past plans')} (${Past.length})</summary>${Past.map(plan).join('')}</details>` : ''}
    <h4 class="sh">⚙ ${L('Skupina','Group')}</h4>
    <div class="sbr">${own ? `<button class="sb" id="grRen">✎ ${L('Preimenuj','Rename')}</button><button class="sb danger" id="grDel">🗑 ${L('Izbriši skupino','Delete group')}</button>` : ''}<button class="sb danger" id="grLeave">${L('Zapusti skupino','Leave group')}</button></div>
    ${own ? `<div class="ah2">${L('Če zapustiš skupino, postane lastnik najstarejši član.','If you leave, the longest member becomes the owner.')}</div>` : ''}</div>`;
  lbTop(); const again = () => grView(gid);
  $a('lbBack').onclick = grList;
  B.querySelectorAll('.lr[data-u]').forEach(d => d.onclick = e => { if (e.target.closest('.kick')) return; lbProfile(d.dataset.u, again); });
  B.querySelectorAll('.kick,.unv').forEach(b => b.onclick = e => { e.stopPropagation(); if (!confirmTwice(b)) return; busy(b, () => rpc('group_kick', {gid, uname: b.dataset.k}, true), again); });
  B.querySelectorAll('[data-pk]').forEach(a => a.onclick = () => { lbClose(); openPeak(a.dataset.pk, true); });
  B.querySelectorAll('.pk[data-id]').forEach(d => d.onclick = () => { lbClose(); openPeak(d.dataset.id, true); });
  B.querySelectorAll('.plan button').forEach(b => b.onclick = async () => { const id = b.closest('.plan').dataset.p, x = G.plans.find(q => q.id === id), a = b.dataset.a;
    if (a === 'go') busy(b, () => rpc('plan_go', {pid: id, going: !x.going.includes(S.username)}, true), again);
    else if (a === 'del'){ if (confirmTwice(b)) busy(b, () => rpc('plan_delete', {pid: id}, true), again); }
    else if (a === 'pk'){ lbClose(); openPeak(x.peak_ids.find(i => byId[i]), true); }
    else if (a === 'map') busy(b, async () => { const j = await rpc('plan_line', {pid: id}, true); lbClose();
      await showLine({name: j.title, who: '@' + (j.username || '?'), sub: j.plan_on ? fmtD(j.plan_on) : '', coords: decodeLine(j.line), km: j.km}); }); });
  $a('plGo').onclick = () => { const i = $a('plR').value, r = i !== '' ? MY[+i] : null, pv = $a('plP').value.trim();
    const pk = pv ? PEAKS.find(p => `${p.name} (${Math.round(p.elev)} m)` === pv) || PEAKS.find(p => p.name.toLowerCase() === pv.toLowerCase()) : null;
    if (pv && !pk){ toastErr(L('Vrha ni na seznamu – izberi ga s seznama.', 'Peak not found - pick it from the list.')); return; }
    const title = $a('plT').value.trim() || (r && r.name) || (pk && pk.name); if (!title){ $a('plT').focus(); return; }
    const c = r && r.coords && r.coords.length > 1 ? r.coords : null, ids = [...new Set([].concat(pk ? [pk.id] : [], c ? routePeaks(c) : []))].slice(0, 50);
    busy($a('plGo'), () => rpc('plan_add', {gid, title, plan_on: $a('plD').value || null, note: $a('plN').value.trim() || null, peak_ids: ids, line: c ? encodeLine(c) : null, km: c ? +lineKm(c).toFixed(2) : null}, true), again); };
  $a('grMap').onclick = () => { lbClose(); ringsShow(`${G.name}: ${done} / ${BP.length}`, Object.fromEntries(Object.entries(cnt).map(([p, s]) => [p, {n: s.size, of: N}]))); };
  const inv = $a('grInv'); if (inv) inv.onclick = () => { const u = [...B.querySelectorAll('.pick input:checked')].map(i => i.value); if (!u.length) return;
    busy(inv, async () => { const n = await rpc('group_invite', {gid, unames: u}, true); toast(L(`Poslanih povabil: ${n}`, `Invitations sent: ${n}`)); }, again); };
  const ren = $a('grRen'); if (ren) ren.onclick = () => { const n = prompt(L('Novo ime skupine', 'New group name'), G.name); if (n && n.trim()) busy(ren, () => rpc('group_rename', {gid, gname: n.trim()}, true), again); };
  const del = $a('grDel'); if (del) del.onclick = () => { if (confirmTwice(del)) busy(del, () => rpc('group_delete', {gid}, true), grList); };
  $a('grLeave').onclick = () => { if (confirmTwice($a('grLeave'))) busy($a('grLeave'), () => rpc('group_leave', {gid}, true), async () => { SO.circle = null; await grList(); }); }; }
// ---------- 👤 my page: numbers, GPS ✓, wishlist, latest climbs, my routes, friends, groups (works without an account too) ----------
// wishlist = peaks I want to climb; kept in the profile settings, so it syncs with the account like the other settings
const WISH = () => ((window.PREFS && PREFS.get().wish) || []).filter(id => byId[id]);
function wishSet(list){ if (!window.PREFS) return; PREFS.set(Object.assign(PREFS.get(), {wish: [...new Set(list)].slice(0, 300)})); window.onPrefs && window.onPrefs(); }
window.wishBtn = p => { const b = document.createElement('button'); b.className = 'wish';
  const paint = () => { const on = WISH().includes(p.id); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on);
    b.title = on ? L('Odstrani s seznama želja','Remove from wishlist') : L('Dodaj na seznam želja','Add to wishlist'); };
  b.onclick = e => { e.preventDefault(); e.stopPropagation(); const W = WISH(), on = W.includes(p.id);
    wishSet(on ? W.filter(x => x !== p.id) : W.concat(p.id)); paint(); toast(on ? L('Odstranjeno s seznama želja.','Removed from the wishlist.') : L('⭐ Na seznamu želja (👤 Moj profil).','⭐ On your wishlist (👤 My profile).')); };
  paint(); return b; };
function meOpen(){ lbShow();
  lb.innerHTML = `<div class="lbc"><div class="lbh">${head('me')}<div class="lbs">${S ? L('Vse tvoje na enem mestu. Nastavitve računa so v ⚙ Nastavitvah.','Everything of yours in one place. Account settings are in ⚙ Settings.')
      : L('Brez računa — vse je shranjeno samo v tej napravi.','No account — everything is stored on this device only.')}</div></div>
    <div class="lbm"><div class="lbb" id="lbBody"></div><aside class="lba" id="lbAside"></aside></div><div class="lbf" id="lbFoot" style="display:none"></div></div>`;
  bindHead(() => {}); SO.re = meOpen; meBody(); meAside(); }
function meAside(){ SO.aside = meAside; const A = $a('lbAside'); if (!A) return; A.innerHTML = badgeCard() + progressCard(); asideBind(); }
const pkRow = (id, right, extra = '') => { const p = byId[id]; if (!p) return ''; const tr = window.T || (x => x);
  return `<div class="it"><div>${pkA(id)}${VER[id] ? ' <span class="vgps" title="GPS">✓</span>' : ''} <small class="nb">${Math.round(p.elev)} m · ${esc(tr(p.range || ''))}</small></div><span>${right || ''}${extra}</span></div>`; };
async function meBody(){ const B = $a('lbBody'); if (!B) return; const c = myC(), T0 = window.TICKS ? TICKS.get() : new Set(), nV = Object.keys(VER).filter(id => T0.has(id)).length;
  const W = WISH(), MY = window.MYR ? MYR.get() : [];
  const climbs = [...T0].filter(id => byId[id]).map(id => [id, (VI[id] && VI[id].d) || '']).sort((a, b) => b[1].localeCompare(a[1]) || byId[b[0]].elev - byId[a[0]].elev);
  B.innerHTML = `<div class="mehero">${av(S ? S.username : '?', S ? S.display_name : '?', 54)}<div class="who"><b>${esc(S ? (S.display_name || S.username) : L('Gost','Guest'))}</b><small>${S ? '@' + esc(S.username) : L('brez računa','no account')}</small></div>
      <div class="mebtn">${S ? '' : `<button class="sb pri" id="meIn">${L('Prijava / nov račun','Sign in / new account')}</button>`}<button class="sb" id="meSet">⚙ ${L('Nastavitve','Settings')}</button>
      ${IN_APP ? `<button class="sb${gWatch ? ' pri' : ''}" id="meGps">📍 ${gWatch ? L('GPS vrhovi: vklopljeno','GPS summits: on') : L('GPS vrhovi','GPS summits')}</button>` : ''}</div></div>
    ${countGrid(c)}
    <div class="nb" style="margin:-4px 0 12px">${[nV ? `<span class="vgps">✓</span> ${L('Potrjeno z GPS','Confirmed by GPS')}: <b>${nV}</b>` : '', c.last_climb ? L('Zadnji vzpon','Last climb') + ': <b>' + esc(fmtD(c.last_climb)) + '</b>' : '',
      !IN_APP ? L('Vrhove s GPS potrdi Android aplikacija.','Summits are GPS-confirmed by the Android app.') : ''].filter(Boolean).join(' · ')}</div>
    ${ac(`⭐ ${L('Seznam želja','Wishlist')} (${W.length})`, W.length ? W.map(id => pkRow(id, T0.has(id) ? '✓ ' + L('osvojen','climbed') : '', ` <a class="rmw" data-w="${esc(id)}" title="${L('Odstrani','Remove')}">✕</a>`)).join('')
        : `<div class="nb">${L('V oknu vrha klikni ☆ in vrh se znajde tu.','Click ☆ in a peak window and the peak lands here.')}</div>`)}
    ${ac(`📅 ${L('Moji vzponi','My climbs')} (${climbs.length})`, climbs.length ? climbs.slice(0, 25).map(([id, d]) => pkRow(id, d ? esc(fmtD(d)) : '')).join('') + (climbs.length > 25 ? `<div class="nb">… ${L('in še','and')} ${climbs.length - 25} ${L('(vsi so na seznamu vrhov)','more (all are in the peak list)')}</div>` : '')
        : `<div class="nb">${L('Še nobenega — odkljukaj vrh v seznamu ali v oknu vrha.','None yet — tick a peak in the list or in its window.')}</div>`)}
    ${ac(`🗺 ${L('Moje poti','My routes')} (${MY.length})`, MY.length ? MY.slice().reverse().slice(0, 30).map((r, j) => { const i = MY.length - 1 - j, km = r.coords && r.coords.length > 1 ? lineKm(r.coords) : 0;
        return `<div class="it"><div><a data-rt="${i}">${esc(r.name || L('Pot','Route'))}</a> <small class="nb">${km.toFixed(1)} km${r.vis && r.vis !== 'private' ? ' · ' + (r.vis === 'public' ? L('javna','public') : L('s povezavo','link')) : ''}</small></div><span><a data-gpx="${i}">GPX</a></span></div>`; }).join('')
        : `<div class="nb">${L('Nariši pot z ✏️ Riši pot in jo shrani.','Draw a route with ✏️ Draw route and save it.')}</div>`)}
    <div id="meSoc">${S ? `<div class="nb">…</div>` : ac(`👥 ${L('Prijatelji in skupine','Friends & groups')}`, `<div class="nb">${L('Za prijatelje, skupine in lestvico potrebuješ račun.','Friends, groups and the leaderboard need an account.')}</div>`)}</div>`;
  const bind = () => { B.querySelectorAll('[data-pk]').forEach(a => a.onclick = () => { lbClose(); setTimeout(() => openPeak(a.dataset.pk, true), 60); });
    B.querySelectorAll('[data-u]').forEach(a => a.onclick = () => lbProfile(a.dataset.u, meOpen));
    B.querySelectorAll('[data-g]').forEach(a => a.onclick = () => { soShell('gr'); grView(a.dataset.g); }); };
  B.querySelectorAll('.rmw').forEach(a => a.onclick = () => { wishSet(WISH().filter(x => x !== a.dataset.w)); meBody(); });
  B.querySelectorAll('[data-rt]').forEach(a => a.onclick = () => { const r = MY[+a.dataset.rt]; lbClose(); setTimeout(() => showLine({name: r.name, coords: r.coords, km: lineKm(r.coords), sub: L('moja pot','my route')}), 60); });
  B.querySelectorAll('[data-gpx]').forEach(a => a.onclick = () => { const r = MY[+a.dataset.gpx]; window.coordsGPX && coordsGPX(r.name || 'pot', r.coords); });
  const si = $a('meIn'); if (si) si.onclick = () => { lbClose(); openAccount('in'); };
  $a('meSet').onclick = () => { lbClose(); (window.openSettings || (() => {}))(); };
  const g = $a('meGps'); if (g) g.onclick = async () => { await (gWatch ? gpsStop() : gpsStart()); meBody(); };
  bind(); if (!S) return;
  let F = [], G = null; try{ [F, G] = await Promise.all([loadFriends().catch(() => []), rpc('my_groups', {}, true).catch(() => null)]); }catch(_){}
  const box = $a('meSoc'); if (!box || lb.dataset.p !== 'me') return; const fr = (F || []).filter(f => f.state === 'friend'), gr = (G && G.groups) || [];
  box.innerHTML = ac(`👥 ${L('Prijatelji','Friends')} (${fr.length})`, (fr.length ? fr.slice(0, 20).map(f => `<div class="it"><div>${av(f.username, f.display_name, 22)} <a data-u="${esc(f.username)}">${esc(f.display_name || f.username)}</a></div><span>${boardN(f.counts || {})} ${L('vrhov','peaks')}</span></div>`).join('')
        : `<div class="nb">${L('Še nimaš prijateljev.','No friends yet.')}</div>`) + `<div class="nb" style="margin-top:6px"><a id="meFr">${L('Vsi prijatelji in prošnje →','All friends and requests →')}</a></div>`)
    + ac(`⛰ ${L('Moje skupine','My groups')} (${gr.length})`, (gr.length ? gr.map(x => `<div class="it"><div>⛰ <a data-g="${esc(x.id)}">${esc(x.name)}</a></div><span>${nMem(x.members)}${x.plans ? ' · 📅 ' + x.plans : ''}</span></div>`).join('')
        : `<div class="nb">${L('Nisi še v nobeni skupini.','Not in any group yet.')}</div>`) + `<div class="nb" style="margin-top:6px"><a id="meGr">${L('Skupine in povabila →','Groups and invitations →')}</a></div>`);
  $a('meFr').onclick = () => soOpen('fr'); $a('meGr').onclick = () => soOpen('gr'); bind(); }
window.showMe = meOpen;

// ---------- 🔔 notifications: friends, groups, weather ----------
// Checked when the page / app opens, every 15 min while it is open or in the background, and when it comes back. A fully closed
// app gets nothing (that needs a push server). The app shows them as phone notifications, the browser as system notifications
// (after "Dovoli"), otherwise as a note on the page. Settings live with the profile (synced with the account).
const NDEF = {fr: true, frc: true, gi: true, gp: true, ww: true, wp: true}, NSK = 'dvat3d_ntf_seen';
const nOpt = () => Object.assign({}, NDEF, (window.PREFS && PREFS.get().ntf) || {});
let NS = get(NSK) || {}; const nSave = () => put(NSK, NS);
const nPerm = () => IN_APP ? 'app' : 'Notification' in window ? Notification.permission : 'none';
async function nShow(list){ if (!list.length) return;
  if (LNO) try{ await LNO.schedule({notifications: list.map(([t, b], k) => ({id: (Math.floor(Date.now() / 1000) + k) % 2e9, title: t, body: b}))}); return; }catch(_){}
  if (nPerm() === 'granted') try{ const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    for (const [t, b] of list){ if (reg) await reg.showNotification(t, {body: b, icon: 'icon-192.png', badge: 'icon-192.png', tag: t}); else new Notification(t, {body: b, icon: 'icon-192.png'}); } return; }catch(_){}
  list.slice(0, 2).forEach(([t, b], k) => setTimeout(() => toast(`${t} — ${b}`), k * 4200)); }
let nBusy = false;
async function nCheck(){ if (nBusy || document.visibilityState === 'hidden' && !IN_APP) return; nBusy = true; const o = nOpt(), out = [], first = !NS.init, day0 = today();
  try{
    if (S){
      if (o.fr || o.gi) try{ const b = await rpc('social_badge', {}, true) || {};
        if (o.fr && (b.requests || 0) > (NS.req || 0)) out.push(['👥 ' + L('Nova prošnja za prijateljstvo', 'New friend request'), L('Odpri ☰ → Prijatelji.', 'Open ☰ → Friends.')]);
        if (o.gi && (b.invites || 0) > (NS.inv || 0)) out.push(['⛰ ' + L('Novo povabilo v skupino', 'New group invitation'), L('Odpri ☰ → Skupine.', 'Open ☰ → Groups.')]);
        NS.req = b.requests || 0; NS.inv = b.invites || 0; }catch(_){}
      if (o.frc) try{ const R = await rpc('circle_ascents', {}, true) || [], seen = NS.asc || {}, lim = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
        for (const r of R){ if (!r.friend || !r.climbed_on || r.climbed_on < lim || !byId[r.peak_id]) continue; const k = r.username + '|' + r.peak_id + '|' + r.climbed_on;
          if (seen[k]) continue; seen[k] = 1; if (!first) out.push(['🏔 ' + (r.display_name || r.username), L(`je osvojil(a) ${byId[r.peak_id].name} (${fmtD(r.climbed_on)})`, `climbed ${byId[r.peak_id].name} (${fmtD(r.climbed_on)})`)]); }
        for (const k in seen) if (k.split('|')[2] < lim) delete seen[k]; NS.asc = seen; }catch(_){}
      if (o.gp || o.wp) try{ const P = await rpc('my_plans', {}, true) || [], seen = NS.plans || {};
        for (const x of P){ if (!seen[x.id]){ seen[x.id] = 1; if (!first && o.gp) out.push(['📅 ' + L('Nov načrt', 'New plan') + ` · ${x.group}`, `${x.title}${x.plan_on ? ' · ' + fmtD(x.plan_on) : ''}`]); }
          if (o.wp && x.plan_on && window.wxDayScore && (x.peak_ids || []).length){ const dd = (Date.parse(x.plan_on) - Date.parse(day0)) / 864e5; if (dd < 0 || dd > 3) continue;
            const k = 'w' + x.id + x.plan_on; if (seen[k]) continue; let worst = 101;
            for (const id of x.peak_ids.slice(0, 4)){ const p = byId[id]; if (!p) continue; const r = await window.wxDayScore(p, x.plan_on); if (r) worst = Math.min(worst, r.score); }
            if (worst < 45){ seen[k] = 1; out.push(['⛈ ' + L('Slaba napoved za načrt', 'Poor forecast for a plan'), `${x.title} · ${fmtD(x.plan_on)} · ${L('ocena', 'rating')} ${worst}`]); } } }
        NS.plans = seen; }catch(_){} }
    if (o.ww && window.wxBestDay){ const seen = NS.ww || {}; let n = 0;
      for (const id of WISH().slice(0, 15)){ const p = byId[id]; if (!p || (window.TICKS && TICKS.get().has(id))) continue; const b = await window.wxBestDay(p);
        if (!b || b.score < 80) continue; const dd = (Date.parse(b.day) - Date.parse(day0)) / 864e5; if (dd < 0 || dd > 2) continue;
        const k = id + b.day; if (seen[k]) continue; seen[k] = 1;
        const dn = new Date(b.day + 'T12:00').toLocaleDateString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {weekday: 'long'});
        out.push(['☀ ' + L(`Lep dan za ${p.name}`, `A good day for ${p.name}`), L(`${dn}: ocena ${b.score} / 100 (seznam želja)`, `${dn}: rating ${b.score} / 100 (wishlist)`)]); if (++n >= 2) break; }
      for (const k in seen) if (k.slice(-10) < day0) delete seen[k]; NS.ww = seen; }
    NS.init = 1; NS.t = Date.now(); nSave(); await nShow(out); }
  finally { nBusy = false; } }
setTimeout(nCheck, 8000); setInterval(nCheck, 15 * 6e4);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (NS.t || 0) > 10 * 6e4) nCheck(); });
// settings block (⚙ Nastavitve, under the account)
function nBox(){ const B = document.getElementById('ntfBox'); if (!B) return; const o = nOpt(), pm = nPerm();
  const row = (k, t) => `<label><input type="checkbox" data-n="${k}" ${o[k] ? 'checked' : ''}> ${t}</label>`;
  B.innerHTML = `<div class="ntg"><b>👥 ${L('Prijatelji','Friends')}</b>${row('fr', L('prošnje za prijateljstvo','friend requests'))}${row('frc', L('vzponi prijateljev','climbs of friends'))}</div>
    <div class="ntg"><b>⛰ ${L('Skupine','Groups')}</b>${row('gi', L('povabila v skupino','group invitations'))}${row('gp', L('novi načrti','new plans'))}</div>
    <div class="ntg"><b>☀ ${L('Vreme','Weather')}</b>${row('ww', L('lep dan za vrh s seznama želja','a good day for a wishlist peak'))}${row('wp', L('slaba napoved na dan načrta skupine','poor forecast on a group plan day'))}</div>
    <div class="hint">${pm === 'app' ? L('Obvestila pokaže telefon.','The phone shows the notifications.') : pm === 'granted' ? L('Obvestila so dovoljena v tem brskalniku.','Notifications are allowed in this browser.')
      : pm === 'denied' ? L('Obvestila so v brskalniku zavrnjena — dovoli jih v nastavitvah strani.','Notifications are blocked in this browser — allow them in the site settings.') : `<button class="btn btn2" id="ntfAsk">🔔 ${L('Dovoli obvestila','Allow notifications')}</button>`}</div>
    <div class="hint">${L('Preverja ob odprtju in vsakih 15 min, ko je stran / aplikacija odprta ali v ozadju. Ko je povsem zaprta, obvestil ni.','Checked when the site / app opens and every 15 min while it is open or in the background. Nothing arrives while it is fully closed.')}
      ${S ? '' : ' ' + L('Prijatelji in skupine potrebujejo račun.','Friends and groups need an account.')}</div>`;
  B.querySelectorAll('[data-n]').forEach(c => c.onchange = () => { const n = Object.assign(nOpt(), {[c.dataset.n]: c.checked}); if (window.PREFS){ PREFS.set(Object.assign(PREFS.get(), {ntf: n})); window.onPrefs && window.onPrefs(); } });
  const a = document.getElementById('ntfAsk'); if (a) a.onclick = async () => { try{ await Notification.requestPermission(); }catch(_){} nBox(); };
  if (pm === 'app' && LNO) LNO.requestPermissions().catch(() => {}); }
{ const ab = document.getElementById('accBox'); if (ab){ ab.insertAdjacentHTML('afterend', `<h4>🔔 ${L('Obvestila','Notifications')}</h4><div id="ntfBox"></div>`); nBox();
    const w = document.getElementById('setWin'); if (w) new MutationObserver(() => { if (w.classList.contains('on')) nBox(); }).observe(w, {attributes: true, attributeFilter: ['class']}); } }
const nCss = document.createElement('style'); nCss.textContent = '#ntfBox .ntg{margin:6px 0}#ntfBox .ntg b{display:block;font-size:.9em;margin-bottom:2px}#ntfBox label{display:flex;gap:8px;align-items:center;margin:3px 0;font-weight:400}';
document.head.append(nCss);

// ---------- side column: my progress, the community, friends' climbs, upcoming plans ----------
const lbTop = () => { const m = lb.querySelector('.lbm'); if (m) m.scrollTop = 0; };
const pkA = id => byId[id] ? `<a data-pk="${esc(id)}">${esc(byId[id].name)}</a>` : esc(id);
const ac = (t, h) => h ? `<section class="ac2"><h4>${t}</h4>${h}</section>` : '';
function asideBind(){ const A = $a('lbAside'); if (!A) return;
  A.querySelectorAll('[data-pk]').forEach(a => a.onclick = () => { lbClose(); setTimeout(() => openPeak(a.dataset.pk, true), 60); });
  A.querySelectorAll('[data-u]').forEach(a => a.onclick = () => lbProfile(a.dataset.u, SO.re || lbList));
  A.querySelectorAll('[data-g]').forEach(a => a.onclick = () => { if (lb.dataset.p !== 'gr') soShell('gr'); grView(a.dataset.g); }); }
function progressCard(){ const T0 = new Set(window.TICKS ? TICKS.get() : []), BP = boardPeaks(), by = new Map(), tr = window.T || (x => x);
  let done = 0; for (const p of BP){ const r = p.range || '–', o = by.get(r) || [0, 0]; o[1]++; if (T0.has(p.id)){ o[0]++; done++; } by.set(r, o); }
  const next = BP.filter(p => !T0.has(p.id) && p.lat != null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || b.elev - a.elev).slice(0, 3);
  return ac(L('Moj napredek','My progress'), `<div class="big"><b>${done}</b><span class="nb">/ ${BP.length} · ${Math.round(done / Math.max(1, BP.length) * 100)} %</span></div>`
    + [...by].sort((a, b) => b[1][1] - a[1][1]).map(([r, [d, n]]) => `<div class="pr"><span>${esc(tr(r))}</span><b>${d} / ${n}</b><div class="bar"><i style="width:${(d / n * 100).toFixed(1)}%"></i></div></div>`).join('')
    + (next.length ? `<div class="nb" style="margin-top:6px">${L('Naslednji izziv','Next up')}: ${next.map(p => pkA(p.id)).join(', ')}</div>` : '')); }
async function asideLB(){ SO.aside = asideLB; const A = $a('lbAside'); if (!A) return; A.innerHTML = badgeCard() + progressCard(); asideBind();
  let C = null; try{ C = await rpc('community_stats'); }catch(_){ return; } if (!C || !C.recent || lb.dataset.p !== 'lb') return;
  const pp = n => n + ' ' + plSl(n, ['planinec', 'planinca', 'planinci', 'planincev', 'hiker', 'hikers']);
  A.innerHTML = badgeCard() + progressCard()
    + ac(L('Zadnji vzponi','Latest climbs'), C.recent.map(r => `<div class="it"><div><a data-u="${esc(r.username)}">${esc(r.display_name || r.username)}</a> · ${pkA(r.peak_id)}</div><span>${esc(fmtD(r.climbed_on))}</span></div>`).join('') + (C.recent.length ? '' : '') )
    + ac(L('Najbolj obiskani vrhovi','Most climbed peaks'), C.top_peaks.filter(r => byId[r.peak_id]).map((r, i) => `<div class="it"><div>${i + 1}. ${pkA(r.peak_id)}</div><span>${pp(r.n)}</span></div>`).join(''))
    + ac(L('Najbolj aktivni ta mesec','Most active this month'), C.month_top.map(r => `<div class="it"><a data-u="${esc(r.username)}">${esc(r.display_name || r.username)}</a><span>${r.n} ${L('vrhov','peaks')}</span></div>`).join('') || `<div class="nb">${L('Ta mesec še nihče – bodi prvi!','Nobody yet this month - be the first!')}</div>`)
    + (C.new_users ? `<div class="nb" style="text-align:center">${L('Novih v zadnjih 30 dneh','New in the last 30 days')}: <b>${C.new_users}</b></div>` : '');
  asideBind(); }
async function asideFR(){ SO.aside = asideFR; const A = $a('lbAside'); if (!A) return; A.innerHTML = progressCard(); asideBind(); if (!S) return;
  let R = SO.circle; try{ if (!R || Date.now() - SO.circleT > 300000){ R = await rpc('circle_ascents', {}, true); SO.circle = R; SO.circleT = Date.now(); } }catch(_){ return; }
  if (lb.dataset.p !== 'fr') return; const fr = (R || []).filter(r => r.friend && byId[r.peak_id]), mine = new Set(window.TICKS ? TICKS.get() : []);
  const recent = fr.filter(r => r.climbed_on).sort((a, b) => b.climbed_on.localeCompare(a.climbed_on)).slice(0, 10);
  const cnt = new Map(); fr.forEach(r => { if (!mine.has(r.peak_id)) cnt.set(r.peak_id, (cnt.get(r.peak_id) || new Set()).add(r.username)); });
  const sug = [...cnt].sort((a, b) => b[1].size - a[1].size || byId[b[0]].elev - byId[a[0]].elev).slice(0, 6);
  A.innerHTML = progressCard()
    + ac(L('Zadnji vzponi prijateljev','Friends\' latest climbs'), recent.map(r => `<div class="it"><div><a data-u="${esc(r.username)}">${esc(r.display_name || r.username)}</a> · ${pkA(r.peak_id)}</div><span>${esc(fmtD(r.climbed_on))}</span></div>`).join(''))
    + ac(L('Bili so tam, ti še ne','They were there, you not yet'), sug.map(([id, u]) => `<div class="it"><div>${pkA(id)}</div><span>${[...u].slice(0, 3).map(x => '@' + esc(x)).join(', ')}${u.size > 3 ? ' +' + (u.size - 3) : ''}</span></div>`).join(''));
  asideBind(); }
async function asideGR(){ SO.aside = asideGR; const A = $a('lbAside'); if (!A) return; A.innerHTML = progressCard(); asideBind(); if (!S) return;
  let P = null; try{ P = await rpc('my_plans', {}, true); }catch(_){ return; } if (!Array.isArray(P) || lb.dataset.p !== 'gr') return;
  A.innerHTML = ac(L('Prihajajoči načrti','Upcoming plans'), P.map(x => `<div class="it"><div><a data-g="${esc(x.gid)}">${esc(x.title)}</a><div class="nb">${esc(x.group)}${x.me ? ' · ✓ ' + L('greš','you go') : ''}</div></div><span>${x.plan_on ? esc(fmtD(x.plan_on)) : '?'}<br>${x.going} ${L('gre','going')}</span></div>`).join('') || `<div class="nb">${L('Ni načrtov. Odpri skupino in dodaj turo.','No plans. Open a group and add a tour.')}</div>`)
    + progressCard();
  asideBind(); }

// ---------- 🏅 badges (from the ticks in this browser / account) ----------
// count badges on the 98 prominent 2000ers + per range two badges: prominent peaks / all peaks (2000 m ranges: incl. subpeaks;
// Pohorje, Snežnik, Predalpe: the 1500–2000 m list). Each range badge shows its best-known summits.
const sname = p => p.name.split(' (')[0];
const RANGE_ORDER = ['Julijske Alpe', 'Kamniško-Savinjske Alpe', 'Karavanke', 'Pohorje', 'Snežnik', 'Predalpe'];
// one peak per badge (SIL_PK), drawn as its own emblem (SIL_ART)
const SIL_PK = {c10: 'Mangart', c25: 'Jalovec', c50: 'Razor', c98: 'Triglav', 'Julijske Alpe*': 'Škrlatica', 'Julijske Alpe': 'Visoki Kanin',
  'Kamniško-Savinjske Alpe*': 'Grintovec', 'Kamniško-Savinjske Alpe': 'Ojstrica', 'Karavanke*': 'Stol', 'Karavanke': 'Vrtača',
  'Pohorje*': 'Črni vrh', 'Pohorje': 'Rogla', 'Snežnik*': 'Veliki Snežnik', 'Snežnik': 'Travica', 'Predalpe*': 'Altemaver', 'Predalpe': 'Porezen'};
const silPeak = (k, rng) => { const nm = SIL_PK[k], ok = p => sname(p) === nm && p.lat != null; return nm ? PEAKS.find(p => ok(p) && (!rng || p.range === rng)) || PEAKS.find(ok) || null : null; };
function badgeDefs(){ const T0 = new Set(window.TICKS ? TICKS.get() : []), P2 = PEAKS.filter(isP2), out = [], tr = window.T || (x => x);
  const nP2 = P2.filter(p => T0.has(p.id)).length;
  for (const n of [10, 25, 50, P2.length]){ const k = 'c' + (n >= P2.length ? 98 : n), pk = silPeak(k);
    out.push({k, pk, col: n >= P2.length ? '#b8860b' : n >= 50 ? '#c0392b' : n >= 25 ? '#6a1b9a' : '#1565c0', ring: n >= P2.length ? 'gold' : 'silver',
      t: n >= P2.length ? L('Vseh 98','All 98') : L(`${n} dvatisočakov`, `${n} 2000ers`), big: n >= P2.length ? '98' : String(n), d: Math.min(nP2, n), n, sub: [], kind: pk ? '⛰ ' + sname(pk) : ''}); }
  for (const r of RANGE_ORDER){ const alp = PEAKS.some(p => p.range === r && p.tier !== '1500'), set = PEAKS.filter(p => p.range === r && (alp ? p.tier !== '1500' : p.tier === '1500'));
    if (!set.length) continue; const main = set.filter(alp ? isP2 : isP15), top = main.filter(p => !/^Vrh \d|^\d/.test(p.name)).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || b.elev - a.elev).slice(0, 2).map(sname);
    const col = (typeof RCOL !== 'undefined' && RCOL[r]) || '#555', p1 = silPeak(r + '*', r), p2 = silPeak(r, r);
    if (main.length) out.push({k: r + '*', pk: p1, col, ring: 'gold', t: tr(r) + ' ★', sub: p1 ? [sname(p1)] : top, d: main.filter(p => T0.has(p.id)).length, n: main.length, rng: r, kind: L('prominentni','prominent')});
    if (set.length > main.length) out.push({k: r, pk: p2, col, ring: 'silver', t: tr(r), sub: p2 ? [sname(p2)] : top, d: set.filter(p => T0.has(p.id)).length, n: set.length, rng: r, kind: L('vsi vrhovi','all peaks')}); }
  return out; }

let BID = 0;
// hand-drawn emblem per badge peak (100 × 100 box, mountain base at the bottom): m = mountain, k = rock / shadow side,
// w = snow, x = landmark (white), l = lines (road, cable car), r = rock, d = trees / dark details. Shapes follow the peak's best-known outline.
const HUT = (x, y) => `M${x - 3} ${y}v-3l3-2.6 3 2.6v3z`, TREE = (x, y, h = 7) => `M${x} ${y - h}l${h * .38} ${h}h${-h * .76}z`;
const SIL_ART = {
  Triglav: {m: 'M2 72L20 54L28 57L37 45L43 48L50 27L57 47L63 43L72 56L80 52L98 72Z', k: 'M50 27L57 47L63 43L72 56L80 52L98 72H50Z',
    w: 'M43 48L50 27L57 47L54 44L51 49L48 43L45 48Z M37 45L43 48L40 49Z', x: 'M48.6 27v-5.2h2.8v5.2Z M47.9 21.9L50 18.4L52.1 21.9Z'},   // Aljažev stolp
  Jalovec: {m: 'M2 72Q34 66 44 40L50 15L56 40Q66 66 98 72Z', k: 'M50 15L56 40Q66 66 98 72H50Z', w: 'M47 30L50 15L53 30L50 27Z M43 46l3-4 1 5Z M55 45l2-5 2 6Z'},
  Mangart: {m: 'M2 72L18 56L26 52L36 38L44 31L58 28L66 30L70 40L77 44L82 52L98 72Z', k: 'M66 30L70 40L77 44L82 52L98 72H62Z',
    w: 'M36 38L44 31L58 28L66 30L63 34L56 32L50 36L44 34L39 39Z', l: 'M12 68L26 64L16 60L30 56L22 52L34 48'},   // Mangart road
  Razor: {m: 'M2 72L24 50L32 47L44 31L48 29L58 29L62 33L70 42L78 45L98 72Z', k: 'M58 29L62 33L70 42L78 45L98 72H56Z', w: 'M44 31L48 29L58 29L55 33L50 31L46 35Z', r: 'M47 35L52 47L56 35L52 39Z'},
  'Škrlatica': {m: 'M2 72L16 55L21 58L27 42L31 47L36 33L40 41L44 28L48 34L51 22L55 31L59 26L62 37L67 31L70 44L75 40L82 55L98 72Z', k: 'M51 22L55 31L59 26L62 37L67 31L70 44L75 40L82 55L98 72H50Z',
    w: 'M49 30L51 22L53 28Z M57.5 28.5L59 26L60.5 30Z M42 32L44 28L46 32Z M34.5 37L36 33L38 37Z'},
  'Visoki Kanin': {m: 'M2 72L14 52L26 44L36 41L46 34L52 32L60 35L70 33L80 38L88 48L98 72Z', k: 'M60 35L70 33L80 38L88 48L98 72H58Z',
    w: 'M26 44L36 41L46 34L52 32L60 35L70 33L80 38L74 40L66 37L58 40L50 37L42 41L32 45Z', l: 'M4 88L46 38', r: 'M17 70.5h5v4h-5Z M33 51.5h5v4h-5Z'},   // cable car
  Grintovec: {m: 'M2 72L24 52L30 52L50 24L70 52L76 52L98 72Z', k: 'M50 24L70 52L76 52L98 72H50Z', w: 'M43 34L50 24L57 34L53 32L50 36L47 32Z'},
  Ojstrica: {m: 'M2 72L26 63L38 50L46 36L53 20L57 30L59 46L62 62L98 72Z', k: 'M53 20L57 30L59 46L62 62L98 72H56Z', w: 'M49 28L53 20L55.5 27L52 26Z'},
  Stol: {m: 'M2 72Q22 42 42 34Q52 31 60 33Q78 38 98 64V72Z', k: 'M60 33Q78 38 98 64V72H58Z', w: 'M36 37Q46 31 56 32Q63 33 66 35Q56 35 50 38Q44 36 36 40Z', x: HUT(70, 40)},   // Prešernova koča
  'Vrtača': {m: 'M2 72L22 50L36 32L42 38L47 46L52 40L58 28L66 40L76 48L98 72Z', k: 'M58 28L66 40L76 48L98 72H56Z', w: 'M33 36L36 32L39 36Z M55 32L58 28L61 33Z'},
  'Črni vrh': {m: 'M2 72Q28 36 50 34Q72 36 98 72Z', d: [[18,62,9],[26,54,10],[34,47,10],[42,42,10],[50,40,10],[58,42,10],[66,47,10],[74,54,10],[82,62,9],[30,62,9],[46,56,10],[62,58,10]].map(t => TREE(...t)).join('')},
  Rogla: {m: 'M2 72Q30 44 50 42Q70 44 98 72Z', d: [[16,66,8],[26,60,8],[72,60,8],[82,66,8],[36,62,7],[64,62,7]].map(t => TREE(...t)).join(''),
    x: 'M47 42L45.5 22H54.5L53 42Z M44 22h12v-2.5H44Z'},   // lookout tower
  'Veliki Snežnik': {m: 'M2 72Q26 40 50 32Q74 40 98 72Z', k: 'M50 32Q74 40 98 72H50Z', w: 'M26 46Q38 34 50 32Q62 34 74 46Q66 44 60 48Q55 43 50 46Q44 42 38 48Q32 44 26 46Z', d: HUT(56, 36)},
  Travica: {m: 'M2 72Q30 42 52 40Q74 44 98 72Z', d: [[14,67,7],[22,62,7],[80,63,7],[88,68,7]].map(t => TREE(...t)).join(''), l: 'M40 48l2-4 2 4 M50 45l2-4 2 4 M60 48l2-4 2 4'},
  Altemaver: {m: 'M2 72L16 50L26 40L64 37L78 42L86 52L98 72Z', k: 'M64 37L78 42L86 52L98 72H62Z', r: 'M20 50L26 42L30 52Z M34 48L38 41L41 50Z', x: HUT(50, 38)},   // Krekova koča
  Porezen: {m: 'M2 72Q26 44 50 38Q74 44 98 72Z', k: 'M50 38Q74 44 98 72H50Z', x: 'M48.6 38v-12l1.4-2.4 1.4 2.4v12Z'}};   // memorial
function badgeSVG(b){ const id = 'bg' + (++BID), done = b.d >= b.n, f = b.d / b.n, C = 2 * Math.PI * 46, gold = b.ring === 'gold', rim = gold ? ['#f9e08b', '#b8860b'] : ['#f4f6f7', '#90a4ae'];
  const A = b.pk && SIL_ART[sname(b.pk)] || SIL_ART.Grintovec, band = b.big || (b.sub || [])[0] || '', fs = b.big ? (b.big.length > 2 ? 17 : 19) : Math.min(11, 125 / Math.max(6, band.length));
  const sky = gold ? [b.col, '#fff'] : [b.col, '#ffcc80'];   // ★ = day sky, all peaks = evening sky
  return `<svg viewBox="0 0 100 100" width="76" height="76" aria-hidden="true"><defs><linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rim[0]}"/><stop offset="1" stop-color="${rim[1]}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}" stop-opacity=".55"/></linearGradient>
    <clipPath id="${id}c"><circle cx="50" cy="50" r="39"/></clipPath></defs>
    <g${done ? '' : ' style="filter:grayscale(1);opacity:.5"'}>
    <circle cx="50" cy="50" r="47" fill="url(#${id}r)"/><circle cx="50" cy="50" r="39" fill="${b.col}"/><circle cx="50" cy="50" r="39" fill="url(#${id}s)"/>
    <g clip-path="url(#${id}c)">${gold ? '' : `<circle cx="72" cy="30" r="6" fill="#fff3c4" opacity=".9"/>`}
      <path d="${A.m}" fill="#eef2f4" stroke="#263238" stroke-width="1.6" stroke-linejoin="round"/>${A.k ? `<path d="${A.k}" fill="#90a4ae" opacity=".55"/>` : ''}
      ${A.w ? `<path d="${A.w}" fill="#fff"/>` : ''}${A.r ? `<path d="${A.r}" fill="#546e7a"/>` : ''}${A.d ? `<path d="${A.d}" fill="#2e5d3a"/>` : ''}
      ${A.l ? `<path d="${A.l}" fill="none" stroke="#263238" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${A.x ? `<path d="${A.x}" fill="#fff" stroke="#263238" stroke-width="1.2" stroke-linejoin="round"/>` : ''}
      <path d="M0 72H100V100H0Z" fill="#263238" opacity=".22"/>
      ${band ? `<rect x="0" y="64" width="100" height="${b.big ? 22 : 17}" fill="rgba(0,0,0,.5)"/>` : ''}</g>
    ${band ? `<text x="50" y="${b.big ? 81 : 76.5}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="${b.big ? 900 : 700}" style="font-size:${fs.toFixed(1)}px" fill="#fff">${esc(band)}</text>` : ''}
    ${gold && !b.big ? `<text x="50" y="21" text-anchor="middle" font-family="system-ui,sans-serif" style="font-size:9px" fill="#b8860b">★</text>` : ''}
    </g>${done ? '' : `<circle cx="50" cy="50" r="46" fill="none" stroke="#e3e8e5" stroke-width="4"/><circle cx="50" cy="50" r="46" fill="none" stroke="${b.col}" stroke-width="4" stroke-dasharray="${(f * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)" stroke-linecap="round"/>`}</svg>`; }
const bdwInner = B => B.map(b => `<div class="bdg2${b.d >= b.n ? ' got' : ''}" title="${esc(b.t)}${b.kind ? ' · ' + esc(b.kind) : ''}: ${b.d} / ${b.n}">${badgeSVG(b)}<b>${esc(b.t)}</b><small>${b.d >= b.n ? '✓ ' + L('osvojeno','earned') : `${b.d} / ${b.n}`}</small></div>`).join('');
function badgeCard(){ const B = badgeDefs(), got = B.filter(b => b.d >= b.n).length;
  return ac(`🏅 ${L('Značke','Badges')} <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${got} / ${B.length}</span>`, `<div class="bdw">${bdwInner(B)}</div>`); }

// ---------- 📸 peak of the week (a Slovenian prominent 2000er, photo from Wikimedia Commons, best day of the next days) ----------
// photos: the Slovenian Wikipedia article (picked by its coordinates, so "Vrtača" is the peak and not the sinkhole), its Commons
// category (Wikidata P373) and geotagged Commons photos within 1.5 km of the summit; free licences, JPEG, ≥ 900 px wide.
async function potwPics(p){ const J = u => fetch(u).then(r => r.json()), txt = h => (h || '').replace(/<[^>]*>/g, '').trim();
  const names = [...new Set([sname(p), ...(p.name.match(/\(([^)]+)\)/) || [, ''])[1].split('/'), p.pb_name].filter(Boolean))];
  const titles = names.flatMap(n => [n + ' (gora)', n, `${n}, ${p.range}`, `${n} (${p.range})`]).slice(0, 40);
  const q = await J(`https://sl.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=coordinates|pageimages|pageprops&piprop=name&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`);
  const near = x => x.coordinates && Math.hypot((x.coordinates[0].lat - p.lat) * 111, (x.coordinates[0].lon - p.lon) * 77) <= 3;
  const pg = Object.values((q.query || {}).pages || {}).find(near);
  let files = [], cat = null;
  if (pg){ if (pg.pageimage) files.push('File:' + pg.pageimage);
    const qid = pg.pageprops && pg.pageprops.wikibase_item;
    if (qid) try{ const w = await J(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P373&format=json&origin=*`), c = ((w.claims || {}).P373 || [])[0]; cat = c && c.mainsnak.datavalue && c.mainsnak.datavalue.value; }catch(_){} }
  const CM = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&', out = [], seen = new Set();
  const add = pages => { for (const x of Object.values(pages || {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))){ const i = x.imageinfo && x.imageinfo[0]; if (!i || seen.has(x.title)) continue;
      if (i.mime !== 'image/jpeg' || i.width < 900 || i.width > i.height * 3.2 || i.height > i.width * 1.6) continue;
      const md = i.extmetadata || {}, lic = txt(md.LicenseShortName && md.LicenseShortName.value); if (!lic || /fair|non-free/i.test(lic)) continue;
      seen.add(x.title); out.push({img: i.thumburl || i.url, big: i.width > 1920 && i.thumburl ? i.thumburl.replace('/1280px-', '/1920px-') : i.url, page: i.descriptionurl, artist: txt(md.Artist && md.Artist.value).slice(0, 60), lic}); } };
  if (files.length) try{ add((await J(CM + 'titles=' + encodeURIComponent(files.join('|')))).query?.pages); }catch(_){}
  if (cat) try{ add((await J(CM + `generator=categorymembers&gcmtype=file&gcmlimit=30&gcmtitle=${encodeURIComponent('Category:' + cat)}`)).query?.pages); }catch(_){}
  if (out.length < 12) try{ add((await J(CM + `generator=geosearch&ggscoord=${p.lat}|${p.lon}&ggsradius=1500&ggsnamespace=6&ggslimit=30`)).query?.pages); }catch(_){}
  return out.slice(0, 12); }
async function potw(){ const box = $a('potw'); if (!box) return;
  const P = PEAKS.filter(p => isP2(p) && p.lat != null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const wk = Math.floor((Date.now() / 864e5 + 3) / 7), key = 'dvat3d_potw2_' + wk;
  let c = get(key);
  if (!c){ for (let t = 0; t < 8 && !c; t++){ const p = P[(wk * 17 + t * 5) % P.length];
      try{ const pics = await potwPics(p); if (pics.length) c = {id: p.id, pics}; }catch(_){ break; } }
    if (c) put(key, c); }
  if (!box.isConnected) return; const p = c ? byId[c.id] : P[wk % P.length]; if (!p) return;
  const tr = window.T || (x => x), pics = c ? c.pics : []; let k = 0;
  box.innerHTML = `<div class="ph"></div><div class="pt"><small>📸 ${L('Vrh tedna','Peak of the week')}</small><b>${esc(p.name)}</b>
    <span>${Math.round(p.elev)} m · ${esc(tr(p.range || ''))}${p.rank != null ? ' · #' + p.rank : ''}</span><span class="bd" id="potwBest"></span>
    <button id="potwGo">${L('Pokaži na karti','Show on the map')}</button></div>
    ${pics.length > 1 ? `<button class="pv" aria-label="‹">‹</button><button class="nx" aria-label="›">›</button><div class="dots">${pics.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>` : ''}
    ${pics.length ? `<span class="zm">⤢ ${pics.length > 1 ? `<b class="n"></b>` : ''}</span><a class="cr" target="_blank" rel="noopener"></a>` : ''}`;
  const show = i => { if (!pics.length) return; k = (i + pics.length) % pics.length; const x = pics[k];
    box.querySelector('.ph').style.backgroundImage = `url('${x.img.replace(/'/g, '%27')}')`;
    const cr = box.querySelector('.cr'); cr.href = x.page; cr.textContent = `${L('Foto','Photo')}: ${x.artist || 'Wikimedia Commons'} · ${x.lic} · Wikimedia Commons`;
    const n = box.querySelector('.zm .n'); if (n) n.textContent = `${k + 1} / ${pics.length}`;
    box.querySelectorAll('.dots i').forEach((d, j) => d.classList.toggle('on', j === k));
    if (pics.length > 1) new Image().src = pics[(k + 1) % pics.length].img; };
  show(0); box.classList.add('on');
  $a('potwGo').onclick = () => { lbClose(); setTimeout(() => openPeak(p.id, true), 60); };
  const pv = box.querySelector('.pv'), nx = box.querySelector('.nx');
  if (pv){ pv.onclick = e => { e.stopPropagation(); show(k - 1); }; nx.onclick = e => { e.stopPropagation(); show(k + 1); };
    box.querySelectorAll('.dots i').forEach(d => d.onclick = e => { e.stopPropagation(); show(+d.dataset.i); }); }
  // swipe on the photo, tap = enlarge
  let x0 = null; box.onpointerdown = e => { x0 = e.target.closest('button,a,.dots') ? null : e.clientX; };
  box.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40 && pics.length > 1) show(k + (dx < 0 ? 1 : -1)); else if (Math.abs(dx) < 8 && pics.length) potwBig(pics, k, p.name, i => show(i)); };
  if (window.wxBestDay) window.wxBestDay(p).then(b => { const el = $a('potwBest'); if (!b || !el) return;
    const dn = new Date(b.day + 'T12:00').toLocaleDateString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {weekday: 'long', day: 'numeric', month: 'numeric'});
    el.innerHTML = `${L('Najboljši dan','Best day')}: <b>${esc(dn)}</b> · ${L('ocena','rating')} <b style="color:${['#8ee59a', '#ffcc66', '#ff9a9a'][b.r]}">${b.score}</b>`; }).catch(() => {}); }
// full-screen photo viewer (arrows, swipe, ← → Esc)
function potwBig(pics, k, title, onMove){ let v = document.getElementById('potwLb'); if (v) v.remove();
  v = document.createElement('div'); v.id = 'potwLb';
  v.innerHTML = `<img alt=""><div class="lt"><b>${esc(title)}</b> <span class="n"></span><a class="cr" target="_blank" rel="noopener"></a></div><button class="x" aria-label="${L('Zapri','Close')}">×</button>
    ${pics.length > 1 ? '<button class="pv" aria-label="‹">‹</button><button class="nx" aria-label="›">›</button>' : ''}`;
  document.body.append(v); const img = v.querySelector('img');
  const show = i => { k = (i + pics.length) % pics.length; const x = pics[k]; img.src = x.img; const hi = new Image(); hi.onload = () => { if (pics[k] === x) img.src = x.big; }; hi.src = x.big;
    v.querySelector('.n').textContent = pics.length > 1 ? `${k + 1} / ${pics.length}` : ''; const cr = v.querySelector('.cr'); cr.href = x.page; cr.textContent = `${x.artist || 'Wikimedia Commons'} · ${x.lic}`;
    onMove && onMove(k); if (pics.length > 1) new Image().src = pics[(k + 1) % pics.length].img; };
  const close = () => { v.remove(); removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(k + 1); else if (e.key === 'ArrowLeft') show(k - 1); };
  addEventListener('keydown', key); v.querySelector('.x').onclick = close;
  const pv = v.querySelector('.pv'); if (pv){ pv.onclick = () => show(k - 1); v.querySelector('.nx').onclick = () => show(k + 1); }
  let x0 = null; v.onpointerdown = e => { x0 = e.target.closest('button,a') ? null : e.clientX; };
  v.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40 && pics.length > 1) show(k + (dx < 0 ? 1 : -1)); else if (Math.abs(dx) < 8 && e.target === v) close(); };
  show(k); }

// dangerous buttons: the first tap asks "sure?", the second does it
function confirmTwice(b){ if (b.dataset.sure) return true; b.dataset.sure = 1; const t = b.innerHTML; b.innerHTML = L('Res? Klikni še enkrat', 'Sure? Click again'); b.classList.add('sure');
  setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.innerHTML = t; b.classList.remove('sure'); } }, 3500); return false; }

// in the peak window: friends and group members who climbed this peak
window.circleBox = p => { const d = document.createElement('div'); d.className = 'prt';
  if (!S){ return d; }
  const fill = rows => { const R = (rows || []).filter(r => r.peak_id === p.id).sort((a, b) => (b.climbed_on || '').localeCompare(a.climbed_on || ''));
    if (!R.length){ d.remove(); return; }
    d.innerHTML = `<b>👥 ${L('Prijatelji in skupine','Friends & groups')}</b>` + R.slice(0, 6).map(r => `<div>${r.friend ? '' : '⛰ '}<a data-u="${esc(r.username)}">${esc(r.display_name || r.username)}</a>${r.climbed_on ? ' · ' + esc(fmtD(r.climbed_on)) : ''}${r.route_name ? ' · ' + esc(r.route_name) : ''}${r.note ? ` · <i>${esc(r.note.slice(0, 80))}</i>` : ''}</div>`).join('')
      + (R.length > 6 ? `<div>+ ${R.length - 6}</div>` : '');
    d.querySelectorAll('a').forEach(a => a.onclick = () => profile(a.dataset.u)); };
  if (SO.circle && Date.now() - SO.circleT < 300000) fill(SO.circle);
  else rpc('circle_ascents', {}, true).then(rows => { SO.circle = rows; SO.circleT = Date.now(); fill(rows); }).catch(() => d.remove());
  return d; };

// ---------- sharing my routes ----------
window.myShare = i => { const MY = window.MYR ? MYR.get() : [], r = MY[i]; if (!r) return;
  if (!S){ toast(L('Za deljenje poti se prijavi (⚙ Nastavitve → Račun).', 'Sign in to share routes (⚙ Settings → Account).')); openAccount('in'); return; }
  const opts = [['private', L('Zasebno','Private'), L('vidiš samo ti','only you')], ['link', L('Kdorkoli s povezavo','Anyone with the link'), L('povezava ni nikjer objavljena','the link is not listed anywhere')],
    ['public', L('Javno','Public'), L('vidno tudi v oknu vrhov na poti','also shown in the window of peaks on the way')]];
  const paintDlg = () => { const v = r.vis || 'private', link = r.tok ? `${location.origin}${location.pathname}?pot=${r.tok}` : '';
    modal(`<h3>⤴ ${esc(r.name)}</h3>${opts.map(([k, t, d]) => `<div class="opt${v === k ? ' on' : ''}" data-v="${k}"><input type="radio" ${v === k ? 'checked' : ''}><div><b>${t}</b><small>${d}</small></div></div>`).join('')}
      ${v !== 'private' ? (link ? `<div class="lnkbox"><input readonly value="${esc(link)}"><button id="shCopy">${L('Kopiraj','Copy')}</button></div>` : `<div class="sub" style="margin-top:8px">${L('shranjujem …','saving …')}</div>`) : ''}`);
    card.querySelectorAll('.opt').forEach(o => o.onclick = async () => { if (o.dataset.v === (r.vis || 'private')) return; r.vis = o.dataset.v; r.date = Date.now(); MYR.set(MYR.get()); paintDlg();
      await sync(); paintDlg(); });
    const c = $a('shCopy'); if (c) c.onclick = async () => { try{ await navigator.clipboard.writeText(link); c.textContent = '✓'; }catch(_){ card.querySelector('.lnkbox input').select(); } }; };
  paintDlg(); if (!r.sat || !r.tok) sync().then(() => win.classList.contains('on') && paintDlg()); };

// shared / public route on the map
let shared = null;
const shCard = document.createElement('div'); shCard.id = 'shCard'; document.body.append(shCard);
function shClear(){ shared = null; shCard.classList.remove('on');
  try{ ['shared-rt', 'shared-rt-c', 'rings'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); }); ['shared-rt', 'rings'].forEach(id => { if (map.getSource(id)) map.removeSource(id); }); }catch(_){} }
const styleReady = () => map.isStyleLoaded() ? Promise.resolve() : new Promise(r => map.once('load', r));
// a route line on the map with a small card (shared link, friend's route, group plan)
async function showLine({name, who, coords: c, km, sub}){
  if (!c || c.length < 2){ toastErr(L('Ta pot nima črte.', 'This route has no line.')); return; }
  shClear(); shared = {name, coords: c}; await styleReady();
  map.addSource('shared-rt', {type: 'geojson', data: {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: c}}});
  map.addLayer({id: 'shared-rt-c', type: 'line', source: 'shared-rt', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#fff', 'line-width': 7}});
  map.addLayer({id: 'shared-rt', type: 'line', source: 'shared-rt', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#8e24aa', 'line-width': 4}});
  const b = new maplibregl.LngLatBounds(); c.forEach(x => b.extend(x)); map.fitBounds(b, {padding: 80, maxZoom: 14, duration: 900});
  shCard.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button><b>${esc(name)}</b><div style="color:#5b6461">${esc([who, sub, (+km || lineKm(c)).toFixed(1) + ' km'].filter(Boolean).join(' · '))}</div>
    <div class="r"><button id="shGpx">GPX</button><button id="shSave">${L('Shrani med moje poti','Save to my routes')}</button></div>`;
  shCard.classList.add('on'); shCard.querySelector('.x').onclick = shClear;
  $a('shGpx').onclick = () => window.coordsGPX && coordsGPX(name, c);
  $a('shSave').onclick = () => { if (window.MYR){ MYR.add(name, c); toast(L('Shranjeno med moje poti (✎ Riši).', 'Saved to my routes (✎ Draw).')); } }; }
async function showShared(tok){
  try{ const j = await rpc('shared_route', {token: tok}); if (!j){ toastErr(L('Pot ne obstaja več ali ni deljena.', 'This route no longer exists or is not shared.')); return; }
    await showLine({name: j.name, who: '@' + (j.username || '?'), coords: decodeLine(j.line), km: j.km});
  }catch(e){ toastErr(errText(e)); } }
// rings around peaks (a friend's or a group's climbed peaks): green = all of them, amber = some
async function ringsShow(title, P){
  shClear(); await styleReady();
  const F = Object.entries(P).filter(([id]) => byId[id] && byId[id].lat != null).map(([id, v]) => ({type: 'Feature', properties: {id, all: v.n >= v.of ? 1 : 0},
    geometry: {type: 'Point', coordinates: [byId[id].lon, byId[id].lat]}}));
  map.addSource('rings', {type: 'geojson', data: {type: 'FeatureCollection', features: F}});
  const k = window.MAPK ? MAPK() : 1;
  map.addLayer({id: 'rings', type: 'circle', source: 'rings', paint: {'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 6 * k, 12, 13 * k], 'circle-color': 'rgba(0,0,0,0)',
    'circle-stroke-width': 3 * k, 'circle-stroke-color': ['case', ['==', ['get', 'all'], 1], '#2e7d32', '#f9a825']}});
  const multi = Object.values(P).some(v => v.of > 1);
  shCard.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button><b>${esc(title)}</b><div style="color:#5b6461;white-space:nowrap">${multi
    ? `<span style="color:#2e7d32">◯</span> ${L('vsi so bili','all were there')} · <span style="color:#f9a825">◯</span> ${L('nekateri','some')}` : `<span style="color:#2e7d32">◯</span> ${L('osvojeni vrhovi','climbed peaks')}`}</div>`;
  shCard.classList.add('on'); shCard.querySelector('.x').onclick = shClear;
  if (F.length){ const b = new maplibregl.LngLatBounds(); F.forEach(f => b.extend(f.geometry.coordinates)); map.fitBounds(b, {padding: 70, maxZoom: 12, duration: 900}); } }
window.showShared = showShared;
// in the peak window: public routes of other users over this peak
const prCache = new Map();
window.pubRoutesBox = p => { const d = document.createElement('div'); d.className = 'prt';
  const fill = rows => { if (!rows || !rows.length){ d.remove(); return; }
    d.innerHTML = `<b>${L('Poti uporabnikov','Routes by users')}</b>` + rows.slice(0, 6).map(r => `<div>↗ <a data-t="${esc(r.share_token)}">${esc(r.name)}</a> · ${(+r.km || 0).toFixed(1)} km · @${esc(r.username)}</div>`).join('');
    d.querySelectorAll('a').forEach(a => a.onclick = () => showShared(a.dataset.t)); };
  const c = prCache.get(p.id); if (c && Date.now() - c.t < 300000) fill(c.rows);
  else rpc('public_routes', {peak: p.id}).then(rows => { prCache.set(p.id, {t: Date.now(), rows}); fill(rows); }).catch(() => d.remove());
  return d; };

// links: ?pot=<token> opens a shared route, ?u=<username> a public profile
{ const q = new URLSearchParams(location.search), t = q.get('pot'), u = q.get('u');
  if (t && /^[0-9a-f]{8,64}$/.test(t)) setTimeout(() => showShared(t), 1500);
  if (u && USER_RE.test(u.toLowerCase())) setTimeout(() => profile(u.toLowerCase()), 1500); }

// after the guide: optional account step (extras.js)
window.accountStepButtons = (end) => [[L('Ustvari račun','Create account'), () => { end(); openAccount('up'); }], [L('Prijava','Sign in'), () => { end(); openAccount('in'); }]];

draw(); paint();
if (S){ setState('busy'); token().then(t => { if (t) sync(); else paint(); }); }
setInterval(() => { if (S && !document.hidden) refreshBadge(); }, 600000);   // red dot: new friend requests / group invites
})();
