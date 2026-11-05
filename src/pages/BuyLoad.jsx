import React, { useCallback, useEffect, useState } from 'react';
import { xmSupabase } from '../supabase.js';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';

const PIN = import.meta.env.VITE_XADMIN_PIN;
const actor = () => sessionStorage.getItem('xadmin_actor') || 'admin';
async function rpc(fn, args) {
  const { data, error } = await xmSupabase.rpc(fn, { p_pin: PIN, ...args });
  if (error) throw error;
  return data;
}
const STATUSES = ['processing', 'completed', 'cancelled'];

export default function BuyLoad() {
  const { show } = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setErr(''); setD(await rpc('xload_admin_list', { p_status: status || null, p_search: q || null, p_limit: 100 })); }
    catch (e) { setErr(e.message || 'Load failed'); }
  }, [status, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const change = async (row, next) => {
    if (next === row.status || busy) return;
    if (!window.confirm('Change ' + row.mobile + ' (' + row.network + ', ₱' + row.amount + ') from ' + row.status + ' to ' + next + '?')) return;
    setBusy(row.id);
    try { await rpc('xload_admin_set_status', { p_actor: actor(), p_id: row.id, p_status: next }); show('Status updated', 'success'); await load(); }
    catch (e) { show(e.message || 'Failed', 'error'); }
    setBusy('');
  };

  if (err) return <Card><div style={{ color: '#b42323', marginBottom: 10 }}>{err}</div><Btn onClick={load}>Retry</Btn></Card>;
  const rows = d ? d.rows : [];
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#8a93a3', whiteSpace: 'nowrap' };
  const td = { padding: '8px 10px', fontSize: 13, whiteSpace: 'nowrap' };
  return (
    <>
      <div className="page-head"><div><h1>Buy Load</h1><p>Mobile load orders and their status</p></div></div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {['', ...STATUSES].map((s) => (
          <Btn key={s || 'all'} variant={status === s ? 'primary' : undefined} onClick={() => setStatus(s)}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}{d && s ? ' (' + (d.counts[s] || 0) + ')' : ''}</Btn>
        ))}
        <input className="neu-input" style={{ flex: 1, minWidth: 180 }} placeholder="Search mobile, network or user id" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn onClick={load}>Refresh</Btn>
      </div>
      <Card style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>{['Date', 'User', 'Network', 'Mobile', 'Amount', 'Status'].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={td}>{String(r.user_id).slice(0, 8)}</td>
                <td style={td}>{r.network}</td>
                <td style={td}>{r.mobile}</td>
                <td style={td}>₱{Number(r.amount).toLocaleString()}</td>
                <td style={td}>
                  <select className="neu-input" style={{ padding: '6px 8px' }} value={r.status} disabled={busy === r.id} onChange={(e) => change(r, e.target.value)}>
                    {[...new Set([r.status, ...STATUSES])].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {d && !rows.length && <tr><td style={td} colSpan={6}>No load orders found.</td></tr>}
            {!d && <tr><td style={td} colSpan={6}>Loading…</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
