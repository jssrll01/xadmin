import React, { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import { peso, pesoShort } from '../lib/format.js';
import {
  fetchRevenueByPeriod,
  fetchTopSellingProducts,
  fetchRevenueSnapshot,
  fetchReceiptsStats,
  fetchReviewsStats,
} from '../lib/api.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { TrendingUp, ShoppingBag, Calendar, Award, FileText, Star } from 'lucide-react';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];


/* ─── Pad a sparse series so every bucket in the window is present ─── */
function padSeries(items, period, count) {
  const now = new Date();
  const bucketKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (period === 'daily')   return `${y}-${m}-${day}`;
    if (period === 'weekly') {
      // ISO week — approximate: use the Monday of the week
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (dow - 1));
      return `${mon.getFullYear()}-W${String(Math.ceil((((mon - new Date(mon.getFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0')}`;
    }
    if (period === 'yearly')  return String(y);
    return `${y}-${m}`; // monthly
  };

  const buckets = [];
  const cur = new Date(now);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cur);
    if (period === 'daily')   d.setDate(cur.getDate() - i);
    if (period === 'weekly')  d.setDate(cur.getDate() - i * 7);
    if (period === 'monthly') d.setMonth(cur.getMonth() - i, 1);
    if (period === 'yearly')  d.setFullYear(cur.getFullYear() - i, 0, 1);
    buckets.push(bucketKey(d));
  }

  const map = {};
  items.forEach(it => { map[it.bucket] = it; });

  return buckets.map(b => map[b] || { bucket: b, revenue: 0, order_count: 0 });
}

export default function Analytics() {
  const [period, setPeriod] = useState('monthly');
  const [series, setSeries] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [receiptStats, setReceiptStats] = useState({ total: 0, paid: 0, unpaid: 0, pending: 0, overdue: 0, revenue: 0 });
  const [reviewStats, setReviewStats] = useState({ total: 0, avg: 0, fiveStar: 0, replied: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [seriesRes, snapRes, topRes] = await Promise.all([
        fetchRevenueByPeriod(period, 24),
        fetchRevenueSnapshot(),
        fetchTopSellingProducts(15),
      ]);
      // pad to full window so missing buckets render as zero-bars
      const bucketCount = period === 'daily' ? 30
        : period === 'weekly' ? 26
        : period === 'yearly' ? 5
        : 24;
      const padded = padSeries(seriesRes.items || [], period, bucketCount);
      setSeries(padded);
      setSnapshot(snapRes);
      setTopProducts(topRes.items || []);
      const [r, v] = await Promise.all([fetchReceiptsStats(), fetchReviewsStats()]);
      setReceiptStats(r);
      setReviewStats(v);
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
    
      {/* ─── QUOTATIONS ANALYTICS ─── */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#0EA5E9" /> Quotations
        </h2>
        <div className="stat-grid">
          <div className="stat"><div className="stat-icon" style={{ background: '#0EA5E9' }}><FileText size={22} /></div><div><div className="stat-value">{receiptStats.total}</div><div className="stat-label">Total receipts</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#10B981' }}><Award size={22} /></div><div><div className="stat-value">{receiptStats.paid}</div><div className="stat-label">Paid</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#F59E0B' }}><Calendar size={22} /></div><div><div className="stat-value">{receiptStats.unpaid}</div><div className="stat-label">Unpaid</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#3B82F6' }}><Calendar size={22} /></div><div><div className="stat-value">{receiptStats.pending}</div><div className="stat-label">Pending</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#EF4444' }}><Calendar size={22} /></div><div><div className="stat-value">{receiptStats.overdue}</div><div className="stat-label">Overdue</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#10B981' }}><TrendingUp size={22} /></div><div><div className="stat-value">{pesoShort(receiptStats.revenue)}</div><div className="stat-label">Paid revenue</div></div></div>
        </div>
      </div>

      {/* ─── REVIEWS ANALYTICS ─── */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={18} color="#EAB308" /> Reviews
        </h2>
        <div className="stat-grid">
          <div className="stat"><div className="stat-icon" style={{ background: '#EAB308' }}><Star size={22} /></div><div><div className="stat-value">{reviewStats.total}</div><div className="stat-label">Total reviews</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#F59E0B' }}><Star size={22} /></div><div><div className="stat-value">{reviewStats.avg}</div><div className="stat-label">Avg rating</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#10B981' }}><Award size={22} /></div><div><div className="stat-value">{reviewStats.fiveStar}</div><div className="stat-label">5-star</div></div></div>
          <div className="stat"><div className="stat-icon" style={{ background: '#3B82F6' }}><TrendingUp size={22} /></div><div><div className="stat-value">{reviewStats.replied}</div><div className="stat-label">Replied</div></div></div>
        </div>
      </div>
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
