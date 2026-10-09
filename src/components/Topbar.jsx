import React from 'react';
import { Menu, Lock, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ onMenu, onLock, title }) {
  const nav = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
      padding: '12px 16px', borderRadius: 16,
      background: 'var(--surface)', boxShadow: 'var(--neu-raised)',
    }}>
      <button className="neu-btn neu-btn-ghost" onClick={onMenu} style={{ padding: 10, borderRadius: 12, display: 'none' }}>
        <Menu size={18} />
      </button>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-dim)' }}>{title}</div>
      <button className="neu-btn neu-btn-ghost" style={{ padding: 10, borderRadius: 12 }} onClick={() => nav('/reports')}>
        <Bell size={18} />
      </button>
      <button className="neu-btn neu-btn-ghost" style={{ padding: 10, borderRadius: 12 }} onClick={onLock}>
        <Lock size={18} />
      </button>
    </div>
  );
}
