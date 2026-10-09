import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchBundles, bundleCrud } from '../lib/api.js';
import { peso } from '../lib/format.js';

export default function Bundles() {
  return (
    <CrudPage
      title="Bundles"
      subtitle="Product bundles"
      fetcher={fetchBundles}
      searchKeys={['title', 'name']}
      columns={[
        { key: 'title', label: 'Title', render: (r) => <b>{r.title || r.name || '—'}</b> },
        { key: 'bundle_price', label: 'Bundle price', render: (r) => peso(r.bundle_price || r.price || 0) },
        { key: 'original_price', label: 'Original', render: (r) => peso(r.original_price || 0) },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
      ]}
      formFields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'bundle_price', label: 'Bundle price', type: 'number' },
        { key: 'original_price', label: 'Original price', type: 'number' },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={bundleCrud.create}
      onUpdate={bundleCrud.update}
      onDelete={bundleCrud.remove}
    />
  );
}
