import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };
const BLANK = { name: '', description: '', image_url: '', price: '', stock: '', sort: 0, active: true };

export default function MarketQA() {
  const [tab, setTab] = useState('qa');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('active');

  const load = useCallback(async () => {
    try {
      const d = tab === 'qa' ? await call('admin_qa_list', { p_status: status })
        : tab === 'items' ? await call('admin_market_items') : await call('admin_market_purchases');
      setRows(Array.isArray(d) ? d : []); setErr('');
    } catch (e) { setRows([]); setErr(e.message); }
  }, [tab, status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const run = async (fn, args, ask) => {
    if (ask && !window.confirm(ask)) return;
    try { const r = await call(fn, args); if (r && r.ok === false) setErr(r.error); else { setForm(null); load(); } } catch (e) { setErr(e.message); }
  };
  const edit = (kind, id, old) => { const b = window.prompt('Edit text:', old); if (b !== null) run('admin_qa_update', { p_kind: kind, p_id: id, p_body: b }); };
  const answer = (q) => { const b = window.prompt('Answer as XMARKET:'); if (b) run('admin_qa_answer', { p_question: q, p_body: b }); };
  const saveItem = () => run('admin_market_save', { p_id: form.id || null, p_data: { ...form, price: String(form.price), stock: String(form.stock ?? ''), sort: Number(form.sort) || 0 } });

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Market &amp; Q&amp;A</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['qa', 'Product Q&A'], ['items', 'Shop items'], ['sales', 'Purchases']].map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: tab === id ? 1 : .6 }}>{l}</button>
        ))}
        {tab === 'qa' && <button className="neu-btn" onClick={() => setStatus(status === 'active' ? 'hidden' : 'active')} style={{ padding: '8px 14px' }}>Showing: {status}</button>}
        {tab === 'items' && <button className="neu-btn" onClick={() => setForm({ ...BLANK })} style={{ padding: '8px 14px', fontWeight: 800 }}>+ New item</button>}
      </div>
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ opacity: .6, padding: 20 }}>Nothing here.</div>}

      {tab === 'qa' && rows && rows.map((q) => (
        <div key={q.id} style={card}>
          <div style={{ fontSize: 12, opacity: .7 }}>{q.product} · @{q.username}</div>
          <div style={{ fontWeight: 700, margin: '2px 0 6px' }}>{q.body}</div>
          {q.answers.map((a) => (
            <div key={a.id} style={{ marginLeft: 12, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', opacity: a.status === 'active' ? 1 : .5 }}>
              <span style={{ flex: 1 }}>↳ {a.body} <i style={{ opacity: .6 }}>{a.is_admin ? 'XMARKET' : '@' + a.username}</i></span>
              <button className="neu-btn" style={sm} onClick={() => edit('a', a.id, a.body)}>Edit</button>
              <button className="neu-btn" style={sm} onClick={() => run('admin_qa_update', { p_kind: 'a', p_id: a.id, p_status: a.status === 'active' ? 'hidden' : 'active' })}>{a.status === 'active' ? 'Hide' : 'Show'}</button>
              <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => run('admin_qa_delete', { p_kind: 'a', p_id: a.id }, 'Delete this answer?')}>Del</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="neu-btn" style={sm} onClick={() => answer(q.id)}>Answer</button>
            <button className="neu-btn" style={sm} onClick={() => edit('q', q.id, q.body)}>Edit</button>
            <button className="neu-btn" style={sm} onClick={() => run('admin_qa_update', { p_kind: 'q', p_id: q.id, p_status: q.status === 'active' ? 'hidden' : 'active' })}>{q.status === 'active' ? 'Hide' : 'Show'}</button>
            <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => run('admin_qa_delete', { p_kind: 'q', p_id: q.id }, 'Delete this question and its answers?')}>Delete</button>
          </div>
        </div>
      ))}

      {tab === 'items' && rows && rows.map((i) => (
        <div key={i.id} style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', opacity: i.active ? 1 : .55 }}>
          {i.image_url && <img src={i.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }} />}
          <div style={{ flex: 1, minWidth: 0 }}><b>{i.name}</b> · ₱{Number(i.price).toFixed(2)}<div style={{ fontSize: 12, opacity: .7 }}>stock: {i.stock ?? 'unlimited'} · {i.active ? 'live' : 'hidden'}</div></div>
          <button className="neu-btn" style={sm} onClick={() => setForm({ ...i, stock: i.stock ?? '' })}>Edit</button>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => run('admin_market_delete', { p_id: i.id }, 'Delete this item?')}>Del</button>
        </div>
      ))}

      {tab === 'sales' && rows && rows.map((p) => (
        <div key={p.id} style={card}>
          <b>{p.item_name}</b> · ₱{Number(p.price).toFixed(2)} · {p.status}
          <div style={{ fontSize: 12, opacity: .7 }}>@{p.buyer} ({p.buyer_email}){p.recipient_email ? ' → gift to ' + p.recipient_email : ''} · {new Date(p.created_at).toLocaleString()}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {p.status === 'pending' && <button className="neu-btn" style={sm} onClick={() => run('admin_market_purchase_set', { p_id: p.id, p_status: 'fulfilled' })}>Mark fulfilled</button>}
            {p.status !== 'refunded' && <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => run('admin_market_purchase_set', { p_id: p.id, p_status: 'refunded' }, 'Refund ₱' + p.price + ' to the buyer?')}>Refund</button>}
          </div>
        </div>
      ))}

      {form && (
        <div onClick={() => setForm(null)} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, background: '#fff', width: '100%', maxWidth: 420 }}>
            <b>{form.id ? 'Edit item' : 'New item'}</b>
            {[['name', 'Name'], ['description', 'Description'], ['image_url', 'Image URL'], ['price', 'Price (₱)'], ['stock', 'Stock (empty = unlimited)'], ['sort', 'Sort order']].map(([k, l]) => (
              <input key={k} className="neu-input" placeholder={l} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%', margin: '8px 0 0' }} />
            ))}
            <label style={{ display: 'block', marginTop: 10 }}><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Live in shop</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="neu-btn-primary" style={{ flex: 1, padding: 11 }} onClick={saveItem}>Save</button>
              <button className="neu-btn" style={{ flex: 1, padding: 11 }} onClick={() => setForm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
