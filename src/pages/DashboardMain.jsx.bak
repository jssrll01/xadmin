import React, { useState, useCallback } from 'react';
import { TrendingUp, ShoppingBag, Users, Package, Wallet, AlertTriangle, FileText, Star } from 'lucide-react';
import { fetchStats, fetchSoldOutProducts, fetchReceiptsStats, fetchReviewsStats } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [soldOutItems, setSoldOutItems] = useState([]);
  const [receiptStats, setReceiptStats] = useState({ total: 0, paid: 0, revenue: 0 });
  const [reviewStats, setReviewStats] = useState({ total: 0, avg: 0 });

  const load = useCallback(async () => {
    const s = await fetchStats();
    setStats(s);
  }, []);

  useAutoRefresh(load, 1000);
  useAutoRefresh(async () => {
    const [r, v] = await Promise.all([fetchReceiptsStats(), fetchReviewsStats()]);
    setReceiptStats(r || { total: 0, paid: 0, revenue: 0 });
    setReviewStats(v || { total: 0, avg: 0 });
  }, 5000);
  useAutoRefresh(async () => {
    const { items } = await fetchSoldOutProducts();
    setSoldOutItems(Array.isArray(items) ? items : []);
  }, 3000);

  const s = stats || { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  const cards = [
    { icon: TrendingUp, value: pesoShort(s.revenue), label: 'Revenue', color: '#10B981' },
    { icon: ShoppingBag, value: s.orders, label: 'Orders', color: '#2563EB' },
    { icon: Users, value: s.users, label: 'Users', color: '#7C3AED' },
    { icon: Package, value: s.products, label: 'Products', color: '#F59E0B' },
    { icon: Wallet, value: s.pendingTopups, label: 'Pending top-ups', color: '#059669' },
    { icon: AlertTriangle, value: s.openReports, label: 'Open reports', color: '#EF4444' },
    { icon: TrendingUp, value: soldOutItems.length, label: 'Sold out', color: '#DC2626' },
    { icon: FileText, value: receiptStats.total, label: 'Quotations', color: '#0EA5E9' },
    { icon: Star, value: reviewStats.total, label: 'Reviews', color: '#EAB308' },
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
      <div className="neu-card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Revenue (total)</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>{peso(s.revenue)}</div>
      </div>

      {soldOutItems.length > 0 && (
        <div className="neu-card">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
            🚨 Sold-out products ({soldOutItems.length})
          </div>
          <div className="table-wrap">
            <table className="neu-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Store</th>
                  <th>Price</th>
                  <th>Sold</th>
                </tr>
              </thead>
              <tbody>
                {soldOutItems.slice(0, 20).map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td>{p.category || '—'}</td>
                    <td>{p.store || '—'}</td>
                    <td>{peso(p.price || 0)}</td>
                    <td>{p.sold ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
