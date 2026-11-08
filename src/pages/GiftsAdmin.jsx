import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { dateTime } from '../lib/format.js';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GiftsAdmin() {
  const [rows, setRows] = useState(null);
  const [sum, setSum] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([call('admin_gifts_list', { p_limit: 300 }), call('admin_gifts_summary')]);
      setRows(Array.isArray(a) ? a : []); setSum(b); setErr('');
    } catch (e) { setRows([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, id, ask) => {
    if (!window.confirm(ask)) return;
    setBusy(true);
    try { const r = await call(fn, { p_id: id }); if (r && r.ok === false) setErr(r.error); else { setErr(''); await load(); } } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const t = q.trim().toLowerCase();
  const list = (rows || []).filter((g) => !t || (g.sender + ' ' + g.creator + ' ' + (g.target || '')).toLowerCase().includes(t));
  const stat = (l, v) => <div style={{ ...card, flex: '1 1 140px', marginBottom: 0 }}><div style={{ fontSize: 11, opacity: .7 }}>{l}</div><div style={{ fontWeight: 800, fontSize: 16 }}>{v}</div></div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Creator Gifts</h2>
      {sum && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {stat('Sent total', peso(sum.sent_total) + ' (' + sum.sent_count + ')')}
          {stat('Today (Manila)', peso(sum.today_total))}
          {stat('Refunded', peso(sum.refunded_total) + ' (' + sum.refunded_count + ')')}
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sender, creator or target" style={{ padding: 8, borderRadius: 10, minWidth: 220, marginBottom: 12 }} />
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && list.length === 0 && <div style={{ opacity: .6, padding: 20 }}>No gifts.</div>}
      {list.map((g) => (
        <div key={g.id} style={{ ...card, opacity: g.status === 'sent' ? 1 : 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b>{peso(g.amount)}</b>
            <span style={{ fontSize: 11, color: g.status === 'refunded' ? '#DC2626' : '#059669', fontWeight: 800 }}>{g.status.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 2 }}>@{g.sender} → @{g.creator}</div>
          <div style={{ fontSize: 12, opacity: .7, wordBreak: 'break-word' }}>{g.target_type}: {g.target || '(removed)'} · {dateTime(g.created_at)}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {g.status === 'sent' && <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_gift_refund', g.id, 'Refund ' + peso(g.amount) + ' to @' + g.sender + '? It leaves the creator balance.')}>refund</button>}
            {g.status === 'refunded' && <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_gift_delete', g.id, 'Delete this refunded gift record?')}>delete record</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
