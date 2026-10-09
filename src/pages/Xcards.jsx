import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchXCards } from '../lib/api.js';
import { dateOnly } from '../lib/format.js';

export default function Xcards() {
  return (
    <DataPage
      title="Xcards"
      subtitle="Xcards issued"
      fetcher={fetchXCards}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'code', label: 'Code', render: (r) => r.code || r.card_number || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
    />
  );
}
