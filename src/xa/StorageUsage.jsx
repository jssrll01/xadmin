import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';
import { adm } from './db.js';
import { Badge, EmptyState, ErrorState, SkCards, SkRows } from './Kit.jsx';
import { fmtBytes } from './xaFmt.js';

function Stat({ label, value, sub }) {
  return (
    <div className="neu-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Bar({ t, max }) {
  const total = Number(t.total_bytes) || 0;
  const heap = Number(t.table_bytes) || 0;
  const idx = Number(t.index_bytes) || 0;
  const other = Math.max(0, total - heap - idx);
  const seg = (v, c) => ({ width: total ? (v / total) * 100 + '%' : '0%', background: c, height: '100%' });
  return (
    <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <div style={{ width: Math.max(2, (total / max) * 100) + '%', height: '100%', display: 'flex' }}>
        <div style={seg(heap, 'var(--primary)')} />
        <div style={seg(idx, 'var(--warn)')} />
        <div style={seg(other, 'var(--text-dim)')} />
      </div>
    </div>
  );
}

export default function StorageUsage() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setD(await adm('adm_storage_usage')); setErr(''); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const tables = useMemo(() => ((d && d.tables) || []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [d, q]);
  const max = Math.max(1, ...((d && d.tables) || []).map((t) => Number(t.total_bytes) || 0));
  const sumTables = ((d && d.tables) || []).reduce((s, t) => s + (Number(t.total_bytes) || 0), 0);
  const buckets = (d && d.buckets) || [];
  const sumBuckets = buckets.reduce((s, b) => s + (Number(b.bytes) || 0), 0);
  const shown = all || q ? tables : tables.slice(0, 25);

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><HardDrive size={22} /> Storage usage</h2>
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={load} disabled={busy} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !d && <><SkCards n={3} /><div className="neu-card" style={{ marginTop: 12 }}><SkRows rows={6} cols={3} /></div></>}
      {d && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
            <Stat label="Whole database" value={fmtBytes(d.db_bytes)} sub="all schemas, incl. auth and logs" />
            <Stat label="Your tables" value={fmtBytes(sumTables)} sub={((d.tables || []).length) + ' tables in public'} />
            <Stat label="File buckets" value={fmtBytes(sumBuckets)} sub={buckets.length + ' bucket' + (buckets.length === 1 ? '' : 's')} />
          </div>

          <div className="neu-card" style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <b style={{ fontSize: 14 }}>Tables</b>
              <span style={{ fontSize: 11.5, display: 'flex', gap: 10, opacity: 0.8 }}>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'var(--primary)', marginRight: 4 }} />data</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'var(--warn)', marginRight: 4 }} />indexes</span>
                <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: 'var(--text-dim)', marginRight: 4 }} />other</span>
              </span>
              <input className="xa-input" style={{ flex: '1 1 160px', width: 'auto', marginLeft: 'auto' }} placeholder="Find a table" aria-label="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {shown.length === 0 && <EmptyState title="No matching table" />}
            {shown.map((t) => (
              <div key={t.name} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5 }}>
                  <b style={{ fontSize: 13.5, wordBreak: 'break-all' }}>{t.name}</b>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13 }}>{fmtBytes(t.total_bytes)}</span>
                </div>
                <Bar t={t} max={max} />
                <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 4 }}>{Number(t.rows).toLocaleString()} rows - data {fmtBytes(t.table_bytes)} - indexes {fmtBytes(t.index_bytes)}</div>
              </div>
            ))}
            {!q && !all && tables.length > 25 && <button type="button" className="neu-btn" style={{ marginTop: 10 }} onClick={() => setAll(true)}>Show all {tables.length} tables</button>}
          </div>

          <div className="neu-card" style={{ padding: 14 }}>
            <b style={{ fontSize: 14 }}>Buckets</b>
            {buckets.length === 0 && <EmptyState title="No buckets" hint="Images in XMARKET are stored in Cloudinary, not here." />}
            {buckets.map((b) => (
              <div key={b.name} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '9px 0', borderTop: '1px solid var(--border)' }}>
                <b style={{ fontSize: 13.5 }}>{b.name}</b>
                <Badge tone={b.public ? 'warn' : 'ok'}>{b.public ? 'public' : 'private'}</Badge>
                <span style={{ fontSize: 12.5, opacity: 0.7 }}>{Number(b.files).toLocaleString()} files</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13 }}>{fmtBytes(b.bytes)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
