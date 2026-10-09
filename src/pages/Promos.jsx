import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchPromos, promoCrud } from '../lib/api.js';

export default function Promos() {
  return (
    <CrudPage
      title="Promo codes"
      subtitle="Discount codes"
      fetcher={fetchPromos}
      searchKeys={['code']}
      columns={[
        { key: 'code', label: 'Code', render: (r) => <b>{r.code || '—'}</b> },
        { key: 'discount_value', label: 'Value', render: (r) => (r.discount_value ?? r.discount ?? '—') + (r.discount_type === 'percent' ? '%' : '') },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
        { key: 'created_at', label: 'Created' },
      ]}
      formFields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'discount_type', label: 'Type', type: 'select',
          options: ['fixed', 'percent'], required: true, default: 'fixed' },
        { key: 'discount_value', label: 'Value', type: 'number', required: true },
        { key: 'min_spend', label: 'Min spend', type: 'number' },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={promoCrud.create}
      onUpdate={promoCrud.update}
      onDelete={promoCrud.remove}
    />
  );
}
