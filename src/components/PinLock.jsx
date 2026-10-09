import React, { useState } from 'react';
import { Delete } from 'lucide-react';

const PIN = '1010';

export default function PinLock({ onUnlock }) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);

  const press = (d) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN) onUnlock();
        else { setError(true); setTimeout(() => { setError(false); setDigits(''); }, 500); }
      }, 150);
    }
  };

  return (
    <div className="pin-lock">
      <div className={'pin-box' + (error ? ' shake' : '')}>
        <div style={{ width:72, height:72, borderRadius:22, margin:'0 auto 20px',
          background:'linear-gradient(135deg,#3B82F6,#2563EB)', display:'flex',
          alignItems:'center', justifyContent:'center', color:'#fff',
          boxShadow:'8px 8px 20px rgba(37,99,235,0.35), -6px -6px 16px rgba(255,255,255,0.9)' }}>
          <span style={{ fontSize: 34, lineHeight: 1 }}>👨‍💻</span>
        </div>
        <h2 style={{ fontSize:22, fontWeight:900 }}>XADMIN</h2>
        <p style={{ fontSize:12.5, color:'var(--text-dim)', marginTop:4 }}>Enter access PIN</p>
        <div className="pin-dots">
          {[0,1,2,3].map((i) => (
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
