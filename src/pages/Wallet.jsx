import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchWallet, walletCrud } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function Wallet() {
  return (
    <CrudPage
      title="Wallet transactions"
      subtitle="All wallet movements"
      fetcher={fetchWallet}
      searchKeys={['type', 'reason', 'note']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'user_id', label: 'User', render: (r) => (r.user_id || '').slice(0, 8) || '—' },
        { key: 'amount', label: 'Amount', render: (r) => {
          const v = Number(r.amount || 0);
          return <b style={{ color: v >= 0 ? 'var(--success)' : 'var(--danger)' }}>{peso(v)}</b>;
        } },
        { key: 'type', label: 'Type', render: (r) => r.type || '—' },
        { key: 'note', label: 'Note', render: (r) => r.note || '—' },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'user_id', label: 'User ID', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'type', label: 'Type', type: 'select',
          options: ['credit', 'debit', 'topup', 'refund'], default: 'credit' },
        { key: 'note', label: 'Note', type: 'textarea' },
      ]}
      onCreate={walletCrud.create}
      onUpdate={walletCrud.update}
      onDelete={walletCrud.remove}
    />
  );
}
