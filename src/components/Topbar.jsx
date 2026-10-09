import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Lock } from 'lucide-react';

export default function Topbar() {
  const loc = useLocation();
  const title = loc.pathname === '/' ? 'dashboard' : loc.pathname.replace('/', '').split('/')[0];
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      marginBottom:20, padding:'12px 18px', background:'var(--surface)',
      borderRadius:14, boxShadow:'var(--neu-raised)' }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-dim)' }}>{title}</div>
      <div style={{ display:'flex', gap:14 }}>
        <Bell size={18} style={{ color:'var(--text-dim)' }} />
        <Lock size={18} style={{ color:'var(--text-dim)' }} />
      </div>
    </div>
  );
}
