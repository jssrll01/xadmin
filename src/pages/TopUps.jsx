import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchTopUps, topupCrud } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function TopUps() {
  return (
    <CrudPage
      title="Top-ups"
      subtitle="Wallet funding requests"
      fetcher={fetchTopUps}
      searchKeys={['status', 'method']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'amount', label: 'Amount', render: (r) => <b>{peso(r.amount || r.requested_amount || 0)}</b> },
        { key: 'method', label: 'Method', render: (r) => r.method || r.payment_method || '—' },
        { key: 'status', label: 'Status', render: (r) => (
          <span className="neu-badge" style={{
            background: r.status === 'approved' ? '#D1FAE5'
                      : r.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
            color: r.status === 'approved' ? '#065F46'
                 : r.status === 'rejected' ? '#991B1B' : '#92400E',
          }}>{r.status || 'pending'}</span>
        ) },
        { key: 'created_at', label: 'Requested', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'method', label: 'Method', type: 'select', options: ['gcash', 'maya', 'bank', 'crypto'] },
        { key: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected'] },
      ]}
      onCreate={topupCrud.create}
      onUpdate={topupCrud.update}
      onDelete={topupCrud.remove}
    />
  );
}
