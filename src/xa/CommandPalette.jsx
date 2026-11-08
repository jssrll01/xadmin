import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// items: [path, label, Icon?, group?]
export default function CommandPalette({ items }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const inp = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const o = () => setOpen(true);
    window.addEventListener('keydown', h);
    window.addEventListener('xa:palette', o);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('xa:palette', o); };
  }, []);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => inp.current && inp.current.focus(), 30); } }, [open]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = (items || []).map(([path, label, Icon, group]) => ({ path, label, Icon, group }));
    return (t ? all.filter((x) => x.label.toLowerCase().includes(t) || x.path.includes(t)) : all).slice(0, 40);
  }, [q, items]);
  useEffect(() => { setI(0); }, [q]);

  if (!open) return null;
  const go = (x) => { setOpen(false); nav(x.path); };
  return (
    <div className="xa-ov" onClick={() => setOpen(false)}>
      <div className="xa-pal" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input ref={inp} value={q} placeholder="Jump to a page…" aria-label="Search pages" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
            else if (e.key === 'Enter' && list[i]) go(list[i]);
          }} />
        <ul role="listbox">
          {list.length === 0 && <li className="empty">No matching page</li>}
          {list.map((x, n) => (
            <li key={x.path + n} role="option" aria-selected={n === i} className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => go(x)}>
              {x.Icon && <x.Icon size={16} />}{x.label}<small>{x.group || x.path}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
