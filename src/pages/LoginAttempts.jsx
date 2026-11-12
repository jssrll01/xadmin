import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { ConfirmDialog, EmptyState, ErrorState, SkRows } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { ago, deviceOf } from '../lib/sessionPing.js';
import { dateTime } from '../lib/format.js';

const tile = { padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', minWidth: 120, flex: '1 1 120px' };

export default function LoginAttempts() {
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [only, setOnly] = useState('failed');
  const [ask, setAsk] = useState(null); // days to keep, 0 = everything
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await adm('adm_attempts_list', { p_limit: 500 })); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const clear = async () => {
    setBusy(true);
    try { const n = await adm('adm_attempts_clear', { p_days: ask }); show?.(n + ' entries deleted', 'success'); load(); }
    catch (e) { show?.(e.message, 'error'); }
    setBusy(false); setAsk(null);
  };

  const rows = ((data && data.rows) || []).filter((r) => only === 'all' || !r.ok);
  return (
    <>
      <PageHeader title="Login attempts" subtitle="PIN unlock attempts, newest first · refreshes every 15s"
        actions={<>
          <Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>
          <Btn variant="danger" onClick={() => setAsk(30)} disabled={!data || !data.total}><Trash2 size={14} /> Clear old</Btn>
        </>} />
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !data && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={5} cols={4} /></div>}
      {data && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={tile}><div className="ui-lbl">Failed, last hour</div><b style={{ fontSize: 22, color: data.fail_1h > 0 ? '#DC2626' : undefined }}>{data.fail_1h}</b></div>
            <div style={tile}><div className="ui-lbl">Failed, last 24h</div><b style={{ fontSize: 22 }}>{data.fail_24h}</b></div>
            <div style={tile}><div className="ui-lbl">Unlocked, last 24h</div><b style={{ fontSize: 22 }}>{data.ok_24h}</b></div>
            <div style={tile}><div className="ui-lbl">Last failure</div><b style={{ fontSize: 14 }}>{data.last_fail ? ago(data.last_fail) : 'none'}</b></div>
          </div>
          <div className="ui-tools">
            <select className="neu-input" style={{ flex: '0 1 180px' }} value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Show">
              <option value="failed">Failed only</option>
              <option value="all">Failed and successful</option>
            </select>
          </div>
          {!rows.length && <div className="table-wrap"><EmptyState title={only === 'failed' ? 'No failed attempts' : 'No attempts yet'} hint="Attempts are recorded from the moment the security SQL was installed." /></div>}
          {rows.length > 0 && (
            <div className="table-wrap">
              <table className="neu-table stack">
                <thead><tr><th>When</th><th>Result</th><th>Device</th><th>IP</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label="When">{dateTime(r.at)}<div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{ago(r.at)}</div></td>
                      <td data-label="Result"><span className={'neu-badge ' + (r.ok ? 'badge-approved' : 'badge-rejected')}>{r.ok ? 'Unlocked' : 'Wrong PIN'}</span></td>
                      <td data-label="Device">{deviceOf(r.user_agent)}</td>
                      <td data-label="IP"><code style={{ fontSize: 11 }}>{r.ip || '—'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <ConfirmDialog open={ask !== null} title="Delete old attempts?"
        message="Deletes entries older than 30 days. This cannot be undone." confirmText="Delete" danger busy={busy} onConfirm={clear} onCancel={() => setAsk(null)} />
    </>
  );
}
