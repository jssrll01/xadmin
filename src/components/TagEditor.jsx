import { getAdminPin } from '../lib/pin.js';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const CODE = getAdminPin();

export default function TagEditor({ title, fn, id, initial, onClose, onSaved }) {
  const [list, setList] = useState(initial || []);
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setRes([]); return undefined; }
    const h = setTimeout(async () => {
      const { data } = await supabase.from('products').select('id,name').ilike('name', '%' + t.replace(/[%_,()]/g, ' ') + '%').limit(8);
      setRes(data || []);
    }, 300);
    return () => clearTimeout(h);
  }, [q]);

  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc(fn, { p_code: CODE, p_id: id, p_products: list.map((x) => x.id) });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data && data.ok === false) return setErr(data.error);
    onSaved();
  };

  const btn = { padding: '4px 10px', fontSize: 11 };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto', background: '#fff', color: '#0F172A', borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
        {list.length === 0 && <div style={{ opacity: .6, fontSize: 13, marginBottom: 8 }}>No products tagged.</div>}
        {list.map((x) => (
          <div key={x.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
            <span style={{ flex: 1 }}>{x.name}</span>
            <button className="neu-btn" style={{ ...btn, color: '#DC2626' }} onClick={() => setList(list.filter((y) => y.id !== x.id))}>remove</button>
          </div>
        ))}
        {list.length < 3 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to add" style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 8 }} />}
        {res.filter((x) => !list.some((y) => y.id === x.id)).map((x) => (
          <button key={x.id} className="neu-btn" style={{ ...btn, display: 'block', width: '100%', textAlign: 'left', marginTop: 6 }} onClick={() => { setList([...list, x]); setQ(''); setRes([]); }}>+ {x.name}</button>
        ))}
        {err && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="neu-btn" style={{ padding: '8px 14px', fontWeight: 800 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="neu-btn" style={{ padding: '8px 14px' }} onClick={() => setList([])}>Clear all</button>
          <button className="neu-btn" style={{ padding: '8px 14px' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
