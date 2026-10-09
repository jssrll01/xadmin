import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchTopUps } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function TopUps() {
  return (
    <DataPage
      title="Top-ups"
      subtitle="Wallet funding requests"
      fetcher={fetchTopUps}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'amount', label: 'Amount', render: (r) => <b>{peso(r.amount || r.requested_amount || 0)}</b> },
        { key: 'method', label: 'Method', render: (r) => r.method || r.payment_method || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Requested', render: (r) => dateTime(r.created_at) },
      ]}
    />
  );
}
