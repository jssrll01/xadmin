import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchProducts } from '../lib/api.js';
import { peso, dateOnly } from '../lib/format.js';

export default function Products() {
  return (
    <DataPage
      title="Products"
      subtitle="Product catalog"
      fetcher={fetchProducts}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.name || r.title || '—'}</b> },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', render: (r) => peso(r.price || r.amount || 0) },
        { key: 'stock', label: 'Stock', render: (r) => String(r.stock ?? r.quantity ?? 0) },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
    />
  );
}
