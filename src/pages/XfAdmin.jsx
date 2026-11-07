import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import ImageUrlsField from '../components/ImageUrlsField.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', margin: '12px 0 5px', textTransform: 'uppercase', letterSpacing: 0.4 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(120,130,150,.35)', background: 'var(--surface)', color: 'inherit', fontSize: 14 };

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
}

const CFG = {
  price_drop: {
    title: 'Digital Price Drops', max: 5, orders: 'Orders', statuses: ['processing', 'contacted', 'completed', 'cancelled'],
    name: (r) => r.title, sub: (r) => '₱' + r.price + ' · stock ' + r.stock + ' · ' + r.status,
    blank: { title: '', description: '', price: '', stock: 1, status: 'active', images: '' },
    fields: [['title', 'Title', 'text'], ['description', 'Description', 'area'], ['price', 'Price (₱)', 'number'], ['stock', 'Stock', 'number'], ['status', 'Status', 'select', ['active', 'sold', 'hidden']], ['images', 'Images (up to 5)', 'images']],
  },
  digital: {
    title: 'Digital Products', max: 20, orders: 'Orders', statuses: ['processing', 'completed', 'cancelled'],
    name: (r) => r.name, sub: (r) => '₱' + r.price + ' · stock ' + r.stock + (r.active ? '' : ' · hidden'),
    blank: { name: '', description: '', price: '', stock: 0, category: '', delivery_note: '', active: true, images: '' },
    fields: [['name', 'Name', 'text'], ['description', 'Description', 'area'], ['price', 'Price (₱)', 'number'], ['stock', 'Stock', 'number'], ['category', 'Category', 'text'], ['delivery_note', 'Delivery note', 'area'], ['active', 'Visible to users', 'bool'], ['images', 'Images', 'images']],
  },
  poll: {
    title: 'Demand Polls', max: 0, orders: '',
    name: (r) => r.question, sub: (r) => r.votes + ' votes · reward ₱' + r.reward + (r.active ? '' : ' · closed'),
    blank: { question: '', description: '', options: '', reward: 0.1, active: true },
    fields: [['question', 'Question', 'text'], ['description', 'Description', 'area'], ['options', 'Options (one per line, min 2)', 'area'], ['reward', 'Reward per vote (₱)', 'number'], ['active', 'Open for voting', 'bool']],
  },
  fund: {
    title: 'Sponsorships', max: 1000, orders: 'Contributions',
    name: (r) => r.title, sub: (r) => '₱' + r.raised + ' of ₱' + r.target + (r.active ? '' : ' · hidden'),
    blank: { title: '', project: '', purpose: '', details: '', target: 2000, active: true, images: '' },
    fields: [['title', 'Title', 'text'], ['project', 'Project', 'text'], ['purpose', 'Purpose', 'area'], ['details', 'Where the funds will be used', 'area'], ['target', 'Target (₱)', 'number'], ['active', 'Visible to users', 'bool'], ['images', 'Transparency images (no limit)', 'images']],
  },
};

const EX = {
  price_drop: [{ title: 'Sample drop', description: 'Details here', price: 99, stock: 1, status: 'active', images: ['https://example.com/1.jpg'] }],
  digital: [{ name: 'Sample product', description: 'Details here', price: 49, stock: 10, category: 'Software', delivery_note: 'Sent by message', active: true, images: ['https://example.com/1.jpg'] }],
  poll: [{ question: 'What should we add next?', description: 'Pick one', options: ['Option A', 'Option B', 'Option C'], reward: 0.1, active: true }],
  fund: [{ title: 'Server upgrade', project: 'Project name', purpose: 'Why we need it', details: 'Where the funds go', target: 2000, active: true, images: ['https://example.com/1.jpg'] }],
};

