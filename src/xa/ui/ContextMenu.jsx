import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// items: [{ label, icon, onClick, danger, disabled }] or { separator: true }
// Right-click on desktop, long-press (500 ms) on phones.
export default function ContextMenu({ items, children, className, style }) {
  const [pos, setPos] = useState(null);
  const menu = useRef(null);
  const timer = useRef(null);

  const openAt = (x, y) => setPos({ x, y });
  const close = () => setPos(null);

  useLayoutEffect(() => {
    if (!pos || !menu.current) return;
    const r = menu.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(pos.x, window.innerWidth - r.width - 8));
    const y = Math.max(8, Math.min(pos.y, window.innerHeight - r.height - 8));
    if (x !== pos.x || y !== pos.y) setPos({ x, y });
    menu.current.querySelector('button:not(:disabled)')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  useEffect(() => {
    if (!pos) return;
    const away = (e) => { if (menu.current && !menu.current.contains(e.target)) close(); };
    const key = (e) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const btns = [...menu.current.querySelectorAll('button:not(:disabled)')];
      const i = btns.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      btns[next]?.focus();
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const cancelPress = () => { clearTimeout(timer.current); timer.current = null; };

  return (
    <div className={className} style={style}
      onContextMenu={(e) => { e.preventDefault(); openAt(e.clientX, e.clientY); }}
      onTouchStart={(e) => { const t = e.touches[0]; cancelPress(); timer.current = setTimeout(() => openAt(t.clientX, t.clientY), 500); }}
      onTouchMove={cancelPress} onTouchEnd={cancelPress} onTouchCancel={cancelPress}>
      {children}
      {pos && createPortal(
        <div ref={menu} className="cm" role="menu" style={{ left: pos.x, top: pos.y }}>
          {items.map((it, i) => it.separator ? <div key={i} className="cm-sep" role="separator" /> : (
            <button key={i} type="button" role="menuitem" disabled={it.disabled}
              className={'cm-item' + (it.danger ? ' danger' : '')}
              onClick={() => { close(); it.onClick?.(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>, document.body)}
    </div>
  );
}
