import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Package, Wallet, AlertTriangle, FileText, Star, ArrowRight, Calendar, Award, Activity, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchStats, fetchSoldOutProducts, fetchReceiptsStats, fetchReviewsStats, fetchRevenueByPeriod, fetchRevenueSnapshot, fetchTopSellingProducts, fetchOrders, fetchTopUps, fetchReports } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import StatCard from '../xa/ui/StatCard.jsx';
import Tabs from '../xa/ui/Tabs.jsx';
import Timeline from '../xa/ui/Timeline.jsx';
import Panel from '../analytics/Panel.jsx';
import { P } from '../analytics/config.js';
import { Badge as XBadge, EmptyState } from '../xa/Kit.jsx';

const CSS = `
.dx-hero,.dx-split{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
@media(min-width:960px){.dx-hero{grid-template-columns:2fr 1fr}.dx-split{grid-template-columns:1fr 1fr}}
.dx-title{font-size:15px;font-weight:800;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.dx-h2{font-size:15px;font-weight:800;margin:20px 0 10px}
.dx-trend{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:800;padding:3px 8px;border-radius:20px}
.dx-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.dx-row:last-child{border-bottom:0}
.dx-sub{font-size:12px;color:var(--text-dim)}
.dx-bar{height:7px;border-radius:6px;background:var(--border);overflow:hidden;margin-top:4px}
.dx-bar>i{display:block;height:100%;border-radius:6px}
.dx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:14px}
.dx-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.dx-act{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:12px;font-weight:700;font-size:13px;background:var(--surface);border:1px solid var(--border);color:var(--text)}
.dx-act:hover{background:var(--surface-2);border-color:var(--border-strong)}
.dx-badge{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:20px;text-transform:uppercase;white-space:nowrap}
.dx-todo{display:flex;flex-wrap:wrap;gap:10px}
.dx-todo a{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);font-size:13px;font-weight:700;color:var(--text);border-left:4px solid var(--tone)}
.dx-todo a b{font-size:16px;color:var(--tone)}
.dx-status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--text-dim)}
.dx-live{width:8px;height:8px;border-radius:50%;display:inline-block}
`;

