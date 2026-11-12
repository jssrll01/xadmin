import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import { adm } from './db.js';
import { Badge, EmptyState, ErrorState, SkRows, useXaToast } from './Kit.jsx';
import { fmtMs } from './xaFmt.js';

const SORTS = [['mean', 'Slowest on average'], ['max', 'Slowest single call'], ['total', 'Most total time'], ['calls', 'Most calls']];

function Row({ r, open, onToggle, onCopy }) {
  const mean = Number(r.mean_ms);
  const tone = mean >= 500 ? 'bad' : mean >= 100 ? 'warn' : 'ok';
  return (
    <div className="neu-card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
        <Badge tone={tone}>avg {fmtMs(mean)}</Badge>
        <span>max {fmtMs(r.max_ms)}</span>
        <span>{Number(r.calls).toLocaleString()} calls</span>
        <span style={{ opacity: 0.65 }}>total {fmtMs(r.total_ms)}</span>
        <span style={{ opacity: 0.65 }}>{Number(r.rows).toLocaleString()} rows</span>
      </div>
      <button type="button" data-xa-skip onClick={onToggle} style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 8 }}>
        <code style={{ display: 'block', fontSize: 12, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: open ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.query}</code>
      </button>
      {open && <button type="button" data-xa-skip className="neu-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={onCopy}>Copy query</button>}
    </div>
  );
}

export default function SlowQueries() {
  const { push } = useXaToast();
  const [sort, setSort] = useState('mean');
  const [min, setMin] = useState('50');
  const [limit, setLimit] = useState('50');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    setErr('');
    try { setData(await adm('adm_slow_queries', { p_limit: Number(limit), p_sort: sort })); } catch (e) { setErr(e.message); }
  }, [limit, sort]);
  useEffect(() => { load(); }, [load]);

  const rows = ((data && data.rows) || []).filter((r) => Number(r.mean_ms) >= (Number(min) || 0));
  const copy = async (q) => {
    try { await navigator.clipboard.writeText(q); push('Copied', 'success', 1500); } catch (e) { push('Could not copy', 'error'); }
  };

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Gauge size={22} /> Slow queries</h2>
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={load} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 12 }}>Slowest database calls recorded since the last restart or statistics reset. Constants are shown as $1, $2.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select className="xa-input" style={{ width: 'auto', flex: '1 1 180px' }} value={sort} aria-label="Sort by" onChange={(e) => setSort(e.target.value)}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="xa-input" style={{ width: 'auto', flex: '0 1 130px' }} value={min} aria-label="Minimum average time" onChange={(e) => setMin(e.target.value)}>
          {['0', '10', '50', '100', '500'].map((v) => <option key={v} value={v}>avg {v}+ ms</option>)}
        </select>
        <select className="xa-input" style={{ width: 'auto', flex: '0 1 110px' }} value={limit} aria-label="How many" onChange={(e) => setLimit(e.target.value)}>
          {['25', '50', '100', '200'].map((v) => <option key={v} value={v}>top {v}</option>)}
        </select>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !data && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {data && !data.enabled && <EmptyState title="pg_stat_statements is not enabled" hint="Enable it in Supabase under Database, Extensions, then come back." />}
      {data && data.enabled && data.error && <ErrorState message={data.error} onRetry={load} />}
      {data && data.enabled && !data.error && rows.length === 0 && <EmptyState title="Nothing above that threshold" hint="Lower the minimum average time to see more." />}
      {rows.map((r, i) => <Row key={i + r.query.slice(0, 24)} r={r} open={open === i} onToggle={() => setOpen(open === i ? null : i)} onCopy={() => copy(r.query)} />)}
    </div>
  );
}
