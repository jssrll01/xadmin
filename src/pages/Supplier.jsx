import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { xrpc } from '../lib/xrpc.js';

const BLANK = { id: null, name: '', url: '' };
const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', marginBottom: 10, fontSize: 15 };
const btn = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 };
const card = { padding: 12, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' };

export default function Supplier() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [toast, setToast] = useState('');
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const load = useCallback(async () => {
    try { setRows((await xrpc('admin_sup_list')) || []); setErr(''); }
    catch (e) { setErr(e.message || String(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => (r.name || '').toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  const save = async () => {
    if (!form.name.trim()) return setErr('Product name is required');
    if (!/^https?:\/\//i.test(form.url.trim())) return setErr('Link must start with http:// or https://');
    try {
      await xrpc('admin_sup_save', { p_id: form.id, p_name: form.name, p_url: form.url });
      setOpen(false); setErr(''); say(form.id ? 'Updated' : 'Added'); load();
    } catch (e) { setErr(e.message || String(e)); }
  };
  const del = async (r) => {
    if (!window.confirm('Delete "' + r.name + '"?')) return;
    try { await xrpc('admin_sup_delete', { p_id: r.id }); say('Deleted'); load(); }
    catch (e) { setErr(e.message || String(e)); }
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12, maxWidth: 800 }}>
      <h2 style={{ margin: 0 }}>Supplier</h2>
      <div style={card}>
        <input style={inp} placeholder="Search product names" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btn} onClick={() => { setForm(BLANK); setErr(''); setOpen(true); }}>+ Add product</button>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{list.length} of {rows.length}</span>
        </div>
      </div>
      {err && !open && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
      {!list.length && <div style={{ ...card, textAlign: 'center', color: 'var(--text-dim)' }}>No products found.</div>}
      {list.map((r) => (
        <div key={r.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href={r.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontWeight: 700, wordBreak: 'break-word', color: 'var(--primary)' }}>{r.name} ↗</a>
          <button style={btn} onClick={() => { setForm(r); setErr(''); setOpen(true); }}>Edit</button>
          <button style={{ ...btn, color: 'var(--danger)' }} onClick={() => del(r)}>Delete</button>
        </div>
      ))}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(420px, 92vw)', padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit product' : 'Add product'}</h3>
            <input style={inp} placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={inp} placeholder="Link (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn} onClick={save}>{form.id ? 'Save' : 'Add'}</button>
              <button style={btn} onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 16px', borderRadius: 99, fontSize: 14, zIndex: 2000 }}>{toast}</div>}
    </div>
  );
}
