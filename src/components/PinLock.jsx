import React, { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

const PIN = import.meta.env.VITE_XADMIN_PIN;
const PIN_LEN = (PIN || '').length || 4;
const SESSION_KEY = 'xadmin_unlocked';
const ACTOR_KEY = 'xadmin_actor';
const SESSION_TTL_MS = Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000); // default 15 min

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

  useEffect(() => {
    if (CARD_PIN && PIN && CARD_PIN === PIN) {
      CARD_PIN = '';
      sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_TTL_MS));
      sessionStorage.setItem(ACTOR_KEY, import.meta.env.VITE_XADMIN_ACTOR || 'admin');
      onUnlock();
    }
  }, []);

  const press = (d) => {
    if (digits.length >= PIN_LEN) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === PIN_LEN) {
      setTimeout(() => {
        if (next === PIN) {
          sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_TTL_MS));
          sessionStorage.setItem(ACTOR_KEY, import.meta.env.VITE_XADMIN_ACTOR || 'admin');
          onUnlock();
        }
        else { setError(true); setTimeout(() => { setError(false); setDigits(''); }, 500); }
      }, 150);
    }
  };

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
        <p style={{ fontSize:12.5, color:'var(--text-dim)', marginTop:4 }}>Enter access PIN</p>
        <div className="pin-dots">
          {Array.from({ length: PIN_LEN }, (_, i) => i).map((i) => (
            <div key={i} className={'pin-dot' + (i < digits.length ? ' filled' : '')} />
          ))}
        </div>
        {error && <div style={{ fontSize:12.5, color:'var(--danger)', fontWeight:700, marginBottom:8 }}>Incorrect PIN</div>}
        <div className="pin-keypad">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} className="pin-key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <button className="pin-key action" onClick={() => setDigits(d => d.slice(0,-1))}><Delete size={20} /></button>
          <button className="pin-key" onClick={() => press('0')}>0</button>
          <button className="pin-key action" style={{ opacity: 0 }} />
        </div>
      </div>
    </div>
  );
}
