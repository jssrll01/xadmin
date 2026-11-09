import React, { useState, useCallback, useMemo } from 'react';
import { Trash2, RefreshCw, Search, Eye } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchAuditLog, deleteAuditLogAdmin as deleteAuditLog, deleteAuditLogAllAdmin as deleteAuditLogAll } from '../lib/api.js';
import { dateTime } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import { ConfirmDialog, EmptyState, SkRows } from '../xa/Kit.jsx';

const badge = (a) => (a === 'delete' ? 'badge-rejected' : a === 'create' ? 'badge-approved' : a === 'update' ? 'badge-frozen' : 'badge-pending');
const json = (v) => (v ? JSON.stringify(v, null, 2) : '—');
const pre = { fontSize: 11, margin: 0, padding: 10, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflow: 'auto' };

export default function AuditLog() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [act, setAct] = useState('all');
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { items, error } = await fetchAuditLog({ limit: 500 });
    if (error) show?.(error.message, 'error');
    setItems(Array.isArray(items) ? items : []);
    setLoading(false);
  }, [show]);
  useAutoRefresh(load, 3000);

  const doDelete = async () => {
    setBusy(true);
    const { error } = await deleteAuditLog(del.id);
    setBusy(false); setDel(null);
    if (error) return show?.(error.message, 'error');
    show?.('Deleted', 'success'); load();
  };
  const doClear = async () => {
    setBusy(true);
    const { error } = await deleteAuditLogAll();
    setBusy(false); setClearing(false);
    if (error) return show?.(error.message, 'error');
    show?.('All logs cleared', 'success'); load();
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((r) => {
      if (act !== 'all' && (r.action || '').toLowerCase() !== act) return false;
      if (!t) return true;
      return [r.actor, r.action, r.table_name, r.record_id].filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [items, q, act]);

  return (
    <>
      <PageHeader title="Audit log" subtitle={shown.length + ' shown of ' + items.length + ' · auto-refresh 3s'}
        actions={<>
          <Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>
          <Btn variant="danger" onClick={() => setClearing(true)} disabled={!items.length}><Trash2 size={14} /> Clear all</Btn>
        </>} />

      <div className="ui-tools">
        <label className="ui-search">
          <Search size={15} />
          <input className="neu-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, table, record…" aria-label="Search audit log" />
        </label>
        <select className="neu-input" style={{ flex: '0 1 150px' }} value={act} onChange={(e) => setAct(e.target.value)} aria-label="Filter by action">
          <option value="all">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      {loading && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={6} cols={4} /></div>}
      {!loading && !shown.length && <div className="table-wrap"><EmptyState title={items.length ? 'No matches' : 'No audit entries yet'} hint={items.length ? 'Try a different search or action.' : ''} /></div>}

      {!loading && shown.length > 0 && (
        <div className="table-wrap">
          <table className="neu-table stack">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Table</th><th>Record</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const a = (r.action || '').toLowerCase();
                return (
                  <tr key={r.id}>
                    <td data-label="When">{dateTime(r.created_at)}</td>
                    <td data-label="Actor"><b>{r.actor || 'admin'}</b></td>
                    <td data-label="Action"><span className={'neu-badge ' + badge(a)}>{a}</span></td>
                    <td data-label="Table">{r.table_name || '—'}</td>
                    <td data-label="Record"><code style={{ fontSize: 11 }}>{String(r.record_id || '').slice(0, 8) || '—'}</code></td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="ui-ic" style={{ width: 36, height: 34 }} onClick={() => setView(r)} aria-label="View details"><Eye size={14} /></button>
                        <button type="button" className="ui-ic danger" style={{ width: 36, height: 34 }} onClick={() => setDel(r)} aria-label="Delete entry"><Trash2 size={14} /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!view} onClose={() => setView(null)} title="Audit entry" footer={<Btn onClick={() => setView(null)}>Close</Btn>}>
        {view && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div><b>{view.actor || 'admin'}</b> · {(view.action || '').toLowerCase()} · {view.table_name || '—'}</div>
            <div style={{ color: 'var(--text-dim)' }}>{dateTime(view.created_at)} · record <code>{view.record_id || '—'}</code></div>
            <div><div className="ui-lbl">Before</div><pre style={pre}>{json(view.before_data)}</pre></div>
            <div><div className="ui-lbl">After</div><pre style={pre}>{json(view.after_data)}</pre></div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!del} title="Delete this audit entry?" message="This cannot be undone." confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <ConfirmDialog open={clearing} title="Delete ALL audit logs?" message={'This permanently deletes all ' + items.length + ' entries and cannot be undone.'} confirmText="Delete everything" danger busy={busy} onConfirm={doClear} onCancel={() => setClearing(false)} />
    </>
  );
}
