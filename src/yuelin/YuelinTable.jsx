import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ylSupabase as db } from '../supabase.js';
import { useYlTables } from './useYlTables.js';
import { prettify } from './schema.js';
import { S, ACCENT } from './ui.js';

const PAGE = 25;
const isNum = (t) => /int|numeric|decimal|double|real|float|number/i.test(t);
const isBool = (t) => /bool/i.test(t);
const isJson = (t) => /json|\[\]|array/i.test(t);
const IMG = /^https?:\/\/\S+\.(png|jpe?g|webp|gif|svg)(\?\S*)?$/i;

function inferType(v) {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (v && typeof v === 'object') return 'jsonb';
  return 'text';
}

function show(v) {
  if (v === null || v === undefined) return <span style={S.dim}>-</span>;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') {
    const j = JSON.stringify(v);
    return <span title={j}>{j.length > 50 ? j.slice(0, 50) + '...' : j}</span>;
  }
  const s = String(v);
  if (IMG.test(s)) return <img src={s} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8 }} />;
  return <span title={s}>{s.length > 60 ? s.slice(0, 60) + '...' : s}</span>;
}

const toForm = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));

function coerce(c, raw) {
  if (raw === '') return null;
  if (isNum(c.type)) {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error('"' + c.name + '" must be a number');
    return n;
  }
  if (isBool(c.type)) return raw === 'true';
  if (isJson(c.type)) {
    try { return JSON.parse(raw); } catch (e) { throw new Error('"' + c.name + '" must be valid JSON'); }
  }
  return raw;
}

