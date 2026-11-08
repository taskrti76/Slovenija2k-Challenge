// ===================== "Nov videz" (v2, experimental): one design system over the existing UI =====================
// On only when html.v2 is set (Nastavitve → Nov videz, or ?v2=1 / ?v2=0 on the address; remembered). Everything here is scoped
// to html.v2, so with it off the site looks exactly as before. Tokens: Inter; one accent (alpine red #B42318), ink #1B1F23,
// grey #626870, stone #F5F4F0, line #E6E3DC, selection blue #1F5FAD; radius 10 (controls) / 14 (cards) / 20 (sheets) / pill;
// two shadows (floating on the map, sheet / window); line icons instead of emoji in the round menu.
(function(){
if (!document.documentElement.classList.contains('v2')) return;
const f = document.createElement('link'); f.rel = 'stylesheet';
f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; document.head.append(f);
const PC = '@media (min-width:701px) and (min-height:501px),(min-width:701px) and (pointer:fine)';
const PH = '@media (max-width:700px),(max-height:500px) and (pointer:coarse)';
const c = document.createElement('style'); c.id = 'v2css'; c.textContent = `
html.v2{--acc:#B42318;--v2red:#B42318;--v2blue:#1F5FAD;--v2float:0 1px 3px rgba(16,24,32,.22);--v2sheet:0 8px 28px rgba(16,24,32,.18)}
@media (prefers-color-scheme:light){html.v2{--ink:#1B1F23;--mute:#626870;--line:#E6E3DC;--bg:#F5F4F0;--panel:#ffffff;--solid:#ffffff}}
@media (prefers-color-scheme:dark){html.v2{--acc:#F07167;--v2blue:#6EA8F0}}
html.v2 body,html.v2 button,html.v2 input,html.v2 select,html.v2 textarea,html.v2 .maplibregl-popup-content,html.v2 .maplibregl-ctrl{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important}
html.v2 body{-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}

/* panels, sheets, cards, windows */
html.v2 .panel,html.v2 #drawer,html.v2 .card,html.v2 #plCard{backdrop-filter:none!important;border:0!important;box-shadow:var(--v2sheet)!important}
${PC}{ html.v2 .card,html.v2 #plCard{border-radius:14px!important} }
${PH}{ html.v2 .card,html.v2 #plCard,html.v2 #drawer,html.v2 .panel{border-radius:20px 20px 0 0!important} }
html.v2 .maplibregl-popup-content{border-radius:14px!important;box-shadow:0 8px 28px rgba(16,24,32,.24)!important;padding:14px 14px 12px!important}
html.v2 #setWin .setcard,html.v2 #accWin .acard{border-radius:16px!important}
html.v2 .panel h1,html.v2 #dtitle{letter-spacing:-.015em}

/* buttons: primary (red), secondary (outlined), all 10 px corners */
html.v2 .btn,html.v2 .pbtns button,html.v2 .rb button,html.v2 .sb,html.v2 .alt,html.v2 #accBox .go,html.v2 #plCard .go,html.v2 .tb{border-radius:10px!important;font-weight:600!important}
html.v2 .pbtns button,html.v2 .rb button{min-height:40px;border:1px solid var(--line)!important;background:var(--solid)!important;color:var(--ink)!important}
html.v2 .btn:not(.btn2){background:var(--ink);border-color:var(--ink)}
html.v2 .sb.pri,html.v2 #accBox .go,html.v2 #plCard .go,html.v2 #tour .nx,html.v2 .admd .pri{background:var(--v2red)!important;border-color:var(--v2red)!important;color:#fff!important}
html.v2 .pplan{border-radius:10px!important;border-style:solid!important;font-weight:600}

/* chips (pills) and segmented switches */
html.v2 #chips button,html.v2 .chips button,html.v2 .tchips button{border-radius:999px!important;font-weight:500}
html.v2 #chips button.on,html.v2 .chips button.on,html.v2 .tchips button.on{background:var(--ink)!important;color:var(--panel)!important;border-color:var(--ink)!important}
html.v2 #stchips{border:0!important;background:rgba(127,127,127,.14);border-radius:10px!important;padding:3px;gap:3px}
html.v2 #stchips button{border:0!important;border-radius:8px!important;font-weight:500}
html.v2 #stchips button.on{background:var(--solid)!important;color:var(--ink)!important;font-weight:600;box-shadow:0 1px 2px rgba(16,24,32,.14)}

/* peak list */
html.v2 .rg{letter-spacing:.06em;font-weight:700}
html.v2 .it .rk{border:0!important;background:rgba(127,127,127,.13);border-radius:6px!important;font-weight:600;color:var(--ink)}
html.v2 .it input[type=checkbox]{accent-color:#2E7D4F}

/* route card */
html.v2 .ri{border-radius:12px!important}
html.v2 .ri.on{border-color:var(--v2blue)!important;background:rgba(31,95,173,.07)!important}
html.v2 .pzs{background:var(--v2red)!important;border-radius:4px!important}

/* map buttons, legends, little pills on the map */
html.v2 .maplibregl-ctrl-group{border-radius:12px!important;box-shadow:var(--v2float)!important;overflow:hidden}
html.v2 #hleg,html.v2 #snowleg{border-radius:12px!important;box-shadow:var(--v2float)!important}

/* the red button, its menu and the peaks tab */
html.v2 #fab .fb{background:var(--v2red)!important}
html.v2 #fab.open .fb{background:#1B1F23!important}
html.v2 #fab .fo{width:52px!important;height:52px!important;left:5px!important;top:5px!important;box-shadow:0 4px 14px rgba(16,24,32,.24)!important}
${PH}{ html.v2 #fab .fo{left:5px!important;top:5px!important} }
html.v2 #fab .fb .fi svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;display:block}
html.v2 #fab .fo .oi svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;display:block}
html.v2 #fab .fo .ol{font:600 12px Inter,system-ui,sans-serif!important;border-radius:6px!important;padding:2px 7px!important;box-shadow:0 1px 3px rgba(16,24,32,.14)}
html.v2 #fab.open .fo:hover,html.v2 #fab.open .fo:focus-visible,html.v2 #fab.open .fo:active{background:var(--v2red)!important;color:#fff!important;box-shadow:0 6px 18px rgba(180,35,24,.4)!important}
html.v2 #fab .fo:hover .ol,html.v2 #fab .fo:focus-visible .ol,html.v2 #fab .fo:active .ol{background:var(--v2red)!important;color:#fff!important}
html.v2 #fabTab{font-family:Inter,system-ui,sans-serif!important;font-weight:600!important;box-shadow:0 -4px 16px rgba(16,24,32,.16)!important}
html.v2 #fabTab .tr{color:var(--v2red)!important}

/* PC side tabs: calm white handles instead of a blue and a red bar */
${PC}{ html.v2 #ltab,html.v2 #ptab{background:var(--solid)!important;color:var(--ink)!important;box-shadow:var(--v2float)!important;border:0!important}
  html.v2 #ptab em,html.v2 #vcount3{color:var(--v2red)!important} }

/* guide */
html.v2 #tour .tc{border-radius:18px!important}
html.v2 #tour h3{letter-spacing:-.01em}
`;
document.head.append(c);
})();
// line icons for the round menu (account.js uses them when html.v2 is on)
window.V2I = (() => { const s = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`; return {
  '◧': s('<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>'),
  '⚙': s('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h12M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  '👤': s('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  '✏️': s('<path d="M4 20l4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14 7 3 3"/>'),
  '🗓': s('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>'),
  '🏆': s('<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>'),
  '👥': s('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .7 3.2 2.3 3.5 5"/>'),
  '⛰': s('<path d="m3 20 6.5-11 4 6 2.5-3.5L21 20H3Z"/><path d="M9.5 9V4l3 1.2-3 1.3"/>'),
  '📍': s('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  '❓': s('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
  '🛠': s('<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3Z"/>'),
  '☰': s('<path d="M4 7h16M4 12h16M4 17h16"/>')
}; })();
if (window.V2 && window.fabFace) fabFace();
