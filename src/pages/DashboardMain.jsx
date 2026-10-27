import React, { useState, useCallback, useEffect, useMemo, useContext, createContext } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Package, Wallet, AlertTriangle, FileText, Star, ArrowRight, Calendar, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchStats, fetchSoldOutProducts, fetchReceiptsStats, fetchReviewsStats, fetchRevenueByPeriod, fetchRevenueSnapshot, fetchTopSellingProducts, fetchOrders, fetchTopUps, fetchReports } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import AnimatedNumber from '../components/AnimatedNumber.jsx';

const CSS = `
.dx-hero,.dx-split{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
@media(min-width:900px){.dx-hero{grid-template-columns:2fr 1fr}.dx-split{grid-template-columns:1fr 1fr}}
.dx-title{font-size:15px;font-weight:800;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.dx-h2{font-size:16px;font-weight:800;margin:18px 0 10px}
.dx-pills{display:flex;gap:6px;flex-wrap:wrap}
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
const PERIODS = [['daily', 'Daily', 30], ['weekly', 'Weekly', 26], ['monthly', 'Monthly', 24], ['yearly', 'Yearly', 5]];
const SC = { pending: '#F59E0B', processing: '#3B82F6', paid: '#10B981', completed: '#10B981', delivered: '#10B981', shipped: '#6366F1', cancelled: '#EF4444', refunded: '#EF4444', submitted: '#F59E0B', in_progress: '#3B82F6', resolved: '#10B981', closed: '#EF4444', approved: '#10B981', rejected: '#EF4444' };
const col = (s) => SC[(s || '').toLowerCase()] || '#97A0B5';
const Badge = ({ s }) => <span className="dx-badge" style={{ background: col(s) + '22', color: col(s) }}>{(s || 'n/a').replace('_', ' ')}</span>;
const short = (id) => String(id || '').slice(0, 8);
const when = (d) => (d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function padSeries(items, period, count) {
  const now = new Date();
  const key = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    if (period === 'daily') return `${y}-${m}-${day}`;
    if (period === 'weekly') {
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (dow - 1));
      return `${mon.getFullYear()}-W${String(Math.ceil((((mon - new Date(mon.getFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0')}`;
    }
    if (period === 'yearly') return String(y);
    return `${y}-${m}`;
  };
  const map = {};
  (items || []).forEach((it) => { map[it.bucket] = it; });
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (period === 'daily') d.setDate(now.getDate() - i);
    if (period === 'weekly') d.setDate(now.getDate() - i * 7);
    if (period === 'monthly') d.setMonth(now.getMonth() - i, 1);
    if (period === 'yearly') d.setFullYear(now.getFullYear() - i, 0, 1);
    const b = key(d);
    out.push(map[b] || { bucket: b, revenue: 0, order_count: 0 });
  }
  return out.map((s) => ({ ...s, revenue: Number(s.revenue) || 0, order_count: Number(s.order_count) || 0 }));
}

const StateCtx = createContext('ready');

function Stat({ icon: Icon, value, num, fmt, label, color }) {
  const state = useContext(StateCtx);
  const numeric = num !== undefined || (value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)));
  let shown;
  if (state === 'loading') shown = <span className="xa-skel" role="status" aria-label="Loading" />;
  else if (state === 'na') shown = <span title="Data unavailable">Not available</span>;
  else if (numeric) shown = <AnimatedNumber value={num !== undefined ? num : value} format={fmt} />;
  else shown = value;
  return (
    <div className="stat">
      <div className="stat-icon" style={{ background: color }}><Icon size={22} /></div>
      <div><div className="stat-value">{shown}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState('yearly');
  const [stats, setStats] = useState(null);
  const [snap, setSnap] = useState(null);
  const [series, setSeries] = useState([]);
  const [top, setTop] = useState([]);
  const [soldOut, setSoldOut] = useState([]);
  const [rc, setRc] = useState({ total: 0, paid: 0, unpaid: 0, pending: 0, overdue: 0, revenue: 0 });
  const [rv, setRv] = useState({ total: 0, avg: 0, fiveStar: 0, replied: 0 });
  const [orders, setOrders] = useState([]);
  const [topups, setTopups] = useState([]);
  const [reports, setReports] = useState([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const count = PERIODS.find((p) => p[0] === period)[2];
      const [st, sn, ser, tp, r1, r2, so, o, t, r] = await Promise.all([
        fetchStats(), fetchRevenueSnapshot(), fetchRevenueByPeriod(period, 24), fetchTopSellingProducts(10),
        fetchReceiptsStats(), fetchReviewsStats(), fetchSoldOutProducts(), fetchOrders(), fetchTopUps(), fetchReports(),
      ]);
      setStats(st); setSnap(sn); setFailed(false);
      setSeries(padSeries((ser && ser.items) || [], period, count));
      setTop((tp && tp.items) || []);
      if (r1) setRc(r1); if (r2) setRv(r2);
      setSoldOut(Array.isArray(so && so.items) ? so.items : []);
      setOrders((o && o.items) || []); setTopups((t && t.items) || []); setReports((r && r.items) || []);
    } catch (e) { setFailed(true); }
  }, [period]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 15000);

  const s = stats || { revenue: 0, orders: 0, users: 0, products: 0 };
  const openReports = reports.filter((x) => !['resolved', 'closed'].includes((x.status || 'submitted').toLowerCase()));
  const pendingTopups = topups.filter((x) => ['pending', 'processing'].includes((x.status || '').toLowerCase()));

  const { total, ordersIn, trend } = useMemo(() => {
    const half = Math.floor(series.length / 2);
    const a = series.slice(0, half).reduce((n, d) => n + d.revenue, 0);
    const b = series.slice(half).reduce((n, d) => n + d.revenue, 0);
    return { total: a + b, ordersIn: series.reduce((n, d) => n + d.order_count, 0), trend: a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0 };
  }, [series]);
  const up = trend >= 0;
  const st = stats ? 'ready' : failed ? 'na' : 'loading';
  const pendingOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;
  const todo = [
    { to: '/orders', label: 'Pending orders', n: pendingOrders, tone: '#F59E0B' },
    { to: '/topups', label: 'Pending top-ups', n: pendingTopups.length, tone: '#059669' },
    { to: '/reports', label: 'Open reports', n: openReports.length, tone: '#EF4444' },
    { to: '/products', label: 'Sold-out products', n: soldOut.length, tone: '#DC2626' },
  ].filter((t) => t.n > 0);

  const byStatus = useMemo(() => {
    const m = {};
    orders.forEach((o) => { const k = (o.status || 'unknown').toLowerCase(); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [orders]);
  const maxStatus = byStatus.length ? byStatus[0][1] : 1;
  const recent = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6), [orders]);

  const cards = [
    { icon: TrendingUp, num: s.revenue, fmt: pesoShort, label: 'Revenue', color: '#10B981' },
    { icon: ShoppingBag, value: s.orders, label: 'Orders', color: '#2563EB' },
    { icon: Users, value: s.users, label: 'Users', color: '#7C3AED' },
    { icon: Package, value: s.products, label: 'Products', color: '#F59E0B' },
    { icon: Wallet, value: pendingTopups.length, label: 'Pending top-ups', color: '#059669' },
    { icon: AlertTriangle, value: openReports.length, label: 'Open reports', color: '#EF4444' },
    { icon: TrendingUp, value: soldOut.length, label: 'Sold out', color: '#DC2626' },
    { icon: FileText, value: rc.total, label: 'Quotations', color: '#0EA5E9' },
    { icon: Star, value: rv.total + (rv.avg ? ' · ' + rv.avg + '★' : ''), label: 'Reviews', color: '#EAB308' },
  ];
  const snaps = [
    { icon: Calendar, num: (snap && snap.today) || 0, fmt: pesoShort, label: 'Today', color: '#10B981' },
    { icon: TrendingUp, num: (snap && snap.thisWeek) || 0, fmt: pesoShort, label: 'This week', color: '#2563EB' },
    { icon: Calendar, num: (snap && snap.thisMonth) || 0, fmt: pesoShort, label: 'This month', color: '#7C3AED' },
    { icon: TrendingUp, num: (snap && snap.thisYear) || 0, fmt: pesoShort, label: 'This year', color: '#F59E0B' },
    { icon: ShoppingBag, num: (snap && snap.allTime) || 0, fmt: pesoShort, label: 'All time', color: '#059669' },
  ];
  const links = [['/orders', 'Orders', ShoppingBag], ['/topups', 'Top-ups', Wallet], ['/reports', 'Reports', AlertTriangle], ['/products', 'Products', Package], ['/users', 'Users', Users]];

  return (
    <StateCtx.Provider value={st}>
      <style>{CSS}</style>
      <div className="page-head"><div><h1>Dashboard</h1><p>Overview &amp; analytics · live</p></div></div>
      {st === 'ready' && (
        <div className="xa-todo neu-card" role="region" aria-label="Action center">
          <div className="xa-todo-head">Action center</div>
          {todo.length === 0 ? <div className="dx-sub">All clear. Nothing is waiting on you.</div> : (
            <div className="xa-todo-list">
              {todo.map((t) => (
                <Link key={t.to} to={t.to} className="xa-todo-item" style={{ '--tone': t.tone }}>
                  <span className="xa-todo-n"><AnimatedNumber value={t.n} /></span>
                  <span>{t.label}</span><ArrowRight size={14} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="stat-grid">{cards.map((c) => <Stat key={c.label} {...c} />)}</div>

      <div className="dx-h2">Sales snapshot</div>
      <div className="stat-grid">{snaps.map((c) => <Stat key={c.label} {...c} />)}</div>

      <div className="dx-hero" style={{ marginTop: 14 }}>
        <div className="neu-card">
          <div className="dx-title">
            <span>Revenue</span>
            <div className="dx-pills">
              {PERIODS.map(([id, label]) => (
                <button key={id} className={'dx-pill neu-btn' + (period === id ? ' on' : '')} onClick={() => setPeriod(id)}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)' }}>{peso(total)}</span>
            <span className="dx-trend" style={{ background: (up ? '#10B981' : '#EF4444') + '22', color: up ? '#10B981' : '#EF4444' }}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(trend).toFixed(0)}%
            </span>
            <span className="dx-sub">{ordersIn} orders · recent half vs earlier half</span>
          </div>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dxg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,160,180,.25)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} minTickGap={20} tickFormatter={(b) => String(b).slice(-5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => pesoShort(v)} />
                <Tooltip formatter={(v) => peso(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#dxg)" dot={{ r: 3 }} />
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
          {!recent.length && <div className="dx-sub">No orders yet</div>}
          {recent.map((o) => (
            <div className="dx-row" key={o.id}>
              <div><b>#{short(o.id)}</b><div className="dx-sub">{when(o.created_at)}</div></div>
              <div style={{ textAlign: 'right' }}><b>{peso(o.total || 0)}</b><div><Badge s={o.status} /></div></div>
            </div>
          ))}
        </div>
        <div className="neu-card">
          <div className="dx-title"><span>Needs attention</span></div>
          <div className="dx-sub" style={{ fontWeight: 800 }}>PENDING TOP-UPS ({pendingTopups.length})</div>
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

      <div className="neu-card" style={{ marginBottom: 14, padding: 0 }}>
        <div className="dx-title" style={{ padding: '16px 20px 0' }}><span><Award size={16} color="#6366F1" style={{ verticalAlign: -3 }} /> Top selling products</span></div>
        {!top.length ? <div className="dx-sub" style={{ padding: 20 }}>No sales data yet.</div> : (
          <div className="table-wrap">
            <table className="neu-table">
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Store</th><th style={{ textAlign: 'right' }}>Units</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.product_id || i}>
                    <td style={{ fontWeight: 900, color: i < 3 ? '#6366F1' : '#7A8499' }}>{i + 1}</td>
                    <td><b>{p.name}</b></td><td>{p.category || '—'}</td><td>{p.store || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{p.units_sold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{peso(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dx-split">
        <div>
          <div className="dx-h2" style={{ marginTop: 4 }}>Quotations</div>
          <div className="stat-grid">
            <Stat icon={FileText} value={rc.total} label="Total" color="#0EA5E9" />
            <Stat icon={Award} value={rc.paid} label="Paid" color="#10B981" />
            <Stat icon={Calendar} value={rc.unpaid} label="Unpaid" color="#F59E0B" />
            <Stat icon={Calendar} value={rc.pending} label="Pending" color="#3B82F6" />
            <Stat icon={Calendar} value={rc.overdue} label="Overdue" color="#EF4444" />
            <Stat icon={TrendingUp} num={rc.revenue} fmt={pesoShort} label="Paid revenue" color="#10B981" />
          </div>
        </div>
        <div>
          <div className="dx-h2" style={{ marginTop: 4 }}>Reviews</div>
          <div className="stat-grid">
            <Stat icon={Star} value={rv.total} label="Total" color="#EAB308" />
            <Stat icon={Star} value={rv.avg} label="Avg rating" color="#F59E0B" />
            <Stat icon={Award} value={rv.fiveStar} label="5-star" color="#10B981" />
            <Stat icon={TrendingUp} value={rv.replied} label="Replied" color="#3B82F6" />
          </div>
        </div>
      </div>

      {soldOut.length > 0 && (
        <div className="neu-card">
          <div className="dx-title"><span>🚨 Sold-out products ({soldOut.length})</span></div>
          <div className="table-wrap">
            <table className="neu-table">
              <thead><tr><th>Product</th><th>Category</th><th>Store</th><th>Price</th><th>Sold</th></tr></thead>
              <tbody>
                {soldOut.slice(0, 20).map((p) => (
                  <tr key={p.id}><td><b>{p.name}</b></td><td>{p.category || '—'}</td><td>{p.store || '—'}</td><td>{peso(p.price || 0)}</td><td>{p.sold ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </StateCtx.Provider>
  );
}
