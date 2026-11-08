import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { Link } from 'react-router-dom';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };
const dt = (d) => new Date(d).toLocaleString();

export default function WalletSecurity() {
  const [tab, setTab] = useState('pins');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const fns = { pins: 'admin_pin_list', receipts: 'admin_receipts_list', rewards: 'admin_review_rewards_list' };

  const load = useCallback(async () => {
    try { const d = await call(fns[tab], { p_limit: 150 }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const reset = async (r) => {
    if (!window.confirm('Reset the Xwallet PIN of @' + (r.username || r.email) + '? They must set a new one.')) return;
    try { await call('admin_pin_reset', { p_user: r.user_id }); load(); } catch (e) { setErr(e.message); }
  };
  const del = async (r) => {
    if (!window.confirm('Delete receipt ' + r.receipt_no + '?')) return;
    try { await call('admin_receipt_delete', { p_id: r.id }); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Wallet Security</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['pins', 'PINs'], ['receipts', 'Receipts'], ['rewards', 'Review rewards']].map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: tab === id ? 1 : .6 }}>{l}</button>
        ))}
      </div>
      <Link to="/market-qa" className="neu-btn" style={{ ...sm, display: 'inline-block', textDecoration: 'none', marginBottom: 12 }}>Market purchases ›</Link>
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ opacity: .6, padding: 20 }}>Nothing here yet.</div>}
      {rows && tab === 'pins' && rows.map((r) => (
        <div key={r.user_id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>@{r.username || '—'}</b> <span style={{ fontSize: 12, opacity: .7 }}>{r.email}</span>
            <div style={{ fontSize: 11.5 }}>{r.locked_until && new Date(r.locked_until) > new Date() ? 'LOCKED until ' + dt(r.locked_until) : 'Failed tries: ' + r.failed} · set {dt(r.updated_at)}</div>
          </div>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => reset(r)}>Reset PIN</button>
        </div>
      ))}
      {rows && tab === 'receipts' && rows.map((r) => (
        <div key={r.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{r.receipt_no}</b> · {r.kind} · ₱{Number(r.total).toFixed(2)}
            <div style={{ fontSize: 11.5, opacity: .7 }}>@{r.username || '—'} → {r.counterparty || '—'} · fee ₱{Number(r.fee).toFixed(2)} · {dt(r.created_at)}</div>
          </div>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => del(r)}>Delete</button>
        </div>
      ))}
      {rows && tab === 'rewards' && rows.map((r, i) => (
        <div key={i} style={card}>
          <b>@{r.username || '—'}</b> earned ₱{Number(r.amount).toFixed(2)}
          <div style={{ fontSize: 11.5, opacity: .7 }}>review {String(r.review_id).slice(0, 8)} · {dt(r.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
