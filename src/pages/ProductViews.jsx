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
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };

export default function ProductViews() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState('');

  const load = useCallback(async () => {
    try { const d = await call('admin_product_views', { p_limit: 200 }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, args, ask) => {
    if (!window.confirm(ask)) return;
    setBusy(true); setMsg('');
    try {
      const r = await call(fn, args);
      if (r && r.ok === false) setErr(r.error); else { setErr(''); setMsg('Cleared ' + (r && r.deleted != null ? r.deleted : 0) + ' record(s).'); await load(); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Product Views</h2>
      <div style={{ fontSize: 12, opacity: .6, marginBottom: 12 }}>Counts come from each user's last 50 viewed products.</div>
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="User email or ID" style={{ padding: 8, borderRadius: 10, flex: 1, minWidth: 180 }} />
        <button className="neu-btn" style={{ padding: '8px 14px', color: '#DC2626' }} disabled={busy || !user.trim()} onClick={() => run('admin_product_views_clear_user', { p_user: user.trim() }, 'Clear the whole viewing history of this user?')}>Clear user history</button>
      </div>
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: '#059669', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ opacity: .6, padding: 20 }}>No views yet.</div>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ wordBreak: 'break-word' }}>{r.name}</b>
            <div style={{ fontSize: 12, opacity: .7 }}>{r.views} views · {r.viewers} users · last {dateTime(r.last_view)}</div>
          </div>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => run('admin_product_views_clear_product', { p_product: r.id }, 'Clear all view records of this product?')}>clear</button>
        </div>
      ))}
    </div>
  );
}
