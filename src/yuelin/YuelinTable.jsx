import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { api } from './ylApi.js';
import { useYlTables } from './useYlTables.js';
import { prettify } from './schema.js';
import { S, ACCENT } from './ui.js';
import './anim.css';

const PAGE = 25;
const MAX_BULK = 1000;
const isNum = (t) => /int|numeric|decimal|double|real|float|number/i.test(t);
const isBool = (t) => /bool/i.test(t);
const isJson = (t) => /json|\[\]|array/i.test(t);
const IMG = /^https?:\/\/\S+\.(png|jpe?g|webp|gif|svg)(\?\S*)?$/i;
const OK = { background: '#e7f6ec', color: '#1b6b3a', borderRadius: 12, padding: '10px 14px', fontSize: 13, margin: '12px 0' };

const STATUS = {
  redemptions: ['pending', 'fulfilled', 'cancelled'],
  vip_applications: ['pending', 'verified', 'rejected'],
  vip_memberships: ['active', 'expired', 'cancelled'],
  vip_entitlements: ['available', 'requested', 'redeemed', 'issued', 'fulfilled', 'unavailable'],
};
const GENERIC = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
const cap = (v) => String(v).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function inferType(v) {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (v && typeof v === 'object') return 'jsonb';
  return 'text';
}

function show(v, lab) {
  if (v === null || v === undefined) return <span style={S.dim}>-</span>;
  if (lab && lab[String(v)]) {
    return <span title={String(v)}><b>{lab[String(v)]}</b> <span style={S.dim}>{String(v).slice(0, 6)}</span></span>;
  }
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') {
    const j = JSON.stringify(v);
    return <span title={j}>{j.length > 50 ? j.slice(0, 50) + '...' : j}</span>;
  }
  const s = String(v);
  if (/^https?:\/\/\S+$/i.test(s)) {
    const isImg = IMG.test(s) || /res\.cloudinary\.com/.test(s);
    return (
      <a href={s} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 700 }}>
        {isImg ? <img src={s} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8, verticalAlign: 'middle', marginRight: 6 }} /> : null}
        {isImg ? 'Open' : (s.length > 40 ? s.slice(0, 40) + '...' : s)}
      </a>
    );
  }
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

function parseBulk(text, names) {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  if (!t) throw new Error('Paste a JSON array of rows.');
  let v;
  try { v = JSON.parse(t); } catch (e) { throw new Error('Invalid JSON: ' + e.message); }
  if (!Array.isArray(v)) v = [v];
  if (!v.length) throw new Error('The array is empty.');
  if (v.length > MAX_BULK) throw new Error('Maximum ' + MAX_BULK + ' rows per import.');
  v.forEach((r, i) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('Row ' + (i + 1) + ' is not an object.');
    if (names.length) {
      const bad = Object.keys(r).filter((k) => !names.includes(k));
      if (bad.length) throw new Error('Row ' + (i + 1) + ': unknown column ' + bad.join(', ') + '.');
    }
  });
  return v;
}

