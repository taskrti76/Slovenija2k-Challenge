// ===================== settings window: my profile + everything that used to be under "Napredno" =====================
// PC: ⚙ button next to SL/EN at the top of the side panel (and where "Napredno" was); phone: 4th tab "⚙ Nastavitve".
(function(){
const L = (sl, en) => window.LANG === 'en' ? en : sl;
const $s = id => document.getElementById(id);
// --- profile (stored in this browser). Defaults are neutral: nothing changes until you set it.
const DEF = {winter:1, fit:1, maxT:6, ferrata:true};
let P = DEF; try{ P = Object.assign({}, DEF, JSON.parse(localStorage.getItem('dvat3d_profile') || '{}')); }catch(_){}
const FIT_K = [1.25, 1, 0.8];
const apply = () => { window.PROFILE = Object.assign({}, P, {fitK:FIT_K[P.fit] ?? 1}); };
apply();
const save = () => { try{ localStorage.setItem('dvat3d_profile', JSON.stringify(P)); }catch(_){} apply();
  window.rerenderRoutes && window.rerenderRoutes(); window.wxRepaint && window.wxRepaint(); };

const css = document.createElement('style'); css.textContent = `
#setWin{position:fixed;inset:0;z-index:58;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:12px}
#setWin.on{display:flex}
#setWin .setcard{display:block;background:#fff;color:#1d2321;border-radius:14px;width:min(560px,100%);max-height:100%;overflow:auto;padding:14px 16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-size:calc(14px*var(--ui,1))}
#setWin h3{margin:0 0 10px;font-size:1.2em}#setWin .x{float:right;border:0;background:none;font-size:1.7em;line-height:1;cursor:pointer;color:var(--mute,#666)}
#setWin h4{margin:14px 0 6px;font-size:.8em;text-transform:uppercase;letter-spacing:.06em;color:var(--mute,#666)}
#setWin .q{margin:8px 0 2px;font-weight:600}#setWin .hint{font-size:.82em;color:var(--mute,#666);margin:2px 0 4px}
#setWin .chips{display:flex;flex-wrap:wrap;gap:6px}#setWin .chips button{border:1px solid var(--line,#ccc);background:transparent;color:inherit;border-radius:18px;padding:5px 11px;font:inherit;font-size:.92em;cursor:pointer}
#setWin .chips button.on{background:#1d2321;color:#fff;border-color:#1d2321}
#setWin .advbox .btn{width:100%;margin:4px 0;background:#1d2321!important;color:#fff!important;border:1px solid #1d2321;font-weight:600}
#setWin .advbox .btn2{background:#fff!important;color:#1d2321!important;border:1px solid #8a948f}#setWin .advbox .btn2:hover{background:#eef2f0!important}
#setWin .advbox,#setWin .advbox label{color:#1d2321}#setWin .advbox .row,#setWin .advbox div[style*="color"],#setWin .hint{color:#4a524f!important}#setWin h4{color:#4a524f}#setWin .advbox label{display:flex;gap:8px;align-items:center;margin:6px 0}
#gearBtn{float:right;margin:2px 6px 0 0;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--mute);font:600 calc(11px*var(--ui,1)) system-ui,sans-serif;padding:3px 7px;cursor:pointer}
@media (max-width:700px){ #setWin{padding:0;align-items:stretch} #setWin .setcard{border-radius:0;width:100%;padding-bottom:calc(18px + env(safe-area-inset-bottom))} #gearBtn{display:none} }`;
document.head.append(css);

const win = document.createElement('div'); win.id = 'setWin';
win.innerHTML = `<div class="setcard"><button class="x" aria-label="${L('Zapri','Close')}">×</button><h3>⚙ ${L('Nastavitve','Settings')}</h3>
  <h4>${L('Moj profil','My profile')}</h4>
  <div class="hint">${L('Vpliva na oceno vremena, čase hoje in opozorila pri poteh. Shranjeno v tem brskalniku.','Affects the weather rating, walking times and route warnings. Saved in this browser.')}</div>
  <div class="q">${L('Izkušnje z zimo','Winter experience')}</div>
  <div class="chips" data-k="winter">${[L('brez','none'), L('lažje zimske ture (dereze, cepin)','easy winter tours (crampons, axe)'), L('zimska alpinistika','winter alpinism')].map((t, i) => `<button data-v="${i}">${t}</button>`).join('')}</div>
  <div class="hint">${L('Sneg na vrhu šteje ×1,5 / ×1 / ×0,5 pri oceni dneva.','Snow on the summit counts ×1.5 / ×1 / ×0.5 in the day rating.')}</div>
  <div class="q">${L('Kondicija','Fitness')}</div>
  <div class="chips" data-k="fit">${[L('počasnejši','slower'), L('povprečna','average'), L('hiter','fast')].map((t, i) => `<button data-v="${i}">${t}</button>`).join('')}</div>
  <div class="hint">${L('Časi hoje ×1,25 / ×1 / ×0,8 (osnova DIN 33466).','Walking times ×1.25 / ×1 / ×0.8 (DIN 33466 base).')}</div>
  <div class="q">${L('Najtežje, kar mi je še prijetno','Hardest I am comfortable with')}</div>
  <div class="chips" data-k="maxT">${[2,3,4,5,6].map(v => `<button data-v="${v}">T${v}</button>`).join('')}</div>
  <div class="chips" data-k="ferrata" style="margin-top:6px"><button data-v="1">${L('ferate: da','via ferratas: yes')}</button><button data-v="0">${L('ferate: ne','via ferratas: no')}</button></div>
  <div class="hint">${L('Težje poti in vrhovi dobijo oznako »⚠ nad tvojo mejo«. T2 planinska, T3 zahtevna planinska, T4 alpska, T5 zahtevna alpska, T6 težka alpska pot.','Harder routes and peaks get "⚠ above your limit". T2 mountain, T3 demanding mountain, T4 alpine, T5 demanding alpine, T6 difficult alpine.')}</div>
  <h4>${L('Napredno','Advanced')}</h4><div class="advbox" id="setAdv"></div></div>`;
document.body.append(win);
const paintChips = () => win.querySelectorAll('.chips').forEach(c => { const k = c.dataset.k, v = k === 'ferrata' ? (P.ferrata ? 1 : 0) : P[k];
  c.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === v)); });
