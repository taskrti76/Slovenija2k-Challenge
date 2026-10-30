// ===================== accounts: username + password (+ Cloudflare Turnstile human check), synced ticked peaks =====================
// Supabase Auth needs an email, so the page signs up <username>@uporabnik.dvatisocaki.invalid (".invalid" can never receive mail;
// "Confirm email" is off). The database takes the username from that address (supabase/01_schema.sql), so it cannot be faked.
// No library: a few fetch calls to Supabase Auth (GoTrue) and the database API (PostgREST). Keys here are public by design.
// Sync: the ticked peaks stay in this browser as before (works offline); with an account every change is remembered as "unsent"
// until the server has it. First login in a browser uploads the ticks made here before. Log out = this browser forgets them
// (they stay in the account).
(function(){
const SB = 'https://txprpjrwnrchevknvxci.supabase.co', KEY = 'sb_publishable_yYpHRC0Rdo0L1Mpq3xS9ZQ_HewnusvY';
const TS_KEY = '0x4AAAAAAFr5h2NZFQOFHE6y', DOM = 'uporabnik.dvatisocaki.invalid';
const L = (sl, en) => window.LANG === 'en' ? en : sl;
const $a = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const get = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(_){ return null; } };
const put = (k, v) => { try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
const AK = 'dvat3d_auth', SK = 'dvat3d_sync';
let S = get(AK);                         // session {access_token, refresh_token, expires_at, uid, username, display_name}
let SY = get(SK) || {};                  // {uid, merged, dirty:{peak_id: 0 = ticked / 1 = unticked}, at}
const USER_RE = /^(?![.])(?!.*\.\.)[a-z0-9_.-]{3,24}(?<![.])$/;

// ---------- Supabase calls ----------
class ApiErr extends Error {}
async function call(path, {method = 'GET', body, auth = true, headers = {}} = {}){
  const h = Object.assign({apikey: KEY, 'Content-Type': 'application/json'}, headers);
  if (auth){ const t = await token(); if (!t){ const e = new ApiErr('not signed in'); e.status = 401; throw e; } h.Authorization = 'Bearer ' + t; }
  const r = await fetch(SB + path, {method, headers: h, body: body != null ? JSON.stringify(body) : undefined, cache: 'no-store'});
  const txt = await r.text(); let j = null; try{ j = txt ? JSON.parse(txt) : null; }catch(_){}
  if (!r.ok){ const e = new ApiErr((j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status)); e.status = r.status; e.code = j && (j.error_code || j.code); throw e; }
  return j; }
const keep = j => { S = Object.assign({}, S || {}, {access_token: j.access_token, refresh_token: j.refresh_token,
  expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), uid: (j.user && j.user.id) || (S && S.uid)}); put(AK, S); };
let refreshing = null;
async function token(){
  if (!S || !S.refresh_token) return null;
  if (S.expires_at - 60 > Date.now() / 1000) return S.access_token;
  if (!refreshing) refreshing = (async () => {
    try{ keep(await call('/auth/v1/token?grant_type=refresh_token', {method: 'POST', auth: false, body: {refresh_token: S.refresh_token}})); return S.access_token; }
    catch(e){ if (e.status === 400 || e.status === 401 || e.status === 403){ forget(); paint(); } return null; }   // session ended elsewhere
    finally { refreshing = null; } })();
  return refreshing; }
function forget(){ S = null; put(AK, null); }
const errText = e => {
  const c = e.code || '', m = (e.message || '').toLowerCase();
  if (c === 'invalid_credentials' || m.includes('invalid login')) return L('Napačno uporabniško ime ali geslo.', 'Wrong username or password.');
  if (c === 'user_already_exists' || c === 'email_exists' || m.includes('already registered')) return L('To uporabniško ime je že zasedeno.', 'This username is taken.');
  if (c.startsWith('captcha') || m.includes('captcha')) return L('Preverjanje »nisem robot« ni uspelo – poskusi znova.', 'The "not a robot" check failed - try again.');
  if (c === 'weak_password' || m.includes('password')) return L('Geslo je prešibko (vsaj 8 znakov).', 'Password too weak (at least 8 characters).');
  if (e.status === 429 || c.includes('rate')) return L('Preveč poskusov – počakaj nekaj minut.', 'Too many attempts - wait a few minutes.');
  if (m.includes('database error')) return L('Uporabniško ime ni veljavno.', 'Invalid username.');
  if (e instanceof TypeError) return L('Ni povezave s strežnikom.', 'No connection to the server.');
  return L('Napaka: ', 'Error: ') + e.message; };

async function loadProfile(){
  try{ const r = await call(`/rest/v1/profiles?id=eq.${S.uid}&select=username,display_name`); if (r && r[0]){ Object.assign(S, r[0]); put(AK, S); } }catch(_){} }
async function signUp(user, pass, name, captcha){
  const j = await call('/auth/v1/signup', {method: 'POST', auth: false,
    body: {email: `${user}@${DOM}`, password: pass, data: {display_name: name || user}, gotrue_meta_security: {captcha_token: captcha}}});
  if (!j || !j.access_token) throw new ApiErr(L('Račun je ustvarjen, a prijava ni uspela – prijavi se.', 'Account created but sign-in failed - please sign in.'));
  keep(j); await loadProfile(); }
async function signIn(user, pass, captcha){
  keep(await call('/auth/v1/token?grant_type=password', {method: 'POST', auth: false,
    body: {email: `${user}@${DOM}`, password: pass, gotrue_meta_security: {captcha_token: captcha}}}));
  await loadProfile(); }
async function signOut(){
  if (Object.keys(SY.dirty || {}).length) try{ await sync(); }catch(_){}
  try{ await call('/auth/v1/logout', {method: 'POST'}); }catch(_){}
  forget(); SY = {}; put(SK, null); window.TICKS && TICKS.set([]); paint(); }

// ---------- sync of ticked peaks ----------
let syncing = false, again = false, syncT = 0, state = '';
const saveSY = () => put(SK, SY);
function schedule(ms = 1500){ clearTimeout(syncT); syncT = setTimeout(sync, ms); }
window.onTicks = (ids, on) => { if (!S) return; if (SY.uid !== S.uid) SY = {uid: S.uid, merged: false, dirty: {}};
  SY.dirty = SY.dirty || {}; ids.forEach(id => SY.dirty[id] = on ? 0 : 1); saveSY(); setState('wait'); schedule(); };
async function sync(){
  if (!S || !window.TICKS) return; if (syncing){ again = true; return; } syncing = true; setState('busy');
  try{
    if (SY.uid !== S.uid) SY = {uid: S.uid, merged: false, dirty: {}};
    SY.dirty = SY.dirty || {};
    const rows = await call('/rest/v1/ascents?select=peak_id,deleted&limit=5000');
    const srv = new Map(rows.map(r => [r.peak_id, !r.deleted]));
    if (!SY.merged){ for (const id of TICKS.get()) if (!srv.get(id) && !(id in SY.dirty)) SY.dirty[id] = 0; SY.merged = true; saveSY(); }   // first login here
    const up = Object.entries(SY.dirty).map(([peak_id, d]) => ({user_id: S.uid, peak_id, deleted: !!d}));
    for (let i = 0; i < up.length; i += 500){ const part = up.slice(i, i + 500);
      await call('/rest/v1/ascents?on_conflict=user_id,peak_id', {method: 'POST', body: part, headers: {Prefer: 'resolution=merge-duplicates,return=minimal'}});
      for (const r of part){ srv.set(r.peak_id, !r.deleted); if (SY.dirty[r.peak_id] === (r.deleted ? 1 : 0)) delete SY.dirty[r.peak_id]; } }
    SY.at = Date.now(); saveSY();
    // what the page should show: the account + changes made here that are not sent yet (a tick during this sync stays)
    const want = new Set([...srv].filter(([, v]) => v).map(([k]) => k));
    for (const [id, d] of Object.entries(SY.dirty)) d ? want.delete(id) : want.add(id);
    const now = TICKS.get(); if (want.size !== now.size || [...want].some(id => !now.has(id))) TICKS.set([...want]);
    setState(Object.keys(SY.dirty).length ? 'wait' : 'ok');
  }catch(e){ setState(e.status === 401 ? 'out' : 'off'); if (e.status !== 401) schedule(60000); }
  finally { syncing = false; if (again){ again = false; schedule(300); } } }
addEventListener('online', () => S && schedule(200));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S && Date.now() - (SY.at || 0) > 60000) schedule(200); });

