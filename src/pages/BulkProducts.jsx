import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { fetchProducts } from '../lib/api.js';
import { uploadToCloudinary } from '../lib/cloud.js';
import { HEADERS, CATEGORIES, normalizeRow, processImages } from '../lib/bulkImport.js';

const PIN = import.meta.env.VITE_XADMIN_PIN;
const PAGE = 25;
const STATES = ['imported', 'processing', 'needs_review', 'ready', 'approved', 'published', 'failed', 'rejected'];
const COLORS = { imported: '#2563EB', processing: '#F59E0B', needs_review: '#EF4444', ready: '#10B981', approved: '#059669', publishing: '#F59E0B', published: '#6B7280', failed: '#DC2626', rejected: '#9CA3AF' };
const rpc = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_pin: PIN, ...args });
  if (error) throw new Error(error.message);
  return data;
};
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error('Timed out')), ms))]);
const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); };
const SAMPLE = [HEADERS.join(','),
  [q('Sample Instant Noodles 60g'), '25', q('Groceries & Pantry'), q('Quick-cook noodles.'), q('https://example.com/noodles.jpg'), q(''), 'in_stock'].join(','),
  [q('Sample Phone Case'), '199', q('Electronics'), q(''), q('https://example.com/a.jpg|https://example.com/b.jpg'), q('[{"name":"Color","options":["Black","White"]}]'), 'in_stock'].join(',')].join('\n');
