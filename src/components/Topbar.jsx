import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Lock, Sun, Moon } from 'lucide-react';
import InstallButton from './InstallButton.jsx';

export default function Topbar() {
  const loc = useLocation();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const title =
    loc.pathname === '/' ? 'Dashboard' :
    loc.pathname.replace('/', '').replace('-', ' ').replace(/^\w/, c => c.toUpperCase());
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('xadmin_theme', next); } catch (e) { /* storage blocked */ }
    setTheme(next);
  };
  return (
    <div className="topbar">
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dim)' }}>{title}</div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginLeft: 'auto' }}>
        <InstallButton />
        <button type="button" className="xa-icon-btn" onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={theme === 'dark'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Bell size={18} style={{ color: 'var(--text-dim)' }} />
        <Lock size={18} style={{ color: 'var(--text-dim)' }} />
      </div>
    </div>
  );
}
