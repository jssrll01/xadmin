import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Package, Wallet, AlertTriangle, FileText, Star, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchStats, fetchSoldOutProducts, fetchReceiptsStats, fetchReviewsStats, fetchRevenueSeries, fetchOrders, fetchTopUps, fetchReports } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';

const CSS = `
.dx-hero{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
.dx-split{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
@media(min-width:900px){.dx-hero{grid-template-columns:2fr 1fr}.dx-split{grid-template-columns:1fr 1fr}}
.dx-title{font-size:15px;font-weight:800;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.dx-pills{display:flex;gap:6px}
.dx-pill{border:0;padding:6px 11px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:#7A8499}
.dx-pill.on{background:#6366F1;color:#fff}
.dx-trend{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:800;padding:3px 8px;border-radius:20px}
.dx-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(150,160,180,.18);font-size:13px}
.dx-row:last-child{border-bottom:0}
.dx-sub{font-size:11px;color:#7A8499}
.dx-bar{height:8px;border-radius:6px;background:rgba(150,160,180,.2);overflow:hidden;margin-top:4px}
.dx-bar>i{display:block;height:100%;border-radius:6px}
.dx-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px}
.dx-act{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-radius:14px;text-decoration:none;color:inherit;font-weight:700;font-size:13px}
.dx-badge{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:20px;text-transform:uppercase;white-space:nowrap}
`;

