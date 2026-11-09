import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Plus, X, Save, Eraser, Trash2, Copy } from 'lucide-react';
import { adm } from './db.js';
import { ConfirmDialog, LoadingBtn, useXaToast, SkRows, Badge, EmptyState } from './Kit.jsx';

function splitSql(src) {
  const out = []; let cur = ''; let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i]; const two = src.slice(i, i + 2);
    if (two === '--') { const e = src.indexOf('\n', i); const t = e < 0 ? n : e; cur += src.slice(i, t); i = t; continue; }
    if (two === '/*') { const e = src.indexOf('*/', i + 2); const t = e < 0 ? n : e + 2; cur += src.slice(i, t); i = t; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < n) { if (src[j] === c) { if (src[j + 1] === c) { j += 2; continue; } break; } j++; } cur += src.slice(i, j + 1); i = j + 1; continue; }
    if (c === '$') { const m = /^\$[A-Za-z_]*\$/.exec(src.slice(i)); if (m) { const e = src.indexOf(m[0], i + m[0].length); const t = e < 0 ? n : e + m[0].length; cur += src.slice(i, t); i = t; continue; } }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((x) => x.replace(/--[^\n]*/g, '').trim());
}

// Statements that can wipe data in one go get a plain one-click confirmation (no typing).
function isDestructive(stmt) {
  const s = stmt.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase();
  if (/^(drop|truncate)\b/.test(s)) return true;
  if (/^(delete|update)\b/.test(s) && !/\bwhere\b/.test(s)) return true;
  return false;
}

const cell = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const STORE = 'xa_sql_tabs_v1';
let seq = 1;
const newTab = (sql, name) => ({ id: 't' + Date.now().toString(36) + (seq++), name: name || 'Query ' + seq, sql: sql || '', write: false, res: null });

function loadTabs(first) {
  if (first) return { tabs: [newTab(first, 'Query 1')], active: 0 };
  try {
    const j = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (j && Array.isArray(j.tabs) && j.tabs.length) {
      return { tabs: j.tabs.map((t) => ({ id: String(t.id), name: String(t.name || 'Query'), sql: String(t.sql || ''), write: false, res: null })), active: Math.min(j.active || 0, j.tabs.length - 1) };
    }
  } catch (e) { /* storage unavailable */ }
  return { tabs: [newTab('select * from profiles limit 10', 'Query 1')], active: 0 };
}

