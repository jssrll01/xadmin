import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Database, Plus, Edit2, Copy, Trash2, Upload, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { useToast } from '../components/Toast.jsx';
import Btn from '../components/Btn.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import DataTable from '../xa/ui/DataTable.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import Switch from '../xa/ui/Switch.jsx';
import { ConfirmDialog, ErrorState, SkCards } from '../xa/Kit.jsx';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin() || import.meta.env.VITE_XADMIN_PIN, ...args });
  if (error) throw error;
  return data;
}
const kind = (c) => (/^(int2|int4|int8|float4|float8|numeric)$/.test(c.type) ? 'num'
  : c.type === 'bool' ? 'bool'
  : /^(json|jsonb)$/.test(c.type) || c.type.startsWith('_') ? 'json'
  : c.type === 'text' ? 'text' : 'str');
const short = (v, n) => { const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return s.length > n ? s.slice(0, n) + '...' : s; };
const cell = (c, v) => (v == null ? <span style={{ opacity: 0.4 }}>null</span> : kind(c) === 'bool' ? (v ? 'true' : 'false') : short(v, 70));

function TableList() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    try { const d = await rpc('admin_tbl_list'); setList(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setList([]); setErr(e.message || 'Failed'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const t = q.trim().toLowerCase();
  const shown = (list || []).filter((x) => !t || x.name.toLowerCase().includes(t));
  return (
    <>
      <PageHeader title="Data Manager" subtitle={list ? list.length + ' tables. Open one to create, edit and delete rows.' : 'Loading tables'} />
      <div className="ui-tools">
        <label className="ui-search"><Search size={15} /><input className="neu-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a table" aria-label="Find a table" /></label>
      </div>
      {list === null && <SkCards n={6} />}
      {err && <ErrorState message={err} onRetry={load} />}
      <div className="dm-grid">
        {shown.map((x) => (
          <button key={x.name} type="button" className="dm-tile" onClick={() => nav('/data/' + encodeURIComponent(x.name))}>
            <b><Database size={15} />{x.name}</b>
            <small>{x.columns.length} columns{x.rows > 0 ? ' · about ' + x.rows.toLocaleString() + ' rows' : ''}{x.pk.length ? '' : ' · no primary key'}</small>
          </button>
        ))}
      </div>
    </>
  );
}

function TableView({ table }) {
  const nav = useNavigate();
  const { show } = useToast();
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [imp, setImp] = useState(null);
  const [busy, setBusy] = useState(false);
  const file = useRef(null);

  const load = useCallback(async () => {
    try {
      const l = await rpc('admin_tbl_list');
      const m = (l || []).find((x) => x.name === table);
      if (!m) { setFailed('Table not found'); setLoading(false); return; }
      setMeta(m);
      const d = await rpc('admin_tbl_select', { p_tbl: table, p_limit: 2000, p_offset: 0 });
      if (!d || d.ok === false) throw new Error((d && d.error) || 'Could not load rows');
      const pk = m.pk || [];
      setRows((d.rows || []).map((r) => ({ ...r, __k: pk.length ? pk.map((k) => String(r[k])).join('|') : r._ctid })));
      setTotal(d.total || 0);
      setFailed('');
    } catch (e) { setFailed(e.message || 'Failed'); } finally { setLoading(false); }
  }, [table]);
  useEffect(() => { load(); }, [load]);

  const cols = meta ? meta.columns : [];
  const editable = cols.filter((c) => !c.generated);
  const pk = meta ? meta.pk : [];
  const keyOf = (r) => (pk.length ? Object.fromEntries(pk.map((k) => [k, r[k]])) : { _ctid: r._ctid });

  const initVals = (row) => {
    const o = {};
    editable.forEach((c) => {
      const v = row ? row[c.name] : undefined;
      const k = kind(c);
      o[c.name] = k === 'bool' ? !!v : k === 'json' ? (v == null ? '' : JSON.stringify(v, null, 2)) : (v == null ? '' : String(v));
    });
    return o;
  };
  const openNew = () => setForm({ mode: 'new', vals: initVals(null), touched: {}, errs: {}, msg: '' });
  const openEdit = (row) => setForm({ mode: 'edit', key: keyOf(row), vals: initVals(row), touched: {}, errs: {}, msg: '' });
  const openDup = (row) => {
    const vals = initVals(row);
    const touched = {};
    editable.forEach((c) => {
      if (pk.includes(c.name)) { vals[c.name] = kind(c) === 'bool' ? false : ''; return; }
      if (vals[c.name] !== '' && vals[c.name] !== false) touched[c.name] = true;
    });
    setForm({ mode: 'new', vals, touched, errs: {}, msg: '' });
  };
  const setVal = (k, v) => setForm((f) => ({ ...f, vals: { ...f.vals, [k]: v }, touched: { ...f.touched, [k]: true }, errs: { ...f.errs, [k]: '' } }));

  const parse = (c, raw) => {
    const k = kind(c);
    if (k === 'bool') return !!raw;
    if (k === 'num') { if (String(raw).trim() === '') return null; const n = Number(raw); if (Number.isNaN(n)) throw new Error('Enter a number'); return n; }
    if (k === 'json') { if (String(raw).trim() === '') return null; try { return JSON.parse(raw); } catch (e) { throw new Error('Not valid JSON'); } }
    if (raw === '') return c.nullable ? null : '';
    return raw;
  };

  const save = async () => {
    const errs = {}; const data = {};
    editable.forEach((c) => {
      if (!form.touched[c.name]) return;
      try {
        const v = parse(c, form.vals[c.name]);
        if (form.mode === 'new' && v === null) return;
        data[c.name] = v;
      } catch (e) { errs[c.name] = e.message; }
    });
    if (form.mode === 'new') editable.forEach((c) => { if (!(c.name in data) && !errs[c.name] && !c.nullable && !c.has_default) errs[c.name] = 'Required'; });
    if (Object.keys(errs).length) { setForm({ ...form, errs, msg: 'Fix the highlighted fields' }); return; }
    if (form.mode === 'edit' && Object.keys(data).length === 0) { setForm({ ...form, msg: 'No changes to save' }); return; }
    setBusy(true);
    try {
      const r = form.mode === 'new'
        ? await rpc('admin_tbl_insert', { p_tbl: table, p_data: data })
        : await rpc('admin_tbl_update', { p_tbl: table, p_key: form.key, p_data: data });
      if (!r || r.ok === false) { setForm({ ...form, msg: (r && r.error) || 'Failed' }); setBusy(false); return; }
      show(form.mode === 'new' ? 'Row created' : 'Row updated', 'success');
      setForm(null);
      load();
    } catch (e) { setForm({ ...form, msg: e.message || 'Failed' }); }
    setBusy(false);
  };

  const delOne = async (r) => {
    const d = await rpc('admin_tbl_delete', { p_tbl: table, p_key: keyOf(r) });
    return d && d.ok !== false ? '' : ((d && d.error) || 'Failed');
  };
  const doDelete = async () => {
    setBusy(true);
    try { const m = await delOne(del); if (m) show(m, 'error'); else show('Row deleted', 'success'); } catch (e) { show(e.message, 'error'); }
    setBusy(false); setDel(null); load();
  };
  const doBulk = async () => {
    setBusy(true);
    let ok = 0; let bad = 0; let last = '';
    for (const r of bulk) { try { const m = await delOne(r); if (m) { bad += 1; last = m; } else ok += 1; } catch (e) { bad += 1; last = e.message; } }
    show(ok + ' deleted' + (bad ? ', ' + bad + ' failed: ' + last : ''), bad ? 'error' : 'success');
    setBusy(false); setBulk(null); load();
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!Array.isArray(j) || !j.length || j.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) throw new Error('bad');
      setImp(j.slice(0, 500));
    } catch (er) { show('The file must be a JSON list of objects', 'error'); }
  };
  const doImport = async () => {
    setBusy(true);
    let ok = 0; let bad = 0; let last = '';
    for (const row of imp) {
      const clean = { ...row }; delete clean._ctid; delete clean.__k;
      try { const r = await rpc('admin_tbl_insert', { p_tbl: table, p_data: clean }); if (r && r.ok !== false) ok += 1; else { bad += 1; last = r && r.error; } } catch (er) { bad += 1; last = er.message; }
    }
    show(ok + ' imported' + (bad ? ', ' + bad + ' failed: ' + last : ''), bad ? 'error' : 'success');
    setBusy(false); setImp(null); load();
  };

  const columns = useMemo(() => cols.map((c, i) => ({
    key: c.name, label: c.name, hidden: i >= 8, wrap: kind(c) === 'json',
    render: (r) => cell(c, r[c.name]), exportValue: (r) => r[c.name],
  })), [cols]);

  const field = (c) => {
    const k = kind(c);
    const v = form.vals[c.name];
    const bad = form.errs[c.name] ? ' bad' : '';
    if (k === 'bool') return <div className="ui-swrow"><span>{v ? 'true' : 'false'}</span><Switch checked={!!v} label={c.name} onChange={(n) => setVal(c.name, n)} /></div>;
    if (k === 'json' || (k === 'text' && String(v).length > 80)) return <textarea className={'neu-input' + bad} rows={k === 'json' ? 5 : 3} value={v} onChange={(e) => setVal(c.name, e.target.value)} spellCheck={false} />;
    return <input className={'neu-input' + bad} inputMode={k === 'num' ? 'decimal' : undefined} value={v} onChange={(e) => setVal(c.name, e.target.value)} placeholder={form.mode === 'new' && c.has_default ? 'default' : ''} />;
  };

  if (!meta && failed) return <><button type="button" className="neu-btn" onClick={() => nav('/data')}><ArrowLeft size={15} /> All tables</button><ErrorState message={failed} onRetry={load} /></>;

  return (
    <>
      <PageHeader title={table} subtitle={total.toLocaleString() + ' rows' + (total > rows.length ? ' (showing the newest ' + rows.length + ')' : '')}
        actions={<>
          <Btn onClick={() => nav('/data')}><ArrowLeft size={15} /> All tables</Btn>
          <Btn onClick={() => file.current && file.current.click()}><Upload size={15} /> Import JSON</Btn>
          <Btn variant="primary" onClick={openNew} disabled={!meta}><Plus size={15} /> New row</Btn>
        </>} />
      <input ref={file} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />

      <DataTable
        columns={columns} rows={rows} rowKey="__k" loading={loading} error={!!failed && !!meta} onRetry={load}
        searchKeys={cols.map((c) => c.name)} exportName={'tbl-' + table} selectable
        bulkActions={[{ label: 'Delete', danger: true, onClick: (r) => setBulk(r) }]}
        emptyHint='Tap "New row" to add the first row.'
        rowActions={(r) => (
          <>
            <button type="button" className="ui-ic" data-tip="Edit" aria-label="Edit" onClick={() => openEdit(r)}><Edit2 size={14} /></button>
            <button type="button" className="ui-ic" data-tip="Duplicate" aria-label="Duplicate" onClick={() => openDup(r)}><Copy size={14} /></button>
            <button type="button" className="ui-ic danger" data-tip="Delete" aria-label="Delete" onClick={() => setDel(r)}><Trash2 size={14} /></button>
          </>
        )}
      />

      <Drawer open={!!form} wide onClose={() => !busy && setForm(null)} title={form ? (form.mode === 'new' ? 'New row in ' : 'Edit row in ') + table : ''}
        footer={form ? <><Btn variant="primary" loading={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</Btn><Btn onClick={() => setForm(null)} disabled={busy}>Cancel</Btn></> : null}>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {form.msg && <div className="ui-err" role="alert" style={{ marginTop: 0 }}>{form.msg}</div>}
            {editable.map((c) => (
              <div key={c.name}>
                <div className="ui-lbl">{c.name} <span style={{ textTransform: 'none', fontWeight: 600, opacity: 0.7 }}>{c.type}{!c.nullable && !c.has_default ? ' · required' : ''}</span></div>
                {field(c)}
                {form.errs[c.name] && <div className="ui-err" role="alert">{form.errs[c.name]}</div>}
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!del} title="Delete this row?" message={'It is removed from ' + table + ' and the change is logged. This cannot be undone.'} confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <ConfirmDialog open={!!bulk} title={'Delete ' + (bulk ? bulk.length : 0) + ' rows?'} message={'Every selected row is removed from ' + table + ' and logged. This cannot be undone.'} confirmText="Delete all" danger typeToConfirm="DELETE" busy={busy} onConfirm={doBulk} onCancel={() => setBulk(null)} />
      <ConfirmDialog open={!!imp} title={'Import ' + (imp ? imp.length : 0) + ' rows?'} message={'Each object becomes a new row in ' + table + '. Rows the table rejects are skipped and counted.'} confirmText="Import" busy={busy} onConfirm={doImport} onCancel={() => setImp(null)} />
    </>
  );
}

export default function DataManager() {
  const { table } = useParams();
  return table ? <TableView key={table} table={decodeURIComponent(table)} /> : <TableList />;
}
