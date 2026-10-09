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
      searchKeys={['category', 'concern', 'gmail', 'status']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'category', label: 'Category', render: (r) => <b>{r.category}</b> },
        { key: 'gmail', label: 'Gmail', render: (r) => r.gmail || '—' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'concern', label: 'Concern', wrap: true, render: (r) => <span style={{ fontSize: 12 }}>{r.concern}</span> },
        { key: 'status', label: 'Status', render: (r) => {
          const s = (r.status || 'submitted').toLowerCase();
          const cls =
            s === 'resolved'    ? 'badge-approved' :
            s === 'closed'      ? 'badge-rejected' :
            s === 'in_progress' ? 'badge-frozen'   :
                                  'badge-pending';
          return <span className={`neu-badge ${cls}`}>{s.replace('_', ' ')}</span>;
        } },
        { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'category', label: 'Category', required: true },
        { key: 'concern', label: 'Concern', type: 'textarea', required: true },
        { key: 'user_id', label: 'User ID' },
        { key: 'gmail', label: 'Gmail' },
        { key: 'phone', label: 'Phone' },
        { key: 'related_id', label: 'Related ID' },
        { key: 'status', label: 'Status', type: 'select',
          options: ['submitted', 'in_progress', 'resolved', 'closed'],
          default: 'submitted' },
      ]}
      onCreate={reportCrud.create}
      onUpdate={reportCrud.update}
      onDelete={reportCrud.remove}
      extraRowActions={(row, { update }) => (
        <select
          className="neu-input-sm"
          value={(row.status || 'submitted').toLowerCase()}
          onChange={(e) => update(row.id, { status: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ paddingRight: 22 }}
        >
          <option value="submitted">Submitted</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      )}
    />
  );
}
