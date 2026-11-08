import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, RefreshCw, Columns, Filter, X, ChevronLeft, ChevronRight, RotateCcw, Edit2, Download, Upload } from 'lucide-react';
import { adm, getTables, pkOf, pkKey, typeKind, parseCell, showCell, short } from './db.js';
import ImportDialog from './ImportDialog.jsx';
import { SkRows, ErrorState, EmptyState, ConfirmDialog, LoadingBtn, useXaToast, Badge } from './Kit.jsx';

const PAGE = 25;
const OPS = [['has', 'contains'], ['eq', 'equals'], ['neq', 'not equal'], ['gt', '>'], ['gte', '≥'], ['lt', '<'], ['lte', '≤'], ['null', 'is empty'], ['notnull', 'is set']];

export default function DbTable() {
  const { table } = useParams();
  const nav = useNavigate();
  const { push } = useXaToast();
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState({ col: null, dir: 'desc' });
  const [search, setSearch] = useState('');
  const [dq, setDq] = useState('');
  const [filters, setFilters] = useState([]);
  const [showDel, setShowDel] = useState(false);
  const [hidden, setHidden] = useState([]);
  const [sel, setSel] = useState({});
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState('');
  const [cellEdit, setCellEdit] = useState(null);
  const [imp, setImp] = useState(false);
  const escRef = useRef(false);
  const reqId = useRef(0);

  useEffect(() => { getTables().then((all) => { const m = all.find((t) => t.name === table); if (!m) setErr('Unknown table: ' + table); else { setMeta(m); } }).catch((e) => setErr(e.message)); }, [table]);
  useEffect(() => { setPage(0); setSel({}); setFilters([]); setSearch(''); setDq(''); setOrder({ col: null, dir: 'desc' }); setShowDel(false); try { setHidden(JSON.parse(localStorage.getItem('xa_cols_' + table) || '[]')); } catch (e) { setHidden([]); } }, [table]);
  useEffect(() => { const t = setTimeout(() => { setDq(search); setPage(0); }, 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    if (!meta) return;
    const my = ++reqId.current;
    setErr('');
    try {
      const r = await adm('adm_rows', { p_table: table, p_limit: PAGE, p_offset: page * PAGE, p_order: order.col, p_dir: order.dir, p_filters: filters.filter((f) => f.col && f.op), p_search: dq || null, p_show_deleted: showDel });
      if (my !== reqId.current) return;
      setRows(r.rows || []); setTotal(Number(r.total || 0));
    } catch (e) { if (my === reqId.current) { setErr(e.message); setRows([]); } }
  }, [meta, table, page, order, filters, dq, showDel]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const cols = useMemo(() => (meta ? meta.cols : []), [meta]);
  const visible = cols.filter((c) => !hidden.includes(c.name));
  const canWrite = meta && meta.kind === 'r' && meta.pk.length > 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const selected = (rows || []).filter((r) => sel[pkKey(meta, r)]);
  const kindOf = (c) => typeKind(c.type, !!c.enum);
  const toggleHidden = (n) => { const next = hidden.includes(n) ? hidden.filter((x) => x !== n) : [...hidden, n]; setHidden(next); try { localStorage.setItem('xa_cols_' + table, JSON.stringify(next)); } catch (e) { /* ignore */ } };
  const sortBy = (c) => { setOrder((o) => (o.col === c ? { col: c, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col: c, dir: 'asc' })); setPage(0); };

  const openNew = (base) => {
    const f = {}; cols.forEach((c) => { const k = kindOf(c); const src = base ? base[c.name] : undefined; f[c.name] = src !== undefined ? showCell(k, src) : ''; });
    if (base) (meta.pk || []).forEach((k) => { f[k] = ''; });
    setEdit({ isNew: true, form: f, orig: null });
  };
  const openEdit = (row) => { const f = {}; cols.forEach((c) => { f[c.name] = showCell(kindOf(c), row[c.name]); }); setEdit({ isNew: false, form: f, orig: row }); };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {};
      cols.forEach((c) => {
        const k = kindOf(c); const v = edit.form[c.name];
        if (edit.isNew) {
          if (v === '' || v === undefined) return;
          payload[c.name] = parseCell(k, v, c.nullable);
        } else {
          const before = showCell(k, edit.orig[c.name]);
          if (v === before) return;
          payload[c.name] = parseCell(k, v, c.nullable);
        }
      });
      if (!edit.isNew && Object.keys(payload).length === 0) { setEdit(null); setBusy(false); return; }
      if (edit.isNew) await adm('adm_insert', { p_table: table, p_payload: payload });
      else await adm('adm_update', { p_table: table, p_pk: pkOf(meta, edit.orig), p_payload: payload });
      push(edit.isNew ? 'Row created' : 'Row updated', 'success');
      setEdit(null); await load();
    } catch (e) { push(e.message, 'error', 6000); }
    setBusy(false);
  };

  const askDelete = async (list) => {
    if (!list.length) return;
    let deps = [];
    if (list.length === 1) { try { deps = await adm('adm_dependents', { p_table: table, p_pk: pkOf(meta, list[0]) }); } catch (e) { /* ignore */ } }
    setConfirm({ list, deps });
  };
  const doDelete = async (hard) => {
    setBusy(true);
    try {
      const pks = confirm.list.map((r) => pkOf(meta, r));
      if (pks.length === 1) await adm('adm_delete', { p_table: table, p_pk: pks[0], p_hard: hard });
      else await adm('adm_bulk_delete', { p_table: table, p_pks: pks, p_hard: hard });
      push((meta.soft_delete && !hard ? 'Moved to deleted' : 'Deleted') + ' · ' + pks.length + ' row' + (pks.length > 1 ? 's' : ''), 'success');
      setConfirm(null); setSel({}); await load();
    } catch (e) { push(e.message, 'error', 7000); }
    setBusy(false);
  };
  const restore = async (row) => { try { await adm('adm_restore', { p_table: table, p_pk: pkOf(meta, row) }); push('Restored', 'success'); await load(); } catch (e) { push(e.message, 'error'); } };

  const BAL = ['xwallet_balance', 'real_balance', 'demo_balance'];
  const startCell = (r, c, k, gone) => {
    if (!canWrite || gone || meta.pk.includes(c.name) || BAL.includes(c.name)) return;
    const kd = kindOf(c);
    if (kd === 'json' || kd === 'array') return;
    setCellEdit({ k, col: c.name, val: showCell(kd, r[c.name]), row: r });
  };
  const saveCell = async (override) => {
    const ce = cellEdit; if (!ce) return;
    const c = cols.find((x) => x.name === ce.col); const kd = kindOf(c);
    const raw = override !== undefined ? override : ce.val;
    setCellEdit(null);
    if (raw === showCell(kd, ce.row[ce.col])) return;
    let parsed;
    try { parsed = parseCell(kd, raw, c.nullable); } catch (e) { push(e.message, 'error'); return; }
    const prev = ce.row[ce.col];
    setRows((a) => (a || []).map((x) => (pkKey(meta, x) === ce.k ? { ...x, [ce.col]: parsed } : x)));
    try { await adm('adm_update', { p_table: table, p_pk: pkOf(meta, ce.row), p_payload: { [ce.col]: parsed } }); push('Saved', 'success', 1800); }
    catch (e) { setRows((a) => (a || []).map((x) => (pkKey(meta, x) === ce.k ? { ...x, [ce.col]: prev } : x))); push(e.message, 'error', 6000); }
  };
  const exportCsv = () => {
    const names = visible.map((c) => c.name);
    const esc = (v) => { const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [names.join(',')].concat((rows || []).map((r) => names.map((n) => esc(r[n])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = table + '-page-' + (page + 1) + '.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  if (err && !meta) return <div style={{ padding: 4 }}><button type="button" className="neu-btn" onClick={() => nav('/db')}><ArrowLeft size={14} /> Tables</button><ErrorState message={err} /></div>;
  if (!meta) return <div style={{ padding: 4 }}><div className="neu-card"><SkRows rows={8} cols={5} /></div></div>;

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="neu-btn" onClick={() => nav('/db')} aria-label="Back to tables"><ArrowLeft size={14} /></button>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{table}</h2>
        <Badge>{total.toLocaleString()} rows</Badge>
        {meta.kind !== 'r' && <Badge>read-only view</Badge>}
        {!canWrite && meta.kind === 'r' && <Badge tone="warn">no primary key: read-only</Badge>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="neu-btn" onClick={() => setPanel(panel === 'filters' ? '' : 'filters')}><Filter size={14} /> Filters{filters.length ? ' (' + filters.length + ')' : ''}</button>
          <button type="button" className="neu-btn" onClick={() => setPanel(panel === 'cols' ? '' : 'cols')}><Columns size={14} /> Columns</button>
          <button type="button" className="neu-btn" onClick={exportCsv} aria-label="Export this page as CSV"><Download size={14} /></button>
          <button type="button" className="neu-btn" onClick={() => { setRows(null); load(); }} aria-label="Refresh"><RefreshCw size={14} /></button>
          {canWrite && <button type="button" className="neu-btn" onClick={() => setImp(true)}><Upload size={14} /> Import</button>}
          {canWrite && <button type="button" className="neu-btn neu-btn-primary" onClick={() => openNew(null)}><Plus size={14} /> New</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="xa-input" style={{ flex: '1 1 220px' }} placeholder="Search every column…" aria-label="Search rows" value={search} onChange={(e) => setSearch(e.target.value)} />
        {meta.soft_delete && <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={showDel} onChange={(e) => { setShowDel(e.target.checked); setPage(0); }} /> Show deleted</label>}
      </div>

      {panel === 'filters' && (
        <div className="neu-card" style={{ marginBottom: 10, padding: 12 }}>
          {filters.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <select className="xa-input" style={{ width: 'auto', flex: '1 1 130px' }} value={f.col} aria-label="Column" onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, col: e.target.value } : x)))}>
                {cols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <select className="xa-input" style={{ width: 'auto', flex: '0 1 120px' }} value={f.op} aria-label="Operator" onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}>
                {OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {f.op !== 'null' && f.op !== 'notnull' && <input className="xa-input" style={{ flex: '1 1 140px', width: 'auto' }} value={f.val || ''} aria-label="Value" onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, val: e.target.value } : x)))} />}
              <button type="button" className="neu-btn" aria-label="Remove filter" onClick={() => { setFilters(filters.filter((_, j) => j !== i)); setPage(0); }}><X size={14} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="neu-btn" onClick={() => setFilters([...filters, { col: cols[0].name, op: 'has', val: '' }])}><Plus size={14} /> Add filter</button>
            <button type="button" className="neu-btn neu-btn-primary" onClick={() => { setPage(0); setRows(null); load(); }}>Apply</button>
          </div>
        </div>
      )}
      {panel === 'cols' && (
        <div className="neu-card" style={{ marginBottom: 10, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {cols.map((c) => <label key={c.name} style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={!hidden.includes(c.name)} onChange={() => toggleHidden(c.name)} />{c.name}</label>)}
        </div>
      )}

      {selected.length > 0 && canWrite && (
        <div className="neu-card" style={{ marginBottom: 10, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <b style={{ fontSize: 13 }}>{selected.length} selected</b>
          <button type="button" className="neu-btn neu-btn-danger" onClick={() => askDelete(selected)}><Trash2 size={14} /> Delete</button>
          <button type="button" className="neu-btn" onClick={() => setSel({})}>Clear</button>
        </div>
      )}

      <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
        {err && <ErrorState message={err} onRetry={load} />}
        {!err && rows === null && <div style={{ padding: 8 }}><SkRows rows={8} cols={Math.min(visible.length + 1, 6)} /></div>}
        {!err && rows && rows.length === 0 && <EmptyState title="No rows" hint={dq || filters.length ? 'Try clearing the search or filters.' : 'This table is empty.'} />}
        {!err && rows && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
                  {canWrite && <th style={{ padding: 10, width: 34 }}><input type="checkbox" aria-label="Select all on this page" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => { const n = {}; if (e.target.checked) rows.forEach((r) => { n[pkKey(meta, r)] = true; }); setSel(n); }} /></th>}
                  {visible.map((c) => (
                    <th key={c.name} style={{ padding: '10px 10px', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12 }} onClick={() => sortBy(c.name)} aria-sort={order.col === c.name ? (order.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      {c.name}{order.col === c.name ? (order.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  {canWrite && <th style={{ width: 130 }} />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const k = pkKey(meta, r); const gone = meta.soft_delete && r.deleted_at;
                  return (
                    <tr key={k || JSON.stringify(r).slice(0, 80)} style={{ borderTop: '1px solid var(--border)', opacity: gone ? 0.55 : 1 }}>
                      {canWrite && <td style={{ padding: 10 }}><input type="checkbox" aria-label="Select row" checked={!!sel[k]} onChange={(e) => setSel({ ...sel, [k]: e.target.checked })} /></td>}
                      {visible.map((c) => {
                        const v = r[c.name]; const kind = kindOf(c);
                        return (
                          <td key={c.name} onDoubleClick={() => startCell(r, c, k, gone)} style={{ padding: '9px 10px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')}>
                            {cellEdit && cellEdit.k === k && cellEdit.col === c.name ? (
                              kind === 'bool' || kind === 'enum' ? (
                                <select autoFocus className="xa-input" style={{ padding: '4px 6px' }} value={cellEdit.val} aria-label="Edit value" onChange={(e) => saveCell(e.target.value)} onBlur={() => setCellEdit(null)}>
                                  {kind === 'bool' ? <><option value="true">true</option><option value="false">false</option></> : <>{c.nullable && <option value="">(empty)</option>}{c.enum.map((o) => <option key={o} value={o}>{o}</option>)}</>}
                                </select>
                              ) : (
                                <input autoFocus className="xa-input" style={{ padding: '4px 8px', minWidth: 120 }} type={kind === 'number' ? 'number' : 'text'} step="any" value={cellEdit.val} aria-label="Edit value"
                                  onChange={(e) => setCellEdit({ ...cellEdit, val: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveCell(); else if (e.key === 'Escape') { escRef.current = true; setCellEdit(null); } }}
                                  onBlur={() => { if (escRef.current) { escRef.current = false; return; } saveCell(); }} />
                              )
                            ) : v === null || v === undefined ? <span style={{ color: 'var(--text-dim)' }}>null</span>
                              : kind === 'bool' ? <Badge tone={v ? 'ok' : undefined}>{String(v)}</Badge>
                              : /^https?:\/\/\S+\.(png|jpe?g|webp|gif)/i.test(String(v)) ? <img src={v} alt="" style={{ height: 28, borderRadius: 6, verticalAlign: 'middle' }} loading="lazy" />
                              : short(v)}
                          </td>
                        );
                      })}
                      {canWrite && (
                        <td style={{ padding: 8, whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {gone ? <button type="button" className="neu-btn" onClick={() => restore(r)} aria-label="Restore"><RotateCcw size={13} /></button> : (<>
                            <button type="button" className="neu-btn" onClick={() => openEdit(r)} aria-label="Edit"><Edit2 size={13} /></button>{' '}
                            <button type="button" className="neu-btn" onClick={() => openNew(r)} aria-label="Duplicate"><Copy size={13} /></button>{' '}
                            <button type="button" className="neu-btn neu-btn-danger" onClick={() => askDelete([r])} aria-label="Delete"><Trash2 size={13} /></button>
                          </>)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
        <button type="button" className="neu-btn" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Page {page + 1} of {pages}</span>
        <button type="button" className="neu-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
      </div>

      {edit && (
        <div className="xa-ov center" onClick={() => !busy && setEdit(null)}>
          <div className="xa-dialog" style={{ maxWidth: 560, maxHeight: '88vh', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-label={edit.isNew ? 'New row' : 'Edit row'} onClick={(e) => e.stopPropagation()}>
            <h3>{edit.isNew ? 'New row' : 'Edit row'} <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 13 }}>· {table}</span></h3>
            {cols.map((c) => {
              const kind = kindOf(c); const v = edit.form[c.name] ?? ''; const lockedPk = !edit.isNew && meta.pk.includes(c.name);
              const set = (nv) => setEdit({ ...edit, form: { ...edit.form, [c.name]: nv } });
              const isBal = ['xwallet_balance', 'real_balance', 'demo_balance'].includes(c.name);
              return (
                <div key={c.name} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                    {c.name} <span style={{ fontWeight: 500 }}>· {c.type}{c.nullable ? '' : ' · required'}{c.default && edit.isNew ? ' · default' : ''}</span>
                  </label>
                  {kind === 'enum' ? (
                    <select className="xa-input" value={v} disabled={lockedPk} onChange={(e) => set(e.target.value)}><option value="">{edit.isNew ? '(default)' : '(empty)'}</option>{c.enum.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  ) : kind === 'bool' ? (
                    <select className="xa-input" value={String(v)} disabled={lockedPk} onChange={(e) => set(e.target.value)}><option value="">{edit.isNew ? '(default)' : '(empty)'}</option><option value="true">true</option><option value="false">false</option></select>
                  ) : kind === 'json' || kind === 'array' ? (
                    <textarea className="xa-input" rows={4} style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }} value={v} disabled={lockedPk} onChange={(e) => set(e.target.value)} placeholder={kind === 'array' ? 'one value per line' : 'JSON'} />
                  ) : (
                    <input className="xa-input" type={kind === 'number' ? 'number' : 'text'} step="any" value={v} disabled={lockedPk || isBal} onChange={(e) => set(e.target.value)} placeholder={kind === 'date' ? 'e.g. 2026-11-08T12:00:00+08:00' : ''} />
                  )}
                  {isBal && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>Balances change through the wallet adjustment tool so the ledger stays correct.</div>}
                </div>
              );
            })}
            <div className="row" style={{ marginTop: 6 }}>
              <button type="button" className="neu-btn" disabled={busy} onClick={() => setEdit(null)}>Cancel</button>
              <LoadingBtn variant="primary" loading={busy} onClick={save}>{edit.isNew ? 'Create' : 'Save changes'}</LoadingBtn>
            </div>
          </div>
        </div>
      )}

      {imp && <ImportDialog table={table} meta={meta} onClose={() => setImp(false)} onDone={() => { setImp(false); setPage(0); load(); }} />}
      <ConfirmDialog
        open={!!confirm} danger busy={busy}
        title={confirm ? 'Delete ' + confirm.list.length + ' row' + (confirm.list.length > 1 ? 's' : '') + '?' : ''}
        message={confirm ? (meta.soft_delete ? 'Rows are hidden, not erased, and can be restored. ' : 'This permanently erases the data. ') + (confirm.deps.length ? 'Related data: ' + confirm.deps.map((d) => d.count + ' in ' + d.table + ' (' + d.action + ')').join('; ') + '.' : '') : ''}
        confirmText={meta.soft_delete ? 'Soft delete' : 'Delete permanently'}
        typeToConfirm={confirm && (confirm.list.length > 1 || (!meta.soft_delete && confirm.deps.length > 0)) ? 'DELETE' : undefined}
        onConfirm={() => doDelete(false)} onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
