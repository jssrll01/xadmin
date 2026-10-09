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
      searchKeys={['subject', 'title', 'category', 'status']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'subject', label: 'Subject', render: (r) => r.subject || r.title || r.category || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'subject', label: 'Subject' },
        { key: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'resolved', 'closed'] },
        { key: 'message', label: 'Message', type: 'textarea' },
      ]}
      onCreate={reportCrud.create}
      onUpdate={reportCrud.update}
      onDelete={reportCrud.remove}
    />
  );
}
