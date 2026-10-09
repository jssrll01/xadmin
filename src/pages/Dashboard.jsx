import React, { useState, useCallback } from 'react';
import { TrendingUp, ShoppingBag, Users, Package, Wallet, AlertTriangle } from 'lucide-react';
import { fetchStats } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    const s = await fetchStats();
    setStats(s);
  }, []);

  useAutoRefresh(load, 1000);

  const s = stats || { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  const cards = [
    { icon: TrendingUp, value: pesoShort(s.revenue), label: 'Revenue', color: '#10B981' },
    { icon: ShoppingBag, value: s.orders, label: 'Orders', color: '#2563EB' },
    { icon: Users, value: s.users, label: 'Users', color: '#7C3AED' },
    { icon: Package, value: s.products, label: 'Products', color: '#F59E0B' },
    { icon: Wallet, value: s.pendingTopups, label: 'Pending top-ups', color: '#059669' },
    { icon: AlertTriangle, value: s.openReports, label: 'Open reports', color: '#EF4444' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Overview · auto-refresh 1s</p>
        </div>
      </div>
      <div className="stat-grid">
        {cards.map(({ icon: Icon, value, label, color }) => (
          <div className="stat" key={label}>
            <div className="stat-icon" style={{ background: color }}>
              <Icon size={22} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="neu-card">
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Revenue (total)</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>{peso(s.revenue)}</div>
      </div>
    </>
  );
}
