import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { adm } from './db.js';
import { EmptyState, ErrorState, SkRows } from './Kit.jsx';
import { peso } from './xaFmt.js';
import { Orders, Services, OrderCard, StatusDialog, HistoryDialog } from './BoosterAdmin.jsx';

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube'];
const ACTIVE = ['pending', 'starting', 'ongoing'];
const LABEL = { pending: 'Pending', starting: 'Starting', ongoing: 'Ongoing' };

function Shell({ title, sub, children }) {
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sub ? 4 : 14 }}>
        <Zap size={20} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{title}</h2>
      </div>
      {sub && <div style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 14 }}>{sub}</div>}
      {children}
    </div>
  );
}

export function BoosterOrdersPage() {
  return <Shell title="Social Booster Orders"><Orders /></Shell>;
}

export function BoosterServicesPage() {
  return <Shell title="Social Booster Services"><Services /></Shell>;
}

export function BoosterQueuePage() {
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [act, setAct] = useState(null);
  const [hist, setHist] = useState(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const my = ++reqRef.current;
    try {
      const r = await adm('adm_booster_queue', { p_status: status || null, p_platform: platform || null });
      if (my !== reqRef.current) return;
      setData(r);
      setErr('');
    } catch (e) {
      if (my === reqRef.current) setErr(e.message);
    }
  }, [status, platform]);

  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  const c = (data && data.counts) || {};
  const n = (k) => Number((c[k] && c[k].n) || 0);
  const amt = (k) => Number((c[k] && c[k].amount) || 0);
  const totalN = ACTIVE.reduce((s, k) => s + n(k), 0);
  const totalAmt = ACTIVE.reduce((s, k) => s + amt(k), 0);

  return (
    <Shell title="Booster Queue" sub="Orders still to do, oldest first. Work from the top.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
        <div className="neu-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.65 }}>In queue</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totalN}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{peso(totalAmt)}</div>
        </div>
        {ACTIVE.map((k) => (
          <div key={k} className="neu-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{LABEL[k]}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{n(k)}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{peso(amt(k))}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" data-xa-skip className={'neu-btn' + (status === '' ? ' neu-btn-primary' : '')} onClick={() => setStatus('')}>All</button>
        {ACTIVE.map((k) => (
          <button key={k} type="button" data-xa-skip className={'neu-btn' + (status === k ? ' neu-btn-primary' : '')} onClick={() => setStatus(k)}>{LABEL[k]}</button>
        ))}
        <select className="xa-input" style={{ width: 'auto', flex: '0 1 140px' }} value={platform} aria-label="Platform" onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={load} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>

      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !data && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {data && data.rows.length === 0 && <EmptyState title="Queue is empty" hint="No orders are waiting." />}
      {data && data.rows.map((o) => (
        <div key={o.id}>
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, margin: '0 0 4px 4px' }}>#{o.pos} in queue</div>
          <OrderCard o={o} onAct={(order, st) => setAct({ order, status: st })} onHist={setHist} />
        </div>
      ))}
      {act && <StatusDialog act={act} onClose={() => setAct(null)} onDone={() => { setAct(null); load(); }} />}
      {hist && <HistoryDialog order={hist} onClose={() => setHist(null)} />}
    </Shell>
  );
}
