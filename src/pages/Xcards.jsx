import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchXCards, xcardCrud } from '../lib/api.js';
import { dateOnly } from '../lib/format.js';

export default function Xcards() {
  return (
    <CrudPage
      title="Xcards"
      subtitle="Xcards issued"
      fetcher={fetchXCards}
      searchKeys={['code', 'card_number', 'status']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'code', label: 'Code', render: (r) => r.code || r.card_number || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'code', label: 'Code', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'used', 'void', 'expired'] },
      ]}
      onCreate={xcardCrud.create}
      onUpdate={xcardCrud.update}
      onDelete={xcardCrud.remove}
    />
  );
}
