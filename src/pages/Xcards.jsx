import React, { useEffect, useState } from 'react';
import { Ticket, XCircle } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchAllXcards, voidXcard } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const TABS = ['', 'active', 'redeemed'];

export default function Xcards() {
  const { show } = useToast();
  const [tab, setTab] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAllXcards({ status: tab }).then(({ items }) => { setItems(items); setLoading(false); });
  };
  useEffect(load, [tab]); // eslint-disable-line

  const doVoid = async (c) => {
    if (!confirm(`Void card ${c.code}?`)) return;
    const { error } = await voidXcard(c.id);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === c.id ? { ...x, active: false } : x));
    show('Card voided', 'success');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Xcards</h1>
          <p>{items.length} cards</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
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
        <EmptyState title="No Xcards" message="Nothing here." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Value</th>
              <th>Buyer</th>
              <th>Redeemer</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td><b style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</b></td>
                <td><b>{peso(c.value)}</b></td>
                <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.purchased_by?.slice(0, 8)}</td>
                <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.redeemed_by?.slice(0, 8) || '—'}</td>
                <td>
                  {!c.active ? (
                    <span className="neu-badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>Voided</span>
                  ) : c.redeemed_by ? (
                    <span className="neu-badge" style={{ background: '#E0E7FF', color: '#3730A3' }}>Redeemed</span>
                  ) : (
                    <span className="neu-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>Active</span>
                  )}
                </td>
                <td>{dateTime(c.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  {c.active && !c.redeemed_by && (
                    <Btn size="sm" variant="danger" onClick={() => doVoid(c)}>
                      <XCircle size={12} /> Void
                    </Btn>
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
