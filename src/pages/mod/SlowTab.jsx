import React, { useEffect, useState } from 'react';
import { call, card, inp, Btn } from './shared.jsx';

export default function SlowTab() {
  const [on, setOn] = useState(false);
  const [secs, setSecs] = useState(10);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    call('mod_settings_get').then((d) => { setOn(!!d.slow_on); setSecs(d.slow_secs || 10); setReady(true); }).catch((e) => setErr(e.message));
  }, []);
  const save = async (nextOn) => {
    setMsg(''); setErr('');
    try { await call('mod_slow_set', { p_on: nextOn, p_secs: Number(secs) || 10 }); setOn(nextOn); setMsg(nextOn ? 'Slow mode is ON.' : 'Slow mode is OFF.'); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div style={card}>
      <b>Global Chat slow mode</b>
      <p style={{ fontSize: 12, color: '#8a93a3', margin: '4px 0 12px' }}>Each user can send one message per interval. It is enforced in the database. Your existing anti-spam limits still apply on top.</p>
      {!ready && !err && <p>Loading...</p>}
      {ready && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>1 message every</span>
          <select value={secs} onChange={(e) => setSecs(Number(e.target.value))} style={inp}>
            {[3, 5, 10, 15, 30, 60, 120, 300].map((s) => <option key={s} value={s}>{s} seconds</option>)}
          </select>
          <Btn onClick={() => save(true)} style={{ outline: on ? '2px solid #2563EB' : 'none' }}>{on ? 'Update' : 'Turn ON'}</Btn>
          {on && <Btn onClick={() => save(false)}>Turn OFF</Btn>}
        </div>
      )}
      {ready && <p style={{ marginTop: 12, fontWeight: 800, color: on ? '#DC2626' : '#059669' }}>{on ? 'Slow mode is ON' : 'Slow mode is OFF'}</p>}
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      {msg && <p style={{ color: '#059669' }}>{msg}</p>}
    </div>
  );
}
