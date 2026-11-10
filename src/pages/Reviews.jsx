import React, { useCallback, useEffect, useState } from 'react';
import { Star, Search, Trash2, Edit3, PlusCircle, MessageCircle } from 'lucide-react';
import { adminDb, adminRows, fetchReviews, reviewCrud } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import useAutoClear from '../xa/useAutoClear.js';
import Btn from '../components/Btn.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import { ConfirmDialog, EmptyState, SkRows } from '../xa/Kit.jsx';

function Stars({ value = 0, size = 14 }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={n + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} fill={i <= n ? '#F59E0B' : 'none'} color={i <= n ? '#F59E0B' : 'var(--border-strong)'} />)}
    </span>
  );
}

const BLANK = { product_id: '', user_id: '', rating: 5, comment: '' };

export default function Reviews() {
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState({});
  const [buyers, setBuyers] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useAutoClear(q, setQ);
  const [star, setStar] = useState('all');
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState({ rating: 5, comment: '', seller_reply: '' });
  const [creating, setCreating] = useState(false);
  const [nd, setNd] = useState(BLANK);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    const { items } = await fetchReviews();
    const list = items || [];
    setRows(list);
    const pids = [...new Set(list.map((r) => r.product_id).filter(Boolean))];
    const uids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
    const [pRes, uRes] = await Promise.all([
      pids.length ? adminDb('select', 'products', { lim: 5000 }).then((r) => ({ data: adminRows(r).filter((p) => pids.includes(p.id)) })) : { data: [] },
      uids.length ? adminDb('select', 'profiles', { lim: 5000 }).then((r) => ({ data: adminRows(r).filter((u) => uids.includes(u.id)) })) : { data: [] },
    ]);
    setProducts(Object.fromEntries((pRes.data || []).map((p) => [p.id, p])));
    setBuyers(Object.fromEntries((uRes.data || []).map((u) => [u.id, u])));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (row) => {
    setDraft({ rating: row.rating || 5, comment: row.comment || '', seller_reply: row.seller_reply || '' });
    setEdit(row);
  };
  const saveEdit = async () => {
    setBusy(true);
    const { error } = await reviewCrud.update(edit.id, {
      rating: Number(draft.rating), comment: draft.comment,
      seller_reply: draft.seller_reply || null,
      replied_at: draft.seller_reply ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (error) return show(error.message, 'error');
    show('Review updated', 'success');
    setEdit(null);
    load();
  };
  const submitNew = async () => {
    const e = {};
    if (!nd.product_id.trim()) e.product_id = 'Product ID is required';
    if (!nd.user_id.trim()) e.user_id = 'User ID is required';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error } = await reviewCrud.create({ product_id: nd.product_id.trim(), user_id: nd.user_id.trim(), rating: Number(nd.rating) || 5, comment: nd.comment || '' });
    setBusy(false);
    if (error) return show(error.message, 'error');
    show('Review created', 'success');
    setCreating(false); setNd(BLANK);
    load();
  };
  const doDelete = async () => {
    setBusy(true);
    const { error } = await reviewCrud.remove(del.id);
    setBusy(false);
    setDel(null);
    if (error) return show(error.message, 'error');
    show('Review deleted', 'success');
    load();
  };

  const t = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (star !== 'all' && Number(r.rating) !== Number(star)) return false;
    if (!t) return true;
    const p = products[r.product_id]?.name || '';
    const u = buyers[r.user_id] || {};
    const buyer = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
    return [r.comment, r.id, p, buyer].filter(Boolean).join(' ').toLowerCase().includes(t);
  });

  return (
    <>
      <PageHeader title="Reviews" subtitle={filtered.length + ' shown of ' + rows.length}
        actions={<Btn variant="primary" onClick={() => { setErrs({}); setCreating(true); }}><PlusCircle size={15} /> New</Btn>} />

      <div className="ui-tools">
        <label className="ui-search">
          <Search size={15} />
          <input className="neu-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search comment, product, buyer…" aria-label="Search reviews" />
        </label>
        <select className="neu-input" style={{ flex: '0 1 150px' }} value={star} onChange={(e) => setStar(e.target.value)} aria-label="Filter by rating">
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
        </select>
      </div>

      {loading && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={5} cols={3} /></div>}
      {!loading && !filtered.length && <div className="table-wrap"><EmptyState title={rows.length ? 'No matches' : 'No reviews yet'} hint={rows.length ? 'Try a different search or rating.' : ''} /></div>}

      <div className="rv-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 12 }}>
        {filtered.map((row) => {
          const p = products[row.product_id] || {};
          const u = buyers[row.user_id] || {};
          const buyerName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—';
          return (
            <div key={row.id} className="neu-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Stars value={row.rating} />
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{new Date(row.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
              </div>
              <div style={{ fontSize: 14, marginBottom: 8, wordBreak: 'break-word' }}>{row.comment || '—'}</div>
              {row.photo_url && String(row.photo_url).startsWith('https://res.cloudinary.com/bvw3okdf/') && (
                <a href={row.photo_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 8 }}>
                  <img src={String(row.photo_url).replace('/image/upload/', '/image/upload/w_300,c_limit,f_auto,q_auto/')} alt="Review photo" loading="lazy" decoding="async" style={{ maxWidth: 140, maxHeight: 140, borderRadius: 10, display: 'block' }} />
                </a>
              )}
              {row.seller_reply && (
                <div style={{ padding: 10, marginBottom: 8, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="ui-lbl" style={{ marginBottom: 2 }}>Seller reply</div>
                  <div style={{ fontSize: 13 }}>{row.seller_reply}</div>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Product: <b style={{ color: 'var(--text)' }}>{p.name || row.product_id?.slice(0, 8) || '—'}</b></div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>Buyer: <b style={{ color: 'var(--text)' }}>{buyerName}</b>{u.email ? ' · ' + u.email : ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => startEdit(row)} style={{ flex: 1 }}><Edit3 size={14} /> Edit or reply</Btn>
                <button type="button" className="ui-ic danger" style={{ width: 38, height: 36 }} onClick={() => setDel(row)} aria-label="Delete review"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Drawer open={!!edit} onClose={() => !busy && setEdit(null)} title="Edit review"
        footer={<><Btn variant="primary" loading={busy} onClick={saveEdit}>{busy ? 'Saving…' : 'Save'}</Btn><Btn onClick={() => setEdit(null)} disabled={busy}>Cancel</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="ui-lbl">Rating</div>
            <select className="neu-input" value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></div>
          <div><div className="ui-lbl">Comment</div>
            <textarea className="neu-input" rows={4} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></div>
          <div><div className="ui-lbl">Seller reply (empty removes it)</div>
            <textarea className="neu-input" rows={3} value={draft.seller_reply} onChange={(e) => setDraft({ ...draft, seller_reply: e.target.value })} /></div>
        </div>
      </Drawer>

      <Drawer open={creating} onClose={() => !busy && setCreating(false)} title="Create review"
        footer={<><Btn variant="primary" loading={busy} onClick={submitNew}>{busy ? 'Saving…' : 'Create'}</Btn><Btn onClick={() => setCreating(false)} disabled={busy}>Cancel</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="ui-lbl">Product ID *</div>
            <input className={'neu-input' + (errs.product_id ? ' bad' : '')} value={nd.product_id} onChange={(e) => { setNd({ ...nd, product_id: e.target.value }); setErrs({ ...errs, product_id: '' }); }} />
            {errs.product_id && <div className="ui-err" role="alert">{errs.product_id}</div>}</div>
          <div><div className="ui-lbl">User ID *</div>
            <input className={'neu-input' + (errs.user_id ? ' bad' : '')} value={nd.user_id} onChange={(e) => { setNd({ ...nd, user_id: e.target.value }); setErrs({ ...errs, user_id: '' }); }} />
            {errs.user_id && <div className="ui-err" role="alert">{errs.user_id}</div>}</div>
          <div><div className="ui-lbl">Rating</div>
            <select className="neu-input" value={nd.rating} onChange={(e) => setNd({ ...nd, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></div>
          <div><div className="ui-lbl">Comment</div>
            <textarea className="neu-input" rows={4} value={nd.comment} onChange={(e) => setNd({ ...nd, comment: e.target.value })} /></div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!del} title="Delete this review?" message="This cannot be undone." confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <span hidden><MessageCircle size={1} /></span>
    </>
  );
}