const PERIODS = [['daily', 'Daily', 30], ['weekly', 'Weekly', 26], ['monthly', 'Monthly', 24], ['yearly', 'Yearly', 5]];
const SC = { pending: '#F59E0B', processing: '#3B82F6', paid: '#10B981', completed: '#10B981', delivered: '#10B981', shipped: '#6366F1', cancelled: '#EF4444', refunded: '#EF4444', submitted: '#F59E0B', in_progress: '#3B82F6', resolved: '#10B981', closed: '#EF4444', approved: '#10B981', rejected: '#EF4444' };
const col = (s) => SC[(s || '').toLowerCase()] || '#97A0B5';
const tone = (s) => { const c = col(s); return c === '#10B981' ? 'ok' : c === '#EF4444' ? 'bad' : c === '#F59E0B' ? 'warn' : ''; };
const Badge = ({ s }) => <span className="dx-badge" style={{ background: col(s) + '22', color: col(s) }}>{(s || 'n/a').replace('_', ' ')}</span>;
const short = (id) => String(id || '').slice(0, 8);
const when = (d) => (d ? new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

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

export default function DashboardMain() {
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
  const [at, setAt] = useState(null);
  const [spin, setSpin] = useState(false);

  const load = useCallback(async () => {
    try {
      const count = PERIODS.find((p) => p[0] === period)[2];
      const [st, sn, ser, tp, r1, r2, so, o, t, r] = await Promise.all([
        fetchStats(), fetchRevenueSnapshot(), fetchRevenueByPeriod(period, 24), fetchTopSellingProducts(10),
        fetchReceiptsStats(), fetchReviewsStats(), fetchSoldOutProducts(), fetchOrders(), fetchTopUps(), fetchReports(),
      ]);
      setStats(st); setSnap(sn); setFailed(false); setAt(new Date());
      setSeries(padSeries((ser && ser.items) || [], period, count));
      setTop((tp && tp.items) || []);
      if (r1) setRc(r1);
      if (r2) setRv(r2);
      setSoldOut(Array.isArray(so && so.items) ? so.items : []);
      setOrders((o && o.items) || []); setTopups((t && t.items) || []); setReports((r && r.items) || []);
    } catch (e) { setFailed(true); }
  }, [period]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 15000);

  const refresh = async () => { setSpin(true); await load(); setSpin(false); };

  const ready = !!stats;
  const loading = !ready && !failed;
  const s = stats || { revenue: 0, orders: 0, users: 0, products: 0 };
  const openReports = reports.filter((x) => !['resolved', 'closed'].includes((x.status || 'submitted').toLowerCase()));
  const pendingTopups = topups.filter((x) => ['pending', 'processing'].includes((x.status || '').toLowerCase()));
  const pendingOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;

  const { total, ordersIn, trend } = useMemo(() => {
    const half = Math.floor(series.length / 2);
    const a = series.slice(0, half).reduce((n, d) => n + d.revenue, 0);
    const b = series.slice(half).reduce((n, d) => n + d.revenue, 0);
    return { total: a + b, ordersIn: series.reduce((n, d) => n + d.order_count, 0), trend: a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0 };
  }, [series]);
  const up = trend >= 0;

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

  const activity = useMemo(() => {
    const a = [];
    orders.forEach((o) => a.push({ id: 'o' + o.id, at: o.created_at, title: 'Order #' + short(o.id) + ' · ' + peso(o.total || 0), status: o.status }));
    topups.forEach((t) => a.push({ id: 't' + t.id, at: t.created_at, title: 'Top-up request · ' + peso(t.amount || 0), status: t.status }));
    reports.forEach((r) => a.push({ id: 'r' + r.id, at: r.created_at, title: 'Report: ' + (r.category || 'report'), status: r.status || 'submitted' }));
    return a.filter((x) => x.at).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 8)
      .map((x) => ({ id: x.id, title: x.title, meta: when(x.at) + ' · ' + String(x.status || 'n/a').replace('_', ' '), tone: tone(x.status) }));
  }, [orders, topups, reports]);

  const num = (v) => (loading ? null : <AnimatedNumber value={Number(v) || 0} />);
  const money = (v) => (loading ? null : <AnimatedNumber value={Number(v) || 0} format={pesoShort} />);
  const kpis = [
    { icon: TrendingUp, label: 'Revenue', value: money(s.revenue), tone: 'ok' },
    { icon: ShoppingBag, label: 'Orders', value: num(s.orders) },
    { icon: Users, label: 'Users', value: num(s.users) },
    { icon: Package, label: 'Products', value: num(s.products) },
    { icon: Wallet, label: 'Pending top-ups', value: num(pendingTopups.length), tone: pendingTopups.length ? 'warn' : 'ok' },
    { icon: AlertTriangle, label: 'Open reports', value: num(openReports.length), tone: openReports.length ? 'bad' : 'ok' },
    { icon: Package, label: 'Sold out', value: num(soldOut.length), tone: soldOut.length ? 'bad' : 'ok' },
    { icon: FileText, label: 'Quotations', value: num(rc.total) },
    { icon: Star, label: 'Reviews', value: loading ? null : rv.total + (rv.avg ? ' · ' + rv.avg + ' stars' : '') },
  ];
  const snaps = [
    ['Today', snap && snap.today], ['This week', snap && snap.thisWeek], ['This month', snap && snap.thisMonth],
    ['This year', snap && snap.thisYear], ['All time', snap && snap.allTime],
  ];
  const links = [['/orders', 'Orders', ShoppingBag], ['/products', 'Products', Package], ['/topups', 'Top-ups', Wallet], ['/users', 'Users', Users], ['/reports', 'Reports', AlertTriangle], ['/banners', 'Banners', Star]];

  return (
    <>
      <style>{CSS}</style>

      <div className="neu-card" style={{ marginBottom: 14, padding: 12 }}>
        <div className="dx-status">
          <span className="dx-live" style={{ background: failed ? 'var(--danger)' : ready ? 'var(--success)' : 'var(--warn)' }} />
          <b style={{ color: 'var(--text)' }}>{failed ? 'Data connection failed' : ready ? 'Connected' : 'Connecting'}</b>
          <span>{at ? 'Updated ' + at.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : 'Waiting for data'}</span>
          <span>Auto refresh every 15 s</span>
          <XBadge tone={failed ? 'bad' : 'ok'}>{failed ? 'Offline' : 'Live'}</XBadge>
          <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={refresh} disabled={spin} aria-label="Refresh dashboard">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {failed && <div className="neu-card" style={{ marginBottom: 14, borderColor: 'var(--danger)' }}><b style={{ color: 'var(--danger)' }}>Could not load the dashboard.</b> <button type="button" className="neu-btn" onClick={refresh}>Try again</button></div>}

      {ready && (
        <div className="neu-card" style={{ marginBottom: 14 }} role="region" aria-label="Action center">
          <div className="dx-title"><span>Action center</span></div>
          {todo.length === 0 ? <div className="dx-sub">All clear. Nothing is waiting on you.</div> : (
            <div className="dx-todo">
              {todo.map((t) => (
                <Link key={t.to} to={t.to} style={{ '--tone': t.tone }}><b>{t.n}</b><span>{t.label}</span><ArrowRight size={14} /></Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="dx-grid">{kpis.map((k) => <StatCard key={k.label} {...k} loading={loading} />)}</div>

      <div className="dx-h2">Sales snapshot</div>
      <div className="dx-grid">
        {snaps.map(([label, v], i) => <StatCard key={label} icon={i < 2 ? Calendar : TrendingUp} label={label} value={money(v)} loading={loading || !snap} />)}
      </div>

      <div className="dx-hero" style={{ marginTop: 14 }}>
        <div className="neu-card">
          <div className="dx-title">
            <span>Revenue</span>
            <Tabs tabs={PERIODS.map(([id, label]) => [id, label])} value={period} onChange={setPeriod} label="Revenue period" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>{peso(total)}</span>
            <span className="dx-trend" style={{ background: (up ? '#10B981' : '#EF4444') + '22', color: up ? '#10B981' : '#EF4444' }}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(trend).toFixed(0)}%
            </span>
            <span className="dx-sub">{ordersIn} orders · recent half vs earlier half</span>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dxg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} minTickGap={20} tickFormatter={(b) => String(b).slice(-5)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} tickFormatter={(v) => pesoShort(v)} />
                <Tooltip formatter={(v) => peso(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.4} fill="url(#dxg)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="neu-card">
          <div className="dx-title"><span>Orders by status</span><span className="dx-sub">{orders.length} total</span></div>
          {!byStatus.length && <EmptyState title="No orders yet" />}
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

      <div className="dx-h2" style={{ marginTop: 4 }}>Quick actions</div>
      <div className="dx-actions">
        {links.map(([to, label, Icon]) => (
          <Link key={to} to={to} className="dx-act">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={16} style={{ color: 'var(--primary)' }} />{label}</span>
            <ArrowRight size={14} />
          </Link>
        ))}
      </div>

      <div className="dx-split">
        <div className="neu-card">
          <div className="dx-title"><span><Activity size={15} style={{ verticalAlign: -2 }} /> Recent activity</span><Link to="/audit" className="dx-sub">Audit log</Link></div>
          {activity.length === 0 ? <EmptyState title="No activity yet" /> : <Timeline items={activity} />}
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
                <div className="dx-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{r.concern}</div>
              </div>
              <Badge s={r.status || 'submitted'} />
            </div>
          ))}
        </div>
      </div>

      <div className="dx-h2">User growth</div>
      <Panel cfg={{ ...P.users, id: 'dash_users', title: 'New customers' }} days={30} />

      <div className="neu-card" style={{ marginBottom: 14, padding: 0 }}>
        <div className="dx-title" style={{ padding: '16px 20px 0' }}><span><Award size={16} color="var(--primary)" style={{ verticalAlign: -3 }} /> Top selling products</span></div>
        {!top.length ? <div className="dx-sub" style={{ padding: 20 }}>No sales data yet.</div> : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="neu-table">
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Store</th><th style={{ textAlign: 'right' }}>Units</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
              <tbody>
                {top.map((p, i) => (
                  <tr key={p.product_id || i}>
                    <td style={{ fontWeight: 800, color: i < 3 ? 'var(--primary)' : 'var(--text-dim)' }}>{i + 1}</td>
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
          <div className="dx-grid">
            <StatCard icon={FileText} label="Total" value={rc.total} loading={loading} />
            <StatCard icon={Award} label="Paid" value={rc.paid} tone="ok" loading={loading} />
            <StatCard icon={Calendar} label="Unpaid" value={rc.unpaid} tone={rc.unpaid ? 'warn' : ''} loading={loading} />
            <StatCard icon={Calendar} label="Pending" value={rc.pending} loading={loading} />
            <StatCard icon={Calendar} label="Overdue" value={rc.overdue} tone={rc.overdue ? 'bad' : ''} loading={loading} />
            <StatCard icon={TrendingUp} label="Paid revenue" value={peso(rc.revenue)} tone="ok" loading={loading} />
          </div>
        </div>
        <div>
          <div className="dx-h2" style={{ marginTop: 4 }}>Reviews</div>
          <div className="dx-grid">
            <StatCard icon={Star} label="Total" value={rv.total} loading={loading} />
            <StatCard icon={Star} label="Average rating" value={rv.avg} loading={loading} />
            <StatCard icon={Award} label="5-star" value={rv.fiveStar} tone="ok" loading={loading} />
            <StatCard icon={TrendingUp} label="Replied" value={rv.replied} loading={loading} />
          </div>
        </div>
      </div>

      {soldOut.length > 0 && (
        <div className="neu-card">
          <div className="dx-title"><span>Sold-out products ({soldOut.length})</span><Link to="/products" className="dx-sub">Manage</Link></div>
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
    </>
  );
}
