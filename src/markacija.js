// ===================== "Markacija" look (preview): the new look (design.js) + trail-blaze skin + a bottom bar on the phone =====================
// On only with html.mk (Nastavitve → Videz → Markacija, or ?v2=mk). Red #C8102E and white like the Slovenian trail blaze,
// black 2 px outlines, Barlow Condensed for headings and numbers. Phone: one 64 px bar at the bottom (Vrhovi, Karta, the menu
// button as a blaze, Načrt, Jaz) instead of the peek sheet. Map: peaks drawn as blazes (red ring, white middle; climbed = red).
(function(){
if (!document.documentElement.classList.contains('mk')) return;
const $ = id => document.getElementById(id), B = document.body, L = (sl, en) => window.LANG === 'en' ? en : sl;
const f = document.createElement('link'); f.rel = 'stylesheet';
f.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=swap'; document.head.append(f);
const PH = '@media (max-width:700px),(max-height:500px) and (pointer:coarse)', PC = '@media (min-width:701px) and (min-height:501px),(min-width:701px) and (pointer:fine)';
const RED = '#C8102E', INK = '#141414', CD = "'Barlow Condensed',Inter,system-ui,sans-serif";
const st = document.createElement('style'); st.id = 'mkcss'; st.textContent = `
html.mk{--acc:${RED};--v2red:${RED};--v2float:0 0 0 2px ${INK};--v2sheet:0 0 0 2px ${INK}}
html.mk .maplibregl-popup-content{--acc:${RED};border:2px solid ${INK}!important;box-shadow:0 6px 0 rgba(20,20,20,.12)!important;border-radius:18px!important}
html.mk .maplibregl-popup-tip{display:none}
html.mk .panel h1,html.mk #dtitle,html.mk .v2p .v2n span:first-child,html.mk .rg,html.mk #tour h3,html.mk #setWin h2,html.mk #lbPage h2{font-family:${CD}!important;text-transform:uppercase;letter-spacing:.02em}
html.mk .v2p .v2n span:first-child{font-size:30px!important;line-height:1}
html.mk .v2ok{background:${RED}!important;color:#fff!important}
html.mk .v2act button{background:#fff!important;border:2px solid ${INK}!important;color:${INK}!important;border-radius:14px!important}
html.mk .v2act button.pri{background:${RED}!important;border-color:${RED}!important;color:#fff!important}
html.mk .v2snow{background:#fff!important;border:2px solid #1F5FAD}
html.mk #v2s{border:2px solid ${INK};border-radius:24px!important;box-shadow:none!important}
html.mk #v2s .av{background:${RED}!important}
html.mk .maplibregl-ctrl-group{border:2px solid ${INK}!important;border-radius:22px!important;box-shadow:none!important}
html.mk #hleg,html.mk #snowleg{border:2px solid ${INK}!important;box-shadow:none!important;border-radius:14px!important}
html.mk #hleg b,html.mk #snowleg b{font-family:${CD};text-transform:uppercase;letter-spacing:.02em;font-size:1.08em}
html.mk .btn:not(.btn2){background:${INK}!important;border-color:${INK}!important}
html.mk .sb.pri,html.mk #accBox .go,html.mk #plCard .go,html.mk #tour .nx{background:${RED}!important;border-color:${RED}!important}
html.mk #chips button.on,html.mk .chips button.on,html.mk .tchips button.on{background:${RED}!important;border-color:${RED}!important;color:#fff!important}
html.mk #stchips button.on{background:${INK}!important;color:#fff!important}
html.mk .it input[type=checkbox]{accent-color:${RED}}
html.mk .ri.on{border-color:${RED}!important;background:rgba(200,16,46,.06)!important}
html.mk #vcount3,html.mk #ptab em{color:${RED}!important;font-family:${CD}}
html.mk #fab .fb{background:radial-gradient(circle,#fff 0 11px,${RED} 11.5px)!important;border:2px solid ${INK}!important;box-shadow:none!important}
html.mk #fab .fb .fi{color:${RED}!important}html.mk #fab .fb .fi svg{width:16px!important;height:16px!important;stroke-width:3!important}
html.mk #fab.open .fb{background:${INK}!important}html.mk #fab.open .fb .fx{color:#fff}
html.mk #fab .fo{border:2px solid ${INK}!important;box-shadow:none!important}
html.mk #fab .fo .ol{border:1.5px solid ${INK};box-shadow:none!important}
html.mk #fab.open .fo:hover,html.mk #fab.open .fo:active{background:${RED}!important}
html.mk #v2rail{border-right:2px solid ${INK}!important;box-shadow:none!important}
html.mk #v2rail .rl.on{background:${RED}!important;color:#fff!important}
html.mk #v2rail .logo{background:${RED}!important;color:#fff!important}
html.mk #v360 .vb{border:2px solid ${INK}}html.mk #v360 .vb .seg button.on,html.mk #v360 .vb button.on{background:${RED}!important;color:#fff!important}
html.mk #v360 .v2x{border:2px solid ${INK}}
html.mk #mkdock{display:none}
${PH}{
  html.mk #fabTab{display:none!important}
  html.mk #mkdock{display:block;position:absolute;z-index:8;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));height:64px;background:#fff;border:2px solid ${INK};border-radius:32px;box-sizing:border-box;overflow:hidden;touch-action:pan-y}
  html.mk body.menu #mkdock,html.mk body.dopen #mkdock,html.mk body.in360 #mkdock,html.mk body.drawing #mkdock,html.mk body.pop #mkdock{display:none}
  html.mk #mkdock .trk{display:flex;height:100%;transition:transform .28s cubic-bezier(.3,.7,.3,1)}
  html.mk #mkdock .pg{flex:0 0 100%;display:flex;align-items:center;padding:0 4px;box-sizing:border-box}
  html.mk #mkdock button,html.mk #mkdock .ph{flex:1;min-width:0;height:58px;border:0;background:none;color:${INK};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:600 11px Inter,system-ui,sans-serif;padding:0;cursor:pointer;position:relative}
  html.mk #mkdock button .lb{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  html.mk #mkdock button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  html.mk #mkdock button .bdg{position:absolute;top:4px;right:calc(50% - 20px)}
  html.mk #mkdock .cnt{font:700 18px ${CD};color:${RED};line-height:22px}
  html.mk #mkdock .gap{flex:0 0 70px}
  html.mk #fab:not(.open) .fb .fi{display:none!important}
  html.mk #mkdock .dots{position:absolute;left:50%;bottom:3px;transform:translateX(-50%);display:flex;gap:4px}
  html.mk #mkdock .dots i{width:5px;height:5px;border-radius:50%;background:#C9C4BA}html.mk #mkdock .dots i.on{background:${RED}}
  html.mk #fab{bottom:calc(24px + env(safe-area-inset-bottom))!important}
  html.mk body.dopen #fab,html.mk body.menu #fab,html.mk body.pop #fab:not(.open){display:none}
}
@media (max-height:500px) and (pointer:coarse) and (orientation:landscape){
  html.mk #mkdock{left:auto;right:calc(10px + env(safe-area-inset-right));top:10px;bottom:10px;width:64px;height:auto}
  html.mk #mkdock .trk{flex-direction:column;height:100%}
  html.mk #mkdock .pg{flex:0 0 100%;flex-direction:column;padding:4px 0;width:100%}
  html.mk #mkdock button,html.mk #mkdock .ph{width:100%;height:auto;flex:1}
  html.mk #mkdock .gap{flex:0 0 64px}
  html.mk #mkdock .dots{left:auto;right:4px;bottom:auto;top:50%;transform:translateY(-50%);flex-direction:column}
  html.mk #fab{left:auto!important;margin-left:0!important;right:calc(13px + env(safe-area-inset-right))!important;bottom:calc(50% - 29px)!important}
  html.mk .maplibregl-ctrl-top-right{right:82px!important}
  html.mk body.pop #mkdock{display:block}html.mk body.pop #fab:not(.open){display:block}
}
`; document.head.append(st);

// ---------- phone: bottom bar with pages. The blaze in the middle stays; tap it (or swipe the bar) and the four buttons around
// it change to the next set. Hold the blaze = the old round menu with everything. ----------
const ico = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const IC = {'◧': ico('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'), '🗓': ico('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  '👤': ico('<circle cx="12" cy="8.5" r="3.8"/><path d="M5 20c1-3.8 3.8-5.5 7-5.5s6 1.7 7 5.5"/>')};
const SHORT = {'🗓': L('Načrt','Plan'), '👤': L('Jaz','Me'), '◧': L('Karta','Map'), '✏️': L('Riši','Draw'), '⚙': L('Nastavitve','Settings'), '🏆': L('Lestvica','Ranking'),
  '❓': L('Vodič','Guide'), '📍': 'GPS', '🛠': 'Admin', '👥': L('Prijatelji','Friends'), '⛰': L('Skupine','Groups')};
const dock = document.createElement('nav'); dock.id = 'mkdock'; dock.setAttribute('aria-label', L('Glavna vrstica','Main bar'));
dock.innerHTML = '<div class="trk"></div><div class="dots"></div>'; B.append(dock);
const trk = dock.querySelector('.trk'), dots = dock.querySelector('.dots');
let PG = 0, PAGES = [], sig = '';
const items = () => window.fabItemsList ? fabItemsList() : [];
function build(){ const it = items(), first = ['◧', '🗓', '👤'], rest = it.filter(x => !first.includes(x[0]));
  const s2 = it.map(x => x[0] + x[1] + (x[3] || '')).join('|'); if (s2 === sig) return; sig = s2;
  const P1 = [['peaks'], ...first.map(k => it.find(x => x[0] === k) || [k])];
  PAGES = [P1]; for (let i = 0; i < rest.length; i += 4) PAGES.push(rest.slice(i, i + 4));
  const btn = x => { if (!x) return '<span class="ph"></span>';
    if (x[0] === 'peaks') return `<button data-k="peaks"><span class="cnt" id="mkcnt">0/0</span>${L('Vrhovi','Peaks')}</button>`;
    return `<button data-k="${x[0]}">${(window.V2I && V2I[x[0]]) || IC[x[0]] || x[0]}<span class="lb">${SHORT[x[0]] || x[1]}</span>${x[3] ? `<i class="bdg">${x[3]}</i>` : ''}</button>`; };
  trk.innerHTML = PAGES.map(p => `<div class="pg">${btn(p[0])}${btn(p[1])}<span class="gap"></span>${btn(p[2])}${btn(p[3])}</div>`).join('');
  dots.innerHTML = PAGES.map((_, i) => `<i class="${i === PG ? 'on' : ''}"></i>`).join(''); if (PG >= PAGES.length) PG = 0; go(PG, true); up(); }
function go(i, inst){ PG = (i + PAGES.length) % PAGES.length; trk.style.transition = inst ? 'none' : ''; trk.style.transform = matchMedia('(max-height:500px) and (pointer:coarse) and (orientation:landscape)').matches ? `translateY(${-PG * 100}%)` : `translateX(${-PG * 100}%)`;
  dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === PG)); }
dock.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k;
  if (window.fabClose) fabClose();
  if (k === 'peaks'){ if (window.DRAW_ON && window.stopDraw) stopDraw(); B.classList.remove('menu'); $('drawer').classList.add('open'); return; }
  const x = items().find(y => y[0] === k); if (x) x[2](); setTimeout(() => { sig = ''; build(); }, 300); };
{ let x0 = null; dock.addEventListener('pointerdown', e => { x0 = e.clientX; });
  dock.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) go(PG + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  addEventListener('resize', () => go(PG, true)); }
// the blaze: tap = next set of buttons, hold = the full round menu
const fab = $('fab'), fb = fab && fab.querySelector('.fb'); let hold = null, held = false;
if (fb){
  fb.addEventListener('pointerdown', () => { held = false; clearTimeout(hold); hold = setTimeout(() => { if (!window.PHONE_UI || !PHONE_UI()) return; held = true; window.__fabOpen && __fabOpen(); }, 550); });
  addEventListener('pointerup', () => clearTimeout(hold));
  fab.addEventListener('click', e => { if (!window.PHONE_UI || !PHONE_UI() || fab.classList.contains('open') || B.classList.contains('touring')) return;
    if (!e.target.closest('.fb')) return; e.stopPropagation(); e.preventDefault(); if (held){ held = false; return; } go(PG + 1); }, true); }
const vc = $('vcount3'), up = () => { const m = (vc && vc.textContent || '').match(/(\d+)\s*\/\s*(\d+)/), c = $('mkcnt'); if (m && c) c.textContent = `${m[1]}/${m[2]}`; };
if (vc) new MutationObserver(up).observe(vc, {childList: true, characterData: true, subtree: true});
build(); setInterval(build, 3000);
window.mkDockPage = go;   // the guide shows the pages

// ---------- map: peaks as trail blazes ----------
const paint = () => { if (typeof map === 'undefined' || !map.getLayer || !map.getLayer('pk')) return false;
  // blaze in the range's colour (Julijske red, Kamniške blue, Karavanke purple ...): ring = not yet, filled = climbed; 1500-2000 m thinner
  map.setPaintProperty('pk', 'circle-color', ['case', ['get', 'v'], ['get', 'col'], '#ffffff']);
  map.setPaintProperty('pk', 'circle-stroke-color', ['case', ['get', 'v'], '#ffffff', ['get', 'col']]);
  map.setPaintProperty('pk', 'circle-stroke-width', ['case', ['get', 'v'], 2, ['get', 't15'], 2, 3.6]); return true; };
if (!paint()){ const t = setInterval(() => { if (paint()) clearInterval(t); }, 500); setTimeout(() => clearInterval(t), 30000); }
})();
