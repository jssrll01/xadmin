import React, { useState, useEffect, useRef } from 'react';
import { Delete, Check } from 'lucide-react';
import { xmSupabase } from '../supabase.js';
import { setAdminPin, verifyPin } from '../lib/pin.js';

const SESSION_KEY = 'xadmin_unlocked';
const ACTOR_KEY = 'xadmin_actor';
const SESSION_TTL_MS = Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000); // default 15 min
const MAX_LEN = 12;

// NFC card: read #pin=XXXX once at load, then wipe it from the address bar
let CARD_PIN = '';
try {
  const m = /^#pin=(\d{4,12})$/.exec(window.location.hash);
  if (m) {
    CARD_PIN = m[1];
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
} catch (e) {}

export default function PinLock({ onUnlock }) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

  const submit = async (pin) => {
    if (working.current || !pin) return;
    working.current = true;
    setBusy(true);
    let ok = false;
    try { ok = await verifyPin(xmSupabase, pin); } catch (e) { ok = false; }
    if (ok) {
      setAdminPin(pin);
      sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_TTL_MS));
      sessionStorage.setItem(ACTOR_KEY, import.meta.env.VITE_XADMIN_ACTOR || 'admin');
      onUnlock();
      return;
    }
    setError(true);
    setTimeout(() => { setError(false); setDigits(''); working.current = false; setBusy(false); }, 500);
  };

  useEffect(() => {
    if (CARD_PIN) { const p = CARD_PIN; CARD_PIN = ''; submit(p); }
  }, []); // eslint-disable-line

  const press = (d) => setDigits((cur) => (working.current || cur.length >= MAX_LEN ? cur : cur + d));
  const back = () => setDigits((cur) => (working.current ? cur : cur.slice(0, -1)));

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') submit(digits);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [digits]); // eslint-disable-line

  return (
    <div className="pin-lock">
      <div className={'pin-box' + (error ? ' shake' : '')}>
        <div style={{ width:72, height:72, borderRadius:22, margin:'0 auto 20px',
          background:'linear-gradient(135deg,#3B82F6,#7C3AED)', display:'flex',
          alignItems:'center', justifyContent:'center', color:'#fff',
          boxShadow:'8px 8px 20px rgba(37,99,235,0.35), -6px -6px 16px rgba(255,255,255,0.9)' }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: "#fff" }}>X</span>
        </div>
        <h2 style={{ fontSize:22, fontWeight:900 }}>XADMIN</h2>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', marginTop:4 }}>{busy && !error ? 'Checking…' : 'Enter access PIN, then tap ✓'}</p>
        <div className="pin-dots">
          {Array.from({ length: Math.max(6, digits.length) }, (_, i) => i).map((i) => (
            <div key={i} className={'pin-dot' + (i < digits.length ? ' filled' : '')} />
          ))}
        </div>
        {error && <div style={{ fontSize:12.5, color:'var(--danger)', fontWeight:700, marginBottom:8 }}>Incorrect PIN</div>}
        <div className="pin-keypad">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} className="pin-key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <button className="pin-key action" onClick={back} aria-label="Delete"><Delete size={20} /></button>
          <button className="pin-key" onClick={() => press('0')}>0</button>
          <button className="pin-key action" onClick={() => submit(digits)} disabled={busy || !digits} aria-label="Unlock"><Check size={20} /></button>
        </div>
      </div>
    </div>
  );
}
