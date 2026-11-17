import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { xrpc } from '../lib/xrpc.js';
import { CATS, pushSupported, currentToken, enablePush, disablePush } from './pushClient.js';

const dim = { fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 };

export default function AdminPushCard() {
  const { show } = useToast();
  const sup = pushSupported();
  const [st, setSt] = useState(null);
  const [email, setEmail] = useState('');
  const [cats, setCats] = useState({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const t = await currentToken();
    try {
      const s = await xrpc('adm_push_status', { p_token: t });
      setSt({ ...s, token: t });
      if (s && s.email) setEmail(s.email);
      setCats((s && s.categories) || {});
    } catch (e) { setSt({ error: e.message || String(e) }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const on = !!(st && st.registered);
  const run = async (name, fn, okMsg) => {
    setBusy(name);
    try { await fn(); if (okMsg) show(okMsg, 'success'); await load(); }
    catch (e) { show(e.message || String(e), 'error'); }
    setBusy('');
  };
  const toggle = (checked) => run('toggle', async () => {
    if (checked) {
      if (!email.trim()) throw new Error('Enter the XMARKET account email that receives admin alerts.');
      await enablePush(email.trim());
    } else {
      await disablePush();
    }
  }, checked ? 'Push alerts are on for this device' : 'Push alerts are off for this device');
  const saveCats = () => run('save', () => xrpc('adm_push_prefs_set', { p_token: st.token, p_categories: cats }), 'Alert choices saved');
  const test = () => run('test', () => xrpc('adm_push_test', { p_token: st.token }), 'Test sent. It should arrive in a few seconds.');

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Admin push notifications</div>
      <div style={{ ...dim, marginBottom: 12 }}>Get a push on this phone when something needs you, such as a top-up waiting for approval.</div>
      {!sup && <div className="ui-err" role="alert">This browser cannot receive push. Use Chrome on Android over HTTPS.</div>}
      {sup && !st && <div style={dim}>Loading…</div>}
      {sup && st && st.error && <div className="ui-err" role="alert">{st.error}</div>}
      {sup && st && !st.error && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div className="ui-lbl">XMARKET account that receives alerts</div>
            <input className="neu-input" type="email" inputMode="email" placeholder="account@example.com" value={email} disabled={on} onChange={(e) => setEmail(e.target.value)} />
            <div style={{ ...dim, marginTop: 4 }}>Best to use an account you only use for admin alerts. On your personal account, its XMARKET notifications will also show on this device.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, marginBottom: 12 }}>
            <input type="checkbox" style={{ width: 18, height: 18 }} checked={on} disabled={busy !== ''} onChange={(e) => toggle(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Push alerts on this device ({on ? 'on' : 'off'})</span>
          </label>
          {on && (
            <>
              <div className="ui-lbl">Send me alerts for</div>
              {CATS.map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 34 }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} checked={cats[k] !== false} onChange={(e) => setCats({ ...cats, [k]: e.target.checked })} />
                  <span style={{ fontSize: 14 }}>{label}</span>
                </label>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn variant="primary" loading={busy === 'save'} disabled={busy !== ''} onClick={saveCats}>Save alerts</Btn>
                <Btn loading={busy === 'test'} disabled={busy !== ''} onClick={test}>Send test</Btn>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
