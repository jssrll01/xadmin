import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Wallet, RotateCcw,
  AlertTriangle, Store, CreditCard, Gift, Boxes, Settings as Cog,
} from 'lucide-react';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/users', 'Users', Users],
  ['/products', 'Products', Package],
  ['/orders', 'Orders', ShoppingBag],
  ['/topups', 'Top-ups', Wallet],
  ['/wallet', 'Wallet', Wallet],
  ['/returns', 'Returns', RotateCcw],
  ['/reports', 'Reports', AlertTriangle],
  ['/shops', 'Shops', Store],
  ['/xcards', 'Xcards', CreditCard],
  ['/promos', 'Promos', Gift],
  ['/bundles', 'Bundles', Boxes],
  ['/settings', 'Settings', Cog],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">X</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.3 }}>XADMIN</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>XMARKET</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
