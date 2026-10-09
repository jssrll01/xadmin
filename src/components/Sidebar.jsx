import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Wallet, Gift, RotateCcw,
  AlertTriangle, Store, CreditCard, Ticket, Layers, Bot, Settings, LogOut, X
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/topups', label: 'Top-ups', icon: Wallet },
  { to: '/returns', label: 'Returns', icon: RotateCcw },
  { to: '/reports', label: 'Reports', icon: AlertTriangle },
  { to: '/sellers', label: 'Sellers', icon: Store },
  { to: '/wallet', label: 'Wallet txns', icon: CreditCard },
  { to: '/xcards', label: 'Xcards', icon: Ticket },
  { to: '/promos', label: 'Promo codes', icon: Gift },
  { to: '/bundles', label: 'Bundles', icon: Layers },
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose, onLock }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">X</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.2 }}>XADMIN</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 1 }}>XMARKET Console</div>
        </div>
        <button onClick={onClose} className="neu-btn neu-btn-ghost" style={{ padding: 6, borderRadius: 10, display: 'none' }}>
          <X size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            onClick={onClose}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button onClick={onLock} className="nav-item" style={{ marginTop: 12, color: 'var(--danger)' }}>
          <LogOut size={18} />
          <span>Lock console</span>
        </button>
      </nav>
    </aside>
  );
}
