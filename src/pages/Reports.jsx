import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchReports } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function Reports() {
  return (
    <DataPage
      title="Reports"
      subtitle="User reports & tickets"
      fetcher={fetchReports}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'subject', label: 'Subject', render: (r) => r.subject || r.title || r.category || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
      ]}
    />
  );
}
