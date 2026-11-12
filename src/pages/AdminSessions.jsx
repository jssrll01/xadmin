import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, LogOut } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { ConfirmDialog, EmptyState, ErrorState, SkRows } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { getSid } from '../lib/pin.js';
import { ago, deviceOf } from '../lib/sessionPing.js';
import { dateTime } from '../lib/format.js';

const state = (s) => (s.active ? ['Unlocked now', 'badge-approved'] : s.ended_at ? [s.ended_by === 'revoked' ? 'Revoked' : 'Locked', 'badge-rejected'] : ['Idle', 'badge-pending']);

export default function AdminSessions() {
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState(null); // { id } | { all: true }
  const [busy, setBusy] = useState(false);
  const mine = getSid();

  const load = useCallback(async () => {
    try { setRows(await adm('adm_sessions_list')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const revoke = async () => {
    setBusy(true);
    try {
      const n = await adm('adm_session_revoke', ask.all ? { p_keep: mine || null } : { p_sid: ask.id });
      show?.(n + ' session(s) revoked. Those devices lock within a minute.', 'success');
      load();
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false); setAsk(null);
  };

  const active = (rows || []).filter((s) => s.active);
  return (
    <>
      <PageHeader title="Admin sessions" subtitle={rows ? active.length + ' unlocked now · refreshes every 10s' : 'Loading…'}
        actions={<>
          <Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>
          <Btn variant="danger" onClick={() => setAsk({ all: true })} disabled={!active.filter((s) => s.id !== mine).length}><LogOut size={14} /> Lock all others</Btn>
        </>} />
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
        A session is "unlocked now" while its tab keeps checking in (every minute). Sessions opened before the security SQL was installed are not listed.
      </p>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !rows && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={5} cols={5} /></div>}
      {rows && !rows.length && <div className="table-wrap"><EmptyState title="No sessions yet" hint="Sessions appear after the next unlock." /></div>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="neu-table stack">
            <thead><tr><th>Status</th><th>Device</th><th>IP</th><th>Unlocked</th><th>Last seen</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const [label, cls] = state(s);
                return (
                  <tr key={s.id}>
                    <td data-label="Status"><span className={'neu-badge ' + cls}>{label}</span>{s.id === mine && <span className="neu-badge badge-frozen" style={{ marginLeft: 6 }}>This device</span>}</td>
                    <td data-label="Device"><b>{deviceOf(s.user_agent)}</b></td>
                    <td data-label="IP"><code style={{ fontSize: 11 }}>{s.ip || '—'}</code></td>
                    <td data-label="Unlocked">{dateTime(s.started_at)}</td>
                    <td data-label="Last seen">{s.ended_at ? 'Ended ' + ago(s.ended_at) : ago(s.last_seen)}</td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      {!s.ended_at && s.id !== mine && <Btn variant="danger" onClick={() => setAsk({ id: s.id })}>Lock</Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!ask} title={ask && ask.all ? 'Lock every other device?' : 'Lock this session?'}
        message="That device is sent back to the PIN screen within a minute. This device stays unlocked." confirmText="Lock" danger busy={busy} onConfirm={revoke} onCancel={() => setAsk(null)} />
    </>
  );
}