// ---------- look ----------
const css = document.createElement('style'); css.textContent = `
#accWin{position:fixed;inset:0;z-index:59;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:12px}
#accWin.on{display:flex}
#accWin .acard{background:#fff;color:#1d2321;border-radius:14px;width:min(400px,100%);max-height:100%;overflow:auto;padding:16px 18px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-size:calc(14px*var(--ui,1))}
#accWin h3{margin:0 0 4px;font-size:1.25em}#accWin .x{float:right;border:0;background:none;font-size:1.7em;line-height:1;cursor:pointer;color:#666}
#accWin .sub{color:#5b6461;font-size:.88em;margin:0 0 12px}
#accWin .tabs{display:flex;border:1px solid #c9cfcc;border-radius:9px;overflow:hidden;margin:0 0 12px}
#accWin .tabs button{flex:1;border:0;background:#fff;color:#1d2321;font:600 1em system-ui,sans-serif;padding:8px;cursor:pointer}
#accWin .tabs button.on{background:#1d2321;color:#fff}
#accWin label{display:block;font-weight:600;font-size:.9em;margin:9px 0 3px}
#accWin input[type=text],#accWin input[type=password]{width:100%;box-sizing:border-box;font:inherit;padding:9px 10px;border:1px solid #b9c1bd;border-radius:8px;background:#fff;color:#1d2321}
#accWin input:focus{outline:2px solid #1565c0;outline-offset:-1px}
#accWin .hint{font-size:.8em;color:#5b6461;margin-top:3px;line-height:1.35}
#accWin .warn{font-size:.82em;background:#fff6e0;border:1px solid #f0d58a;border-radius:8px;padding:7px 9px;margin:10px 0 0;color:#5a4400}
#accWin .err{color:#b3261e;font-size:.88em;min-height:1.2em;margin:8px 0 0}
#accWin .go{width:100%;margin-top:10px;padding:10px;border-radius:9px;border:0;background:#1d2321;color:#fff;font:600 1em system-ui,sans-serif;cursor:pointer}
#accWin .go:disabled{opacity:.5;cursor:default}
#accWin .alt{width:100%;margin-top:8px;padding:9px;border-radius:9px;border:1px solid #8a948f;background:#fff;color:#1d2321;font:600 .95em system-ui,sans-serif;cursor:pointer}
#accWin .danger{border-color:#d9a5a1;color:#b3261e}
#accWin .ts{margin-top:10px;min-height:65px}
#accWin .me{display:flex;gap:12px;align-items:center;margin:4px 0 10px}
#accWin .av{width:44px;height:44px;border-radius:50%;background:#1565c0;color:#fff;display:flex;align-items:center;justify-content:center;font:700 1.2em system-ui,sans-serif;flex:none}
#accWin .st{font-size:.85em;color:#5b6461}
#accBtn{float:right;margin:2px 6px 0 0;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--mute);font:600 calc(11px*var(--ui,1)) system-ui,sans-serif;padding:3px 7px;cursor:pointer;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#accBtn.in{color:var(--ink);border-color:#1565c0}
.accrow{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:8px 10px;border:1px solid #d6dbd8;border-radius:10px;background:#f6f8f7}
.accrow span{flex:1;font-size:.9em}.accrow button{border:0;border-radius:8px;background:#1d2321;color:#fff;font:600 .9em system-ui,sans-serif;padding:6px 10px;cursor:pointer}
#dfoot .fnote a{color:inherit;text-decoration:underline;cursor:pointer}
@media (max-width:700px){ #accWin{padding:0;align-items:stretch} #accWin .acard{border-radius:0;width:100%;padding-bottom:calc(18px + env(safe-area-inset-bottom))} #accBtn{display:none} }`;
document.head.append(css);
const win = document.createElement('div'); win.id = 'accWin'; win.innerHTML = '<div class="acard"></div>'; document.body.append(win);
const card = win.querySelector('.acard');
let mode = 'in', tsId = null, tsTok = '';
const open = m => { if (m) mode = m; draw(); win.classList.add('on'); document.body.classList.remove('menu'); };
const close = () => { win.classList.remove('on'); if (tsId != null && window.turnstile) try{ turnstile.remove(tsId); }catch(_){} tsId = null; };
window.openAccount = open;
win.onclick = e => { if (e.target === win) close(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && win.classList.contains('on')) close(); });

