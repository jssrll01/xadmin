import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchReports, reportCrud } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function Reports() {
  return (
    <CrudPage
      title="Reports"
      subtitle="User reports & tickets"
      fetcher={fetchReports}
      searchKeys={['category', 'concern', 'gmail']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'category', label: 'Category', render: (r) => <b>{r.category}</b> },
        { key: 'gmail', label: 'Gmail' },
        { key: 'concern', label: 'Concern', render: (r) => <span style={{ fontSize: 12 }}>{r.concern}</span> },
        { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'category', label: 'Category', required: true },
        { key: 'concern', label: 'Concern', type: 'textarea', required: true },
        { key: 'user_id', label: 'User ID' },
        { key: 'gmail', label: 'Gmail' },
        { key: 'phone', label: 'Phone' },
        { key: 'related_id', label: 'Related ID' },
      ]}
      onCreate={reportCrud.create}
      onUpdate={reportCrud.update}
      onDelete={reportCrud.remove}
    />
  );
}
