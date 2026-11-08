import { getAdminPin } from '../lib/pin.js';
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { dateTime } from '../lib/format.js';

const CODE = getAdminPin();
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const COLORS = { pending: '#F59E0B', approved: '#10B981', rejected: '#DC2626', suspended: '#6B7280' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', color: '#8a93a3', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid rgba(0,0,0,.06)', verticalAlign: 'top' };

export default function CreatorApps() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await call('admin_creator_apps_list', { p_status: filter || null }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
    setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (r, status) => {
    let note = null;
    if (status === 'rejected' || status === 'suspended') { note = window.prompt('Reason (shown to the applicant):', ''); if (note === null) return; }
    else if (!window.confirm(`Mark ${r.username} as ${status}?`)) return;
    setBusy(true);
    try { await call('admin_creator_app_set', { p_id: r.id, p_status: status, p_note: note }); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const next = { pending: ['approved', 'rejected'], approved: ['suspended'], rejected: ['approved'], suspended: ['approved'] };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Creator Applications</h2>
      <style>{'@keyframes xsk{0%,100%{opacity:.4}50%{opacity:1}}'}</style>
      <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 10, marginBottom: 12 }}>
        <option value="">All</option>
        {Object.keys(COLORS).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Submitted', 'Creator', 'Contact', 'Code', 'Status', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {loading && [0, 1, 2, 3].map(i => <tr key={'sk'+i}><td style={td} colSpan={6}><div style={{ height: 16, borderRadius: 8, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' }} /></td></tr>)}
            {!loading && rows.length === 0 && <tr><td style={{ ...td, textAlign: 'center' }} colSpan={6}>No applications.</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.id}>
                <td style={td}>{dateTime(r.submitted_at)}</td>
                <td style={td}><b>{r.username}</b><br />{r.first_name} {r.last_name}</td>
                <td style={td}>{r.email}<br />{r.phone}</td>
                <td style={td}>{r.referral_code || '—'}</td>
                <td style={td}><span style={{ color: '#fff', background: COLORS[r.status], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{r.status}</span>{r.admin_note && <div style={{ fontSize: 11, color: '#8a93a3' }}>{r.admin_note}</div>}</td>
                <td style={td}>{(next[r.status] || []).map(s => <button key={s} disabled={busy} className="neu-btn" onClick={() => setStatus(r, s)} style={{ padding: '4px 9px', fontSize: 11, marginRight: 4 }}>{s}</button>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// SKELETON_DONE
