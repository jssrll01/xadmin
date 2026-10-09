import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Lock } from 'lucide-react';

export default function Topbar() {
  const loc = useLocation();
  const title =
    loc.pathname === '/' ? 'Dashboard' :
    loc.pathname.replace('/', '').replace('-', ' ').replace(/^\w/, c => c.toUpperCase());
  return (
    <div className="topbar">
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dim)' }}>{title}</div>
      <div style={{ display: 'flex', gap: 14 }}>
        <Bell size={18} style={{ color: 'var(--text-dim)' }} />
        <Lock size={18} style={{ color: 'var(--text-dim)' }} />
      </div>
    </div>
  );
}
