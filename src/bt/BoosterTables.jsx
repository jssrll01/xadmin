import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp, call, useLoad, Shell, Stat, Grid } from '../tw/pages.jsx';

const NUM = /^(integer|bigint|smallint|numeric|real|double precision)$/;
const toStr = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const sm = { padding: '5px 12px', fontSize: 12 };
const PS = 25;

function conv(raw, c) {
  if (c.type === 'boolean') return raw === 'true';
  if (raw === '') return c.null ? null : undefined;
  if (NUM.test(c.type)) { const n = Number(raw); if (!Number.isFinite(n)) throw new Error(c.n + ' must be a number'); return n; }
  if (c.type === 'json' || c.type === 'jsonb' || c.type === 'ARRAY') { try { return JSON.parse(raw); } catch (e) { throw new Error(c.n + ' must be valid JSON'); } }
  return raw;
}

export default function BoosterTables() {
  const { show } = useToast();
  const sc = useLoad(async () => { const d = await call('admin_bt_tables'); return Array.isArray(d) ? d : []; });
  const tables = sc.rows || [];
  const [table, setTable] = useState('');
  useEffect(() => { if (!table && tables.length) setTable(tables[0].t); }, [tables, table]);
  const cur = tables.find((x) => x.t === table);
  const cols = (cur && cur.cols) || [];
  const pk = (cols.filter((c) => c.pk).length === 1 && cols.find((c) => c.pk).n) || '';
  const hasCreated = cols.some((c) => c.n === 'created_at');
  const data = useLoad(async () => {
    if (!table) return [];
    const d = await call('admin_sv_read', { p_table: table, p_limit: 5000, p_order: hasCreated ? 'created_at' : null });
    return Array.isArray(d) ? d : [];
  }, [table]);
  const rows = data.rows || [];
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const t = q.trim().toLowerCase();
  const list = useMemo(() => rows.filter((r) => !t || JSON.stringify(r).toLowerCase().includes(t)), [rows, t]);
  const shown = list.slice(page * PS, page * PS + PS);
  const dcols = cols.filter((c) => !['json', 'jsonb', 'ARRAY'].includes(c.type)).slice(0, 7);

  const openEdit = (row) => { const d = {}; cols.forEach((c) => { d[c.n] = row ? toStr(row[c.n]) : ''; }); setDraft(d); setEdit(row || 'new'); };
  const save = async () => {
    setBusy(true);
    try {
      const row = {};
      cols.forEach((c) => {
        const raw = draft[c.n] ?? '';
        if (edit === 'new') { if (raw === '' && (c.def || c.null)) return; const v = conv(raw, c); if (v !== undefined) row[c.n] = v; }
        else if (!c.pk && raw !== toStr(edit[c.n])) { const v = conv(raw, c); if (v !== undefined) row[c.n] = v; }
      });
      if (!Object.keys(row).length) { show?.('Nothing changed.', 'error'); setBusy(false); return; }
      if (edit !== 'new' && !window.confirm('Update ' + Object.keys(row).join(', ') + '?')) { setBusy(false); return; }
      await call('admin_bt_write', { p_table: table, p_op: edit === 'new' ? 'insert' : 'update', p_row: row, p_val: edit === 'new' ? null : String(edit[pk]) });
      show?.('Saved', 'success'); setEdit(null); data.reload();
    } catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  const del = async (row) => {
    if (window.prompt('Permanently delete this row from ' + table + '?\nType DELETE to confirm.') !== 'DELETE') return;
    try { await call('admin_bt_write', { p_table: table, p_op: 'delete', p_val: String(row[pk]) }); show?.('Deleted', 'success'); data.reload(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const field = (c) => {
    const v = draft[c.n] ?? ''; const set = (x) => setDraft({ ...draft, [c.n]: x });
    const locked = edit !== 'new' && c.pk;
    if (c.type === 'boolean') return <select style={{ ...inp, width: '100%' }} value={v} disabled={locked} onChange={(e) => set(e.target.value)}>{c.null && <option value="">(null)</option>}<option value="true">true</option><option value="false">false</option></select>;
    if (['json', 'jsonb', 'ARRAY'].includes(c.type) || v.length > 80) return <textarea style={{ ...inp, width: '100%', minHeight: 70, fontFamily: 'monospace' }} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
    return <input style={{ ...inp, width: '100%' }} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
  };
  const reload = () => { sc.reload(); data.reload(); };

  return (
    <Shell title="Booster tables" sub="Browse, create, edit and delete rows in the Social Booster tables." onRefresh={reload} loading={sc.loading || data.loading} err={sc.err || data.err}>
      {!sc.loading && !sc.err && tables.length === 0 && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>No tables with “booster” in the name were found. If this says the function does not exist, run the SQL first.</div>}
      {tables.length > 0 && <div style={{ ...card, fontSize: 13 }}>Found {tables.length} table(s): <b>{tables.map((x) => x.t).join(', ')}</b>.{tables.length !== 3 && ' You expected 3, so one may be named without “booster”. Tell me its name and I will include it.'}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {tables.map((x) => <button key={x.t} className="neu-btn" onClick={() => { setTable(x.t); setQ(''); setPage(0); }} style={{ padding: '8px 14px', fontWeight: 700, opacity: x.t === table ? 1 : .6 }}>{x.t}</button>)}
      </div>
      {table && <>
        <Grid><Stat label="Rows loaded" value={rows.length} sub={rows.length >= 5000 ? 'Capped at 5000, newest first' : ''} /><Stat label="Columns" value={cols.length} /><Stat label="Primary key" value={pk || 'none'} /></Grid>
        <div style={{ ...card, color: '#F59E0B', fontSize: 12 }}>Edits here change the stored row only. Changing an order’s status or price this way does not refund, charge or notify anyone. Use the Booster Orders and Queue pages for normal order handling.</div>
        {!pk && cols.length > 0 && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>This table has no single-column primary key, so rows can be read and created but not edited or deleted.</div>}
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Search rows" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <button className="neu-btn" style={{ ...sm, fontWeight: 700 }} onClick={() => openEdit(null)}>+ Create</button>
        </div>
        <div style={{ ...card, overflowX: 'auto', padding: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{dcols.map((c) => <th key={c.n} style={{ textAlign: 'left', padding: '8px 10px', color: '#8a93a3', whiteSpace: 'nowrap' }}>{c.n}</th>)}<th /></tr></thead>
            <tbody>{shown.map((r, i) => (
              <tr key={String(r[pk] ?? i)}>
                {dcols.map((c) => <td key={c.n} style={{ padding: '8px 10px', borderTop: '1px solid rgba(0,0,0,.07)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toStr(r[c.n]).slice(0, 60)}</td>)}
                <td style={{ padding: '8px 10px', borderTop: '1px solid rgba(0,0,0,.07)', whiteSpace: 'nowrap' }}>
                  <button className="neu-btn" style={sm} onClick={() => openEdit(r)}>{pk ? 'Edit' : 'View'}</button>{' '}
                  {pk && <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => del(r)}>Delete</button>}
                </td>
              </tr>))}</tbody>
          </table>
          {!data.loading && list.length === 0 && <div style={{ padding: 14, opacity: .7, fontSize: 13 }}>No rows.</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <button className="neu-btn" style={sm} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
          <span>{list.length ? page * PS + 1 : 0}–{Math.min(list.length, page * PS + PS)} of {list.length}</span>
          <button className="neu-btn" style={sm} disabled={(page + 1) * PS >= list.length} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Create row in ' + table : 'Row in ' + table} wide>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {cols.map((c) => (
            <label key={c.n} style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              <b>{c.n}</b> <span style={{ color: '#8a93a3' }}>{c.type}{c.pk ? ' · primary key' : ''}{c.def ? ' · has default' : ''}{!c.null && !c.def ? ' · required' : ''}</span>
              {field(c)}
            </label>))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="neu-btn neu-btn-success" style={{ padding: '8px 16px', fontWeight: 700 }} disabled={busy || (edit !== 'new' && !pk)} onClick={save}>{busy ? 'Saving…' : edit === 'new' ? 'Create' : 'Save changes'}</button>
          <button className="neu-btn" style={{ padding: '8px 16px' }} onClick={() => setEdit(null)}>Close</button>
        </div>
        {edit === 'new' && <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 6 }}>Leave a field empty to use its default (or null).</div>}
      </Modal>
    </Shell>
  );
}
