import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { adm } from './db.js';
import { Badge, ErrorState, SkCards, SkRows } from './Kit.jsx';
import { ageHours, ago, fmtBytes, fmtMs, fmtUptime, when } from './xaFmt.js';

const COLORS = { ok: 'var(--success)', warn: 'var(--warn)', bad: 'var(--danger)' };

function Stat({ label, value, sub, tone }) {
  return (
    <div className="neu-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: COLORS[tone] }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function HealthDashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [ms, setMs] = useState(null);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const t0 = performance.now();
    try {
      const r = await adm('adm_health');
      setMs(Math.round(performance.now() - t0));
      setD(r);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(t);
  }, [auto, load]);

  const issues = [];
  const c = (d && d.connections) || {};
  const db = (d && d.db) || {};
  const queues = (d && d.queues) || [];
  if (d) {
    if (Number(d.cron_failures_24h) > 0) issues.push(d.cron_failures_24h + ' scheduled job failure(s) in the last 24 hours');
    if (c.max && c.total / c.max > 0.8) issues.push('Database connections are above 80% of the limit');
    if (Number(c.idle_in_tx) > 3) issues.push(c.idle_in_tx + ' connections are stuck idle in a transaction');
    queues.forEach((q) => {
      if (!q.error && Number(q.count) > 0 && ageHours(q.oldest) > Number(q.warn_hours)) issues.push(q.label + ': the oldest item has waited ' + ago(q.oldest).replace(' ago', ''));
    });
  }
  const connTone = c.max && c.total / c.max > 0.8 ? 'bad' : c.max && c.total / c.max > 0.6 ? 'warn' : 'ok';

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={22} /> Health</h2>
        <label style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh
        </label>
        <button type="button" className="neu-btn" onClick={load} disabled={busy} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !d && <><SkCards n={4} /><div className="neu-card" style={{ marginTop: 12 }}><SkRows rows={6} cols={3} /></div></>}
      {d && (
        <>
          <div className="neu-card" style={{ padding: 14, marginBottom: 12, borderLeft: '4px solid ' + (issues.length ? 'var(--warn)' : 'var(--success)') }}>
            <b style={{ fontSize: 14.5 }}>{issues.length ? issues.length + ' thing' + (issues.length === 1 ? '' : 's') + ' need attention' : 'All systems normal'}</b>
            {issues.map((m, i) => <div key={i} style={{ fontSize: 13, marginTop: 4 }}>{m}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
            <Stat label="Database uptime" value={fmtUptime(d.uptime_seconds)} sub={'since ' + when(d.started_at)} tone="ok" />
            <Stat label="Connections" value={c.total + ' / ' + c.max} sub={c.active + ' active, ' + c.idle + ' idle'} tone={connTone} />
            <Stat label="Server response" value={ms != null ? fmtMs(ms) : '-'} sub="round trip for this check" tone={ms > 2500 ? 'warn' : 'ok'} />
            <Stat label="Cron failures (24h)" value={String(d.cron_failures_24h)} tone={Number(d.cron_failures_24h) > 0 ? 'bad' : 'ok'} />
            <Stat label="Database size" value={fmtBytes(d.db_bytes)} sub={d.version} />
            <Stat label="Cache hit rate" value={db.cache_hit != null ? db.cache_hit + '%' : '-'} sub="higher is better" tone={db.cache_hit != null && db.cache_hit < 95 ? 'warn' : 'ok'} />
            <Stat label="Rollbacks" value={Number(db.rollbacks || 0).toLocaleString()} sub={'since ' + (db.stats_reset ? when(db.stats_reset) : 'start')} />
            <Stat label="Deadlocks" value={String(db.deadlocks || 0)} sub="since stats reset" tone={Number(db.deadlocks) > 0 ? 'warn' : 'ok'} />
          </div>

          <div className="neu-card" style={{ padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 14 }}>Queues</b>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>Work waiting for someone or something to handle it.</div>
            {queues.map((q) => {
              const late = !q.error && Number(q.count) > 0 && ageHours(q.oldest) > Number(q.warn_hours);
              return (
                <div key={q.table} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '9px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ flex: '1 1 150px', fontSize: 13.5, fontWeight: 700 }}>{q.label}</span>
                  {q.error ? <Badge>n/a</Badge> : <Badge tone={late ? 'bad' : Number(q.count) > 0 ? 'warn' : 'ok'}>{q.count} waiting</Badge>}
                  {!q.error && Number(q.count) > 0 && <span style={{ fontSize: 12, opacity: 0.7 }}>oldest {ago(q.oldest).replace(' ago', '')}</span>}
                </div>
              );
            })}
          </div>

          <div className="neu-card" style={{ padding: 14 }}>
            <b style={{ fontSize: 14 }}>Recent errors</b>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>Failed scheduled jobs in the last 24 hours. The apps do not keep an error log yet.</div>
            {(d.cron_failures || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>No failures.</div>}
            {(d.cron_failures || []).map((f, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                <b>{f.job}</b> <span style={{ opacity: 0.65, fontSize: 12 }}>{ago(f.at)}</span>
                {f.message && <div style={{ color: 'var(--danger)', fontSize: 12.5, wordBreak: 'break-word' }}>{f.message}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
