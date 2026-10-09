import React, { useEffect, useState } from 'react';
import { Users, Package, ShoppingBag, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import Stat from '../components/Stat.jsx';
import Card from '../components/Card.jsx';
import { fetchStats, fetchRevenueSeries } from '../lib/api.js';
import { peso, pesoShort } from '../lib/format.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    fetchStats().then(setStats);
    fetchRevenueSeries(30).then(setSeries);
  }, []);

  const max = Math.max(1, ...series.map(s => s.revenue));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of XMARKET activity</p>
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon={TrendingUp}     value={pesoShort(stats?.revenue || 0)} label="Revenue"        color="#10B981" />
        <Stat icon={ShoppingBag}    value={stats?.orders || 0}              label="Orders"         color="#2563EB" />
        <Stat icon={Users}          value={stats?.users || 0}               label="Users"          color="#7C3AED" />
        <Stat icon={Package}        value={stats?.products || 0}            label="Products"       color="#F59E0B" />
        <Stat icon={Wallet}         value={stats?.pendingTopups || 0}       label="Pending top-ups" color="#059669" />
        <Stat icon={AlertTriangle}  value={stats?.openReports || 0}         label="Open reports"   color="#EF4444" />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Revenue · last 30 days</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Based on Xwallet purchases</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--success)' }}>{peso(stats?.revenue || 0)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
          {series.map((s, i) => (
            <div key={i} title={`${s.date}: ${peso(s.revenue)}`} style={{
              flex: 1, minWidth: 4,
              height: `${(s.revenue / max) * 100}%`,
              minHeight: s.revenue > 0 ? 4 : 2,
              background: s.revenue > 0 ? 'linear-gradient(180deg, #3B82F6, #2563EB)' : 'var(--surface-in)',
              borderRadius: 4,
              transition: 'all 0.3s var(--ease)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700 }}>
          <span>{series[0]?.date}</span>
          <span>{series[series.length - 1]?.date}</span>
        </div>
      </Card>
    </>
  );
}