export default function YuelinTable() {
  const { table } = useParams();
  const { tables, loading: schemaLoading } = useYlTables(true);
  const meta = tables.find((t) => t.name === table);

  const [rows, setRows] = useState([]);
  const [labels, setLabels] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [initial, setInitial] = useState({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('{}');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkErr, setBulkErr] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

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
    try {
      const d = await api.select(table, PAGE, page * PAGE, orderCol);
      setRows((d && d.rows) || []);
      setLabels((d && d.labels) || {});
      setTotal((d && d.total) || 0);
    } catch (e) {
      setErr(e.message || String(e));
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [table, page, orderCol]);

  useEffect(() => { setPage(0); setSearch(''); setEdit(null); setBulkOpen(false); setOk(''); }, [table]);
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
    setFormErr(''); setOk(''); setEdit({ mode: 'new' });
  };
  const openEdit = (row) => {
    const f = {};
    cols.forEach((c) => { f[c.name] = toForm(row[c.name]); });
    setForm(f); setInitial(f); setJsonMode(false); setJsonText(JSON.stringify(row, null, 2));
    setFormErr(''); setOk(''); setEdit({ mode: 'edit', row });
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
        await api.insert(table, [payload]);
      } else {
        const f = keyOf(edit.row);
        if (!Object.keys(f).length) throw new Error('Cannot identify this row (no key column).');
        if (!Object.keys(payload).length) { setEdit(null); setSaving(false); return; }
        const res = await api.update(table, f, payload);
        if (!res || !res.length) throw new Error('No rows were updated.');
      }
      setEdit(null);
      load();
    } catch (e) {
      setFormErr(e.message || String(e));
    }
    setSaving(false);
  };

  const [busy, setBusy] = useState('');

  const optsFor = (c) => {
    const n = c.name.toLowerCase();
    if (isBool(c.type) && /^(is_)?(active|enabled|published)$/.test(n)) return [{ v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }];
    if (isBool(c.type) || !/(^|_)status$/.test(n)) return null;
    const known = STATUS[table];
    const seen = rows.map((r) => r[c.name]).filter((v) => v !== null && v !== undefined && v !== '').map(String);
    const list = known ? [...known, ...seen.filter((x) => !known.includes(x))] : [...new Set([...seen, ...GENERIC])];
    return list.map((v) => ({ v, l: cap(v) }));
  };

  const grantVip = async (uid) => {
    const now = new Date().toISOString();
    const all = await api.select('vip_memberships', 1000, 0, null);
    const ex = ((all && all.rows) || []).find((r) => r.user_id === uid);
    const from = ex && ex.status === 'active' && ex.ends_at > now ? ex.ends_at : now;
    const d = new Date(from);
    d.setDate(d.getDate() + 30);
    const ends = d.toISOString();
    if (ex) {
      const r = await api.update('vip_memberships', { user_id: uid }, { status: 'active', ends_at: ends });
      if (!r || !r.length) throw new Error('Could not extend the membership.');
    } else {
      await api.insert('vip_memberships', [{ user_id: uid, status: 'active', ends_at: ends }]);
    }
  };

  const changeStatus = async (row, c, val, extra) => {
    const k = keyOf(row);
    if (!Object.keys(k).length) { setErr('Cannot identify this row (no key column).'); return; }
    setBusy(JSON.stringify(k) + c.name);
    setErr(''); setOk('');
    try {
      const vipApp = table === 'vip_applications' && c.name === 'status';
      if (vipApp && val === 'verified' && row.status !== 'verified') await grantVip(row.user_id);
      const data = { [c.name]: isBool(c.type) ? val === 'true' : val, ...(extra || {}) };
      if (vipApp) data.reviewed_at = new Date().toISOString();
      const res = await api.update(table, k, data);
      if (!res || !res.length) throw new Error('No rows were updated.');
      setOk((vipApp && val === 'verified' ? 'VIP activated for 30 days. ' : '') + cap(c.name) + ' is now ' + cap(val) + '.');
      load();
    } catch (e) { setErr('Could not change it: ' + (e.message || e)); }
    setBusy('');
  };

  const approveVip = (row) => {
    if (!window.confirm('Receipt checked? This activates 30 days of VIP for this user.')) return;
    changeStatus(row, { name: 'status', type: 'text' }, 'verified');
  };
  const rejectVip = (row) => {
    const why = window.prompt('Reason for rejecting:', '');
    if (why === null) return;
    changeStatus(row, { name: 'status', type: 'text' }, 'rejected', { reject_reason: why || null });
  };

  const cell = (row, c) => {
    const so = optsFor(c);
    if (!so) return show(row[c.name], labels[c.name]);
    const raw = row[c.name];
    const cur = raw === null || raw === undefined ? '' : String(raw);
    const list = !cur || so.some((o) => o.v === cur) ? so : [{ v: cur, l: cap(cur) }, ...so];
    return (
      <select style={{ ...S.input, padding: '6px 10px', minWidth: 120, width: 'auto' }} value={cur}
        disabled={busy === JSON.stringify(keyOf(row)) + c.name} onChange={(e) => changeStatus(row, c, e.target.value)}>
        {!cur && <option value="">(not set)</option>}
        {list.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  };

  const del = async (row) => {
    const f = keyOf(row);
    if (!Object.keys(f).length) { setErr('Cannot identify this row (no key column).'); return; }
    if (!window.confirm('Delete this row? This cannot be undone.')) return;
    try {
      const res = await api.remove(table, f);
      if (!res || !res.length) setErr('No rows were deleted.'); else load();
    } catch (e) { setErr(e.message || String(e)); }
  };

  const names = useMemo(() => cols.map((c) => c.name), [cols]);
  const bulk = useMemo(() => {
    if (!bulkOpen) return null;
    try { return { rows: parseBulk(bulkText, names) }; } catch (e) { return { error: bulkText.trim() ? e.message : '' }; }
  }, [bulkOpen, bulkText, names]);

  const sampleJson = () => {
    const pick = cols.filter((c) => !c.pk && !c.hasDefault);
    const use = pick.length ? pick : cols.filter((c) => !c.pk);
    const row = () => {
      const o = {};
      use.forEach((c) => { o[c.name] = isNum(c.type) ? 0 : isBool(c.type) ? false : isJson(c.type) ? {} : ''; });
      return o;
    };
    setBulkText(JSON.stringify([row(), row()], null, 2));
  };

  const runBulk = async () => {
    if (!bulk || !bulk.rows) return;
    setBulkBusy(true);
    setBulkErr('');
    try {
      const out = await api.insert(table, bulk.rows);
      setOk('Inserted ' + (out ? out.length : bulk.rows.length) + ' row(s) into ' + prettify(table) + '.');
      setBulkOpen(false);
      setBulkText('');
      if (page === 0) load(); else setPage(0);
    } catch (e) {
      setBulkErr(e.message || String(e));
    }
    setBulkBusy(false);
  };

  const shown = search ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) : rows;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const field = (c) => {
    const v = form[c.name] === undefined ? '' : form[c.name];
    const set = (x) => setForm((f) => ({ ...f, [c.name]: x }));
    const locked = edit.mode === 'edit' && pkCols.includes(c.name);
    const multi = isJson(c.type) || v.length > 80 || /desc|note|body|content|message|detail|address/i.test(c.name);
    let input;
    const so = optsFor(c);
    if (so) {
      input = (
        <select style={S.input} value={v} disabled={locked} onChange={(e) => set(e.target.value)}>
          <option value="">(empty / default)</option>
          {so.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      );
    } else if (isBool(c.type)) {
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
    <div className="yl-page" key={table}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={S.h1}>{prettify(table)}</h1>
          <p style={S.sub}>{total.toLocaleString()} rows - table: {table}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={S.btn} onClick={load}>Refresh</button>
          <button type="button" style={S.btn} onClick={() => { setBulkErr(''); setOk(''); setBulkOpen(true); }}>Bulk JSON</button>
          <button type="button" style={S.btnAccent} onClick={openNew}>+ New row</button>
        </div>
      </div>

      <input style={{ ...S.input, margin: '16px 0 12px', maxWidth: 360 }} placeholder="Search this page..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {ok && <div style={OK}>{ok}</div>}
      {err && <div style={S.err}>{err}</div>}

      <div className="yl-card" style={{ ...S.card, padding: 0, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={S.th}>Actions</th>
              {cols.map((c) => <th key={c.name} style={S.th}>{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="yl-tr" style={{ '--i': Math.min(i, 14) }}>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  <button type="button" style={{ ...S.btn, padding: '5px 10px', marginRight: 6 }} onClick={() => openEdit(row)}>Edit</button>
                  <button type="button" style={{ ...S.btnDanger, padding: '5px 10px' }} onClick={() => del(row)}>Delete</button>
                  {table === 'vip_applications' && row.status === 'pending' && (
                    <>
                      <button type="button" style={{ ...S.btnAccent, padding: '5px 10px', marginLeft: 6 }} onClick={() => approveVip(row)}>Approve VIP</button>
                      <button type="button" style={{ ...S.btnDanger, padding: '5px 10px', marginLeft: 6 }} onClick={() => rejectVip(row)}>Reject</button>
                    </>
                  )}
                </td>
                {cols.map((c) => <td key={c.name} style={S.td}>{cell(row, c)}</td>)}
              </tr>
            ))}
            {!loading && shown.length === 0 && (
              <tr><td style={{ ...S.td, ...S.dim }} colSpan={cols.length + 1}>No rows.</td></tr>
            )}
            {loading && [0, 1, 2, 3].map((n) => (
              <tr key={'sk' + n}><td style={S.td} colSpan={cols.length + 1}><div className="yl-skel" /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
        <button type="button" style={S.btn} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
        <span style={{ fontSize: 13 }}>Page {page + 1} of {pages}</span>
        <button type="button" style={S.btn} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {edit && createPortal(
        <div className="yl-overlay" style={{ ...S.overlay, alignItems: 'center', zIndex: 3000 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="yl-modal" style={{ ...S.modal, maxHeight: '90vh', overflowY: 'auto' }}>
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
        </div>,
        document.body)}

      {bulkOpen && createPortal(
        <div className="yl-overlay" style={{ ...S.overlay, alignItems: 'center', zIndex: 3000 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setBulkOpen(false); }}>
          <div className="yl-modal" style={{ ...S.modal, maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ ...S.h1, fontSize: 18 }}>Bulk add - {prettify(table)}</h2>
            <p style={S.sub}>Paste a JSON array of rows (up to {MAX_BULK}). Columns you leave out use the table's defaults. All rows are added together, or none if any row fails.</p>
            <div style={{ display: 'flex', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
              <button type="button" style={S.btn} onClick={sampleJson}>Insert example</button>
              <label style={{ ...S.btn, display: 'inline-block' }}>
                Load .json file
                <input type="file" accept=".json,application/json,text/plain" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) f.text().then(setBulkText); e.target.value = ''; }} />
              </label>
            </div>
            <textarea style={{ ...S.input, minHeight: 280, fontFamily: 'monospace', fontSize: 12 }} spellCheck={false}
              placeholder={'[\n  { "column": "value" },\n  { "column": "value" }\n]'} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
            {bulk && bulk.error && <div style={S.err}>{bulk.error}</div>}
            {bulk && bulk.rows && <div style={OK}>{bulk.rows.length} row(s) ready to add.</div>}
            {bulkErr && <div style={S.err}>{bulkErr}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button type="button" style={S.btn} onClick={() => setBulkOpen(false)}>Cancel</button>
              <button type="button" style={{ ...S.btn, color: ACCENT }} disabled={bulkBusy || !(bulk && bulk.rows)} onClick={runBulk}>
                {bulkBusy ? 'Adding...' : 'Add ' + (bulk && bulk.rows ? bulk.rows.length : '') + ' rows'}
              </button>
            </div>
          </div>
        </div>,
        document.body)}
    </div>
  );
}
