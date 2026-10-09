import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingBag, Wallet, RotateCcw,
  AlertTriangle, Store, CreditCard, Gift, Boxes, Bot, Settings as Cog } from 'lucide-react';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/users', 'Users', Users],
  ['/products', 'Products', Package],
  ['/orders', 'Orders', ShoppingBag],
  ['/topups', 'Top-ups', Wallet],
  ['/wallet', 'Wallet txns', Wallet],
  ['/returns', 'Returns', RotateCcw],
  ['/reports', 'Reports', AlertTriangle],
  ['/sellers', 'Sellers', Store],
  ['/xcards', 'Xcards', CreditCard],
  ['/promos', 'Promo codes', Gift],
  ['/bundles', 'Bundles', Boxes],
  ['/bots', 'Bots', Bot],
  ['/settings', 'Settings', Cog],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">X</div>
        <div>
          <div style={{ fontSize:14, fontWeight:900 }}>XADMIN</div>
          <div style={{ fontSize:10, color:'var(--text-dim)' }}>XMARKET Console</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
