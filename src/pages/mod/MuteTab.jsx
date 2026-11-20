import React, { useCallback, useEffect, useState } from 'react';
import { call, card, inp, Btn } from './shared.jsx';
import { dateTime } from '../../lib/format.js';

const DUR = [['10', '10 minutes'], ['60', '1 hour'], ['1440', '24 hours'], ['10080', '7 days'], ['', 'Permanent']];

export default function MuteTab() {
  const [rows, setRows] = useState(null);
  const [user, setUser] = useState('');
  const [mins, setMins] = useState('60');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await call('mod_mutes_list'); setRows(Array.isArray(d) ? d : []); } catch (e) { setRows([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const mute = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { await call('mod_mute', { p_user: user.trim(), p_minutes: mins === '' ? null : Number(mins), p_reason: reason || null }); setMsg('User muted.'); setUser(''); setReason(''); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const unmute = async (id) => { try { await call('mod_unmute', { p_id: id }); await load(); } catch (e) { setErr(e.message); } };
  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <b>Mute or timeout a user</b>
        <p style={{ fontSize: 12, color: '#8a93a3', margin: '4px 0 8px' }}>Blocks Global Chat and public comments. Find the user by email, @username or user ID.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="email, @username or ID" style={{ ...inp, flex: 1 }} />
          <select value={mins} onChange={(e) => setMins(e.target.value)} style={inp}>{DUR.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" style={{ ...inp, flex: 1 }} />
          <Btn disabled={busy || !user.trim()} onClick={mute}>Mute</Btn>
        </div>
        {err && <p style={{ color: '#DC2626' }}>{err}</p>}
        {msg && <p style={{ color: '#059669' }}>{msg}</p>}
      </div>
      <b>Active mutes</b>
      {!rows && <div style={{ ...card, marginTop: 8 }}>Loading...</div>}
      {rows && rows.length === 0 && <div style={{ ...card, marginTop: 8, textAlign: 'center', color: '#8a93a3' }}>Nobody is muted.</div>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ ...card, marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <b>@{r.username || 'user'}</b> <span style={{ color: '#8a93a3', fontSize: 12 }}>{r.email}</span>
            <div style={{ fontSize: 12, color: '#8a93a3' }}>{r.until ? 'Until ' + dateTime(r.until) : 'Permanent'}{r.reason ? ' · ' + r.reason : ''}</div>
          </div>
          <Btn onClick={() => unmute(r.id)} style={{ padding: '4px 10px', fontSize: 11 }}>Unmute</Btn>
        </div>
      ))}
    </div>
  );
}
