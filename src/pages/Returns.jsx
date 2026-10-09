import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchReturns } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function Returns() {
  return (
    <DataPage
      title="Returns"
      subtitle="Return / refund requests"
      fetcher={fetchReturns}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'reason', label: 'Reason', render: (r) => r.reason || r.note || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Requested', render: (r) => dateTime(r.created_at) },
      ]}
    />
  );
}
