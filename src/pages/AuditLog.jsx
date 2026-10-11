import React, { useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchAuditLog, deleteAuditLog, deleteAuditLogAll } from '../lib/api.js';
import { dateTime } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { Trash2, RefreshCw } from 'lucide-react';

export default function AuditLog() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { items, error } = await fetchAuditLog({ limit: 500 });
    if (error) show?.(error.message, 'error');
    setItems(Array.isArray(items) ? items : []);
    setLoading(false);
  }, [show]);

  useAutoRefresh(load, 3000);

  const remove = async (row) => {
    if (!confirm(`Delete this audit entry?`)) return;
    const { error } = await deleteAuditLog(row.id);
    if (error) return show?.(error.message, 'error');
    show?.('Deleted', 'success');
    load();
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL audit logs? This cannot be undone.')) return;
    if (!confirm('Are you REALLY sure? Click OK to permanently delete every log.')) return;
    const { error } = await deleteAuditLogAll();
    if (error) return show?.(error.message, 'error');
    show?.('All logs cleared', 'success');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>{items.length} entries · auto-refresh 3s</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>
          <Btn variant="danger" onClick={clearAll}><Trash2 size={14} /> Clear all</Btn>
        </div>
      </div>

      {loading ? (
        <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
      ) : items.length === 0 ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>
          No audit entries yet
        </div></Card>
      ) : (
        <div className="table-wrap">
          <table className="neu-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record</th>
                <th>Before</th>
                <th>After</th>
                <th style={{ textAlign: 'right', width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const a = (r.action || '').toLowerCase();
                const cls = a === 'delete' ? 'badge-rejected'
                          : a === 'create' ? 'badge-approved'
                          : a === 'update' ? 'badge-frozen'
                          : 'badge-pending';
                return (
                  <tr key={r.id}>
                    <td>{dateTime(r.created_at)}</td>
                    <td><b>{r.actor || 'admin'}</b></td>
                    <td><span className={`neu-badge ${cls}`}>{a}</span></td>
                    <td>{r.table_name || '—'}</td>
                    <td><code style={{ fontSize: 11 }}>{String(r.record_id || '').slice(0, 8) || '—'}</code></td>
                    <td className="cell-wrap">
                      {r.before_data ? <code style={{ fontSize: 10 }}>{JSON.stringify(r.before_data).slice(0, 60)}</code> : '—'}
                    </td>
                    <td className="cell-wrap">
                      {r.after_data ? <code style={{ fontSize: 10 }}>{JSON.stringify(r.after_data).slice(0, 60)}</code> : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }}
                        onClick={() => remove(r)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
