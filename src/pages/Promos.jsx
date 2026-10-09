import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchPromos, promoCrud } from '../lib/api.js';

export default function Promos() {
  return (
    <CrudPage
      title="Promo codes"
      subtitle="Discount codes"
      fetcher={fetchPromos}
      primaryKey="code"
      searchKeys={['code']}
      columns={[
        { key: 'code', label: 'Code', render: (r) => <b>{r.code}</b> },
        { key: 'discount_type', label: 'Type', render: (r) => r.discount_type || '—' },
        { key: 'discount_value', label: 'Value', render: (r) =>
          (r.discount_value ?? 0) + (r.discount_type === 'percent' ? '%' : ' ₱') },
        { key: 'min_spend', label: 'Min spend', render: (r) => '₱' + Number(r.min_spend || 0) },
        { key: 'used_count', label: 'Used' },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
      ]}
      formFields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'discount_type', label: 'Type', type: 'select',
          options: ['fixed', 'percent'], required: true, default: 'fixed' },
        { key: 'discount_value', label: 'Value', type: 'number', required: true, default: 0 },
        { key: 'min_spend', label: 'Min spend', type: 'number', default: 0 },
        { key: 'max_uses', label: 'Max uses', type: 'number' },
        { key: 'per_user_limit', label: 'Per user limit', type: 'number', default: 1 },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={promoCrud.create}
      onUpdate={promoCrud.update}
      onDelete={promoCrud.remove}
    />
  );
}