export default function YuelinTable() {
  const { table } = useParams();
  const { tables, loading: schemaLoading } = useYlTables(true);
  const meta = tables.find((t) => t.name === table);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [initial, setInitial] = useState({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('{}');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const cols = useMemo(() => {
    if (meta && meta.columns && meta.columns.length) return meta.columns;
    if (rows[0]) return Object.keys(rows[0]).map((name) => ({ name, type: inferType(rows[0][name]), pk: false }));
    return [];
  }, [meta, rows]);

  const pkCols = useMemo(() => {
    const p = cols.filter((c) => c.pk).map((c) => c.name);
    if (p.length) return p;
    return cols.some((c) => c.name === 'id') ? ['id'] : [];
  }, [cols]);

  const orderCol = useMemo(() => {
    const names = cols.map((c) => c.name);
    if (names.includes('created_at')) return 'created_at';
    return pkCols[0] || null;
  }, [cols, pkCols]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    let q = db.from(table).select('*', { count: 'exact' }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (orderCol) q = q.order(orderCol, { ascending: false });
    const { data, error, count } = await q;
    if (error) { setErr(error.message); setRows([]); setTotal(0); } else { setRows(data || []); setTotal(count || 0); }
    setLoading(false);
  }, [table, page, orderCol]);

  useEffect(() => { setPage(0); setSearch(''); setEdit(null); }, [table]);
  useEffect(() => { if (!schemaLoading) load(); }, [load, schemaLoading]);

  const keyOf = (row) => {
    const f = {};
    if (pkCols.length) pkCols.forEach((k) => { f[k] = row[k]; });
    else Object.entries(row).forEach(([k, v]) => { if (v !== null && typeof v !== 'object') f[k] = v; });
    return f;
  };

  const openNew = () => {
    const f = {};
    cols.forEach((c) => { f[c.name] = ''; });
    setForm(f); setInitial(f); setJsonMode(cols.length === 0); setJsonText('{\n  \n}');
    setFormErr(''); setEdit({ mode: 'new' });
  };
  const openEdit = (row) => {
    const f = {};
    cols.forEach((c) => { f[c.name] = toForm(row[c.name]); });
    setForm(f); setInitial(f); setJsonMode(false); setJsonText(JSON.stringify(row, null, 2));
    setFormErr(''); setEdit({ mode: 'edit', row });
  };

  const buildPayload = () => {
    const p = {};
    cols.forEach((c) => {
      const raw = form[c.name];
      if (edit.mode === 'new') { if (raw !== '') p[c.name] = coerce(c, raw); }
      else if (raw !== initial[c.name] && !pkCols.includes(c.name)) p[c.name] = coerce(c, raw);
    });
    return p;
  };

  const toggleJson = (on) => {
    if (on) {
      try {
        const p = buildPayload();
        setJsonText(JSON.stringify(edit.mode === 'new' ? p : { ...edit.row, ...p }, null, 2));
      } catch (e) { setFormErr(e.message); }
    }
    setJsonMode(on);
  };

  const save = async () => {
    setSaving(true);
    setFormErr('');
    try {
      let payload;
      if (jsonMode) {
        payload = JSON.parse(jsonText);
        if (edit.mode === 'edit') pkCols.forEach((k) => { delete payload[k]; });
      } else payload = buildPayload();

      if (edit.mode === 'new') {
        const { error } = await db.from(table).insert(payload);
        if (error) throw error;
      } else {
        const f = keyOf(edit.row);
        if (!Object.keys(f).length) throw new Error('Cannot identify this row (no key column).');
        if (!Object.keys(payload).length) { setEdit(null); setSaving(false); return; }
        const { data, error } = await db.from(table).update(payload).match(f).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error('No rows were updated. Row-level security on this table probably blocks updates.');
      }
      setEdit(null);
      load();
    } catch (e) {
      setFormErr(e.message || String(e));
    }
    setSaving(false);
  };

  const del = async (row) => {
    const f = keyOf(row);
    if (!Object.keys(f).length) { setErr('Cannot identify this row (no key column).'); return; }
    if (!window.confirm('Delete this row? This cannot be undone.')) return;
    const { data, error } = await db.from(table).delete().match(f).select();
    if (error) setErr(error.message);
    else if (!data || !data.length) setErr('No rows were deleted. Row-level security on this table probably blocks deletes.');
    else load();
  };

  const shown = search ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) : rows;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const field = (c) => {
    const v = form[c.name] === undefined ? '' : form[c.name];
    const set = (x) => setForm((f) => ({ ...f, [c.name]: x }));
    const locked = edit.mode === 'edit' && pkCols.includes(c.name);
    const multi = isJson(c.type) || v.length > 80 || /desc|note|body|content|message|detail|address/i.test(c.name);
    let input;
    if (isBool(c.type)) {
      input = (
        <select style={S.input} value={v} disabled={locked} onChange={(e) => set(e.target.value)}>
          <option value="">(empty / default)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    } else if (multi) {
      input = <textarea style={{ ...S.input, minHeight: 80, fontFamily: isJson(c.type) ? 'monospace' : 'inherit' }} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
    } else {
      input = <input style={S.input} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
    }
    return (
      <div key={c.name}>
        <label style={S.label}>{c.name}<span style={S.dim}> - {c.type}{c.pk ? ' - key' : ''}{c.required && !c.hasDefault ? ' - required' : ''}</span></label>
        {input}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={S.h1}>{prettify(table)}</h1>
          <p style={S.sub}>{total.toLocaleString()} rows - table: {table}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" style={S.btn} onClick={load}>Refresh</button>
          <button type="button" style={S.btnAccent} onClick={openNew}>+ New row</button>
        </div>
      </div>

      <input style={{ ...S.input, margin: '16px 0 12px', maxWidth: 360 }} placeholder="Search this page..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {err && <div style={S.err}>{err}</div>}

      <div style={{ ...S.card, padding: 0, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={S.th}>Actions</th>
              {cols.map((c) => <th key={c.name} style={S.th}>{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  <button type="button" style={{ ...S.btn, padding: '5px 10px', marginRight: 6 }} onClick={() => openEdit(row)}>Edit</button>
                  <button type="button" style={{ ...S.btnDanger, padding: '5px 10px' }} onClick={() => del(row)}>Delete</button>
                </td>
                {cols.map((c) => <td key={c.name} style={S.td}>{show(row[c.name])}</td>)}
              </tr>
            ))}
            {!loading && shown.length === 0 && (
              <tr><td style={{ ...S.td, ...S.dim }} colSpan={cols.length + 1}>No rows.</td></tr>
            )}
            {loading && (
              <tr><td style={{ ...S.td, ...S.dim }} colSpan={cols.length + 1}>Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
        <button type="button" style={S.btn} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
        <span style={{ fontSize: 13 }}>Page {page + 1} of {pages}</span>
        <button type="button" style={S.btn} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {edit && (
        <div style={S.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ ...S.h1, fontSize: 18 }}>{edit.mode === 'new' ? 'New row' : 'Edit row'} - {prettify(table)}</h2>
              <label style={{ fontSize: 12 }}>
                <input type="checkbox" checked={jsonMode} onChange={(e) => toggleJson(e.target.checked)} /> Raw JSON
              </label>
            </div>
            {jsonMode
              ? <textarea style={{ ...S.input, minHeight: 260, marginTop: 12, fontFamily: 'monospace' }} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
              : cols.map(field)}
            {formErr && <div style={S.err}>{formErr}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" style={S.btn} onClick={() => setEdit(null)}>Cancel</button>
              <button type="button" style={{ ...S.btn, color: ACCENT }} disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
