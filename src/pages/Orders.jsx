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
        { key: 'name', label: 'Buyer', render: (r) => r.name || '—' },
        { key: 'email', label: 'Email', render: (r) => r.email || '—' },
        { key: 'mobile', label: 'Mobile', render: (r) => r.mobile || '—' },
        { key: 'subtotal', label: 'Subtotal', render: (r) => peso(r.subtotal) },
        { key: 'discount', label: 'Discount', render: (r) => peso(r.discount) },
        { key: 'total', label: 'Total', render: (r) => <b>{peso(r.total)}</b> },
        { key: 'payment_method', label: 'Payment', render: (r) => r.payment_method || '—' },
        { key: 'delivery_method', label: 'Delivery', render: (r) => r.delivery_method || '—' },
        { key: 'status', label: 'Status', render: (r) => {
          const s = (r.status || 'pending').toLowerCase();
          return <span className={`neu-badge badge-${s}`}>{s}</span>;
        } },
        { key: 'province', label: 'Province', render: (r) => r.province || '—' },
        { key: 'city', label: 'City', render: (r) => r.city || '—' },
        { key: 'barangay', label: 'Barangay', render: (r) => r.barangay || '—' },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'order_code', label: 'Order code', required: true },
        { key: 'name', label: 'Buyer name' },
        { key: 'email', label: 'Email' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'address', label: 'Address', type: 'textarea' },
        { key: 'landmark', label: 'Landmark' },
        { key: 'province', label: 'Province' },
        { key: 'city', label: 'City' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'instructions', label: 'Instructions', type: 'textarea' },
        { key: 'subtotal', label: 'Subtotal', type: 'number', default: 0 },
        { key: 'discount', label: 'Discount', type: 'number', default: 0 },
        { key: 'total', label: 'Total', type: 'number', default: 0 },
        { key: 'payment_method', label: 'Payment method', type: 'select',
          options: ['cod', 'gcash', 'maya', 'bank'] },
        { key: 'delivery_method', label: 'Delivery', type: 'select',
          options: ['delivery', 'pickup'] },
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
