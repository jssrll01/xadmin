import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchOrders } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function Orders() {
  return (
    <DataPage
      title="Orders"
      subtitle="All customer orders"
      fetcher={fetchOrders}
      columns={[
        { key: 'id', label: 'Order', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'total', label: 'Total', render: (r) => <b>{peso(r.total || r.amount || r.total_amount || 0)}</b> },
        { key: 'status', label: 'Status', render: (r) => (
          <span className="neu-badge" style={{
            background: r.status === 'completed' || r.status === 'paid' ? '#D1FAE5'
                      : r.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7',
            color: r.status === 'completed' || r.status === 'paid' ? '#065F46'
                 : r.status === 'cancelled' ? '#991B1B' : '#92400E',
          }}>{r.status || '—'}</span>
        ) },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
    />
  );
}
