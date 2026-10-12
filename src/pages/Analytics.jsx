import React, { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import { peso, pesoShort } from '../lib/format.js';
import {
  fetchRevenueByPeriod,
  fetchTopSellingProducts,
  fetchRevenueSnapshot,
} from '../lib/api.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { TrendingUp, ShoppingBag, Calendar, Award } from 'lucide-react';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

export default function Analytics() {
  const [period, setPeriod] = useState('monthly');
  const [series, setSeries] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [seriesRes, snapRes, topRes] = await Promise.all([
        fetchRevenueByPeriod(period, 24),
        fetchRevenueSnapshot(),
        fetchTopSellingProducts(15),
      ]);
      // reverse so oldest is left-most on the chart
      setSeries((seriesRes.items || []).slice().reverse());
      setSnapshot(snapRes);
      setTopProducts(topRes.items || []);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000); // refresh every 30s

  const maxRevenue = Math.max(1, ...series.map((s) => Number(s.revenue) || 0));
  const totalInView = series.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
  const ordersInView = series.reduce((sum, s) => sum + Number(s.order_count || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Revenue, top products, growth</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <KPI
          icon={Calendar}
          label="Today"
          value={pesoShort(snapshot?.today || 0)}
          color="#10B981"
        />
        <KPI
          icon={TrendingUp}
          label="This week"
          value={pesoShort(snapshot?.thisWeek || 0)}
          color="#2563EB"
        />
        <KPI
          icon={Calendar}
          label="This month"
          value={pesoShort(snapshot?.thisMonth || 0)}
          color="#7C3AED"
        />
        <KPI
          icon={TrendingUp}
          label="This year"
          value={pesoShort(snapshot?.thisYear || 0)}
          color="#F59E0B"
        />
        <KPI
          icon={ShoppingBag}
          label="All time"
          value={pesoShort(snapshot?.allTime || 0)}
          color="#059669"
        />
      </div>

      {/* Period selector */}
      <Card style={{ marginBottom: 16, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={'neu-pill' + (period === p.id ? ' active' : '')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Revenue chart */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              Revenue — {PERIODS.find((p) => p.id === period)?.label.toLowerCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              Last {series.length} buckets · {ordersInView} orders
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Total in view
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--success)' }}>
              {peso(totalInView)}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
        ) : series.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
            No revenue in this period yet.
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              height: 180,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border)',
            }}>
              {series.map((s, i) => {
                const rev = Number(s.revenue) || 0;
                const heightPct = rev > 0 ? Math.max(4, (rev / maxRevenue) * 100) : 2;
                return (
                  <div
                    key={i}
                    title={`${s.bucket}: ${peso(rev)} (${s.order_count} orders)`}
                    style={{
                      flex: 1,
                      minWidth: 6,
                      height: `${heightPct}%`,
                      background: rev > 0
                        ? 'linear-gradient(180deg, #3B82F6, #2563EB)'
                        : 'var(--surface-in)',
                      borderRadius: 6,
                      transition: 'all 0.3s var(--ease)',
                    }}
                  />
                );
              })}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: 'var(--text-dim)',
              fontWeight: 700,
              letterSpacing: 0.4,
            }}>
              <span>{series[0]?.bucket}</span>
              <span>{series[series.length - 1]?.bucket}</span>
            </div>
          </>
        )}
      </Card>

      {/* Top Selling Products */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={16} color="var(--primary)" />
          <div style={{ fontSize: 15, fontWeight: 800 }}>Top selling products</div>
        </div>
        {topProducts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
            No sales data yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="neu-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Store</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.product_id || i}>
                    <td style={{ fontWeight: 900, color: i < 3 ? 'var(--primary)' : 'var(--text-dim)' }}>
                      {i + 1}
                    </td>
                    <td><b>{p.name}</b></td>
                    <td>{p.category || '—'}</td>
                    <td>{p.store || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{p.units_sold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                      {peso(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function KPI({ icon: Icon, label, value, color }) {
  return (
    <div className="stat">
      <div className="stat-icon" style={{ background: color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
