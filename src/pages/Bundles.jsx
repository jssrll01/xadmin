import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchBundles } from '../lib/api.js';
import { peso } from '../lib/format.js';

export default function Bundles() {
  return (
    <DataPage
      title="Bundles"
      subtitle="Product bundles"
      fetcher={fetchBundles}
      columns={[
        { key: 'title', label: 'Title', render: (r) => <b>{r.title || r.name || '—'}</b> },
        { key: 'bundle_price', label: 'Price', render: (r) => peso(r.bundle_price || r.price || 0) },
        { key: 'original_price', label: 'Original', render: (r) => peso(r.original_price || 0) },
      ]}
    />
  );
}
