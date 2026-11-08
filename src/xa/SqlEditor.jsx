import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adm } from './db.js';
import { ConfirmDialog, LoadingBtn, useXaToast, SkRows, Badge, EmptyState } from './Kit.jsx';

const cell = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function SqlEditor() {
  const loc = useLocation();
  const { push } = useXaToast();
  const [sql, setSql] = useState((loc.state && loc.state.sql) || 'select * from profiles limit 10');
  const [write, setWrite] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askWrite, setAskWrite] = useState(false);
  const [saved, setSaved] = useState(null);
  const [hist, setHist] = useState(null);
  const [tab, setTab] = useState('saved');
  const ref = useRef(null);

  const loadMeta = useCallback(async () => {
    try { setSaved(await adm('adm_sql_meta', { p_action: 'saved' })); setHist(await adm('adm_sql_meta', { p_action: 'history' })); }
    catch (e) { push(e.message, 'error'); setSaved([]); setHist([]); }
  }, [push]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const run = useCallback(async () => {
    if (busy) return;
    setBusy(true); setAskWrite(false);
    try { setRes(await adm('adm_sql', { p_sql: sql, p_write: write })); await loadMeta(); }
    catch (e) { setRes({ ok: false, error: e.message }); }
    setBusy(false);
  }, [busy, sql, write, loadMeta]);
  const go = () => { if (write) setAskWrite(true); else run(); };

  const save = async () => {
    const name = window.prompt('Name this query:');
    if (!name) return;
    try { await adm('adm_sql_meta', { p_action: 'save', p_name: name, p_sql: sql }); push('Saved', 'success'); loadMeta(); } catch (e) { push(e.message, 'error'); }
  };
  const del = async (id) => { try { await adm('adm_sql_meta', { p_action: 'delete', p_id: id }); loadMeta(); } catch (e) { push(e.message, 'error'); } };
  const csv = () => {
    const rows = (res && res.rows) || []; if (!rows.length) return;
    const heads = Object.keys(rows[0]); const esc = (v) => { const s = cell(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[heads.join(',')].concat(rows.map((r) => heads.map((h) => esc(r[h])).join(','))).join('\n')], { type: 'text/csv' }));
    a.download = 'query-result.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const rows = (res && res.rows) || [];
  const heads = rows.length ? Object.keys(rows[0]) : [];
  const list = tab === 'saved' ? saved : hist;

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>SQL editor</h2>
        <Badge tone={write ? 'bad' : 'ok'}>{write ? 'WRITE MODE' : 'read-only'}</Badge>
        <label style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={write} onChange={(e) => { setWrite(e.target.checked); setRes(null); }} /> Allow changes
        </label>
      </div>

      <div className="neu-card" style={{ padding: 12, marginBottom: 12 }}>
        <textarea ref={ref} className="xa-input" rows={7} spellCheck={false} value={sql} aria-label="SQL query"
          onChange={(e) => setSql(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); go(); } }}
          style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <LoadingBtn variant={write ? 'danger' : 'primary'} loading={busy} onClick={go}>{write ? 'Run (changes data)' : 'Run'}</LoadingBtn>
          <button type="button" className="neu-btn" onClick={save}>Save query</button>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Ctrl+Enter to run · one statement · 500 rows max · 8s limit</span>
        </div>
      </div>

      <div className="neu-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', minHeight: 44 }}>
          <b style={{ fontSize: 13 }}>Result</b>
          {res && res.ok && <Badge>{res.count} row{res.count === 1 ? '' : 's'} · {res.ms} ms</Badge>}
          {res && res.ok && rows.length > 0 && <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={csv}>Export CSV</button>}
        </div>
        {busy && <div style={{ padding: 8 }}><SkRows rows={5} cols={4} /></div>}
        {!busy && !res && <EmptyState title="No result yet" hint="Run a query to see rows here." />}
        {!busy && res && !res.ok && <div style={{ padding: 14, color: 'var(--danger)', fontSize: 13, fontWeight: 600, whiteSpace: 'pre-wrap' }}>{res.error}</div>}
        {!busy && res && res.ok && rows.length === 0 && <EmptyState title={write && res.count ? res.count + ' row(s) affected' : 'No rows returned'} />}
        {!busy && res && res.ok && rows.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: '55vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>{heads.map((h) => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>{heads.map((h) => <td key={h} title={cell(r[h])} style={{ padding: '7px 10px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[h] === null ? <span style={{ color: 'var(--text-dim)' }}>null</span> : cell(r[h])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="neu-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[['saved', 'Saved queries'], ['history', 'History']].map(([id, l]) => <button key={id} type="button" className="neu-btn" onClick={() => setTab(id)} style={{ opacity: tab === id ? 1 : .6, outline: tab === id ? '2px solid var(--primary)' : 'none' }}>{l}</button>)}
        </div>
        {!list && <SkRows rows={3} cols={2} />}
        {list && list.length === 0 && <EmptyState title={tab === 'saved' ? 'No saved queries' : 'No history yet'} />}
        {list && list.map((q) => (
          <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => { setSql(q.sql); setWrite(false); setRes(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab === 'saved' ? q.name : q.sql}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tab === 'saved' ? q.sql : (q.ok ? 'ok' : 'failed') + (q.write ? ' · write' : '') + ' · ' + q.ms + ' ms · ' + new Date(q.created_at).toLocaleString()}
              </div>
            </button>
            {tab === 'saved' && <button type="button" className="neu-btn" aria-label="Delete saved query" onClick={() => del(q.id)}>✕</button>}
          </div>
        ))}
      </div>

      <ConfirmDialog open={askWrite} danger busy={busy} title="Run a statement that can change data?" confirmText="Run now" typeToConfirm="WRITE"
        message="This runs against the live database and cannot be undone. It is recorded in the audit log." onConfirm={run} onCancel={() => setAskWrite(false)} />
    </div>
  );
}
