import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchReturns, updateReturn } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const TABS = ['pending', 'approved', 'received', 'refunded', 'rejected', ''];

export default function Returns() {
  const { show } = useToast();
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    fetchReturns({ status: tab }).then(({ items }) => { setItems(Array.isArray(items) ? items : []); setLoading(false); });
  };
  useEffect(load, [tab]); // eslint-disable-line

  const setStatus = async (status) => {
    const { error } = await updateReturn(selected.id, { status });
    if (error) return show(error.message, 'error');
    show(`Marked as ${status}`, 'success');
    setSelected(null);
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Returns & Refunds</h1>
          <p>{items.length} requests</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'neu-pill' + (tab === t ? ' active' : '')}>
              {t || 'All'}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No returns" message="Nothing to review here." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Reason</th>
              <th>Refund</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                <td><b>{r.order_id?.slice(0, 8) || '—'}</b></td>
                <td>{r.reason}</td>
                <td><b>{peso(r.refund_amount)}</b></td>
                <td><Badge status={r.status} /></td>
                <td>{dateTime(r.created_at)}</td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Return request" size="lg">
        {selected && (
          <>
            <div className="neu-card-inset" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Reason</div>
              <div style={{ fontWeight: 700 }}>{selected.reason}</div>
            </div>
            {selected.note && (
              <div className="neu-card-inset" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Note</div>
                <div style={{ fontWeight: 500 }}>{selected.note}</div>
              </div>
            )}
            <div className="neu-card-inset" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Refund amount</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--primary)' }}>{peso(selected.refund_amount)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Btn variant="success" onClick={() => setStatus('approved')}><CheckCircle2 size={16} /> Approve</Btn>
              <Btn onClick={() => setStatus('received')}><RotateCcw size={16} /> Mark received</Btn>
              <Btn onClick={() => setStatus('refunded')}><CheckCircle2 size={16} /> Mark refunded</Btn>
              <Btn variant="danger" onClick={() => setStatus('rejected')}><XCircle size={16} /> Reject</Btn>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
