import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { adm } from './db.js';
import { useXaToast, LoadingBtn } from './Kit.jsx';

const PHRASE = 'CLEAR AUDIT LOG';
const SCOPES = [['all', 'Both logs'], ['audit_log', 'Admin actions log (audit_log)'], ['admin_audit_logs', 'Admin audit logs (admin_audit_logs)']];

export default function AuditClear() {
  const loc = useLocation();
  const { push } = useXaToast();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('all');
  const [counts, setCounts] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTyped(''); setCounts(null);
    Promise.all(['audit_log', 'admin_audit_logs'].map((t) => adm('adm_rows', { p_table: t, p_limit: 1 }).then((r) => Number(r.total || 0)).catch(() => 0)))
      .then(([a, b]) => setCounts({ audit_log: a, admin_audit_logs: b }));
  }, [open]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  if (loc.pathname.replace(/\/+$/, '') !== '/audit') return null;
  const n = counts ? (scope === 'all' ? counts.audit_log + counts.admin_audit_logs : counts[scope]) : null;

  const run = async () => {
    setBusy(true);
    try {
      const r = await adm('adm_audit_clear', { p_scope: scope });
      push('Cleared ' + (Number(r.audit_log || 0) + Number(r.admin_audit_logs || 0)) + ' log entries', 'success');
      setOpen(false);
      setTimeout(() => window.location.reload(), 700);
    } catch (e) { push(e.message, 'error', 7000); }
    setBusy(false);
  };

  return (
    <>
      <button type="button" data-xa-skip aria-label="Clear audit log" onClick={() => setOpen(true)}
        style={{ position: 'fixed', right: 16, bottom: 126, zIndex: 900, height: 46, padding: '0 16px', borderRadius: 23, background: 'var(--danger)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-lg)' }}>
        <Trash2 size={17} /> Clear logs
      </button>
      {open && createPortal(
        <div className="xa-ov center" onClick={() => !busy && setOpen(false)}>
          <div className="xa-dialog" role="alertdialog" aria-modal="true" aria-label="Clear audit log" onClick={(e) => e.stopPropagation()}>
            <h3>Clear audit logs?</h3>
            <p>This permanently deletes the history of who changed what. It cannot be undone. One entry recording this clear is kept.</p>
            <select className="xa-input" style={{ marginBottom: 10 }} value={scope} aria-label="Which log" onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{n === null ? 'Counting…' : n.toLocaleString() + ' entr' + (n === 1 ? 'y' : 'ies') + ' will be deleted'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Type <b style={{ color: 'var(--text)' }}>{PHRASE}</b> to confirm</div>
            <input className="xa-input" style={{ marginBottom: 14 }} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Confirmation phrase" />
            <div className="row">
              <button type="button" className="neu-btn" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              <LoadingBtn variant="danger" loading={busy} disabled={typed.trim() !== PHRASE || n === 0} onClick={run}>Delete all</LoadingBtn>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
