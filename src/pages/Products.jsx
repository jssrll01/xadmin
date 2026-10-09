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
      searchKeys={['name', 'category', 'store']}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
        { key: 'category', label: 'Category' },
        { key: 'store', label: 'Store' },
        { key: 'price', label: 'Price', render: (r) => peso(r.price) },
        { key: 'stock', label: 'Stock' },
        { key: 'sold', label: 'Sold' },
        { key: 'verified', label: 'Verified', render: (r) => r.verified ? '✅' : '—' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'price', label: 'Price', type: 'number', required: true, default: 0 },
        { key: 'original_price', label: 'Original price', type: 'number' },
        { key: 'discount', label: 'Discount %', type: 'number', default: 0 },
        { key: 'category', label: 'Category' },
        { key: 'store', label: 'Store' },
        { key: 'stock', label: 'Stock', type: 'number', default: 0 },
        { key: 'verified', label: 'Verified', type: 'boolean' },
        { key: 'preorder', label: 'Preorder', type: 'boolean' },
        { key: 'instant', label: 'Instant', type: 'boolean' },
      ]}
      onCreate={productCrud.create}
      onUpdate={productCrud.update}
      onDelete={productCrud.remove}
    />
  );
}
