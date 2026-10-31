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
const AK = 'dvat3d_auth', SK = 'dvat3d_sync', VK = 'dvat3d_vinfo', PK = 'dvat3d_profile_t';
let S = get(AK);                         // session {access_token, refresh_token, expires_at, uid, username, display_name, public}
let SY = get(SK) || {};                  // {uid, merged, dirty:{peak: 0 ticked / 1 unticked}, idirty:{peak:1}, known:{routeId:1}, at}
let VI = get(VK) || {};                  // climb details {peak: {d:'YYYY-MM-DD', r:'route', n:'note'}}
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
  if (c === 'PGRST202' || c === '42P01' || c === '42703') return L('Ta del še ni nastavljen v bazi (supabase/02_profile_routes.sql).', 'Not set up in the database yet (supabase/02_profile_routes.sql).');
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
  S = null; put(AK, null); SY = {}; put(SK, null); VI = {}; put(VK, null); put(PK, null);
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
  short: id => { const v = VI[id]; if (!v || (!v.d && !v.r)) return ''; return ` <span class="vi">${esc([v.d && fmtD(v.d), v.r].filter(Boolean).join(' · '))}</span>`; },
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
    if (!cb.checked){ box.innerHTML = ''; return; }
    const has = v && (v.d || v.r || v.n);
    box.innerHTML = has ? `<span class="vtxt">📅 ${esc([v.d ? fmtD(v.d) : L('brez datuma','no date'), v.r].filter(Boolean).join(' · '))}${v.n ? ` · <i>${esc(v.n)}</i>` : ''}</span> <a class="vlnk">✎</a>${!v.d ? ' ' + todayBox(false, 'q') : ''}`
      : `<a class="vlnk">📅 ${L('dodaj datum in pot', 'add date and route')}</a> ${todayBox(false, 'q')}`;
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
  const rows = await call('/rest/v1/ascents?select=peak_id,deleted,climbed_on,route_name,note&limit=5000');
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
    SY.at = Date.now(); saveSY(); paint();
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
      <div class="row"><button class="alt" id="accSave">${L('Shrani','Save')}</button><button class="alt" id="accOut">${L('Odjava','Log out')}</button><button class="alt" id="accExp">⬇ ${L('Izvozi moje podatke','Export my data')}</button></div>
      <div class="ah">${L('Ob odjavi ta brskalnik pozabi tvoje kljukice in poti – ostanejo v računu.','On log-out this browser forgets your ticks and routes - they stay in your account.')}</div>
      <div class="ah" style="margin-top:6px"><a href="privacy.html" target="_blank">${L('Zasebnost – kaj shranjujemo','Privacy - what we store')}</a></div>
      <details style="margin-top:10px"><summary style="cursor:pointer;color:#b3261e;font-size:.9em">${L('Izbriši račun','Delete account')}</summary>
        <div class="ah">${L('Izbriše račun, vrhove in poti. Za potrditev vpiši uporabniško ime.','Deletes the account, peaks and routes. Type your username to confirm.')}</div>
        <input type="text" id="accDelU" autocomplete="off" placeholder="${esc(S.username || '')}"><div class="row"><button class="alt danger" id="accDel">${L('Trajno izbriši','Delete for good')}</button></div></details>`;
    paintState();
    $a('accSave').onclick = async () => { const v = $a('accName').value.trim().slice(0, 40), pub = $a('accPub').checked, lst = $a('accList').checked; $a('accErr').textContent = '';
      const patch = body => call(`/rest/v1/profiles?id=eq.${S.uid}`, {method: 'PATCH', body, headers: {Prefer: 'return=minimal'}});
      try{ try{ await patch({display_name: v || null, public: pub, listed: lst}); }
        catch(e){ if (lst !== (S.listed !== false)) throw e; await patch({display_name: v || null, public: pub}); }   // 04 not run yet
        S.display_name = v; S.public = pub; S.listed = lst; put(AK, S); paint(); draw(); toast(L('Shranjeno.', 'Saved.')); }catch(e){ $a('accErr').textContent = errText(e); } };
    $a('accOut').onclick = async () => { $a('accOut').disabled = true; await signOut(); draw(); };
    $a('accExp').onclick = async () => { $a('accErr').textContent = '';
      try{ const [pr, asc, rts] = await Promise.all([call(`/rest/v1/profiles?id=eq.${S.uid}&select=*`), call('/rest/v1/ascents?select=*&limit=5000'), call('/rest/v1/routes?select=*&limit=1000')]);
        const blob = new Blob([JSON.stringify({exported: new Date().toISOString(), profile: pr && pr[0], ascents: asc, routes: rts}, null, 1)], {type: 'application/json'});
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
function paint(){ paintFoot(); if (box && !box.querySelector('#accForm')) draw(); }

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
#lbPage{position:fixed;inset:0;z-index:61;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px}
#lbPage.on{display:flex}
#lbPage .lbc{background:#fff;color:#1d2321;border-radius:16px;width:min(760px,100%);height:min(88vh,900px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 44px rgba(0,0,0,.35);font-size:calc(14px*var(--ui,1))}
#lbPage .lbh{padding:14px 18px 10px;border-bottom:1px solid #e6eae8;background:linear-gradient(180deg,#fff8e6,#fff)}
#lbPage .lbt{display:flex;align-items:center;gap:10px}#lbPage .lbt h3{margin:0;font-size:1.3em;flex:1}
#lbPage .lbx{border:0;background:rgba(0,0,0,.06);width:32px;height:32px;border-radius:50%;font-size:1.3em;cursor:pointer;color:#444}
#lbPage .lbs{color:#5b6461;font-size:.86em;margin:3px 0 10px}
#lbPage .lbtabs{display:flex;flex-wrap:wrap;gap:6px}
#lbPage .lbtabs button{flex:0 1 auto;border:1px solid #d3d9d6;background:#fff;color:#1d2321;border-radius:18px;padding:6px 12px;font:600 .88em system-ui,sans-serif;cursor:pointer;white-space:nowrap}
#lbPage .lbtabs button.on{background:#1d2321;border-color:#1d2321;color:#fff}
#lbPage .lbq{width:100%;box-sizing:border-box;margin-top:10px;font:inherit;padding:8px 12px;border:1px solid #c9d0cc;border-radius:10px}
#lbPage .lbb{flex:1;overflow:auto;padding:6px 18px 12px;overscroll-behavior:contain}
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
#lbPage .pk{display:flex;justify-content:space-between;gap:8px;padding:7px 2px;border-bottom:1px solid #eef1ef;cursor:pointer}#lbPage .pk span{color:#5b6461;font-size:.86em;text-align:right}
@media (max-width:700px){ #lbPage .lbtabs{display:grid;grid-template-columns:1fr 1fr} #lbPage .lbtabs button{white-space:normal;padding:6px 8px} #lbPage{padding:0} #lbPage .lbc{border-radius:0;width:100%;height:100%} #lbPage .grid{grid-template-columns:repeat(2,1fr)} #lbPage .lr{grid-template-columns:28px 32px 1fr auto;gap:8px} }`;
document.head.append(lbCss);
const LB = {board: 'p2000', q: '', off: 0, rows: [], tot: 0, busy: false};
const boardMax = () => (BOARDS.find(b => b[0] === LB.board) || BOARDS[0])[2];
function lbShell(){
  lb.innerHTML = `<div class="lbc"><div class="lbh"><div class="lbt"><h3>🏆 ${L('Lestvica','Leaderboard')}</h3><button class="lbx" aria-label="${L('Zapri','Close')}">×</button></div>
    <div class="lbs" id="lbStats">…</div>
    <div class="lbtabs">${BOARDS.map(([k, t, m]) => `<button data-b="${k}" class="${k === LB.board ? 'on' : ''}">${t} <span style="opacity:.6">${m}</span></button>`).join('')}</div>
    <input class="lbq" id="lbQ" type="search" placeholder="${L('Išči uporabnika …','Search users …')}" value="${esc(LB.q)}" autocomplete="off"></div>
    <div class="lbb" id="lbBody"></div><div class="lbf" id="lbFoot"></div></div>`;
  lb.querySelector('.lbx').onclick = lbClose;
  lb.querySelector('.lbtabs').onclick = e => { const b = e.target.closest('button'); if (!b || b.dataset.b === LB.board) return; LB.board = b.dataset.b;
    lb.querySelectorAll('.lbtabs button').forEach(x => x.classList.toggle('on', x === b)); lbLoad(true); };
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
async function lbProfile(u){
  const r0 = LB.rows.find(r => r.username === u);
  $a('lbBody').innerHTML = `<div class="pf"><button class="back" id="lbBack">‹ ${L('Nazaj na lestvico','Back to the leaderboard')}</button><div id="pfBody"><div class="empty">…</div></div></div>`;
  $a('lbBack').onclick = lbList; $a('lbBody').scrollTop = 0;
  let j = null; try{ j = await rpc('public_profile', {uname: u}); }catch(_){}
  const A = j ? j.ascents.filter(a => byId[a.peak_id]) : null;
  const cnt = A ? {p2: A.filter(a => byId[a.peak_id].tier !== '1500' && byId[a.peak_id].rank != null).length, a2: A.filter(a => byId[a.peak_id].tier !== '1500').length,
      p15: A.filter(a => byId[a.peak_id].tier === '1500' && byId[a.peak_id].is_sub === 'no').length, all: A.length}
    : r0 ? {p2: r0.prom2000, a2: r0.all2000, p15: r0.prom1500, all: r0.all2000 + r0.all1500} : null;
  const nm = (j && j.display_name) || (r0 && r0.display_name) || u;
  $a('pfBody').innerHTML = `<div class="pfh">${av(u, nm, 52)}<div><b>${esc(nm)}</b><div style="color:#5b6461">@${esc(u)}${r0 && r0.joined ? ' · ' + L('od','since') + ' ' + esc(fmtD(r0.joined)) : ''}</div></div></div>
    ${cnt ? `<div class="grid">${[[cnt.p2, N_PROM, L('prominentni 2000','prominent 2000')], [cnt.a2, N_A2K, L('vsi nad 2000 m','all above 2000 m')], [cnt.p15, N_P15, L('prominentni 1500–2000','prominent 1500–2000')], [cnt.all, N_ALL, L('vsi vrhovi','all peaks')]]
      .map(([v, m, t]) => `<div><b>${v}</b><small>/ ${m} · ${t}</small></div>`).join('')}</div>` : ''}
    ${A ? (A.length ? A.map(a => { const p = byId[a.peak_id]; return `<div class="pk" data-id="${esc(a.peak_id)}"><b>${esc(p.name)} <small style="font-weight:400;color:#5b6461">${Math.round(p.elev)} m</small></b><span>${esc([a.climbed_on && fmtD(a.climbed_on), a.route_name].filter(Boolean).join(' · '))}</span></div>`; }).join('') : `<div class="empty">${L('Še brez vrhov.','No peaks yet.')}</div>`)
      : `<div class="empty">🔒 ${L('Seznam vrhov je zaseben.','The list of peaks is private.')}${S && S.username === u ? '<br>' + L('Vklopi »Javni profil« v nastavitvah računa.','Turn on "Public profile" in your account settings.') : ''}</div>`}`;
  $a('pfBody').querySelectorAll('.pk').forEach(d => d.onclick = () => { lbClose(); if (byId[d.dataset.id].lat != null) openPeak(d.dataset.id, true); }); }
function leaderboard(){ lbShell(); lb.classList.add('on'); document.body.classList.remove('menu'); lbLoad(true); }
function lbClose(){ lb.classList.remove('on'); }
lb.onclick = e => { if (e.target === lb) lbClose(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('on')) lbClose(); });
async function profile(u){ lbShell(); lb.classList.add('on'); LB.rows = []; await lbProfile(u); $a('lbBack').onclick = () => lbLoad(true); }
window.showLeaderboard = leaderboard; window.showProfile = profile;
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#lbBtn')){ e.preventDefault(); leaderboard(); } });

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
function shClear(){ shared = null; shCard.classList.remove('on'); try{ if (map.getLayer('shared-rt')) map.removeLayer('shared-rt'); if (map.getLayer('shared-rt-c')) map.removeLayer('shared-rt-c'); if (map.getSource('shared-rt')) map.removeSource('shared-rt'); }catch(_){} }
async function showShared(tok){
  try{ const j = await rpc('shared_route', {token: tok}); if (!j){ toastErr(L('Pot ne obstaja več ali ni deljena.', 'This route no longer exists or is not shared.')); return; }
    const c = decodeLine(j.line); if (c.length < 2) return; shClear(); shared = {name: j.name, coords: c};
    if (!map.isStyleLoaded()) await new Promise(r => map.once('load', r));
    map.addSource('shared-rt', {type: 'geojson', data: {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: c}}});
    map.addLayer({id: 'shared-rt-c', type: 'line', source: 'shared-rt', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#fff', 'line-width': 7}});
    map.addLayer({id: 'shared-rt', type: 'line', source: 'shared-rt', layout: {'line-join': 'round', 'line-cap': 'round'}, paint: {'line-color': '#8e24aa', 'line-width': 4}});
    const b = new maplibregl.LngLatBounds(); c.forEach(x => b.extend(x)); map.fitBounds(b, {padding: 80, maxZoom: 14, duration: 900});
    shCard.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button><b>${esc(j.name)}</b><div style="color:#5b6461">@${esc(j.username || '?')} · ${(+j.km || lineKm(c)).toFixed(1)} km</div>
      <div class="r"><button id="shGpx">GPX</button><button id="shSave">${L('Shrani med moje poti','Save to my routes')}</button></div>`;
    shCard.classList.add('on'); shCard.querySelector('.x').onclick = shClear;
    $a('shGpx').onclick = () => window.coordsGPX && coordsGPX(j.name, c);
    $a('shSave').onclick = () => { if (window.MYR){ MYR.add(j.name, c); toast(L('Shranjeno med moje poti (✎ Riši).', 'Saved to my routes (✎ Draw).')); } };
  }catch(e){ toastErr(errText(e)); } }
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
})();
