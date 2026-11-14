import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Database } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';

const ROUTES = [
  ['/users', 'profiles'], ['/products', 'products'], ['/orders', 'orders'], ['/topups', 'xwallet_topups'], ['/wallet', 'xwallet_txns'],
  ['/payouts', 'xwallet_withdrawals'], ['/returns', 'return_requests'], ['/creators', 'creator_applications'], ['/promos', 'promo_codes'],
  ['/bundles', 'bundles'], ['/xcards', 'xcards'], ['/reports', 'report_tickets'], ['/quotations', 'xquote_receipts'], ['/reviews', 'reviews'],
  ['/shops', 'shops'], ['/tw/withdrawals', 'xwallet_withdrawals'], ['/tw/receipts', 'xwallet_topups'], ['/tw/duplicates', 'xwallet_topups'],
  ['/tw/freeze', 'profiles'], ['/tw/liability', 'profiles'], ['/tw/top-balances', 'profiles'], ['/tw/dormant', 'profiles'], ['/tw/pending', 'xwallet_withdrawals'],
  ['/tw/fees', 'xwallet_withdrawals'], ['/tw/q/topups', 'xwallet_topups'], ['/tw/q/orders', 'orders'], ['/tw/q/quotations', 'xquote_receipts'],
  ['/tw/q/returns', 'return_requests'], ['/tw/q/creators', 'creator_applications'], ['/tw/q/logistics', 'orders'],
  ['/ua/ban', 'user_restrictions'], ['/ua/watchlist', 'user_watchlist'], ['/ua', 'profiles'], ['/sv/stock', 'products'], ['/sv/gifts', 'orders'], ['/sv', 'profiles'],
];
const guess = (p) => { let best = ['', '']; ROUTES.forEach((r) => { if ((p === r[0] || p.startsWith(r[0] + '/')) && r[0].length > best[0].length) best = r; }); return best[1]; };
const NUM = /^(integer|bigint|smallint|numeric|real|double precision)$/;
const toStr = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const inp = { padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(0,0,0,.18)', background: 'transparent', fontSize: 13, width: '100%', boxSizing: 'border-box' };
const sm = { padding: '5px 10px', fontSize: 12 };

function conv(raw, c) {
  if (c.type === 'boolean') return raw === 'true';
  if (raw === '') return c.null ? null : (NUM.test(c.type) ? undefined : '');
  if (NUM.test(c.type)) { const n = Number(raw); if (!Number.isFinite(n)) throw new Error(c.n + ' must be a number'); return n; }
  if (c.type === 'json' || c.type === 'jsonb' || c.type === 'ARRAY') { try { return JSON.parse(raw); } catch (e) { throw new Error(c.n + ' must be valid JSON'); } }
  return raw;
}

export default function AdminCrud() {
  const { show } = useToast();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [schema, setSchema] = useState(null);
  const [serr, setSerr] = useState('');
  const [table, setTable] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const cols = useMemo(() => ((schema || []).find((s) => s.t === table) || {}).cols || [], [schema, table]);
  const pk = (cols.find((c) => c.pk) || {}).n || '';
  const adb = async (action, extra) => { const { data, error } = await supabase.rpc('admin_db', { code: getAdminPin(), action, tbl: table, ...extra }); if (error) throw error; return data; };

  useEffect(() => {
    if (!open || schema) return;
    supabase.rpc('admin_crud_schema', { p_code: getAdminPin() }).then(({ data, error }) => { if (error) setSerr(error.message); else setSchema(Array.isArray(data) ? data : []); });
  }, [open, schema]);
  useEffect(() => { if (open) { const g = guess(loc.pathname); if (g) setTable(g); } }, [open, loc.pathname]);

  const load = useCallback(async () => {
    if (!table) return;
    setLoading(true); setErr('');
    try {
      const oc = cols.find((c) => c.n === 'created_at') ? 'created_at' : pk || null;
      const d = await adb('select', { order_col: oc, lim: 5000 });
      setRows(Array.isArray(d) ? d : []); setPage(0);
    } catch (e) { setRows([]); setErr(e.message || String(e)); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, cols.length]);
  useEffect(() => { if (open && table && cols.length) load(); }, [open, table, cols.length, load]);

  const t = q.trim().toLowerCase();
  const list = rows.filter((r) => !t || JSON.stringify(r).toLowerCase().includes(t));
  const PS = 25;
  const shown = list.slice(page * PS, page * PS + PS);
  const dcols = cols.filter((c) => !['json', 'jsonb'].includes(c.type)).slice(0, 6);
  const money = /^(xwallet|profiles|orders|xcards|creator_)/.test(table);

  const openEdit = (row) => { const d = {}; cols.forEach((c) => { d[c.n] = row ? toStr(row[c.n]) : ''; }); setDraft(d); setEdit(row || 'new'); };
  const save = async () => {
    setBusy(true);
    try {
      const payload = {};
      cols.forEach((c) => {
        if (edit !== 'new' && c.pk) return;
        const raw = draft[c.n] ?? '';
        if (edit === 'new') { if (raw === '' && (c.def || c.null)) return; const v = conv(raw, c); if (v !== undefined) payload[c.n] = v; }
        else if (raw !== toStr(edit[c.n])) { const v = conv(raw, c); if (v !== undefined) payload[c.n] = v; }
      });
      if (!Object.keys(payload).length) { show?.('Nothing changed.', 'error'); setBusy(false); return; }
      if (edit === 'new') await adb('insert', { payload });
      else {
        if (!window.confirm('Update ' + Object.keys(payload).join(', ') + ' on this ' + table + ' row?')) { setBusy(false); return; }
        await adb('update', { payload, match_col: pk, match_val: String(edit[pk]) });
      }
      show?.('Saved', 'success'); setEdit(null); load();
    } catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  const del = async (row) => {
    if (window.prompt('Permanently delete this ' + table + ' row (' + String(row[pk]).slice(0, 12) + ')?\nThis cannot be undone. Type DELETE to confirm.') !== 'DELETE') return;
    try { await adb('delete', { match_col: pk, match_val: String(row[pk]) }); show?.('Deleted', 'success'); load(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const field = (c) => {
    const v = draft[c.n] ?? ''; const set = (x) => setDraft({ ...draft, [c.n]: x });
    const locked = edit !== 'new' && c.pk;
    if (c.type === 'boolean') return <select style={inp} value={v} disabled={locked} onChange={(e) => set(e.target.value)}>{c.null && <option value="">(null)</option>}<option value="true">true</option><option value="false">false</option></select>;
    if (['json', 'jsonb', 'ARRAY'].includes(c.type) || v.length > 80) return <textarea style={{ ...inp, minHeight: 70, fontFamily: 'monospace' }} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
    return <input style={inp} value={v} disabled={locked} onChange={(e) => set(e.target.value)} />;
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Data editor" aria-label="Open data editor"
        style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 900, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 24, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,.3)', cursor: 'pointer' }}>
        <Database size={16} /> Data
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setEdit(null); }} title={edit ? (edit === 'new' ? 'Create row in ' + table : 'Edit row in ' + table) : 'Data editor'} wide>
        {serr && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>Could not load tables: {serr}. If it says the function does not exist, run the SQL first.</div>}
        {!edit && <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <select style={{ ...inp, width: 'auto', flex: '1 1 160px' }} value={table} onChange={(e) => { setTable(e.target.value); setQ(''); }}><option value="">Choose a table…</option>{(schema || []).map((s) => <option key={s.t} value={s.t}>{s.t}</option>)}</select>
            <input style={{ ...inp, width: 'auto', flex: '2 1 160px' }} placeholder="Search rows" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            <button className="neu-btn" style={sm} onClick={load} disabled={!table || loading}>{loading ? 'Loading…' : 'Refresh'}</button>
            <button className="neu-btn" style={{ ...sm, fontWeight: 700 }} onClick={() => openEdit(null)} disabled={!table}>+ Create</button>
          </div>
          {money && <div style={{ color: '#F59E0B', fontSize: 12, marginBottom: 8 }}>Money tables: editing a balance or status here changes the number directly. It writes no wallet transaction, no notification, and runs none of the approval logic. Use the approval pages for normal operations.</div>}
          {table && !pk && cols.length > 0 && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 8 }}>This table has no primary key, so rows can be read and created but not edited or deleted.</div>}
          {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          {rows.length >= 5000 && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 8 }}>Capped at 5000 rows (newest first). Older rows are not shown.</div>}
          <div style={{ overflowX: 'auto', maxHeight: '55vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{dcols.map((c) => <th key={c.n} style={{ textAlign: 'left', padding: '6px 8px', color: '#8a93a3', whiteSpace: 'nowrap' }}>{c.n}</th>)}<th /></tr></thead>
              <tbody>{shown.map((r, i) => (
                <tr key={String(r[pk] ?? i)}>{dcols.map((c) => <td key={c.n} style={{ padding: '6px 8px', borderTop: '1px solid rgba(0,0,0,.07)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toStr(r[c.n]).slice(0, 60)}</td>)}
                  <td style={{ padding: '6px 8px', borderTop: '1px solid rgba(0,0,0,.07)', whiteSpace: 'nowrap' }}>
                    <button className="neu-btn" style={sm} onClick={() => openEdit(r)}>{pk ? 'Edit' : 'View'}</button>{' '}
                    {pk && <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => del(r)}>Delete</button>}
                  </td></tr>))}
              </tbody>
            </table>
            {table && !loading && list.length === 0 && <div style={{ padding: 14, opacity: .7, fontSize: 13 }}>No rows.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 12 }}>
            <button className="neu-btn" style={sm} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <span>{list.length ? page * PS + 1 : 0}–{Math.min(list.length, page * PS + PS)} of {list.length}</span>
            <button className="neu-btn" style={sm} disabled={(page + 1) * PS >= list.length} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>}
        {edit && <>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {cols.map((c) => (
              <label key={c.n} style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                <b>{c.n}</b> <span style={{ color: '#8a93a3' }}>{c.type}{c.pk ? ' · primary key' : ''}{c.def ? ' · has default' : ''}{!c.null && !c.def ? ' · required' : ''}</span>
                {field(c)}
              </label>))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="neu-btn neu-btn-success" style={{ padding: '8px 16px', fontWeight: 700 }} disabled={busy || (edit !== 'new' && !pk)} onClick={save}>{busy ? 'Saving…' : edit === 'new' ? 'Create' : 'Save changes'}</button>
            <button className="neu-btn" style={{ padding: '8px 16px' }} onClick={() => setEdit(null)}>Back</button>
          </div>
          {edit === 'new' && <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 6 }}>Leave a field empty to use its default (or null).</div>}
        </>}
      </Modal>
    </>
  );
}