win.querySelectorAll('.chips').forEach(c => c.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = c.dataset.k, v = +b.dataset.v;
  P[k] = k === 'ferrata' ? v === 1 : v; paintChips(); save(); });
paintChips();
const open = () => { win.classList.add('on'); document.body.classList.remove('menu'); };
const close = () => win.classList.remove('on');
window.openSettings = open; window.closeSettings = close;
win.querySelector('.x').onclick = close; win.onclick = e => { if (e.target === win) close(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && win.classList.contains('on')) close(); });

// --- move the old "Napredno" contents (buttons keep their handlers) into the window; leave a button in its place
const adv = document.querySelector('details.adv');
if (adv){
  [...adv.children].forEach(ch => { if (ch.tagName !== 'SUMMARY') $s('setAdv').append(ch); });
  const b = document.createElement('button'); b.className = 'btn btn2'; b.style.cssText = 'width:100%;margin-top:12px';
  b.textContent = '⚙ ' + L('Nastavitve in napredno', 'Settings & advanced'); b.onclick = open;
  adv.replaceWith(b);
}
// PC: ⚙ next to SL/EN
const lang = $s('langsw');
if (lang){ const g = document.createElement('button'); g.id = 'gearBtn'; g.title = L('Nastavitve','Settings'); g.textContent = '⚙'; g.onclick = open; lang.after(g); }
// phone: 4th tab
const tb = $s('tabbar');
if (tb){ const t = document.createElement('button'); t.dataset.t = 'settings'; t.innerHTML = `<span class="ic">⚙</span>${L('Nastavitve','Settings')}`;
  t.addEventListener('click', e => { e.stopPropagation(); open(); }); tb.append(t); }
})();
