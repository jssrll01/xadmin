import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { xmSupabase } from '../supabase.js';
import { adm } from './db.js';
import { SkRows, EmptyState, ConfirmDialog, useXaToast, Badge } from './Kit.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';

const MAX = 100 * 1048576;
const size = (b) => (!b ? '' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const safe = (n) => n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '12px 0 4px' };

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
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [errs, setErrs] = useState({});
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
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

  const openNew = () => { setForm({ id: null, title: '', price: '', active: true }); setFile(null); setErrs({}); setPct(0); };
  const openEdit = (r) => { setForm({ id: r.id, title: r.title, price: String(r.price), active: r.active }); setFile(null); setErrs({}); setPct(0); };
  const close = () => { if (!busy) setForm(null); };
  const choose = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > MAX) { setErrs((x) => ({ ...x, file: 'File is over 100 MB.' })); return; }
    setFile(f); setErrs((x) => ({ ...x, file: '' }));
  };

  const save = async () => {
    const e = {};
    const title = form.title.trim(); const price = Number(form.price);
    if (!title) e.title = 'Enter a display title';
    if (form.price === '' || !(price >= 0)) e.price = 'Enter a valid price';
    if (!form.id && !file) e.file = 'Choose the file to sell';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true); setPct(0);
    try {
      let path = null;
      if (file) { const u = uploadFile(file, setPct); abortRef.current = u.abort; path = await u.promise; setPct(100); }
      await adm('admin_digital_save', { p_id: form.id, p_title: title, p_price: price, p_path: path, p_name: file ? file.name : null, p_size: file ? file.size : null, p_active: form.active });
      push(form.id ? 'Saved' : 'Digital product added', 'success');
      setBusy(false); abortRef.current = null; setForm(null); load();
      return;
    } catch (er) { if (!er.canceled) push(er.message, 'error', 6000); }
    abortRef.current = null; setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      const r = await adm('admin_digital_delete', { p_id: del.id });
      const paths = (r && r.paths) || [];
      let fileOk = true;
      if (paths.length) {
        const { error } = await xmSupabase.storage.from('digital-files').remove(paths);
        if (error) fileOk = false; else await adm('admin_digital_trash_clear', { p_paths: paths });
      }
      push(fileOk ? 'Product and file deleted' : 'Product deleted, but the file could not be removed yet. It will retry on the next delete.', fileOk ? 'success' : 'error', 6000);
      setDel(null); load();
    } catch (er) { push(er.message, 'error', 6000); }
    setBusy(false);
  };

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Digital Products</h2>
        <Btn variant="primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={15} /> New</Btn>
      </div>
      <div className="neu-card" style={{ padding: 8 }}>
        {rows === null && <SkRows rows={4} cols={3} />}
        {rows && rows.length === 0 && <EmptyState title="No digital products yet" hint='Tap "New" to add one.' />}
        {rows && rows.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>₱{Number(r.price).toLocaleString()} · {r.file_name || 'file'} {size(r.file_size)} · {r.sales} sold</div>
            </div>
            {!r.active && <Badge>hidden</Badge>}
            <button type="button" className="ui-ic" aria-label="Edit" data-tip="Edit" onClick={() => openEdit(r)}><Edit2 size={14} /></button>
            <button type="button" className="ui-ic danger" aria-label="Delete" data-tip="Delete" onClick={() => setDel(r)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={close} closeOnEsc={!busy} title={form && form.id ? 'Edit digital product' : 'New digital product'}>
        {form && (
          <div>
            <label style={{ ...lbl, marginTop: 0 }}>Display title</label>
            <input className={'xa-input' + (errs.title ? ' bad' : '')} value={form.title} maxLength={120} autoFocus onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrs({ ...errs, title: '' }); }} />
            {errs.title && <div className="ui-err" role="alert">{errs.title}</div>}
            <label style={lbl}>Price (₱)</label>
            <input className={'xa-input' + (errs.price ? ' bad' : '')} type="number" min="0" step="any" inputMode="decimal" value={form.price} onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrs({ ...errs, price: '' }); }} />
            {errs.price && <div className="ui-err" role="alert">{errs.price}</div>}
            <label style={lbl}>File{form.id ? ' (leave empty to keep the current one)' : ''}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="neu-btn" disabled={busy} onClick={() => pick.current && pick.current.click()}>{file ? 'Change file' : 'Choose file'}</button>
              {file && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{file.name} · {size(file.size)}</span>}
              <input ref={pick} type="file" style={{ display: 'none' }} onChange={choose} />
            </div>
            {errs.file && <div className="ui-err" role="alert">{errs.file}</div>}
            {form.id && <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible in the shop</label>}
            {busy && (
              <div style={{ marginTop: 14 }}>
                <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: 'var(--primary)', transition: 'width .15s' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{pct < 100 ? 'Uploading ' + pct + '%' : 'Saving…'}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Btn variant="primary" loading={busy} onClick={save} style={{ flex: 1 }}>{form.id ? 'Save changes' : 'Upload and add'}</Btn>
              {busy && abortRef.current && pct < 100
                ? <Btn onClick={() => abortRef.current && abortRef.current()} style={{ flex: 1 }}>Cancel upload</Btn>
                : <Btn onClick={close} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title={'Delete "' + (del ? del.title : '') + '"?'} message={del && del.sales > 0 ? 'This item has ' + del.sales + ' sale(s). Deleting it also removes those purchase records, so buyers lose their download, and nothing is refunded. The file is deleted from storage.' : 'The item and its file are deleted from storage. This cannot be undone.'} confirmText="Delete" typeToConfirm={del && del.sales > 0 ? 'DELETE' : undefined} danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