// Cloudflare Turnstile, loaded only when the form opens
let tsP = null;
const tsLoad = () => tsP || (tsP = new Promise((res, rej) => { const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = res; s.onerror = () => { tsP = null; rej(new Error('turnstile')); };
  document.head.append(s); }));
async function tsMount(){ tsTok = ''; const box = $a('accTs'); if (!box) return;
  try{ await tsLoad(); if (!document.contains(box)) return;
    tsId = turnstile.render(box, {sitekey: TS_KEY, language: window.LANG === 'en' ? 'en' : 'auto', appearance: 'always',
      callback: t => { tsTok = t; ready(); }, 'expired-callback': () => { tsTok = ''; ready(); }, 'error-callback': () => { tsTok = ''; ready(); }}); }
  catch(_){ box.innerHTML = `<div class="err">${L('Preverjanja »nisem robot« ni bilo mogoče naložiti (blokator oglasov?).', 'The "not a robot" check could not load (ad blocker?).')}</div>`; } }
const tsReset = () => { tsTok = ''; if (tsId != null && window.turnstile) try{ turnstile.reset(tsId); }catch(_){} ready(); };
function ready(){ const b = $a('accGo'); if (b) b.disabled = !tsTok; }

function draw(){
  if (tsId != null && window.turnstile) try{ turnstile.remove(tsId); }catch(_){} tsId = null;
  if (S){ const nm = S.display_name || S.username || '?';
    card.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button><h3>${L('Moj račun','My account')}</h3>
      <div class="me"><div class="av">${esc(nm.trim()[0] || '?').toUpperCase()}</div><div><b>${esc(nm)}</b><div class="st">@${esc(S.username || '')}</div></div></div>
      <div class="st" id="accSt"></div>
      <label for="accName">${L('Prikazno ime','Display name')}</label><input type="text" id="accName" maxlength="40" value="${esc(S.display_name || '')}">
      <button class="alt" id="accSave">${L('Shrani ime','Save name')}</button>
      <div class="err" id="accErr"></div>
      <button class="alt" id="accOut">${L('Odjava','Log out')}</button>
      <div class="hint" style="margin-top:4px">${L('Ob odjavi brskalnik pozabi tvoje kljukice – ostanejo shranjene v računu.','On log-out this browser forgets your ticks - they stay in your account.')}</div>
      <details style="margin-top:14px"><summary style="cursor:pointer;color:#b3261e;font-size:.9em">${L('Izbriši račun','Delete account')}</summary>
        <div class="hint">${L('Izbriše račun in vse shranjene vrhove. Za potrditev vpiši svoje uporabniško ime.','Deletes the account and all saved peaks. Type your username to confirm.')}</div>
        <input type="text" id="accDelU" autocomplete="off" placeholder="${esc(S.username || '')}"><button class="alt danger" id="accDel">${L('Trajno izbriši','Delete for good')}</button></details>`;
    card.querySelector('.x').onclick = close; paintState();
    $a('accSave').onclick = async () => { const v = $a('accName').value.trim().slice(0, 40); $a('accErr').textContent = '';
      try{ await call(`/rest/v1/profiles?id=eq.${S.uid}`, {method: 'PATCH', body: {display_name: v || null}, headers: {Prefer: 'return=minimal'}});
        S.display_name = v; put(AK, S); paint(); draw(); }catch(e){ $a('accErr').textContent = errText(e); } };
    $a('accOut').onclick = async () => { $a('accOut').disabled = true; await signOut(); close(); };
    $a('accDel').onclick = async () => { if ($a('accDelU').value.trim().toLowerCase() !== S.username){ $a('accErr').textContent = L('Uporabniško ime se ne ujema.', 'Username does not match.'); return; }
      try{ await call('/rest/v1/rpc/delete_me', {method: 'POST', body: {}}); forget(); SY = {}; put(SK, null); window.TICKS && TICKS.set([]); paint(); close();
        window.toastErr && toastErr(L('Račun je izbrisan.', 'Account deleted.')); }catch(e){ $a('accErr').textContent = errText(e); } };
    return; }
  const up = mode === 'up';
  card.innerHTML = `<button class="x" aria-label="${L('Zapri','Close')}">×</button><h3>${up ? L('Nov račun','New account') : L('Prijava','Sign in')}</h3>
    <div class="sub">${L('Shrani svoje vrhove v račun in jih imej na telefonu in računalniku.','Keep your peaks in an account - on your phone and computer.')}</div>
    <div class="tabs"><button data-m="in" class="${up ? '' : 'on'}">${L('Prijava','Sign in')}</button><button data-m="up" class="${up ? 'on' : ''}">${L('Nov račun','New account')}</button></div>
    <form id="accForm" autocomplete="on">
      <label for="accU">${L('Uporabniško ime','Username')}</label>
      <input type="text" id="accU" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" required>
      ${up ? `<div class="hint">${L('3–24 znakov: male črke a–z, številke, _ . - (brez šumnikov). Kasneje ga ni mogoče spremeniti.','3–24 characters: a–z, digits, _ . - . Cannot be changed later.')}</div>
      <label for="accN">${L('Prikazno ime','Display name')} <span style="font-weight:400;color:#5b6461">(${L('neobvezno, lahko s šumniki','optional')})</span></label>
      <input type="text" id="accN" maxlength="40" autocomplete="nickname">` : ''}
      <label for="accP">${L('Geslo','Password')}</label>
      <input type="password" id="accP" name="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="${up ? 8 : 1}" required>
      ${up ? `<label for="accP2">${L('Ponovi geslo','Repeat password')}</label><input type="password" id="accP2" autocomplete="new-password" minlength="8" required>
      <div class="warn">${L('Gesla ne moremo poslati po e-pošti, ker računi nimajo e-pošte – zapiši si ga ali uporabi upravitelja gesel.','We cannot email your password - accounts have no email. Write it down or use a password manager.')}</div>` : ''}
      <div class="ts" id="accTs"></div>
      <div class="err" id="accErr"></div>
      <button class="go" id="accGo" type="submit" disabled>${up ? L('Ustvari račun','Create account') : L('Prijava','Sign in')}</button>
    </form>
    ${up ? '' : `<div class="hint" style="margin-top:10px">${L('Pozabljeno geslo? Piši skrbniku strani.','Forgot your password? Contact the site admin.')}</div>`}`;
  card.querySelector('.x').onclick = close;
  card.querySelector('.tabs').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.m !== mode){ mode = b.dataset.m; draw(); } };
  $a('accU').oninput = e => { const v = e.target.value.toLowerCase().replace(/\s/g, ''); if (v !== e.target.value) e.target.value = v; };
  $a('accForm').onsubmit = async e => { e.preventDefault(); const err = $a('accErr'); err.textContent = '';
    const u = $a('accU').value.trim().toLowerCase(), p = $a('accP').value;
    if (!USER_RE.test(u)){ err.textContent = L('Uporabniško ime: 3–24 znakov a–z, 0–9, _ . - (pika ne na začetku ali koncu).', 'Username: 3–24 of a–z, 0–9, _ . - (no dot at the start or end).'); return; }
    if (up && p.length < 8){ err.textContent = L('Geslo naj ima vsaj 8 znakov.', 'Password: at least 8 characters.'); return; }
    if (up && p !== $a('accP2').value){ err.textContent = L('Gesli se ne ujemata.', 'Passwords do not match.'); return; }
    if (!tsTok){ err.textContent = L('Najprej potrdi, da nisi robot.', 'Confirm you are not a robot first.'); return; }
    const go = $a('accGo'); go.disabled = true; go.textContent = '…';
    try{ up ? await signUp(u, p, ($a('accN').value || '').trim().slice(0, 40), tsTok) : await signIn(u, p, tsTok);
      SY = SY.uid === S.uid ? SY : {uid: S.uid, merged: false, dirty: {}}; saveSY(); paint(); close(); sync();
      window.toastErr && toastErr(up ? L('Račun je ustvarjen. Tvoji vrhovi se shranjujejo v račun.', 'Account created. Your peaks are now saved to it.') : L('Prijavljen si.', 'Signed in.'));
    }catch(e2){ err.textContent = errText(e2); go.textContent = up ? L('Ustvari račun','Create account') : L('Prijava','Sign in'); tsReset(); } };
  tsMount(); setTimeout(() => $a('accU') && $a('accU').focus(), 50); }

// sync state line (account window, peak list footer, PC button)
function setState(s){ state = s; paintState(); paintFoot(); }
const stateText = () => ({busy: L('☁ shranjujem …', '☁ saving …'), wait: L('☁ čaka na pošiljanje', '☁ waiting to send'),
  off: L('☁ brez povezave – shranim, ko bo spet na voljo', '☁ offline - will save when back online'), out: L('☁ seja je potekla – prijavi se znova', '☁ session ended - sign in again'),
  ok: L('☁ shranjeno v računu', '☁ saved to your account') + (SY.at ? ' · ' + new Date(SY.at).toLocaleTimeString(window.LANG === 'en' ? 'en-GB' : 'sl-SI', {hour: '2-digit', minute: '2-digit'}) : '')}[state] || '');
function paintState(){ const el = $a('accSt'); if (el) el.textContent = stateText(); }
function paintFoot(){ const f = document.querySelector('#dfoot .fnote'); if (!f) return;
  if (S) f.textContent = stateText() || L('☁ račun', '☁ account');
  else { f.innerHTML = `${L('shranjeno v brskalniku', 'saved in this browser')} · <a id="accFoot">${L('prijava', 'sign in')}</a>`; $a('accFoot').onclick = () => open('in'); } }
function paint(){
  const b = $a('accBtn'); if (b){ b.classList.toggle('in', !!S); b.textContent = S ? '👤 ' + (S.display_name || S.username || '') : '👤 ' + L('Prijava', 'Sign in'); }
  const r = $a('accRow'); if (r){ r.innerHTML = S ? `<span>👤 <b>${esc(S.display_name || S.username)}</b> · @${esc(S.username || '')}</span><button>${L('Račun','Account')}</button>`
    : `<span>${L('Shrani vrhove v račun (telefon + računalnik).','Save your peaks to an account (phone + computer).')}</span><button>${L('Prijava','Sign in')}</button>`;
    r.querySelector('button').onclick = () => { window.closeSettings && closeSettings(); open('in'); }; }
  paintFoot(); }

// PC: 👤 next to ⚙; settings window (phone tab ⚙): account row at the top
const gear = $a('gearBtn') || $a('langsw');
if (gear){ const b = document.createElement('button'); b.id = 'accBtn'; b.title = L('Račun','Account'); b.onclick = () => open('in'); gear.after(b); }
const sc = document.querySelector('#setWin .setcard h3');
if (sc){ const r = document.createElement('div'); r.id = 'accRow'; r.className = 'accrow'; sc.after(r); }
paint();
if (S){ setState('busy'); token().then(t => { if (t){ loadProfile().then(paint); sync(); } else paint(); }); }
})();
