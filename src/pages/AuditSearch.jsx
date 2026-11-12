import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import { EmptyState, ErrorState, SkRows } from '../xa/Kit.jsx';
import { SOURCES, EMPTY_FILTER, loadAudit, filterAudit, distinct, manila } from '../lib/auditData.js';

const badge = (a) => (a === 'delete' ? 'badge-rejected' : a === 'create' ? 'badge-approved' : a === 'update' ? 'badge-frozen' : 'badge-pending');
const json = (v) => (v ? JSON.stringify(v, null, 2) : '—');
const pre = { fontSize: 11, margin: 0, padding: 10, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflow: 'auto' };
const LIMIT = 200;

export default function AuditSearch() {
  const [source, setSource] = useState('audit_log');
  const [all, setAll] = useState(null);
  const [meta, setMeta] = useState({});
  const [err, setErr] = useState('');
  const [f, setF] = useState(EMPTY_FILTER);
  const [sel, setSel] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setAll(null); setErr('');
    try { const r = await loadAudit(source, { max: 5000 }); setAll(r.rows); setMeta({ total: r.total, truncated: r.truncated }); }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); setF(EMPTY_FILTER); /* eslint-disable-next-line */ }, [source]);

  const shown = useMemo(() => (all ? filterAudit(all, f) : []), [all, f]);
  const actions = useMemo(() => (all ? distinct(all, 'action') : []), [all]);
  const actors = useMemo(() => (all ? distinct(all, 'actor') : []), [all]);
  const tables = useMemo(() => (all ? distinct(all, 'table_name') : []), [all]);

  return (
    <>
      <PageHeader title="Audit search" subtitle={all ? shown.length + ' match · ' + all.length + ' loaded' + (meta.truncated ? ' (newest 5000 of ' + meta.total + ')' : '') : 'Loading…'}
        actions={<Btn onClick={load}><RefreshCw size={14} /> Reload</Btn>} />
      <div className="ui-tools" style={{ flexWrap: 'wrap' }}>
        <select className="neu-input" style={{ flex: '1 1 200px' }} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Log">
          {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="ui-search" style={{ flex: '2 1 220px' }}><Search size={14} /><input className="neu-input" placeholder="Search text, ids, changed values" value={f.q} onChange={set('q')} /></div>
        <select className="neu-input" style={{ flex: '1 1 130px' }} value={f.action} onChange={set('action')} aria-label="Action"><option value="all">All actions</option>{actions.map((x) => <option key={x}>{x}</option>)}</select>
        <select className="neu-input" style={{ flex: '1 1 130px' }} value={f.actor} onChange={set('actor')} aria-label="Actor"><option value="all">All actors</option>{actors.map((x) => <option key={x}>{x}</option>)}</select>
        <select className="neu-input" style={{ flex: '1 1 150px' }} value={f.table} onChange={set('table')} aria-label="Table"><option value="all">All tables</option>{tables.map((x) => <option key={x}>{x}</option>)}</select>
        <input className="neu-input" style={{ flex: '1 1 130px' }} placeholder="Record id" value={f.record} onChange={set('record')} />
        <input className="neu-input" type="date" style={{ flex: '1 1 130px' }} value={f.from} onChange={set('from')} aria-label="From" />
        <input className="neu-input" type="date" style={{ flex: '1 1 130px' }} value={f.to} onChange={set('to')} aria-label="To" />
        <Btn onClick={() => setF(EMPTY_FILTER)}>Clear</Btn>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !all && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={6} cols={5} /></div>}
      {all && !shown.length && <div className="table-wrap"><EmptyState title="No matches" hint="Loosen a filter." /></div>}
      {all && shown.length > 0 && (
        <div className="table-wrap">
          <table className="neu-table stack">
            <thead><tr><th>When (Manila)</th><th>Actor</th><th>Action</th><th>Table</th><th>Record</th></tr></thead>
            <tbody>
              {shown.slice(0, LIMIT).map((r) => (
                <tr key={source + r.id} onClick={() => setSel(r)} style={{ cursor: 'pointer' }}>
                  <td data-label="When">{manila(r.created_at)}</td>
                  <td data-label="Actor">{r.actor}</td>
                  <td data-label="Action"><span className={'neu-badge ' + badge(r.action)}>{r.action || '—'}</span></td>
                  <td data-label="Table">{r.table_name || '—'}</td>
                  <td data-label="Record"><code style={{ fontSize: 11 }}>{String(r.record_id || '—').slice(0, 24)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > LIMIT && <p style={{ padding: 10, fontSize: 12, color: 'var(--text-dim)' }}>Showing the first {LIMIT}. Narrow the filters, or use Audit export for everything.</p>}
        </div>
      )}
      <Drawer open={!!sel} onClose={() => setSel(null)} title="Log entry">
        {sel && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div><b>{sel.action}</b> on <b>{sel.table_name || '—'}</b> by {sel.actor}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{manila(sel.created_at)}{sel.ip ? ' · ' + sel.ip : ''}</div>
            <div className="ui-lbl">Before</div><pre style={pre}>{json(sel.before_data)}</pre>
            <div className="ui-lbl">After</div><pre style={pre}>{json(sel.after_data)}</pre>
          </div>
        )}
      </Drawer>
    </>
  );
}