export default function SqlEditor() {
  const loc = useLocation();
  const { push } = useXaToast();
  const init = useRef(null);
  if (!init.current) init.current = loadTabs(loc.state && loc.state.sql);
  const [tabs, setTabs] = useState(init.current.tabs);
  const [active, setActive] = useState(init.current.active);
  const [busy, setBusy] = useState(false);
  const [askRun, setAskRun] = useState(false);
  const [saved, setSaved] = useState(null);
  const [hist, setHist] = useState(null);
  const [list, setList] = useState('saved');

  const cur = tabs[active] || tabs[0];
  const patch = useCallback((id, p) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t))), []);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ active, tabs: tabs.map((t) => ({ id: t.id, name: t.name, sql: t.sql })) })); } catch (e) { /* ignore */ }
  }, [tabs, active]);

  const loadMeta = useCallback(async () => {
    try { setSaved(await adm('adm_sql_meta', { p_action: 'saved' })); setHist(await adm('adm_sql_meta', { p_action: 'history' })); }
    catch (e) { push(e.message, 'error'); setSaved([]); setHist([]); }
  }, [push]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const run = useCallback(async () => {
    if (busy || !cur) return;
    const id = cur.id; const write = cur.write;
    setBusy(true); setAskRun(false);
    const parts = splitSql(cur.sql);
    if (!parts.length) { patch(id, { res: { ok: false, error: 'Nothing to run.' } }); setBusy(false); return; }
    let last = null;
    try {
      for (let k = 0; k < parts.length; k++) {
        let r;
        try { r = await adm('adm_sql', { p_sql: parts[k], p_write: write }); }
        catch (e) { r = { ok: false, error: e.message }; }
        if (!r || r.ok === false) { last = { ok: false, error: (parts.length > 1 ? 'Statement ' + (k + 1) + ' of ' + parts.length + ' failed (earlier ones already ran):\n' : '') + ((r && r.error) || 'Failed') }; break; }
        last = r;
      }
      if (last && last.ok && parts.length > 1) push('Ran ' + parts.length + ' statements. Showing the last result.', 'success', 3000);
      patch(id, { res: last }); await loadMeta();
    } catch (e) { patch(id, { res: { ok: false, error: e.message } }); }
    setBusy(false);
  }, [busy, cur, patch, loadMeta, push]);

  const go = () => {
    if (!cur) return;
    if (cur.write && splitSql(cur.sql).some(isDestructive)) setAskRun(true); else run();
  };

  const addTab = (sql, name) => {
    const t = newTab(sql || '', name);
    t.name = name || 'Query ' + (tabs.length + 1);
    setTabs((ts) => [...ts, t]); setActive(tabs.length);
  };
  const closeTab = (idx) => {
    if (tabs.length === 1) { patch(tabs[0].id, { sql: '', res: null, write: false }); return; }
    setTabs((ts) => ts.filter((_, i) => i !== idx));
    setActive((a) => (idx < a ? a - 1 : Math.min(a, tabs.length - 2)));
  };
  const rename = (idx) => { const n = window.prompt('Tab name:', tabs[idx].name); if (n && n.trim()) patch(tabs[idx].id, { name: n.trim().slice(0, 30) }); };

  const save = async () => {
    const name = window.prompt('Name this query:', cur.name);
    if (!name) return;
    try { await adm('adm_sql_meta', { p_action: 'save', p_name: name, p_sql: cur.sql }); push('Saved', 'success'); loadMeta(); } catch (e) { push(e.message, 'error'); }
  };
  const meta = async (action, id) => { try { await adm('adm_sql_meta', { p_action: action, p_id: id || null }); loadMeta(); } catch (e) { push(e.message, 'error'); } };
  const csvText = () => {
    const rs = (cur.res && cur.res.rows) || []; if (!rs.length) return '';
    const hs = Object.keys(rs[0]);
    const esc = (v) => {
      let t = cell(v);
      if (typeof v === 'string' && /^[=+@-]/.test(t)) t = "'" + t;
      return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    return [hs.map(esc).join(',')].concat(rs.map((r) => hs.map((h) => esc(r[h])).join(','))).join('\n');
  };
  const csv = () => {
    const text = csvText(); if (!text) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = 'query-result.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  const copyCsv = async () => {
    const text = csvText(); if (!text) return;
    const n = ((cur.res && cur.res.rows) || []).length;
    try { await navigator.clipboard.writeText(text); push('Copied ' + n + ' row' + (n === 1 ? '' : 's') + ' as CSV', 'success', 2500); }
    catch (e) { csv(); push('Clipboard is blocked here, so the CSV was downloaded instead.', 'info', 4000); }
  };

  const res = cur.res;
  const rows = (res && res.rows) || [];
  const heads = rows.length ? Object.keys(rows[0]) : [];
  const items = list === 'saved' ? saved : hist;
  const write = cur.write;

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>SQL editor</h2>
        <Badge tone={write ? 'bad' : 'ok'}>{write ? 'WRITE MODE' : 'read-only'}</Badge>
        <label style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={write} onChange={(e) => patch(cur.id, { write: e.target.checked, res: null })} /> Allow changes
        </label>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }} role="tablist" aria-label="Queries">
        {tabs.map((t, i) => (
          <div key={t.id} role="tab" aria-selected={i === active} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', borderRadius: 10, border: '1px solid var(--border)', background: i === active ? 'var(--surface-2)' : 'transparent', outline: i === active ? '2px solid var(--primary)' : 'none' }}>
            <button type="button" onClick={() => setActive(i)} onDoubleClick={() => rename(i)} title="Double-click to rename" style={{ padding: '7px 4px 7px 12px', fontSize: 13, fontWeight: 700, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}{t.write ? ' ·W' : ''}</button>
            <button type="button" aria-label={'Close ' + t.name} onClick={() => closeTab(i)} style={{ padding: '7px 8px', display: 'flex' }}><X size={13} /></button>
          </div>
        ))}
        <button type="button" className="neu-btn" aria-label="New query tab" onClick={() => addTab('', null)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> New</button>
      </div>

      <div className="neu-card" style={{ padding: 12, marginBottom: 12 }}>
        <textarea className="xa-input" rows={7} spellCheck={false} value={cur.sql} aria-label="SQL query"
          onChange={(e) => patch(cur.id, { sql: e.target.value })} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); go(); } }}
          style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <LoadingBtn variant={write ? 'danger' : 'primary'} loading={busy} onClick={go}><Play size={14} style={{ marginRight: 6, verticalAlign: -2 }} />{write ? 'Run (changes data)' : 'Run'}</LoadingBtn>
          <button type="button" className="neu-btn" onClick={save}><Save size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Save query</button>
          <button type="button" className="neu-btn" onClick={() => patch(cur.id, { sql: '', res: null })} aria-label="Clear editor"><Eraser size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Clear</button>
          <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Ctrl+Enter to run · statements run in order · 500 rows max</span>
        </div>
      </div>

      <div className="neu-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)', minHeight: 44 }}>
          <b style={{ fontSize: 13 }}>Result</b>
          {res && res.ok && <Badge>{res.count} row{res.count === 1 ? '' : 's'} · {res.ms} ms</Badge>}
          {res && res.ok && rows.length > 0 && <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><button type="button" className="neu-btn" onClick={copyCsv}><Copy size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Copy CSV</button><button type="button" className="neu-btn" onClick={csv}>Export CSV</button></span>}
        </div>
        {busy && <div style={{ padding: 8 }}><SkRows rows={5} cols={4} /></div>}
        {!busy && !res && <EmptyState title="No result yet" hint="Run a query to see rows here." />}
        {!busy && res && !res.ok && <div style={{ padding: 14, color: 'var(--danger)', fontSize: 13, fontWeight: 600, whiteSpace: 'pre-wrap' }}>{res.error}</div>}
        {!busy && res && res.ok && rows.length === 0 && <EmptyState title={write && res.count ? res.count + ' row(s) affected' : 'Done. No rows returned'} />}
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['saved', 'Saved queries'], ['history', 'History']].map(([id, l]) => <button key={id} type="button" className="neu-btn" onClick={() => setList(id)} style={{ opacity: list === id ? 1 : .6, outline: list === id ? '2px solid var(--primary)' : 'none' }}>{l}</button>)}
          {list === 'history' && hist && hist.length > 0 && <button type="button" className="neu-btn" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => meta('clear_history')}><Trash2 size={14} /> Clear history</button>}
        </div>
        {!items && <SkRows rows={3} cols={2} />}
        {items && items.length === 0 && <EmptyState title={list === 'saved' ? 'No saved queries' : 'No history yet'} />}
        {items && items.map((q) => (
          <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => { patch(cur.id, { sql: q.sql, write: false, res: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list === 'saved' ? q.name : q.sql}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {list === 'saved' ? q.sql : (q.ok ? 'ok' : 'failed') + (q.write ? ' · write' : '') + ' · ' + q.ms + ' ms · ' + new Date(q.created_at).toLocaleString()}
              </div>
            </button>
            <button type="button" className="neu-btn" title="Open in a new tab" aria-label="Open in a new tab" onClick={() => addTab(q.sql, list === 'saved' ? q.name : null)}><Plus size={14} /></button>
            <button type="button" className="neu-btn" aria-label="Delete" onClick={() => meta(list === 'saved' ? 'delete' : 'delete_history', q.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <ConfirmDialog open={askRun} danger busy={busy} title="This can remove or rewrite lots of data" confirmText="Run anyway"
        message="The statement drops or truncates something, or has no WHERE clause. It runs on the live database and is recorded in the audit log."
        onConfirm={run} onCancel={() => setAskRun(false)} />
    </div>
  );
}
