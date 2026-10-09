import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchOrders, fetchOrderItems, updateOrderStatus } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const STATUSES = ['', 'pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];

export default function Orders() {
  const { show } = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchOrders({ status, search }).then(({ items }) => { setItems(items); setLoading(false); });
  };
  useEffect(load, [status]); // eslint-disable-line

  const openDetail = async (order) => {
    setSelected(order);
    setNewStatus(order.status);
    setNote('');
    const its = await fetchOrderItems(order.id);
    setOrderItems(its);
  };

  const applyStatus = async () => {
    if (!newStatus) return;
    const { error } = await updateOrderStatus(selected.id, newStatus, note);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === selected.id ? { ...x, status: newStatus } : x));
    show('Status updated', 'success');
    setSelected(null);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p>{items.length} orders</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={'neu-pill' + (status === s ? ' active' : '')}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="neu-input" placeholder="Search by order code…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          <Btn variant="primary" onClick={load}><Search size={16} /></Btn>
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No orders" message="No orders found." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Buyer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(o => (
              <tr key={o.id} onClick={() => openDetail(o)} style={{ cursor: 'pointer' }}>
                <td><b>{o.order_code}</b></td>
                <td>{o.name || '—'}</td>
                <td><b>{peso(o.total)}</b></td>
                <td>{o.payment_method || '—'}</td>
                <td><Badge status={o.status} /></td>
                <td>{dateTime(o.created_at)}</td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={'Order ' + (selected?.order_code || '')} size="lg">
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Buyer</div><div style={{ fontWeight: 700 }}>{selected.name}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Contact</div><div style={{ fontWeight: 700 }}>{selected.mobile}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Payment</div><div style={{ fontWeight: 700 }}>{selected.payment_method}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Delivery</div><div style={{ fontWeight: 700 }}>{selected.delivery_method}</div></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>Items</div>
              {orderItems.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{it.name} × {it.quantity}</span>
                  <b>{peso(Number(it.price) * Number(it.quantity))}</b>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 16, fontWeight: 800 }}>
              <span>Total</span>
              <span>{peso(selected.total)}</span>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>Force status change</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['pending','processing','shipped','delivered','completed','cancelled'].map(s => (
                <button key={s} onClick={() => setNewStatus(s)}
                  className={'neu-pill' + (newStatus === s ? ' active' : '')}>
                  {s}
                </button>
              ))}
            </div>
            <input className="neu-input" placeholder="Note (optional)"
              value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom: 12 }} />
            <Btn variant="primary" onClick={applyStatus} style={{ width: '100%' }}>
              Apply status change
            </Btn>
          </>
        )}
      </Modal>
    </>
  );
}
