import { useAdminContext } from "../context/AdminContext";
import { adminDb, adminRows } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { Star, Search, Trash2, Edit3, Save, X, PlusCircle, MessageCircle } from 'lucide-react';
import { getDb } from '../supabase.js';
import { fetchReviews, reviewCrud } from '../lib/api.js';

function Stars({ value = 0, size = 14 }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} fill={i <= n ? '#F59E0B' : 'none'} color={i <= n ? '#F59E0B' : '#C8D0DD'} />
      ))}
    </span>
  );
}

const emptyDraft = { rating: 5, comment: '', seller_reply: '' };

export default function Reviews() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState({});
  const [buyers, setBuyers] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({ product_id: '', user_id: '', rating: 5, comment: '' });

  const load = async () => {
    setLoading(true);
    const { items } = await fetchReviews();
    const list = items || [];
    setRows(list);
    // enrich with product names + buyer info
    const productIds = [...new Set(list.map(r => r.product_id).filter(Boolean))];
    const userIds    = [...new Set(list.map(r => r.user_id).filter(Boolean))];
    const [pRes, uRes] = await Promise.all([
      productIds.length ? adminDb('select', 'products', { lim: 5000 }).then((r) => ({ data: adminRows(r).filter((p) => productIds.includes(p.id)) })) : { data: [] },
      userIds.length ? adminDb('select', 'profiles', { lim: 5000 }).then((r) => ({ data: adminRows(r).filter((u) => userIds.includes(u.id)) })) : { data: [] },
    ]);
    setProducts(Object.fromEntries((pRes.data || []).map(p => [p.id, p])));
    setBuyers(Object.fromEntries((uRes.data || []).map(u => [u.id, u])));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (row) => {
    setEditing(row.id);
    setDraft({ rating: row.rating || 5, comment: row.comment || '', seller_reply: row.seller_reply || '' });
  };

  const saveEdit = async () => {
    setBusy(true);
    const patch = {
      rating: Number(draft.rating),
      comment: draft.comment,
      seller_reply: draft.seller_reply || null,
      replied_at: draft.seller_reply ? new Date().toISOString() : null,
    };
    const { error } = await reviewCrud.update(editing, patch);
    setBusy(false);
    if (error) return alert(error.message);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this review? Cannot be undone.')) return;
    const { error } = await reviewCrud.remove(id);
    if (error) return alert(error.message);
    load();
  };

  const submitNew = async () => {
    if (!newDraft.product_id || !newDraft.user_id) return alert('product_id and user_id required');
    setBusy(true);
    const { error } = await reviewCrud.create({
      product_id: newDraft.product_id,
      user_id: newDraft.user_id,
      rating: Number(newDraft.rating) || 5,
      comment: newDraft.comment || '',
    });
    setBusy(false);
    if (error) return alert(error.message);
    setCreating(false);
    setNewDraft({ product_id: '', user_id: '', rating: 5, comment: '' });
    load();
  };

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    const p = products[r.product_id]?.name || '';
    const u = buyers[r.user_id] || {};
    const buyer = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
    return [r.comment, r.id, p, buyer].filter(Boolean).join(' ').toLowerCase().includes(t);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reviews</h1>
          <p>{filtered.length} shown</p>
        </div>
        <button className="neu-btn-primary" onClick={() => setCreating(c => !c)}
          style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={14} /> {creating ? 'Close' : 'New'}
        </button>
      </div>

      {creating && (
        <div className="neu-card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Create review</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="neu-input" placeholder="Product ID *" value={newDraft.product_id} onChange={e => setNewDraft({ ...newDraft, product_id: e.target.value })} />
            <input className="neu-input" placeholder="User ID *" value={newDraft.user_id} onChange={e => setNewDraft({ ...newDraft, user_id: e.target.value })} />
            <select className="neu-input" value={newDraft.rating} onChange={e => setNewDraft({ ...newDraft, rating: e.target.value })}>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
            </select>
            <textarea className="neu-input" rows={3} style={{ gridColumn: '1 / -1' }} placeholder="Comment" value={newDraft.comment} onChange={e => setNewDraft({ ...newDraft, comment: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={submitNew} disabled={busy} className="neu-btn-primary" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save size={14} /> {busy ? 'Saving…' : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="neu-btn" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: '#97A0B5' }} />
        <input className="neu-input" style={{ paddingLeft: 40 }} placeholder="Search comment, product, buyer…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading && <div className="muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</div>}
      {!loading && !filtered.length && (
        <div className="neu-card" style={{ padding: 30, textAlign: 'center' }}>
          <MessageCircle size={30} style={{ color: '#97A0B5', marginBottom: 8 }} />
          <div className="muted">No reviews yet</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(row => {
          const isEditing = editing === row.id;
          const p = products[row.product_id] || {};
          const u = buyers[row.user_id] || {};
          const buyerName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—';
          return (
            <div key={row.id} className="neu-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Stars value={row.rating} />
                <div className="muted" style={{ fontSize: 11 }}>{new Date(row.created_at).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>{row.comment || '—'}</div>
              {row.photo_url && String(row.photo_url).startsWith('https://res.cloudinary.com/bvw3okdf/') && (
                <a href={row.photo_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 8 }}>
                  <img src={String(row.photo_url).replace('/image/upload/', '/image/upload/w_300,c_limit,f_auto,q_auto/')} alt="Review photo"
                    style={{ maxWidth: 140, maxHeight: 140, borderRadius: 10, display: 'block' }} />
                </a>
              )}
              {row.seller_reply && (
                <div className="neu-card" style={{ padding: 10, marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 10, fontWeight: 800, marginBottom: 3 }}>SELLER REPLY</div>
                  <div style={{ fontSize: 12.5 }}>{row.seller_reply}</div>
                </div>
              )}
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>
                Product: <b>{p.name || row.product_id?.slice(0,8) || '—'}</b>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
                Buyer: <b>{buyerName}</b> {u.email ? `· ${u.email}` : ''}
              </div>

              {isEditing && (
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, marginBottom: 10 }}>
                  <select className="neu-input" value={draft.rating} onChange={e => setDraft({ ...draft, rating: e.target.value })}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}★</option>)}
                  </select>
                  <input className="neu-input" value={draft.comment} onChange={e => setDraft({ ...draft, comment: e.target.value })} placeholder="Comment" />
                  <textarea className="neu-input" rows={2} style={{ gridColumn: '1 / -1' }} placeholder="Seller reply" value={draft.seller_reply} onChange={e => setDraft({ ...draft, seller_reply: e.target.value })} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} disabled={busy} className="neu-btn-primary" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Save size={14} /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="neu-btn" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <X size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(row)} className="neu-btn" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button onClick={() => remove(row.id)} className="neu-btn" style={{ padding: '10px 14px', color: '#DC2626' }}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
