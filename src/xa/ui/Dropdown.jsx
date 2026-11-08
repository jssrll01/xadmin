import React, { useEffect, useRef, useState } from 'react';

// Pass items=[{label,onClick,danger,icon,disabled}] for a menu, or children for a custom panel.
export default function Dropdown({ trigger, items, children, align = 'right', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const d = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', d);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('pointerdown', d); document.removeEventListener('keydown', k); };
  }, [open]);
  const nav = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const b = Array.from(e.currentTarget.querySelectorAll('button:not(:disabled), input'));
    const i = b.indexOf(document.activeElement);
    const n = e.key === 'ArrowDown' ? Math.min(i + 1, b.length - 1) : Math.max(i - 1, 0);
    if (b[n]) b[n].focus();
  };
  return (
    <div className="ui-dd" ref={ref}>
      <button type="button" className="neu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={'ui-menu ' + align} role="menu" onKeyDown={nav}>
          {items ? items.map((it, i) => (
            <button key={i} type="button" role="menuitem" disabled={it.disabled} className={it.danger ? 'danger' : ''}
              onClick={() => { setOpen(false); if (it.onClick) it.onClick(); }}>{it.icon}{it.label}</button>
          )) : children}
        </div>
      )}
    </div>
  );
}
