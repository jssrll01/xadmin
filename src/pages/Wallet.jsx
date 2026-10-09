import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Minus } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchAllTxns, adminCreditWallet, adminDebitWallet } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const TYPES = ['', 'topup', 'purchase', 'transfer_in', 'transfer_out', 'load', 'giftcard_purchase'];

export default function Wallet() {
  const { show } = useToast();
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdjust, setOpenAdjust] = useState(false);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchAllTxns({ type }).then(({ items }) => { setItems(Array.isArray(items) ? items : []); setLoading(false); });
  };
  useEffect(load, [type]); // eslint-disable-line

  const adjust = async (sign) => {
    const amt = Number(amount);
    if (!userId || !amt) { show('Fill user ID and amount', 'error'); return; }
    const fn = sign > 0 ? adminCreditWallet : adminDebitWallet;
    const { error } = await fn(userId, amt, note || 'Admin adjustment');
    if (error) { show(error.message, 'error'); return; }
    show(`Wallet ${sign > 0 ? 'credited' : 'debited'}`, 'success');
    setOpenAdjust(false); setUserId(''); setAmount(''); setNote('');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Wallet transactions</h1>
          <p>{items.length} records</p>
        </div>
        <Btn variant="primary" onClick={() => setOpenAdjust(true)}><Plus size={16} /> Adjust balance</Btn>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={'neu-pill' + (type === t ? ' active' : '')}>
              {t || 'All'}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No transactions" message="Nothing to show." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id}>
                <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t.user_id?.slice(0, 8)}</td>
                <td style={{ textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</td>
                <td>{t.reference || '—'}</td>
                <td style={{ fontWeight: 800, color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {t.amount > 0 ? '+' : ''}{peso(Math.abs(t.amount))}
                </td>
                <td>{dateTime(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={openAdjust} onClose={() => setOpenAdjust(false)} title="Adjust wallet balance">
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 14 }}>
          Manually credit or debit a user's Xwallet. Use the profile user_id (UUID).
        </div>
        <input className="neu-input" placeholder="User ID (UUID)" value={userId}
          onChange={e => setUserId(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="neu-input" type="number" placeholder="Amount (₱)" value={amount}
          onChange={e => setAmount(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="neu-input" placeholder="Note (optional)" value={note}
          onChange={e => setNote(e.target.value)} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="success" onClick={() => adjust(1)} style={{ flex: 1 }}><Plus size={16} /> Credit</Btn>
          <Btn variant="danger" onClick={() => adjust(-1)} style={{ flex: 1 }}><Minus size={16} /> Debit</Btn>
        </div>
      </Modal>
    </>
  );
}
