import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useYlTables } from '../yuelin/useYlTables.js';
import { useAdminContext } from '../context/AdminContext';
import {
  LayoutDashboard, Users, Package, ShoppingBag, Wallet, RotateCcw,
  AlertTriangle, Store, CreditCard, Gift, Boxes, Settings as Cog, ScrollText, Bell, BarChart3, FileText, Star, Gamepad2, Image as ImageIcon, Percent, Radio, ClipboardList, QrCode, Truck, Crown, Database,
} from 'lucide-react';

const XMARKET_ITEMS = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/daily', 'Daily Tasks & Notes', ClipboardList],
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
  ['/airdrop-mod', 'Airdrop Mod', Gamepad2],
  ['/audit', 'Audit log', ScrollText],
  ['/pricing', 'Pricing', Percent],
  ['/cashback', 'Cashback & Costs', Percent],
  ['/bulk-products', 'Bulk Product Manager', Percent],
  ['/nfc', 'NFC Studio', Radio],
  ['/qr-portal', 'QR Portal', QrCode],
  ['/logistics', 'Logistics', Truck],
  ['/settings', 'Settings', Cog],
];

const YUELIN_ITEMS = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/products', 'Products', Package],
  ['/promos', 'Offers', Gift],
  ['/qr-portal', 'Redeem Codes', QrCode],
  ['/vip', 'VIP Applications', Crown],
  ['/settings', 'Settings', Cog],
];

const seg = (on, color) => ({
  flex: 1, padding: '8px 10px', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', color: on ? color : '#8a93a3', background: on ? 'var(--bg, #e0e5ec)' : 'transparent',
  boxShadow: on ? '4px 4px 8px rgba(163,177,198,0.6), -4px -4px 8px rgba(255,255,255,0.7)' : 'none',
  transition: 'all 0.25s ease',
});

export default function Sidebar() {
  const { activeSystem, setActiveSystem } = useAdminContext();
  const nav = useNavigate();
  const yl = useYlTables(activeSystem === 'YUELIN');
  const items = activeSystem === 'YUELIN'
    ? [['/', 'Dashboard', LayoutDashboard], ...yl.tables.map((t) => ['/yl/' + encodeURIComponent(t.name), t.label, Database])]
    : XMARKET_ITEMS;
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
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>{activeSystem}</div>
        </div>
      </div>
      <div style={{ display: 'flex', padding: 5, margin: '0 0 14px', borderRadius: 16, background: 'var(--bg, #e0e5ec)', boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.7)' }}>
        <button type="button" onClick={() => { setActiveSystem('XMARKET'); nav('/'); }} style={seg(activeSystem === 'XMARKET', '#2563EB')}>XMARKET</button>
        <button type="button" onClick={() => { setActiveSystem('YUELIN'); nav('/'); }} style={seg(activeSystem === 'YUELIN', '#b8860b')}>YUELIN</button>
      </div>
      <nav key={activeSystem} className={'sidebar-nav' + (activeSystem === 'YUELIN' ? ' yl-nav' : '')}>
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