function XfAdmin({ kind }) {
  const cfg = CFG[kind];
  const { show } = useToast();
  const [tab, setTab] = useState('items');
  const [rows, setRows] = useState(null);
  const [orders, setOrders] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [bulk, setBulk] = useState(null);
  const [bulkErr, setBulkErr] = useState('');

  const load = useCallback(async () => {
    try { setRows(await rpc('admin_xf_list', { p_kind: kind })); } catch (e) { show?.(String(e.message || e), 'error'); setRows([]); }
  }, [kind, show]);
  const loadOrders = useCallback(async () => {
    if (!cfg.orders) return;
    try { setOrders(await rpc('admin_xf_orders', { p_kind: kind })); } catch (e) { show?.(String(e.message || e), 'error'); setOrders([]); }
  }, [kind, cfg.orders, show]);
  useEffect(() => { setTab('items'); setRows(null); setOrders(null); load(); }, [kind]); // eslint-disable-line
  useEffect(() => { if (tab === 'orders') loadOrders(); }, [tab]); // eslint-disable-line

  const openEdit = (r) => {
    if (!r) { setEdit({ ...cfg.blank }); return; }
    const v = { ...r };
    if (Array.isArray(r.images)) v.images = r.images.join('\n');
    if (Array.isArray(r.options)) v.options = r.options.join('\n');
    setEdit(v);
  };
  const save = async () => {
    const p = {};
    if (edit.id) p.id = edit.id;
    for (const [k, , t] of cfg.fields) {
      if (t === 'images') p[k] = lines(edit[k]).slice(0, cfg.max);
      else if (k === 'options') p[k] = lines(edit[k]);
      else p[k] = edit[k];
    }
    setBusy(true);
    try {
      await rpc('admin_xf_save', { p_kind: kind, p });
      show?.('Saved', 'success'); setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };
  const del = async (r) => {
    if (!window.confirm('Delete "' + cfg.name(r) + '"? This cannot be undone.')) return;
    try { await rpc('admin_xf_delete', { p_kind: kind, p_id: r.id }); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };
  const setOrder = async (o) => {
    const d = drafts[o.id] || {};
    const status = d.status || o.status;
    if (status === 'cancelled' && o.status !== 'cancelled' && kind === 'price_drop' && !window.confirm('Cancelling refunds the buyer’s Xwallet. Continue?')) return;
    try {
      await rpc('admin_xf_order_set', { p_kind: kind, p_id: o.id, p_status: status, p_note: d.note !== undefined ? d.note : (o.admin_note || '') });
      show?.('Order updated', 'success'); loadOrders();
    } catch (e) { show?.(String(e.message || e), 'error'); }
  };
  const runBulk = async () => {
    setBulkErr('');
    let data;
    try { data = JSON.parse(bulk); } catch (e) { setBulkErr('Invalid JSON: ' + e.message); return; }
    if (data && !Array.isArray(data) && Array.isArray(data.items)) data = data.items;
    if (!Array.isArray(data)) data = [data];
    if (!data.length || data.length > 100) { setBulkErr('Add between 1 and 100 items.'); return; }
    setBusy(true);
    let ok = 0; const failed = []; const msgs = [];
    for (let i = 0; i < data.length; i++) {
      const it = { ...(data[i] || {}) };
      delete it.id;
      if (typeof it.images === 'string') it.images = lines(it.images);
      if (typeof it.options === 'string') it.options = lines(it.options);
      if (Array.isArray(it.images)) it.images = it.images.slice(0, cfg.max);
      try { await rpc('admin_xf_save', { p_kind: kind, p: it }); ok++; }
      catch (e) { failed.push(data[i]); msgs.push('#' + (i + 1) + ': ' + String(e.message || e)); }
    }
    setBusy(false);
    load();
    if (!failed.length) { show?.(ok + ' added', 'success'); setBulk(null); return; }
    setBulk(JSON.stringify(failed, null, 2));
    setBulkErr(ok + ' added. ' + failed.length + ' failed and are kept below, fix them and run again. ' + msgs.join(' | '));
  };
  const upd = (k, v) => setEdit((p) => ({ ...p, [k]: v }));
  const dr = (id, k, v) => setDrafts((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{cfg.title}</h1>
        {tab === 'items' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => { setBulkErr(''); setBulk(JSON.stringify(EX[kind], null, 2)); }}>Bulk add (JSON)</Btn>
            <Btn variant="primary" onClick={() => openEdit(null)}><Plus size={16} /> New</Btn>
          </div>
        )}
      </div>
      {cfg.orders && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Btn variant={tab === 'items' ? 'primary' : undefined} onClick={() => setTab('items')}>Items</Btn>
          <Btn variant={tab === 'orders' ? 'primary' : undefined} onClick={() => setTab('orders')}>{cfg.orders}</Btn>
        </div>
      )}

      {tab === 'items' && (rows === null ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
        : !rows.length ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Nothing yet. Tap New.</div></Card>
        : rows.map((r) => (
          <Card key={r.id} style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {Array.isArray(r.images) && r.images[0] && <img src={r.images[0]} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{cfg.name(r)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>{cfg.sub(r)}</div>
                {kind === 'poll' && Array.isArray(r.options) && (
                  <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-dim)' }}>
                    {r.options.map((o, i) => <div key={i}>{o}: <b>{(r.results || {})[String(i)] || 0}</b></div>)}
                  </div>
                )}
              </div>
              <Btn onClick={() => openEdit(r)}><Edit2 size={15} /></Btn>
              <Btn variant="danger" onClick={() => del(r)}><Trash2 size={15} /></Btn>
            </div>
          </Card>
        )))}

      {tab === 'orders' && (orders === null ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
        : !orders.length ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>No entries yet.</div></Card>
        : orders.map((o) => (
          <Card key={o.id} style={{ marginBottom: 12, padding: 14 }}>
            {kind === 'price_drop' && (<>
              <div style={{ fontWeight: 700 }}>{o.drop_title} · ₱{o.price}</div>
              <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                {o.first_name} {o.last_name}<br />{o.email}<br />{o.phone}<br />
                <span style={{ color: 'var(--text-dim)' }}>{new Date(o.created_at).toLocaleString()}</span>
              </div>
            </>)}
            {kind === 'digital' && (<>
              <div style={{ fontWeight: 700 }}>{o.product_name} ×{o.qty} · ₱{o.total}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{o.email}<br /><span style={{ color: 'var(--text-dim)' }}>{new Date(o.created_at).toLocaleString()}</span></div>
            </>)}
            {kind === 'fund' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span>{o.email || o.user_id}<br /><span style={{ color: 'var(--text-dim)' }}>{new Date(o.created_at).toLocaleString()}</span></span>
                <b>₱{o.amount}</b>
              </div>
            )}
            {kind !== 'fund' && (<>
              <div style={lab}>Status</div>
              <select style={inp} value={(drafts[o.id] || {}).status || o.status} onChange={(e) => dr(o.id, 'status', e.target.value)}>
                {cfg.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={lab}>Note for the buyer</div>
              <input style={inp} value={(drafts[o.id] || {}).note !== undefined ? drafts[o.id].note : (o.admin_note || '')} onChange={(e) => dr(o.id, 'note', e.target.value)} placeholder="Shown on the buyer's order page" />
              <div style={{ marginTop: 12 }}><Btn variant="primary" onClick={() => setOrder(o)}>Save</Btn></div>
            </>)}
          </Card>
        )))}

      <Modal open={bulk !== null} onClose={() => setBulk(null)} title={'Bulk add: ' + cfg.title}>
        {bulk !== null && (<div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Paste a JSON array, one object per item (up to 100). Use the same field names as the form. Images and options are arrays of text.{cfg.max ? ' Images are limited to ' + cfg.max + ' per item.' : ''}
          </div>
          <textarea style={{ ...inp, minHeight: 260, marginTop: 10, fontFamily: 'monospace', fontSize: 12.5 }} value={bulk} onChange={(e) => setBulk(e.target.value)} spellCheck={false} />
          {bulkErr && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger)', lineHeight: 1.5 }}>{bulkErr}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn onClick={() => setBulk(null)}>Cancel</Btn>
            <Btn onClick={() => setBulk(JSON.stringify(EX[kind], null, 2))}>Reset example</Btn>
            <Btn variant="primary" onClick={runBulk} disabled={busy}>{busy ? 'Adding…' : 'Add all'}</Btn>
          </div>
        </div>)}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && edit.id ? 'Edit' : 'New'}>
        {edit && (<div>
          {cfg.fields.map(([k, l, t, opts]) => (
            <div key={k}>
              {t !== 'bool' && <div style={lab}>{l}</div>}
              {t === 'text' && <input style={inp} value={edit[k] ?? ''} onChange={(e) => upd(k, e.target.value)} />}
              {t === 'number' && <input style={inp} type="number" step="any" value={edit[k] ?? ''} onChange={(e) => upd(k, e.target.value)} />}
              {t === 'area' && <textarea style={{ ...inp, minHeight: 84 }} value={edit[k] ?? ''} onChange={(e) => upd(k, e.target.value)} />}
              {t === 'select' && <select style={inp} value={edit[k]} onChange={(e) => upd(k, e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>}
              {t === 'bool' && <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0 4px', fontSize: 14 }}><input type="checkbox" checked={!!edit[k]} onChange={(e) => upd(k, e.target.checked)} />{l}</label>}
              {t === 'images' && <ImageUrlsField value={edit[k]} onChange={(v) => upd(k, v)} />}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>)}
      </Modal>
    </div>
  );
}

export const PriceDropsAdmin = () => <XfAdmin kind="price_drop" />;
export const DigitalProductsAdmin = () => <XfAdmin kind="digital" />;
export const DemandPollsAdmin = () => <XfAdmin kind="poll" />;
export const SponsorshipsAdmin = () => <XfAdmin kind="fund" />;
