import { uploadToCloudinary } from '../lib/cloud.js';
import React, { useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { supabase } from '../supabase.js';
import { logAudit } from '../lib/api.js';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const BLANK = { title: '', subtitle: '', image_url: '', cta_text: '', cta_link: '', sort_order: 0, active: true, starts_at: '', ends_at: '' };
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const day = (d) => (d ? String(d).slice(0, 10) : '');

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}
const audit = async (...a) => { try { await logAudit(...a); } catch {} };
const toPayload = (b) => ({
  id: b.id || null, title: b.title, subtitle: b.subtitle, image_url: b.image_url,
  cta_text: b.cta_text, cta_link: b.cta_link, sort_order: Number(b.sort_order) || 0, active: !!b.active,
  starts_at: b.starts_at ? new Date(b.starts_at).toISOString() : '',
  ends_at: b.ends_at ? new Date(b.ends_at).toISOString() : '',
});

export default function Banners() {
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const d = await rpc('admin_banner_list', {}); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(String(e.message || e)); } finally { setLoading(false); }
  }, []);
  useAutoRefresh(load, 10000);

  const set = (k, v) => setEdit(e => ({ ...e, [k]: v }));

  const save = async () => {
    if (!edit.image_url || !edit.image_url.trim()) { show?.('Image URL is required', 'error'); return; }
    setBusy(true);
    try {
      const payload = toPayload(edit);
      const r = await rpc('admin_banner_save', { payload });
      await audit(edit.id ? 'update' : 'create', 'banners', r && r.id, edit.id ? edit : null, payload);
      show?.(edit.id ? 'Banner updated' : 'Banner created', 'success'); setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(`Delete banner "${r.title || 'Untitled'}"?`)) return;
    try { await rpc('admin_banner_delete', { bid: r.id }); await audit('delete', 'banners', r.id, r, null); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const toggle = async (r) => {
    try { await rpc('admin_banner_save', { payload: toPayload({ ...r, active: !r.active }) }); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const move = async (i, dir) => {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    try {
      await rpc('admin_banner_save', { payload: toPayload({ ...a, sort_order: b.sort_order === a.sort_order ? b.sort_order + dir : b.sort_order }) });
      await rpc('admin_banner_save', { payload: toPayload({ ...b, sort_order: a.sort_order }) });
      load();
    } catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const field = (label, key, props = {}) => (
    <div><div style={lab}>{label}</div>
      <input className="neu-input" value={edit[key] ?? ''} onChange={e => set(key, e.target.value)} {...props} /></div>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Banners</h1><p>{rows.length} banners · shown on the XMARKET home page</p></div>
        <Btn variant="primary" onClick={() => setEdit({ ...BLANK, sort_order: rows.length + 1 })}><Plus size={16} /> New</Btn>
      </div>
      {err && <Card style={{ marginBottom: 12 }}><div style={{ padding: 12, color: 'var(--danger)', fontSize: 13 }}>{err}</div></Card>}
      {loading && rows.length === 0 ? (
        <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
      ) : rows.length === 0 ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>No banners yet. Tap "New" to add one.</div></Card>
      ) : rows.map((r, i) => (
        <Card key={r.id} style={{ marginBottom: 12, padding: 12 }}>
          <img src={r.image_url} alt="" style={{ width: '100%', borderRadius: 12, display: 'block', opacity: r.active ? 1 : 0.4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <b>{r.title || 'Untitled'}</b>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                Order {r.sort_order} · {r.active ? 'Active' : 'Hidden'}
                {r.cta_link ? ` · CTA ${r.cta_text || ''} → ${r.cta_link}` : ''}
                {(r.starts_at || r.ends_at) ? ` · ${day(r.starts_at) || '…'} to ${day(r.ends_at) || '…'}` : ''}
              </div>
            </div>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <button className="neu-btn" style={{ padding: 7 }} disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ArrowUp size={14} /></button>
              <button className="neu-btn" style={{ padding: 7 }} disabled={i === rows.length - 1} onClick={() => move(i, 1)} title="Move down"><ArrowDown size={14} /></button>
              <button className="neu-btn" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => toggle(r)}>{r.active ? 'Hide' : 'Show'}</button>
              <button className="neu-btn" style={{ padding: 7 }} onClick={() => setEdit({ ...r, starts_at: day(r.starts_at), ends_at: day(r.ends_at) })} title="Edit"><Edit2 size={14} /></button>
              <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }} onClick={() => remove(r)} title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && edit.id ? 'Edit banner' : 'New banner'}>
        {edit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {edit.image_url && <img src={edit.image_url} alt="" style={{ width: '100%', borderRadius: 10 }} />}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Banner Image (Upload or URL)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label className="neu-btn" style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', display: 'inline-block', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  📁 Choose Banner File...
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadToCloudinary(f, 'xmarket_banners');
                      setEdit({ ...edit, image_url: url });
                    } catch (err) { alert('Upload failed: ' + err.message); }
                  }} style={{ display: 'none' }} />
                </label>
              </div>
              {field('', 'image_url', { placeholder: 'https://res.cloudinary.com/...' })}
            </div>
            {field('Title', 'title')}
            {field('Subtitle', 'subtitle')}
            {field('CTA button text', 'cta_text', { placeholder: 'Shop Now' })}
            {field('CTA link', 'cta_link', { placeholder: '/flash-sale or https://...' })}
            {field('Order (lower shows first)', 'sort_order', { type: 'number' })}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {field('Starts', 'starts_at', { type: 'date' })}
              {field('Ends', 'ends_at', { type: 'date' })}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!edit.active} onChange={e => set('active', e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14 }}>Active (visible on Home)</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={save} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
