import { useAdminContext } from "../context/AdminContext";
import { adminDb, adminRows } from '../lib/api';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { getDb } from '../supabase.js';
import { logAudit } from '../lib/api.js';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const BLANK = { name: '', description: '', logo_url: '', banner_url: '', location: '', contact_phone: '', contact_email: '', verified: false };
const VBLANK = { code: '', title: '', discount_type: 'fixed', discount_value: '', min_spend: '', expires_at: '', active: true };
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const PAGE_SIZE = 25;

export default function Stores() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [vform, setVform] = useState(VBLANK);

  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name_asc');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => { setDq(q.trim().toLowerCase()); setPage(1); }, 200); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [filter, sort]);

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
  const openEdit = (r) => { setEditing({ ...r, __orig: { ...r } }); setVform(VBLANK); loadVouchers(r.id); };

  const set = (k, v) => setEditing(e => ({ ...e, [k]: v }));

  const closeModal = () => {
    if (!editing) return;
    const o = editing.__orig;
    const dirty = editing.__isNew
      ? Object.keys(BLANK).some((k) => String(editing[k] ?? '') !== String(BLANK[k] ?? ''))
      : o && Object.keys(BLANK).some((k) => String(editing[k] ?? '') !== String(o[k] ?? ''));
    if (dirty && !confirm('Discard unsaved changes to this store?')) return;
    setEditing(null);
  };

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
      await logAudit(editing.__isNew ? 'create' : 'update', 'stores', data?.id, editing.__isNew ? null : editing.__orig, payload);
      show?.(editing.__isNew ? 'Store created' : 'Store updated', 'success');
      if (editing.__isNew && data) { setEditing({ ...data, __orig: { ...data } }); loadVouchers(data.id); }
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

  const filtered = useMemo(() => {
    const f = rows.filter((r) => {
      if (filter === 'verified' && !r.verified) return false;
      if (filter === 'unverified' && r.verified) return false;
      if (!dq) return true;
      return (r.name || '').toLowerCase().includes(dq)
        || (r.location || '').toLowerCase().includes(dq)
        || (r.contact_phone || '').toLowerCase().includes(dq)
        || (r.contact_email || '').toLowerCase().includes(dq);
    });
    const cmp = {
      name_asc: (a, b) => (a.name || '').localeCompare(b.name || ''),
      name_desc: (a, b) => (b.name || '').localeCompare(a.name || ''),
      products_desc: (a, b) => (b.product_count || 0) - (a.product_count || 0),
      products_asc: (a, b) => (a.product_count || 0) - (b.product_count || 0),
      followers_desc: (a, b) => (b.followers || 0) - (a.followers || 0),
    }[sort] || (() => 0);
    return [...f].sort(cmp);
  }, [rows, dq, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <>
      <div className="page-head">
        <div><h1>Stores</h1><p>{rows.length} registered stores · {filtered.length} shown</p></div>
        <Btn variant="primary" onClick={openNew}><Plus size={16} /> New</Btn>
      </div>

      {loading && rows.length === 0 ? (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((k) => (
            <div className="stat" key={k}><div><div className="stat-label">&nbsp;</div><div className="stat-value"><span className="xa-skel" /></div></div></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>No stores yet. Tap "New" to add one.</div></Card>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat"><div><div className="stat-label">Stores</div><div className="stat-value"><AnimatedNumber value={rows.length} /></div></div></div>
            <div className="stat"><div><div className="stat-label">Verified</div><div className="stat-value"><AnimatedNumber value={rows.filter((r) => r.verified).length} /></div></div></div>
            <div className="stat"><div><div className="stat-label">Products</div><div className="stat-value"><AnimatedNumber value={rows.reduce((s, r) => s + (r.product_count || 0), 0)} /></div></div></div>
            <div className="stat"><div><div className="stat-label">Followers</div><div className="stat-value"><AnimatedNumber value={rows.reduce((s, r) => s + (r.followers || 0), 0)} /></div></div></div>
          </div>

          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ position: 'relative', flex: '1 1 220px' }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input className="neu-input" style={{ paddingLeft: 34 }} placeholder="Search name, location, contact…" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <select className="neu-input" style={{ flex: '0 1 150px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <select className="neu-input" style={{ flex: '0 1 180px' }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="name_asc">Name A→Z</option>
                <option value="name_desc">Name Z→A</option>
                <option value="products_desc">Most products</option>
                <option value="products_asc">Fewest products</option>
                <option value="followers_desc">Most followers</option>
              </select>
            </div>
          </Card>

          <div className="table-wrap">
            <table className="neu-table">
              <thead><tr><th>Store</th><th>Products</th><th>Followers</th><th>Location</th><th>Contact</th><th>Verified</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr></thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {r.logo_url ? <img src={r.logo_url} alt="" loading="lazy" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : null}
                      <b>{r.name}</b></div></td>
                    <td>{r.product_count}</td><td>{r.followers}</td>
                    <td className="cell-wrap">{r.location || '—'}</td>
                    <td className="cell-wrap">{r.contact_phone || r.contact_email || '—'}</td>
                    <td>{r.verified ? 'Yes' : 'No'}</td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="neu-btn" style={{ padding: 7 }} onClick={() => openEdit(r)} title="Edit"><Edit2 size={14} /></button>
                      <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => remove(r)} title="Delete"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>No stores match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Btn disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Btn>
              <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Page {curPage} of {totalPages}</span>
              <Btn disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)} aria-label="Next page"><ChevronRight size={16} /></Btn>
            </div>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={closeModal} title={editing?.__isNew ? 'New Store' : 'Edit Store'}>
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editing.banner_url && <img src={editing.banner_url} alt="" loading="lazy" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10 }} />}
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
              <Btn onClick={closeModal} style={{ flex: 1 }}>Close</Btn>
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
