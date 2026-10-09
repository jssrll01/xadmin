import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchPromos } from '../lib/api.js';

export default function Promos() {
  return (
    <DataPage
      title="Promo codes"
      subtitle="Discount codes"
      fetcher={fetchPromos}
      columns={[
        { key: 'code', label: 'Code', render: (r) => <b>{r.code || '—'}</b> },
        { key: 'discount', label: 'Discount', render: (r) => r.discount || r.discount_value || r.percent || '—' },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
        { key: 'created_at', label: 'Created' },
      ]}
    />
  );
}
