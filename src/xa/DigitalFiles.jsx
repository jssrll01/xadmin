import React, { useCallback, useEffect, useRef, useState } from 'react';
import { xmSupabase } from '../supabase.js';
import { adm } from './db.js';
import { SkRows, EmptyState, LoadingBtn, useXaToast, Badge } from './Kit.jsx';

const MAX = 100 * 1048576;
const size = (b) => (!b ? '' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const safe = (n) => n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

function uploadFile(file, onPct) {
  const path = 'incoming/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe(file.name);
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    xhr.open('POST', xmSupabase.supabaseUrl + '/storage/v1/object/digital-files/' + path.split('/').map(encodeURIComponent).join('/'));
    xhr.setRequestHeader('apikey', xmSupabase.supabaseKey);
    xhr.setRequestHeader('Authorization', 'Bearer ' + xmSupabase.supabaseKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(path) : reject(new Error('Upload failed (' + xhr.status + ')')));
    xhr.onerror = () => reject(new Error('Network error. Check your connection and retry.'));
    xhr.onabort = () => reject(Object.assign(new Error('Canceled'), { canceled: true }));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}

export default function DigitalFiles() {
  const { push } = useXaToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ id: null, title: '', price: '', active: true });
  const [file, setFile] = useState(null);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
  const pick = useRef(null);

  const load = useCallback(() => { adm('admin_digital_list').then(setRows).catch((e) => { push(e.message, 'error'); setRows([]); }); }, [push]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!busy) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [busy]);

  const reset = () => { setForm({ id: null, title: '', price: '', active: true }); setFile(null); setPct(0); };
  const choose = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > MAX) { push('File is over 100 MB.', 'error'); return; }
    setFile(f);
  };
  const save = async () => {
    const title = form.title.trim(); const price = Number(form.price);
    if (!title) return push('Enter a display title.', 'error');
    if (!(price >= 0) || form.price === '') return push('Enter a valid price.', 'error');
    if (!form.id && !file) return push('Choose the file to sell.', 'error');
    setBusy(true); setPct(0);
    try {
      let path = null;
      if (file) { const u = uploadFile(file, setPct); abortRef.current = u.abort; path = await u.promise; setPct(100); }
      await adm('admin_digital_save', { p_id: form.id, p_title: title, p_price: price, p_path: path, p_name: file ? file.name : null, p_size: file ? file.size : null, p_active: form.active });
      push(form.id ? 'Saved' : 'Digital product added', 'success'); reset(); load();
    } catch (e) { if (!e.canceled) push(e.message, 'error', 6000); }
    abortRef.current = null; setBusy(false);
  };

  return (
    <div style={{ padding: 4 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 12px' }}>Digital Files</h2>
      <div className="neu-card" style={{ padding: 14, marginBottom: 14 }}>
        <b style={{ fontSize: 14 }}>{form.id ? 'Edit digital product' : 'New digital product'}</b>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '10px 0 4px' }}>Display title</label>
        <input className="xa-input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '10px 0 4px' }}>Price (₱)</label>
        <input className="xa-input" type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '10px 0 4px' }}>File{form.id ? ' (leave empty to keep the current one)' : ''}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="neu-btn" disabled={busy} onClick={() => pick.current && pick.current.click()}>{file ? 'Change file' : 'Choose file'}</button>
          {file && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{file.name} · {size(file.size)}</span>}
          <input ref={pick} type="file" style={{ display: 'none' }} onChange={choose} />
        </div>
        {form.id && <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible in the shop</label>}
        {busy && (
          <div style={{ marginTop: 12 }}>
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'var(--primary)', transition: 'width .15s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{pct < 100 ? 'Uploading ' + pct + '%' : 'Saving…'}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <LoadingBtn variant="primary" loading={busy} onClick={save}>{form.id ? 'Save changes' : 'Upload and add'}</LoadingBtn>
          {busy && abortRef.current && pct < 100 && <button type="button" className="neu-btn" onClick={() => abortRef.current && abortRef.current()}>Cancel upload</button>}
          {!busy && (form.id || file || form.title) && <button type="button" className="neu-btn" onClick={reset}>Clear</button>}
        </div>
      </div>

      <div className="neu-card" style={{ padding: 8 }}>
        {rows === null && <SkRows rows={4} cols={3} />}
        {rows && rows.length === 0 && <EmptyState title="No digital products yet" hint="Add one above." />}
        {rows && rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>₱{Number(r.price).toLocaleString()} · {r.file_name || 'file'} {size(r.file_size)} · {r.sales} sold</div>
            </div>
            {!r.active && <Badge>hidden</Badge>}
            <button type="button" className="neu-btn" onClick={() => { setForm({ id: r.id, title: r.title, price: String(r.price), active: r.active }); setFile(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
