import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchTopups, approveTopup, rejectTopup } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const TABS = ['awaiting_verification', 'approved', 'rejected', ''];

export default function TopUps() {
  const { show } = useToast();
  const [tab, setTab] = useState('awaiting_verification');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchTopups({ status: tab }).then(({ items }) => { setItems(items); setLoading(false); });
  };
  useEffect(load, [tab]); // eslint-disable-line

  const approve = async () => {
    const { error } = await approveTopup(selected.id, null, note || 'Approved by admin');
    if (error) return show(error.message, 'error');
    show('Top-up approved', 'success');
    setSelected(null);
    setNote('');
    load();
  };

  const reject = async () => {
    const { error } = await rejectTopup(selected.id, null, note || 'Rejected by admin');
    if (error) return show(error.message, 'error');
    show('Top-up rejected', 'success');
    setSelected(null);
    setNote('');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Top-ups</h1>
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
        <EmptyState title="No top-ups" message="Nothing to review here." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Amount</th>
              <th>Total (incl. fee)</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} onClick={() => setSelected(t)} style={{ cursor: 'pointer' }}>
                <td>{t.email || '—'}</td>
                <td><b>{peso(t.amount || t.subtotal)}</b></td>
                <td><b>{peso(t.total)}</b></td>
                <td>{t.payment_method || '—'}</td>
                <td><Badge status={t.status} /></td>
                <td>{dateTime(t.created_at)}</td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Top-up details" size="lg">
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Email</div><div style={{ fontWeight: 700 }}>{selected.email || '—'}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Payment</div><div style={{ fontWeight: 700 }}>{selected.payment_method || '—'}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Amount</div><div style={{ fontWeight: 700 }}>{peso(selected.amount || selected.subtotal)}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Fee (1%)</div><div style={{ fontWeight: 700 }}>{peso(selected.fee)}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Total</div><div style={{ fontWeight: 900, color: 'var(--primary)' }}>{peso(selected.total)}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Status</div><Badge status={selected.status} /></div>
            </div>

            {selected.receipt_data?.dataUrl && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>Payment receipt</div>
                <img src={selected.receipt_data.dataUrl} alt="receipt"
                  style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 12, background: 'var(--surface-in)' }} />
              </div>
            )}

            <input className="neu-input" placeholder="Admin note (optional)"
              value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom: 12 }} />

            {selected.status === 'awaiting_verification' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="success" onClick={approve} style={{ flex: 1 }}>
                  <CheckCircle2 size={16} /> Approve
                </Btn>
                <Btn variant="danger" onClick={reject} style={{ flex: 1 }}>
                  <XCircle size={16} /> Reject
                </Btn>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