const Badge = ({ s }) => <span style={{ background: COLORS[s] || '#999', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{s}</span>;
const L = { fontSize: 12, fontWeight: 700, margin: '6px 0 2px', display: 'block' };

export default function BulkProducts() {
  const { show } = useToast();
  const [preview, setPreview] = useState(null);
  const [jobId, setJobId] = useState(() => { try { return localStorage.getItem('bulk_job') || ''; } catch (e) { return ''; } });
  const [jobs, setJobs] = useState([]);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [st, setSt] = useState('');
  const [qq, setQq] = useState('');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState(null);
  const existing = useRef(new Set());
  const cache = useRef(new Map());

  const loadJobs = useCallback(async () => { try { setJobs((await rpc('bulk_jobs')) || []); } catch (e) { show(e.message, 'error'); } }, []);
  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const d = await rpc('bulk_list', { p_job: jobId, p_status: st || null, p_q: qq || null, p_cat: cat || null, p_offset: page * PAGE, p_limit: PAGE });
      setRows(d.rows || []); setCounts(d.counts || {});
    } catch (e) { show(e.message, 'error'); }
  }, [jobId, st, qq, cat, page]);
  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { load(); }, [load]);
  const loadExisting = async () => { if (!existing.current.size) { const ex = await fetchProducts(); existing.current = new Set((ex.items || []).map((p) => String(p.name || '').trim().toLowerCase())); } };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const text = (await f.text()).replace(/^\uFEFF/, '');
      const wb = XLSX.read(text, { type: 'string', raw: true });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
      if (!json.length) return show('File has no rows', 'error');
      if (json.length > 2000) return show('Max 2000 rows per file', 'error');
      const keys = Object.keys(json[0]).map((k) => k.trim().toLowerCase());
      const missing = HEADERS.filter((h) => !keys.includes(h));
      if (missing.length) return show('Missing columns: ' + missing.join(', '), 'error');
      existing.current = new Set(); await loadExisting();
      const seen = new Map();
      const rs = json.map((r, i) => {
        const raw = {}; Object.keys(r).forEach((k) => { const kk = k.trim().toLowerCase(); if (HEADERS.includes(kk)) raw[kk] = String(r[k] == null ? '' : r[k]); });
        return { row_no: i + 1, raw, ...normalizeRow(raw, { seen, existing: existing.current, rowNo: i + 1 }) };
      });
      setPreview({ filename: f.name, rows: rs });
    } catch (err) { show('Could not read file: ' + err.message, 'error'); }
  };
  const stage = async () => {
    setBusy(true); let id = null;
    try {
      const rs = preview.rows;
      for (let i = 0; i < rs.length; i += 100) {
        setMsg('Staging ' + Math.min(i + 100, rs.length) + '/' + rs.length);
        const d = await rpc('bulk_import', { p_job: id, p_filename: preview.filename, p_total: rs.length, p_rows: rs.slice(i, i + 100) });
        id = d.job_id;
      }
      try { localStorage.setItem('bulk_job', id); } catch (e) {}
      setJobId(id); setPage(0); setSt(''); setSel(new Set()); setPreview(null); show('Staged ' + rs.length + ' rows', 'success'); loadJobs();
    } catch (e) { show(e.message, 'error'); }
    setBusy(false); setMsg('');
  };
  const openJob = (id) => { try { localStorage.setItem('bulk_job', id); } catch (e) {} setJobId(id); setPage(0); setSt(''); setSel(new Set()); };

  const processRows = async () => {
    const list = rows.filter((r) => (!sel.size || sel.has(r.id)) && ['imported', 'failed'].includes(r.status));
    if (!list.length) return show('Select imported or failed rows first', 'error');
    setBusy(true);
    for (let i = 0; i < list.length; i++) {
      const r = list[i]; setMsg('Images ' + (i + 1) + '/' + list.length);
      const n = { ...r.normalized }; const src = n.source_images || [];
      try {
        await rpc('bulk_update', { p_id: r.id, p_raw: null, p_normalized: null, p_errors: null, p_status: 'processing', p_images: null });
        const res = (src.length && (n.images || []).length === src.length)
          ? { images: n.images, status: src.map((u) => ({ url: u, ok: true })), ok: true }
          : await processImages(src, (u) => withTimeout(uploadToCloudinary(u, 'xmarket_products'), 60000), { cache: cache.current });
        n.images = res.images;
        const errs = res.ok ? [] : res.status.filter((s) => !s.ok).map((s) => 'Image failed: ' + s.url + ' (' + s.error + ')');
        await rpc('bulk_update', { p_id: r.id, p_raw: null, p_normalized: n, p_errors: errs, p_status: res.ok ? 'ready' : 'failed', p_images: res.status });
      } catch (e) { show('Row ' + r.row_no + ': ' + e.message, 'error'); }
    }
    setBusy(false); setMsg(''); load();
  };
  const decide = async (action) => {
    if (!sel.size) return show('Select rows first', 'error');
    try { const d = await rpc('bulk_decide', { p_ids: [...sel], p_action: action }); show(d.count + ' row(s) ' + action + 'd', 'success'); setSel(new Set()); load(); } catch (e) { show(e.message, 'error'); }
  };
  const publish = async () => {
    const ids = rows.filter((r) => sel.has(r.id) && r.status === 'approved').map((r) => r.id);
    if (!ids.length) return show('Select approved rows first', 'error');
    if (!window.confirm('Publish ' + ids.length + ' product(s) to the LIVE catalog?')) return;
    setBusy(true); let ok = 0, bad = 0;
    try {
      for (let i = 0; i < ids.length; i += 10) {
        setMsg('Publishing ' + Math.min(i + 10, ids.length) + '/' + ids.length);
        const d = await rpc('bulk_publish', { p_ids: ids.slice(i, i + 10) });
        (d.results || []).forEach((x) => (x.ok ? ok++ : bad++));
      }
    } catch (e) { show(e.message, 'error'); }
    show('Published ' + ok + ', failed ' + bad, bad ? 'error' : 'success');
    setSel(new Set()); setBusy(false); setMsg(''); load(); loadJobs();
  };
  const exportErrors = async () => {
    try {
      const out = [['row_no', ...HEADERS, 'errors'].join(',')];
      for (const s of ['needs_review', 'failed']) {
        for (let o = 0; ; o += 200) {
          const d = await rpc('bulk_list', { p_job: jobId, p_status: s, p_q: null, p_cat: null, p_offset: o, p_limit: 200 });
          (d.rows || []).forEach((r) => out.push([r.row_no, ...HEADERS.map((h) => q(r.raw[h])), q((r.errors || []).join(' ; '))].join(',')));
          if ((d.rows || []).length < 200) break;
        }
      }
      if (out.length === 1) return show('No failed rows', 'success');
      download('bulk-errors.csv', out.join('\n'));
    } catch (e) { show(e.message, 'error'); }
  };
  const openEdit = async (r) => { await loadExisting(); setEdit({ id: r.id, raw: { ...r.raw } }); };
  const saveEdit = async () => {
    const n = normalizeRow(edit.raw, { existing: existing.current, rowNo: 0 });
    try { await rpc('bulk_update', { p_id: edit.id, p_raw: edit.raw, p_normalized: n.normalized, p_errors: n.errors, p_status: n.status, p_images: [] }); setEdit(null); load(); } catch (e) { show(e.message, 'error'); }
  };
  const tog = (id) => setSel((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const valid = preview ? preview.rows.filter((r) => !r.errors.length).length : 0;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Bulk Product Manager</div>
        <div style={{ fontSize: 12, marginBottom: 8 }}>CSV columns: {HEADERS.join(', ')}. Variants: leave empty, or <code>Size: S|M|L</code>, or JSON with one variant type.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={() => download('xmarket-template.csv', SAMPLE)}>Download template</Btn>
          <label className="neu-btn neu-btn-primary" style={{ cursor: 'pointer' }}>Upload CSV<input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} /></label>
        </div>
      </Card>

      {preview && (
        <Card>
          <div style={{ fontWeight: 800 }}>Preview: {preview.filename}</div>
          <div style={{ fontSize: 13, margin: '6px 0' }}>{preview.rows.length} rows · {valid} valid · {preview.rows.length - valid} need review</div>
          <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: 12 }}>
            {preview.rows.filter((r) => r.errors.length).slice(0, 100).map((r) => <div key={r.row_no} style={{ color: '#DC2626', marginBottom: 4 }}>Row {r.row_no}: {r.errors.join('; ')}</div>)}
            {preview.rows.every((r) => !r.errors.length) && <div>No validation errors.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="primary" disabled={busy} onClick={stage}>Stage {preview.rows.length} rows (not published)</Btn>
            <Btn disabled={busy} onClick={() => setPreview(null)}>Cancel import</Btn>
          </div>
        </Card>
      )}
      {msg && <div style={{ fontSize: 13, fontWeight: 700 }}>{msg}</div>}

      {jobId && (
        <Card>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {STATES.map((s) => <span key={s} onClick={() => { setSt(st === s ? '' : s); setPage(0); }} style={{ cursor: 'pointer', opacity: st && st !== s ? 0.45 : 1 }}><Badge s={s} /> {counts[s] || 0}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input className="neu-input" placeholder="Search name" value={qq} onChange={(e) => { setQq(e.target.value); setPage(0); }} style={{ flex: 1, minWidth: 120 }} />
            <select className="neu-input" value={cat} onChange={(e) => { setCat(e.target.value); setPage(0); }}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <Btn onClick={() => setSel(sel.size ? new Set() : new Set(rows.map((r) => r.id)))}>{sel.size ? 'Clear' : 'Select page'}</Btn>
            <Btn disabled={busy} onClick={processRows}>Process / retry images</Btn>
            <Btn disabled={busy} variant="success" onClick={() => decide('approve')}>Approve</Btn>
            <Btn disabled={busy} variant="danger" onClick={() => decide('reject')}>Reject</Btn>
            <Btn disabled={busy} variant="primary" onClick={publish}>Publish approved</Btn>
            <Btn onClick={exportErrors}>Export errors</Btn>
          </div>
        </Card>
      )}

      {rows.map((r) => {
        const n = r.normalized || {}; const opts = n.variant_config ? (Object.values(n.variant_config)[0] || []) : [];
        const pr = Object.values(n.variant_prices || {}).map(Number); const thumb = (n.images || [])[0];
        return (
          <Card key={r.id}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={sel.has(r.id)} onChange={() => tog(r.id)} />
              {thumb ? <img src={thumb} alt="" loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#E5E7EB' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div><b>#{r.row_no}</b> <Badge s={r.status} /></div>
                <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{n.name || r.raw.product_name}</div>
                <div style={{ fontSize: 12 }}>{n.category || '—'} · {pr.length ? '₱' + Math.min(...pr) + (Math.max(...pr) > Math.min(...pr) ? '–₱' + Math.max(...pr) : '') : '—'} · {opts.length} option(s){opts.length ? ': ' + opts.slice(0, 4).join(', ') : ''}</div>
                {(r.errors || []).map((e, i) => <div key={i} style={{ color: '#DC2626', fontSize: 12, wordBreak: 'break-word' }}>{String(e)}</div>)}
              </div>
              {r.status !== 'published' && <Btn onClick={() => openEdit(r)}>Edit</Btn>}
            </div>
          </Card>
        );
      })}
      {jobId && <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}><Btn disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Btn><span style={{ alignSelf: 'center' }}>Page {page + 1}</span><Btn disabled={rows.length < PAGE} onClick={() => setPage(page + 1)}>Next</Btn></div>}

      <Card>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Previous imports</div>
        {jobs.length === 0 ? 'None yet' : jobs.map((j) => (
          <div key={j.id} onClick={() => openJob(j.id)} style={{ cursor: 'pointer', fontSize: 12, marginBottom: 6, fontWeight: j.id === jobId ? 800 : 400 }}>
            {j.filename || 'import'} · {new Date(j.created_at).toLocaleString()} · {j.total} rows · {j.published} published · {j.problems} need attention
          </div>))}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit row">
        {edit && <>
          {HEADERS.map((h) => (
            <div key={h}><label style={L}>{h}</label>
              {['description', 'image_urls', 'variants'].includes(h)
                ? <textarea className="neu-input" rows={3} value={edit.raw[h] || ''} onChange={(e) => setEdit({ ...edit, raw: { ...edit.raw, [h]: e.target.value } })} />
                : <input className="neu-input" value={edit.raw[h] || ''} onChange={(e) => setEdit({ ...edit, raw: { ...edit.raw, [h]: e.target.value } })} />}
            </div>))}
          <div style={{ fontSize: 11, margin: '6px 0' }}>Saving re-validates the row. Images are re-processed after an edit.</div>
          <Btn variant="primary" onClick={saveEdit}>Save</Btn>
        </>}
      </Modal>
    </div>
  );
}
