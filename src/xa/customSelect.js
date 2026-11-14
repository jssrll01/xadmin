// Replaces every native <select> with a rounded custom menu. The select stays in the DOM (hidden),
// so React state and onChange handlers keep working.
const setVal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
const pairs = new Map();
let menu = null;

const st = document.createElement('style');
st.textContent = `
select[data-xcs]{display:none!important}
.xa-cs{display:inline-flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;cursor:pointer;min-height:38px;padding:8px 12px;border:1px solid var(--border-strong,#B9C4D4);background:var(--surface,#fff);color:var(--text,#1F2430);font:inherit;font-size:13.5px;max-width:100%}
.xa-cs span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.xa-cs svg{flex:none;opacity:.6}
.xa-cs:disabled{opacity:.5;cursor:not-allowed}
.xa-cs-menu{position:fixed;z-index:100000;background:#fff;border:1px solid #D6DEE9;border-radius:18px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:6px;overflow-y:auto;overscroll-behavior:contain}
.xa-cs-menu button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;padding:10px 12px;border:0;background:transparent;border-radius:12px;font:inherit;font-size:13.5px;color:#1F2430;cursor:pointer}
.xa-cs-menu button:hover{background:#F1F5F9}
.xa-cs-menu button.sel{color:#2563EB;font-weight:700;background:#EFF6FF}
.xa-cs-menu button:disabled{opacity:.4;cursor:not-allowed}
`;
document.head.appendChild(st);

function close() { if (menu) { menu.remove(); menu = null; } }

function open(sel, btn) {
  close();
  const r = btn.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'xa-cs-menu'; m.setAttribute('role', 'listbox');
  Array.from(sel.options).forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.disabled = o.disabled; b.setAttribute('role', 'option');
    if (o.value === sel.value) b.className = 'sel';
    b.innerHTML = '<span></span>' + (o.value === sel.value ? '<b>&#10003;</b>' : '');
    b.firstChild.textContent = o.text;
    b.addEventListener('click', () => {
      setVal.call(sel, o.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    });
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const w = Math.max(r.width, 170);
  const h = Math.min(m.scrollHeight, 280);
  const below = window.innerHeight - r.bottom - 8;
  m.style.width = w + 'px';
  m.style.maxHeight = '280px';
  m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  m.style.top = (below >= h || below >= r.top ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  menu = m;
  const sel0 = m.querySelector('.sel'); if (sel0) sel0.scrollIntoView({ block: 'nearest' });
}

function make(sel) {
  sel.setAttribute('data-xcs', '1');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = (sel.className || '') + ' xa-cs';
  btn.style.cssText = sel.style.cssText;
  btn.setAttribute('aria-haspopup', 'listbox');
  if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
  btn.innerHTML = '<span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  btn.addEventListener('click', (e) => { e.preventDefault(); if (menu) close(); else open(sel, btn); });
  sel.insertAdjacentElement('afterend', btn);
  pairs.set(sel, btn);
}

function scan() {
  document.querySelectorAll('select:not([data-xcs]):not([multiple])').forEach((s) => { if (!(s.size > 1)) make(s); });
  pairs.forEach((btn, sel) => {
    if (!sel.isConnected) { btn.remove(); pairs.delete(sel); return; }
    const o = sel.options[sel.selectedIndex];
    const t = o ? o.text : 'Select';
    if (btn.firstChild.textContent !== t) btn.firstChild.textContent = t;
    if (btn.disabled !== sel.disabled) btn.disabled = sel.disabled;
  });
}

document.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target) && !(e.target.closest && e.target.closest('.xa-cs'))) close(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
window.addEventListener('resize', close);
window.addEventListener('scroll', (e) => { if (menu && !menu.contains(e.target)) close(); }, true);
setInterval(scan, 250);
scan();
