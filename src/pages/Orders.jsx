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
      searchKeys={['order_code', 'email', 'name', 'status']}
      columns={[
        { key: 'order_code', label: 'Code', render: (r) => <b>{r.order_code}</b> },
        { key: 'name', label: 'Buyer' },
        { key: 'email', label: 'Email' },
        { key: 'total', label: 'Total', render: (r) => peso(r.total) },
        { key: 'payment_method', label: 'Payment' },
        { key: 'status', label: 'Status', render: (r) => (
          <span className="neu-badge" style={{
            background: ['completed','paid','delivered'].includes(r.status) ? '#D1FAE5'
                      : r.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7',
            color: ['completed','paid','delivered'].includes(r.status) ? '#065F46'
                 : r.status === 'cancelled' ? '#991B1B' : '#92400E',
          }}>{r.status}</span>
        ) },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'order_code', label: 'Order code', required: true },
        { key: 'name', label: 'Buyer name' },
        { key: 'email', label: 'Email' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'address', label: 'Address' },
        { key: 'subtotal', label: 'Subtotal', type: 'number', default: 0 },
        { key: 'discount', label: 'Discount', type: 'number', default: 0 },
        { key: 'total', label: 'Total', type: 'number', default: 0 },
        { key: 'payment_method', label: 'Payment method',
          type: 'select', options: ['cod', 'gcash', 'maya', 'bank'] },
        { key: 'delivery_method', label: 'Delivery',
          type: 'select', options: ['delivery', 'pickup'] },
        { key: 'status', label: 'Status', type: 'select',
          options: ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'],
          default: 'pending' },
      ]}
      onCreate={orderCrud.create}
      onUpdate={orderCrud.update}
      onDelete={orderCrud.remove}
    />
  );
}
