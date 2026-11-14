// Runs first: locks the white theme, adds the floating progress bar, restyles alert()
try { document.documentElement.dataset.theme = 'light'; localStorage.setItem('xadmin_theme', 'light'); } catch (e) { /* storage blocked */ }

const st = document.createElement('style');
st.textContent = `
.xa-np{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(200px,56vw);height:6px;border-radius:99px;background:rgba(37,99,235,.16);box-shadow:0 2px 10px rgba(37,99,235,.18);overflow:hidden;z-index:99999;pointer-events:none;opacity:0;transition:opacity .18s}
.xa-np.on{opacity:1}
.xa-np i{position:absolute;top:0;bottom:0;width:42%;border-radius:99px;background:#2563EB;animation:xaNp 1s ease-in-out infinite}
@keyframes xaNp{0%{left:-45%}100%{left:105%}}
.xa-alert{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(420px,90vw);padding:12px 18px;border-radius:18px;background:#fff;color:#1F2430;border:1px solid #D6DEE9;box-shadow:0 8px 28px rgba(15,23,42,.18);font:600 13.5px system-ui,sans-serif;z-index:99998}
@media (prefers-reduced-motion: reduce){.xa-np i{animation:none;width:100%}}
`;
document.head.appendChild(st);

let last = 0;
['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, () => { last = Date.now(); }, true));

let n = 0, showT = 0, hideT = 0, bar = null;
function el() {
  if (!bar) { bar = document.createElement('div'); bar.className = 'xa-np'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Loading'); bar.innerHTML = '<i></i>'; document.body.appendChild(bar); }
  return bar;
}
function start() {
  n++; clearTimeout(hideT);
  if (!showT) showT = setTimeout(() => el().classList.add('on'), 120);
}
function end() {
  n = Math.max(0, n - 1);
  if (n === 0) { clearTimeout(showT); showT = 0; hideT = setTimeout(() => { if (bar) bar.classList.remove('on'); }, 260); }
}
const orig = window.fetch.bind(window);
window.fetch = function (...a) {
  if (Date.now() - last > 3000) return orig(...a);
  start();
  return orig(...a).finally(end);
};

window.alert = function (m) {
  const d = document.createElement('div');
  d.className = 'xa-alert'; d.setAttribute('role', 'alert'); d.textContent = String(m == null ? '' : m);
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 4200);
};
