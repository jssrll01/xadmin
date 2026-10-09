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
        { key: 'discount', label: 'Discount', render: (r) => r.discount || r.discount_value || r.percent || '—' },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
        { key: 'created_at', label: 'Created' },
      ]}
      formFields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'discount', label: 'Discount', type: 'number' },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={promoCrud.create}
      onUpdate={promoCrud.update}
      onDelete={promoCrud.remove}
    />
  );
}
