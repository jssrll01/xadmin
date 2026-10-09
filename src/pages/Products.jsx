import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchProducts, productCrud } from '../lib/api.js';
import { peso, dateOnly } from '../lib/format.js';

export default function Products() {
  return (
    <CrudPage
      title="Products"
      subtitle="Catalog"
      fetcher={fetchProducts}
      searchKeys={['name', 'title', 'category']}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.name || r.title || '—'}</b> },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', render: (r) => peso(r.price || r.amount || 0) },
        { key: 'stock', label: 'Stock', render: (r) => String(r.stock ?? r.quantity ?? 0) },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', type: 'number', required: true },
        { key: 'stock', label: 'Stock', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      onCreate={productCrud.create}
      onUpdate={productCrud.update}
      onDelete={productCrud.remove}
    />
  );
}
