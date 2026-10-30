import React, { useEffect, useState } from 'react';
import { api, getPin, setPin } from './ylApi.js';
import { S, ACCENT } from './ui.js';
import './anim.css';

export default function YlGate({ children }) {
  const [pin, setPinState] = useState(getPin());
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ENV_PIN = import.meta.env.VITE_XADMIN_PIN || '';
  const [auto, setAuto] = useState(!!ENV_PIN && !getPin());

  useEffect(() => {
    const h = () => setPinState(getPin());
    window.addEventListener('yl-pin-changed', h);
    return () => window.removeEventListener('yl-pin-changed', h);
  }, []);

  useEffect(() => {
    if (pin || !ENV_PIN) { setAuto(false); return undefined; }
    let dead = false;
    api.check(ENV_PIN).then((ok) => { if (dead) return; if (ok) setPin(ENV_PIN); else setAuto(false); }).catch(() => { if (!dead) setAuto(false); });
    return () => { dead = true; };
  }, [pin]);

  if (pin) return children;
  if (auto) return <div className="yl-page"><p style={S.sub}>Connecting to YUELIN...</p></div>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const ok = await api.check(val);
      if (ok) setPin(val); else setErr('Wrong PIN.');
    } catch (x) {
      setErr(/does not exist|schema cache/i.test(x.message || '') ? 'The YUELIN admin functions are not installed yet. Run the SQL step first.' : (x.message || String(x)));
    }
    setBusy(false);
  };

  return (
    <div className="yl-page" style={{ maxWidth: 380, margin: '8vh auto 0' }}>
      <form className="yl-card" style={{ ...S.card, textAlign: 'center' }} onSubmit={submit}>
        <h1 style={S.h1}>Unlock YUELIN</h1>
        <p style={S.sub}>Enter the YUELIN database PIN. It is kept only for this browser session.</p>
        <input style={{ ...S.input, marginTop: 18, textAlign: 'center', letterSpacing: 4 }} type="password" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="PIN" />
        {ENV_PIN && <div style={S.warn}>The Xadmin PIN did not match the YUELIN database PIN, so it could not unlock automatically.</div>}
        {err && <div style={S.err}>{err}</div>}
        <button type="submit" style={{ ...S.btn, color: ACCENT, marginTop: 16, width: '100%' }} disabled={busy || !val}>{busy ? 'Checking...' : 'Unlock'}</button>
      </form>
    </div>
  );
}
