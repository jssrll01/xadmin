import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Wallet, RotateCcw,
  AlertTriangle, Store, CreditCard, Gift, Boxes, Settings as Cog, ScrollText, Bell, BarChart3, FileText, Star, Gamepad2, Image as ImageIcon, Percent,
} from 'lucide-react';

const items = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/users', 'Users', Users],
  ['/products', 'Products', Package],
  ['/orders', 'Orders', ShoppingBag],
  ['/topups', 'Top-ups', Wallet],
  ['/wallet', 'Wallet', Wallet],
  ['/returns', 'Returns', RotateCcw],
  ['/quotations', 'Quotations', FileText],
  ['/reviews', 'Reviews', Star],
  ['/reports', 'Reports', AlertTriangle],
  ['/shops', 'Shops', Store],
  ['/stores', 'Stores', Store],
  ['/play-time', 'Play Time', Gamepad2],
  ['/airdrop', 'Airdrop 88', Gamepad2],
  ['/banners', 'Banner', ImageIcon],
  ['/xcards', 'Xcards', CreditCard],
  ['/promos', 'Promos', Gift],
  ['/bundles', 'Bundles', Boxes],
  ['/notifications', 'Notifications', Bell],
  ['/supplier', 'Supplier', Boxes],
  ['/notify', 'Notify', Bell],
  ['/upload', 'Upload photos', ImageIcon],
  ['/airdrop-mod', 'Airdrop Mod', Gamepad2],
  ['/audit', 'Audit log', ScrollText],
  ['/pricing', 'Pricing', Percent],
  ['/settings', 'Settings', Cog],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" style={{
          background: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 11,
          boxShadow: '4px 4px 10px rgba(37,99,235,0.35), -3px -3px 8px rgba(255,255,255,0.9)',
        }}>
          X
        </div>
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
