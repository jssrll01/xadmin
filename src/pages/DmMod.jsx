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

export default function DmMod() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const d = await call('admin_dm_thanks_list', { p_limit: 300 }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm('Delete this thank-you message?')) return;
    setBusy(true);
    try { const r = await call('admin_dm_thanks_delete', { p_id: id }); if (r && r.ok === false) setErr(r.error); else { setErr(''); await load(); } } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>DM Moderation</h2>
      <div style={{ fontSize: 12, opacity: .6, marginBottom: 12 }}>Red packet thank-you messages. DMs are deleted automatically after 24 hours. Typing and Seen status need no moderation and are cleared by the same 24 hour cleanup.</div>
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ opacity: .6, padding: 20 }}>No thank-you messages.</div>}
      {rows && rows.map((r) => (
        <div key={r.id} style={card}>
          <div style={{ fontSize: 13 }}><b>@{r.sender}</b> → @{r.receiver}{r.amount != null && <span style={{ opacity: .7 }}> · packet ₱{Number(r.amount).toLocaleString('en-PH')}</span>}</div>
          <div style={{ fontSize: 13, margin: '4px 0', wordBreak: 'break-word' }}>{r.body}</div>
          <div style={{ fontSize: 11, opacity: .6 }}>{dateTime(r.created_at)}</div>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626', marginTop: 8 }} disabled={busy} onClick={() => del(r.id)}>delete</button>
        </div>
      ))}
    </div>
  );
}
