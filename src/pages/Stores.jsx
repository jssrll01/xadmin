import { adminDb, adminRows } from '../lib/api';
import React, { useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { supabase } from '../supabase.js';
import { logAudit } from '../lib/api.js';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const BLANK = { name: '', description: '', logo_url: '', banner_url: '', location: '', contact_phone: '', contact_email: '', verified: false };
const VBLANK = { code: '', title: '', discount_type: 'fixed', discount_value: '', min_spend: '', expires_at: '', active: true };
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };

export default function Stores() {
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [vform, setVform] = useState(VBLANK);

  const load = useCallback(async () => {
    try {
      const list = adminRows(await adminDb('select', 'stores', { order_col: 'created_at', lim: 5000 }));
      const allProducts = adminRows(await adminDb('select', 'products', { lim: 5000 }));
      const withCounts = await Promise.all(list.map(async (s) => {
        const f = await supabase.rpc('store_follower_count', { store_name: s.name });
        return { ...s, followers: Number(f.data) || 0, product_count: allProducts.filter((p) => p.store === s.name).length };
      }));
      setRows(withCounts);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);
  useAutoRefresh(load, 8000);

  const loadVouchers = async (storeId) => {
    setVouchers(adminRows(await adminDb('select', 'store_vouchers', { match_col: 'store_id', match_val: String(storeId), order_col: 'created_at', lim: 5000 })));
  };

  const openNew = () => { setEditing({ ...BLANK, __isNew: true }); setVouchers([]); setVform(VBLANK); };
  const openEdit = (r) => { setEditing({ ...r }); setVform(VBLANK); loadVouchers(r.id); };

  const set = (k, v) => setEditing(e => ({ ...e, [k]: v }));

  const save = async () => {
    if (!editing.name || !editing.name.trim()) { show?.('Store name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        id: editing.__isNew ? null : editing.id, name: editing.name, description: editing.description,
        logo_url: editing.logo_url, banner_url: editing.banner_url, location: editing.location,
        contact_phone: editing.contact_phone, contact_email: editing.contact_email, verified: !!editing.verified,
      };
      const { data, error } = await supabase.rpc('admin_save_store', { code: CODE, payload });
      if (error) throw error;
      await logAudit(editing.__isNew ? 'create' : 'update', 'stores', data?.id, editing.__isNew ? null : editing, payload);
      show?.(editing.__isNew ? 'Store created' : 'Store updated', 'success');
      if (editing.__isNew && data) { setEditing({ ...data }); loadVouchers(data.id); }
      else setEditing(null);
      load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setSaving(false); }
  };

  const remove = async (r) => {
    if (!confirm(`Delete store "${r.name}"? Its products are kept.`)) return;
    const { error } = await supabase.rpc('admin_delete_store', { code: CODE, sid: r.id });
    if (error) { show?.(error.message, 'error'); return; }
    await logAudit('delete', 'stores', r.id, r, null);
    show?.('Deleted', 'success'); load();
  };

  const saveVoucher = async () => {
    if (!vform.code.trim() || !vform.discount_value) { show?.('Code and discount value are required', 'error'); return; }
    const payload = { ...vform, store_id: editing.id, id: vform.id || null,
      expires_at: vform.expires_at ? new Date(vform.expires_at).toISOString() : '' };
    const { error } = await supabase.rpc('admin_save_voucher', { code: CODE, payload });
    if (error) { show?.(error.message, 'error'); return; }
    show?.('Voucher saved', 'success'); setVform(VBLANK); loadVouchers(editing.id);
  };

  const removeVoucher = async (v) => {
    if (!confirm(`Delete voucher ${v.code}?`)) return;
    const { error } = await supabase.rpc('admin_delete_voucher', { code: CODE, vid: v.id });
    if (error) { show?.(error.message, 'error'); return; }
    loadVouchers(editing.id);
  };

  const field = (label, key, props = {}) => (
    <div>
      <div style={lab}>{label}</div>
      <input className="neu-input" value={editing[key] ?? ''} onChange={e => set(key, e.target.value)} {...props} />
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Stores</h1><p>{rows.length} registered stores</p></div>
        <Btn variant="primary" onClick={openNew}><Plus size={16} /> New</Btn>
      </div>

      {loading && rows.length === 0 ? (
        <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
      ) : rows.length === 0 ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>No stores yet. Tap "New" to add one.</div></Card>
      ) : (
        <div className="table-wrap">
          <table className="neu-table">
            <thead><tr><th>Store</th><th>Products</th><th>Followers</th><th>Location</th><th>Contact</th><th>Verified</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : null}
                    <b>{r.name}</b></div></td>
                  <td>{r.product_count}</td><td>{r.followers}</td>
                  <td className="cell-wrap">{r.location || '—'}</td>
                  <td className="cell-wrap">{r.contact_phone || r.contact_email || '—'}</td>
                  <td>{r.verified ? 'Yes' : 'No'}</td>
                  <td style={{ textAlign: 'right' }}><div style={{ display: 'inline-flex', gap: 6 }}>
                    <button className="neu-btn" style={{ padding: 7 }} onClick={() => openEdit(r)} title="Edit"><Edit2 size={14} /></button>
                    <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }} onClick={() => remove(r)} title="Delete"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.__isNew ? 'New Store' : 'Edit Store'}>
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editing.banner_url && <img src={editing.banner_url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10 }} />}
            {field('Store name *', 'name')}
            {field('Store profile (Cloudinary URL)', 'logo_url', { placeholder: 'https://res.cloudinary.com/...' })}
            {field('Store banner (Cloudinary URL)', 'banner_url', { placeholder: 'https://res.cloudinary.com/...' })}
            <div><div style={lab}>Information / description</div>
              <textarea className="neu-input" rows={3} value={editing.description ?? ''} onChange={e => set('description', e.target.value)} /></div>
            {field('Location', 'location')}
            {field('Contact phone', 'contact_phone', { type: 'tel' })}
            {field('Contact email', 'contact_email', { type: 'email' })}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editing.verified} onChange={e => set('verified', e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14 }}>Verified store</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save store'}</Btn>
              <Btn onClick={() => setEditing(null)} style={{ flex: 1 }}>Close</Btn>
            </div>

            {!editing.__isNew && editing.id && (
              <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Store vouchers</div>
                {vouchers.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', fontSize: 13 }}>
                    <span><b>{v.code}</b> · {v.discount_type === 'percent' ? `${Number(v.discount_value)}%` : `₱${Number(v.discount_value)}`} off{Number(v.min_spend) > 0 ? ` · min ₱${Number(v.min_spend)}` : ''}{v.active ? '' : ' · inactive'}</span>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="neu-btn" style={{ padding: 6 }} onClick={() => setVform({ ...v, expires_at: v.expires_at ? v.expires_at.slice(0, 10) : '' })}><Edit2 size={13} /></button>
                      <button className="neu-btn" style={{ padding: 6, color: 'var(--danger)' }} onClick={() => removeVoucher(v)}><Trash2 size={13} /></button>
                    </span>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <input className="neu-input" placeholder="Code" value={vform.code} onChange={e => setVform({ ...vform, code: e.target.value })} />
                  <input className="neu-input" placeholder="Title" value={vform.title || ''} onChange={e => setVform({ ...vform, title: e.target.value })} />
                  <select className="neu-input" value={vform.discount_type} onChange={e => setVform({ ...vform, discount_type: e.target.value })}>
                    <option value="fixed">Fixed (₱)</option><option value="percent">Percent (%)</option>
                  </select>
                  <input className="neu-input" type="number" placeholder="Discount value" value={vform.discount_value} onChange={e => setVform({ ...vform, discount_value: e.target.value })} />
                  <input className="neu-input" type="number" placeholder="Min spend" value={vform.min_spend} onChange={e => setVform({ ...vform, min_spend: e.target.value })} />
                  <input className="neu-input" type="date" value={vform.expires_at || ''} onChange={e => setVform({ ...vform, expires_at: e.target.value })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', fontSize: 13 }}>
                  <input type="checkbox" checked={!!vform.active} onChange={e => setVform({ ...vform, active: e.target.checked })} /> Active
                </label>
                <Btn onClick={saveVoucher} style={{ width: '100%' }}>{vform.id ? 'Update voucher' : 'Add voucher'}</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
