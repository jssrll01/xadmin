import React, { useState, useCallback, useEffect } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { logAudit, orderCrud } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';
import { RefreshCw } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const PAGE = 20;
const CARRIERS = ['J&T Express', 'LBC', 'Flash Express', 'Ninja Van', '2GO', 'JRS Express', 'Grab Express', 'Lalamove', 'GoGo Xpress'];
const FILTERS = [['all', 'All'], ['awaiting', 'Awaiting tracking'], ['tracked', 'Has tracking'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const TILES = [['awaiting', 'Awaiting tracking'], ['tracked', 'Has tracking'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const NEXT = { pending: ['pending', 'paid', 'shipped'], paid: ['paid', 'shipped'], shipped: ['shipped', 'delivered'] };
const TRACK_RE = /^[A-Za-z0-9._/-]{3,64}$/;
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const sub = { fontSize: 12, color: 'var(--text-dim)', marginTop: 3 };
const orderTotal = (r) => Math.max(0, (Number(r.subtotal) || 0) - (Number(r.discount) || 0)) + (Number(r.shipping_fee) || 0);

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}
const audit = async (...a) => { try { await logAudit(...a); } catch {} };

export default function Logistics() {
  const { show } = useToast();
  const [sum, setSum] = useState(null);
  const [list, setList] = useState({ total: 0, rows: [] });
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        rpc('admin_logistics_summary', {}),
        rpc('admin_logistics_list', { p_search: dq, p_filter: filter, p_limit: PAGE, p_offset: page * PAGE }),
      ]);
      setSum(s || {}); setList(l || { total: 0, rows: [] }); setErr('');
    } catch (e) { setErr(String(e.message || e)); } finally { setLoading(false); }
  }, [dq, filter, page]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const pick = (f) => { setFilter(f); setPage(0); };
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

  const openEdit = (r) => {
    const known = CARRIERS.includes(r.carrier || '');
    const st = String(r.status || 'pending').toLowerCase();
    setEdit({
      id: r.id, code: r.order_code, status: st, newStatus: st,
      carrierSel: r.carrier ? (known ? r.carrier : '__other') : '', carrierCustom: r.carrier && !known ? r.carrier : '',
      tracking: r.tracking_number || '', note: r.customer_note || '', internal: r.internal_note || '',
      expected: r.ship_updated || '', had: r.tracking_number || '',
    });
  };

  const save = async (clear) => {
    if (busy || !edit) return;
    const t = (edit.tracking || '').trim();
    if (!clear) {
      if (!t) return show?.('Enter a tracking number, or use Clear tracking.', 'error');
      if (!TRACK_RE.test(t)) return show?.('Tracking number: 3 to 64 letters, numbers or . _ / - (no spaces).', 'error');
    }
    const carrier = (edit.carrierSel === '__other' ? edit.carrierCustom : edit.carrierSel).trim();
    if (carrier.length > 60) return show?.('Carrier name is too long', 'error');
    if (edit.note.length > 500) return show?.('Customer note: 500 characters max', 'error');
    if (edit.internal.length > 1000) return show?.('Internal note: 1000 characters max', 'error');
    const changeStatus = edit.newStatus !== edit.status;
    const msg = (clear
      ? 'Clear the tracking number on order ' + edit.code + '? The customer will see "Please wait for shipment".'
      : 'Attach tracking number ' + t + ' to order ' + edit.code + '?')
      + (changeStatus ? '\n\nAlso change the order status from ' + edit.status + ' to ' + edit.newStatus + '.' : '');
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const r = await rpc('admin_logistics_save', {
        p_order_id: edit.id, p_tracking: clear ? null : t, p_carrier: carrier || null,
        p_customer_note: edit.note, p_internal_note: edit.internal, p_clear: !!clear, p_expected: edit.expected || null,
      });
      const fresh = r && r.shipment ? r.shipment.updated_at : edit.expected;
      setEdit((e) => ({ ...e, expected: fresh }));
      await audit('update', 'order_shipments', edit.id, { tracking_number: edit.had || null }, { tracking_number: clear ? null : t, carrier: carrier || null });
      if (changeStatus) {
        const res = await orderCrud.update(edit.id, { status: edit.newStatus });
        if (res && res.error) { show?.('Tracking saved, but the status change failed: ' + res.error.message, 'error'); load(); return; }
        await audit('update', 'orders', edit.id, { status: edit.status }, { status: edit.newStatus });
      }
      show?.(clear ? 'Tracking cleared' : 'Tracking saved', 'success');
      setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };

  const pages = Math.max(1, Math.ceil((list.total || 0) / PAGE));
  const opts = edit ? (NEXT[edit.status] || [edit.status]) : [];

  return (
    <>
      <div className="page-head">
        <div><h1>Logistics</h1><p>Manage tracking numbers and shipment status · customers see changes on Tracking Orders</p></div>
        <Btn onClick={load}><RefreshCw size={16} /></Btn>
      </div>
      {err && <Card style={{ marginBottom: 12 }}><div style={{ padding: 12, color: 'var(--danger)', fontSize: 13 }}>{err}</div></Card>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
        {TILES.map(([k, l]) => (
          <button key={k} className="neu-btn" onClick={() => pick(k)} style={{ padding: 12, textAlign: 'left', fontWeight: filter === k ? 800 : 500 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{sum ? (sum[k] ?? 0) : '…'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{l}</div>
          </button>
        ))}
      </div>

      {sum && Array.isArray(sum.recent) && sum.recent.length > 0 && (
        <Card style={{ marginBottom: 14, padding: 12 }}>
          <div style={lab}>Recently updated tracking</div>
          {sum.recent.map((r, i) => (
            <div key={i} style={{ fontSize: 13, padding: '3px 0' }}><b>{r.order_code}</b> · {r.tracking_number}{r.carrier ? ' · ' + r.carrier : ''} <span style={{ color: 'var(--text-dim)' }}>· {dateTime(r.tracking_updated_at)}</span></div>
          ))}
        </Card>
      )}

      <input className="neu-input" placeholder="Search order code, buyer, email or tracking number" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} className="neu-btn" onClick={() => pick(k)} style={{ whiteSpace: 'nowrap', padding: '7px 13px', fontSize: 12, fontWeight: filter === k ? 800 : 500 }}>{l}</button>
        ))}
      </div>
      <div style={{ ...sub, marginBottom: 10 }}>{list.total} order(s)</div>

      {loading && list.rows.length === 0 ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
        : list.rows.length === 0 ? <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>No orders match.</div></Card>
        : list.rows.map((r) => {
          const s = String(r.status || 'pending').toLowerCase();
          return (
            <Card key={r.id} style={{ marginBottom: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <b>{r.order_code}</b> <span className={'neu-badge badge-' + s}>{s}</span>
                  <div style={sub}>{r.name || '—'} · {dateTime(r.created_at)}</div>
                  <div style={sub}>{r.item_count} item(s) · {peso(orderTotal(r))} · {r.payment_method || '—'}</div>
                  <div style={{ marginTop: 6, fontSize: 13, wordBreak: 'break-all' }}>
                    {r.tracking_number
                      ? <><b>{r.tracking_number}</b>{r.carrier ? ' · ' + r.carrier : ''}<div style={sub}>Updated {dateTime(r.tracking_updated_at)}</div></>
                      : <span style={{ color: 'var(--text-dim)' }}>No tracking number yet</span>}
                  </div>
                </div>
                <button className="neu-btn" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => openEdit(r)}>Manage tracking</button>
              </div>
            </Card>
          );
        })}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 24px' }}>
        <button className="neu-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span style={sub}>Page {page + 1} of {pages}</span>
        <button className="neu-btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <Modal open={!!edit} onClose={() => !busy && setEdit(null)} title={edit ? 'Shipment · ' + edit.code : ''}>
        {edit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={lab}>Carrier</div>
              <select className="neu-input" value={edit.carrierSel} onChange={(e) => set('carrierSel', e.target.value)}>
                <option value="">Not set</option>
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__other">Other…</option>
              </select>
              {edit.carrierSel === '__other' && <input className="neu-input" style={{ marginTop: 8 }} placeholder="Carrier name" maxLength={60} value={edit.carrierCustom} onChange={(e) => set('carrierCustom', e.target.value)} />}
            </div>
            <div><div style={lab}>Tracking number</div><input className="neu-input" value={edit.tracking} maxLength={64} autoCapitalize="characters" onChange={(e) => set('tracking', e.target.value)} placeholder="Paste or type the tracking number" /></div>
            <div><div style={lab}>Note for the customer (optional)</div><textarea className="neu-input" rows={2} maxLength={500} value={edit.note} onChange={(e) => set('note', e.target.value)} /></div>
            <div><div style={lab}>Internal note (customers never see this)</div><textarea className="neu-input" rows={2} maxLength={1000} value={edit.internal} onChange={(e) => set('internal', e.target.value)} /></div>
            <div>
              <div style={lab}>Order status</div>
              <select className="neu-input" value={edit.newStatus} onChange={(e) => set('newStatus', e.target.value)} disabled={opts.length < 2}>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <div style={sub}>{opts.length < 2 ? 'This status can’t be changed here.' : 'Adding a tracking number does not change the status. Mark Shipped or Delivered only when it is true.'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={() => save(false)} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={() => setEdit(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
            {edit.had && <button className="neu-btn" disabled={busy} onClick={() => save(true)} style={{ color: 'var(--danger)', padding: 10 }}>Clear tracking number</button>}
          </div>
        )}
      </Modal>
    </>
  );
}
