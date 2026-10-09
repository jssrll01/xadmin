import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchOrders, orderCrud } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function Orders() {
  return (
    <CrudPage
      title="Orders"
      subtitle="Customer orders"
      fetcher={fetchOrders}
      searchKeys={['status', 'id']}
      columns={[
        { key: 'id', label: 'Order', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'total', label: 'Total', render: (r) => <b>{peso(r.total || r.amount || r.total_amount || 0)}</b> },
        { key: 'status', label: 'Status', render: (r) => (
          <span className="neu-badge" style={{
            background: ['completed','paid'].includes(r.status) ? '#D1FAE5'
                      : r.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7',
            color: ['completed','paid'].includes(r.status) ? '#065F46'
                 : r.status === 'cancelled' ? '#991B1B' : '#92400E',
          }}>{r.status || '—'}</span>
        ) },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'total', label: 'Total', type: 'number' },
        { key: 'status', label: 'Status', type: 'select',
          options: ['pending', 'paid', 'completed', 'cancelled', 'refunded'] },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      onCreate={orderCrud.create}
      onUpdate={orderCrud.update}
      onDelete={orderCrud.remove}
    />
  );
}
