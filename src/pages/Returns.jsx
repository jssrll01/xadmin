import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchReturns, returnCrud } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function Returns() {
  return (
    <CrudPage
      title="Returns"
      subtitle="Refund requests"
      fetcher={fetchReturns}
      searchKeys={['reason', 'status']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'reason', label: 'Reason', render: (r) => r.reason || r.note || '—' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Requested', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'reason', label: 'Reason', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected'] },
      ]}
      onCreate={returnCrud.create}
      onUpdate={returnCrud.update}
      onDelete={returnCrud.remove}
    />
  );
}