const SC = { pending: '#F59E0B', processing: '#3B82F6', paid: '#10B981', completed: '#10B981', delivered: '#10B981', shipped: '#6366F1', cancelled: '#EF4444', refunded: '#EF4444', submitted: '#F59E0B', in_progress: '#3B82F6', resolved: '#10B981', closed: '#EF4444', approved: '#10B981', rejected: '#EF4444' };
const col = (s) => SC[(s || '').toLowerCase()] || '#97A0B5';
const Badge = ({ s }) => (
  <span className="dx-badge" style={{ background: col(s) + '22', color: col(s) }}>{(s || 'n/a').replace('_', ' ')}</span>
);
const short = (id) => String(id || '').slice(0, 8);
const when = (d) => (d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [soldOutItems, setSoldOutItems] = useState([]);
  const [receiptStats, setReceiptStats] = useState({ total: 0, paid: 0, revenue: 0 });
  const [reviewStats, setReviewStats] = useState({ total: 0, avg: 0 });
  const [range, setRange] = useState(30);
  const [series, setSeries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [topups, setTopups] = useState([]);
  const [reports, setReports] = useState([]);

  const load = useCallback(async () => { setStats(await fetchStats()); }, []);
  useAutoRefresh(load, 5000);
  useAutoRefresh(async () => {
    const [r, v] = await Promise.all([fetchReceiptsStats(), fetchReviewsStats()]);
    setReceiptStats(r || { total: 0, paid: 0, revenue: 0 });
    setReviewStats(v || { total: 0, avg: 0 });
  }, 8000);
  useAutoRefresh(async () => {
    const { items } = await fetchSoldOutProducts();
    setSoldOutItems(Array.isArray(items) ? items : []);
  }, 8000);

  useEffect(() => {
    let live = true;
    const run = async () => {
      try {
        const [s, o, t, r] = await Promise.all([fetchRevenueSeries(range), fetchOrders(), fetchTopUps(), fetchReports()]);
        if (!live) return;
        setSeries(s || []);
        setOrders(o.items || []); setTopups(t.items || []); setReports(r.items || []);
      } catch (e) { /* keep old data */ }
    };
    run();
    const id = setInterval(run, 10000);
    return () => { live = false; clearInterval(id); };
  }, [range]);

  const s = stats || { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  const openReports = reports.filter((x) => !['resolved', 'closed'].includes((x.status || 'submitted').toLowerCase()));
  const pendingTopups = topups.filter((x) => ['pending', 'processing'].includes((x.status || '').toLowerCase()));

  const { periodTotal, trend } = useMemo(() => {
    const half = Math.floor(series.length / 2);
    const a = series.slice(0, half).reduce((n, d) => n + d.revenue, 0);
    const b = series.slice(half).reduce((n, d) => n + d.revenue, 0);
    return { periodTotal: a + b, trend: a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0 };
  }, [series]);

  const byStatus = useMemo(() => {
    const m = {};
    orders.forEach((o) => { const k = (o.status || 'unknown').toLowerCase(); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [orders]);
  const maxStatus = byStatus.length ? byStatus[0][1] : 1;
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6), [orders]);

  const cards = [
    { icon: TrendingUp, value: pesoShort(s.revenue), label: 'Revenue', color: '#10B981' },
    { icon: ShoppingBag, value: s.orders, label: 'Orders', color: '#2563EB' },
    { icon: Users, value: s.users, label: 'Users', color: '#7C3AED' },
    { icon: Package, value: s.products, label: 'Products', color: '#F59E0B' },
    { icon: Wallet, value: pendingTopups.length, label: 'Pending top-ups', color: '#059669' },
    { icon: AlertTriangle, value: openReports.length, label: 'Open reports', color: '#EF4444' },
    { icon: TrendingUp, value: soldOutItems.length, label: 'Sold out', color: '#DC2626' },
    { icon: FileText, value: receiptStats.total, label: 'Quotations', color: '#0EA5E9' },
    { icon: Star, value: reviewStats.total + (reviewStats.avg ? ' · ' + Number(reviewStats.avg).toFixed(1) + '★' : ''), label: 'Reviews', color: '#EAB308' },
  ];
  const up = trend >= 0;
  const links = [['/orders', 'Orders', ShoppingBag], ['/topups', 'Top-ups', Wallet], ['/reports', 'Reports', AlertTriangle], ['/products', 'Products', Package], ['/users', 'Users', Users]];

  return (
    <>
      <style>{CSS}</style>
      <div className="page-head">
        <div><h1>Dashboard</h1><p>Overview · live</p></div>
      </div>

      <div className="stat-grid">
        {cards.map(({ icon: Icon, value, label, color }) => (
          <div className="stat" key={label}>
            <div className="stat-icon" style={{ background: color }}><Icon size={22} /></div>
            <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="dx-hero" style={{ marginTop: 14 }}>
        <div className="neu-card">
          <div className="dx-title">
            <span>Revenue</span>
            <div className="dx-pills">
              {[7, 30, 90].map((d) => (
                <button key={d} className={'dx-pill neu-btn' + (range === d ? ' on' : '')} onClick={() => setRange(d)}>{d}d</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>{peso(periodTotal)}</span>
            <span className="dx-trend" style={{ background: (up ? '#10B981' : '#EF4444') + '22', color: up ? '#10B981' : '#EF4444' }}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(trend).toFixed(0)}%
            </span>
            <span className="dx-sub">last {range} days vs earlier half</span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dxg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,160,180,.25)" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 10 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => pesoShort(v)} />
                <Tooltip formatter={(v) => peso(v)} labelFormatter={(d) => d} />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#dxg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="neu-card">
          <div className="dx-title"><span>Orders by status</span><span className="dx-sub">{orders.length} total</span></div>
          {!byStatus.length && <div className="dx-sub">No orders yet</div>}
          {byStatus.map(([k, n]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span><span>{n}</span>
              </div>
              <div className="dx-bar"><i style={{ width: (n / maxStatus) * 100 + '%', background: col(k) }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="dx-actions">
        {links.map(([to, label, Icon]) => (
          <Link key={to} to={to} className="dx-act neu-btn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={16} style={{ color: '#6366F1' }} />{label}</span>
            <ArrowRight size={14} />
          </Link>
        ))}
      </div>

      <div className="dx-split">
        <div className="neu-card">
          <div className="dx-title"><span>Recent orders</span><Link to="/orders" className="dx-sub">View all</Link></div>
          {!recentOrders.length && <div className="dx-sub">No orders yet</div>}
          {recentOrders.map((o) => (
            <div className="dx-row" key={o.id}>
              <div><b>#{short(o.id)}</b><div className="dx-sub">{when(o.created_at)}</div></div>
              <div style={{ textAlign: 'right' }}><b>{peso(o.total || 0)}</b><div><Badge s={o.status} /></div></div>
            </div>
          ))}
        </div>

        <div className="neu-card">
          <div className="dx-title"><span>Needs attention</span></div>
          <div className="dx-sub" style={{ fontWeight: 800, marginBottom: 2 }}>PENDING TOP-UPS ({pendingTopups.length})</div>
          {!pendingTopups.length && <div className="dx-sub" style={{ padding: '8px 0' }}>All clear</div>}
          {pendingTopups.slice(0, 4).map((t) => (
            <div className="dx-row" key={t.id}>
              <div><b>{peso(t.amount || 0)}</b><div className="dx-sub">{when(t.created_at)}</div></div>
              <Badge s={t.status} />
            </div>
          ))}
          <div className="dx-sub" style={{ fontWeight: 800, margin: '14px 0 2px' }}>OPEN REPORTS ({openReports.length})</div>
          {!openReports.length && <div className="dx-sub" style={{ padding: '8px 0' }}>All clear</div>}
          {openReports.slice(0, 4).map((r) => (
            <div className="dx-row" key={r.id}>
              <div style={{ minWidth: 0 }}>
                <b style={{ textTransform: 'capitalize' }}>{r.category || 'report'}</b>
                <div className="dx-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{r.concern}</div>
              </div>
              <Badge s={r.status || 'submitted'} />
            </div>
          ))}
        </div>
      </div>

      {soldOutItems.length > 0 && (
        <div className="neu-card">
          <div className="dx-title"><span>🚨 Sold-out products ({soldOutItems.length})</span></div>
          <div className="table-wrap">
            <table className="neu-table">
              <thead><tr><th>Product</th><th>Category</th><th>Store</th><th>Price</th><th>Sold</th></tr></thead>
              <tbody>
                {soldOutItems.slice(0, 20).map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td><td>{p.category || '—'}</td><td>{p.store || '—'}</td>
                    <td>{peso(p.price || 0)}</td><td>{p.sold ?? 0}</td>
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
