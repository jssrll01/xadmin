import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchTopUps, approveTopUp, rejectTopUp } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function TopUps() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { items, error } = await fetchTopUps({ status: filter === 'all' ? '' : filter });
    if (error) show(error.message, 'error');
    setItems(Array.isArray(items) ? items : []);
    setLoading(false);
  };
  useEffect(load, [filter]);

  const approve = async (t) => {
    if (!confirm(`Approve ${peso(t.amount)} top-up for ${t.users?.email || 'user'}?`)) return;
    const { error } = await approveTopUp(t.id, t.user_id, t.amount);
    if (error) return show(error.message, 'error');
    show('Top-up approved', 'success');
    load();
  };

  const reject = async (t) => {
    if (!confirm('Reject this top-up?')) return;
    const { error } = await rejectTopUp(t.id);
    if (error) return show(error.message, 'error');
    show('Top-up rejected', 'success');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Top-Ups</h1><p>Wallet funding requests</p></div>
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button key={s} className={'neu-pill' + (filter === s ? ' active' : '')} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {loading ? <Card>Loading…</Card> : items.length === 0 ? (
        <EmptyState title="No top-ups" message="Nothing to review here." />
      ) : (
        <table className="neu-table">
          <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Requested</th><th></th></tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id}>
                <td>{t.users?.email || t.user_id?.slice(0, 8) || '—'}</td>
                <td><b>{peso(t.amount)}</b></td>
                <td>{t.method || '—'}</td>
                <td><span className="neu-badge" style={{
                  background: t.status === 'approved' ? '#D1FAE5' : t.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                  color: t.status === 'approved' ? '#065F46' : t.status === 'rejected' ? '#991B1B' : '#92400E',
                }}>{t.status}</span></td>
                <td>{dateTime(t.created_at)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {t.status === 'pending' && (
                    <>
                      <Btn variant="success" onClick={() => approve(t)} style={{ padding: 8, marginRight: 6 }}><Check size={15} /></Btn>
                      <Btn variant="danger" onClick={() => reject(t)} style={{ padding: 8 }}><X size={15} /></Btn>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
