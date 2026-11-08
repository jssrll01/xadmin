import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Database } from 'lucide-react';
import { useAdminContext } from '../context/AdminContext.jsx';
import { getTables } from './db.js';
import { PAGE_TABLES, READ_ONLY } from './pageTables.js';

export default function ManageData() {
  const loc = useLocation();
  const nav = useNavigate();
  const { activeSystem } = useAdminContext();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(null);

  const key = useMemo(() => {
    const p = loc.pathname.replace(/\/+$/, '') || '/';
    let best = '';
    Object.keys(PAGE_TABLES).forEach((k) => { if ((p === k || p.startsWith(k + '/')) && k.length > best.length) best = k; });
    return best;
  }, [loc.pathname]);

  useEffect(() => {
    if (open && !all) getTables().then((a) => setAll(new Set(a.map((t) => t.name)))).catch(() => setAll(new Set()));
  }, [open, all]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  if (activeSystem !== 'XMARKET' || !key) return null;
  const list = PAGE_TABLES[key].filter((t) => !all || all.has(t));

  return (
    <>
      <button type="button" data-xa-skip aria-label="Manage this page's data" onClick={() => setOpen(true)}
        style={{ position: 'fixed', right: 16, bottom: 72, zIndex: 900, height: 46, padding: '0 16px', borderRadius: 23, background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-lg)' }}>
        <Database size={17} /> Data
      </button>
      {open && createPortal(
        <div className="xa-ov center" onClick={() => setOpen(false)}>
          <div className="xa-dialog" role="dialog" aria-modal="true" aria-label="Page data" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '86vh', overflowY: 'auto' }}>
            <h3>Data behind this page</h3>
            <p>Open a table to create, edit, duplicate, delete, import or restore rows.</p>
            {all === null && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Loading…</div>}
            {list.map((t) => (
              <button type="button" key={t} data-xa-skip onClick={() => { setOpen(false); nav('/db/' + t); }}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '11px 12px', marginBottom: 6, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                {t}
                {READ_ONLY.includes(t) && <span className="xa-badge" style={{ marginLeft: 'auto' }}>read-only ledger</span>}
              </button>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="neu-btn" onClick={() => { setOpen(false); nav('/db'); }}>All tables</button>
              <button type="button" className="neu-btn" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
