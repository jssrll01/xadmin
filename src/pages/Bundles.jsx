import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchBundles, bundleCrud } from '../lib/api.js';
import { peso, dateOnly } from '../lib/format.js';

export default function Bundles() {
  return (
    <CrudPage
      title="Bundles"
      subtitle="Product bundles"
      fetcher={fetchBundles}
      searchKeys={['title']}
      columns={[
        { key: 'title', label: 'Title', render: (r) => <b>{r.title}</b> },
        { key: 'description', label: 'Description', wrap: true, render: (r) => r.description || '—' },
        { key: 'product_ids', label: 'Items', render: (r) =>
          Array.isArray(r.product_ids) ? r.product_ids.length : 0 },
        { key: 'variants', label: 'Variants', render: (r) =>
          Array.isArray(r.variants) && r.variants.length
            ? <span style={{ fontSize: 12 }}>{r.variants.join(', ')}</span>
            : '—' },
        { key: 'bundle_price', label: 'Bundle price', render: (r) => peso(r.bundle_price) },
        { key: 'original_price', label: 'Original', render: (r) => r.original_price ? peso(r.original_price) : '—' },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'image_url', label: 'Image URL' },
        { key: 'bundle_price', label: 'Bundle price', type: 'number', required: true, default: 0 },
        { key: 'original_price', label: 'Original price', type: 'number' },
        { key: 'variants', label: 'Variants', type: 'array',
          placeholder: 'One variant per line (e.g. Small, Medium, Large)' },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={bundleCrud.create}
      onUpdate={bundleCrud.update}
      onDelete={bundleCrud.remove}
    />
  );
}
