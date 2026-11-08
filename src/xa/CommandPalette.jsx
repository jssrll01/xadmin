import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAdminPin } from '../lib/pin.js';

const RK = 'xs_recent';
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RK)) || []; } catch (e) { return []; } };
const pushRecent = (p) => { try { localStorage.setItem(RK, JSON.stringify([p, ...readRecent().filter((x) => x !== p)].slice(0, 5))); } catch (e) { /* storage blocked */ } };

const ACTIONS = [
  { id: 'theme', label: 'Toggle light or dark theme', run: () => {
    const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem('xadmin_theme', n); } catch (e) { /* storage blocked */ }
    window.dispatchEvent(new Event('xs:theme'));
  } },
  { id: 'reload', label: 'Reload the app', run: () => window.location.reload() },
  { id: 'lock', label: 'Lock admin', run: () => {
    try { sessionStorage.removeItem('xadmin_unlocked'); sessionStorage.removeItem('xadmin_actor'); } catch (e) { /* storage blocked */ }
    clearAdminPin();
    window.location.reload();
  } },
];

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
    const pages = (items || []).map(([path, label, Icon, group]) => ({ kind: 'page', path, label, Icon, section: group || 'Pages' }));
    const acts = ACTIONS.map((a) => ({ kind: 'action', ...a }));
    if (t) {
      return [
        ...pages.filter((x) => x.label.toLowerCase().includes(t) || x.path.includes(t)),
        ...acts.filter((a) => a.label.toLowerCase().includes(t)).map((a) => ({ ...a, section: 'Actions' })),
      ].slice(0, 40);
    }
    const recent = readRecent().map((p) => pages.find((x) => x.path === p)).filter(Boolean).map((x) => ({ ...x, section: 'Recent' }));
    return [...recent, ...acts.map((a) => ({ ...a, section: 'Quick actions' })), ...pages].slice(0, 70);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, items, open]);
  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { const el = document.querySelector('.xa-pal li.on'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }, [i]);

  if (!open) return null;
  const go = (x) => {
    setOpen(false);
    if (x.kind === 'action') { x.run(); return; }
    pushRecent(x.path);
    nav(x.path);
  };
  return (
    <div className="xa-ov" onClick={() => setOpen(false)}>
      <div className="xa-pal" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input ref={inp} value={q} placeholder="Jump to a page or run an action…" aria-label="Search pages and actions" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
            else if (e.key === 'Enter' && list[i]) go(list[i]);
          }} />
        <ul role="listbox">
          {list.length === 0 && <li className="empty">No match</li>}
          {list.map((x, n) => (
            <React.Fragment key={x.kind + (x.path || x.id) + n}>
              {(n === 0 || list[n - 1].section !== x.section) && <li className="grp" role="presentation">{x.section}</li>}
              <li role="option" aria-selected={n === i} className={(n === i ? 'on' : '') + (x.kind === 'action' ? ' act' : '')} onMouseEnter={() => setI(n)} onClick={() => go(x)}>
                {x.Icon && <x.Icon size={16} />}{x.label}<small>{x.kind === 'action' ? 'Action' : x.path}</small>
              </li>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}
