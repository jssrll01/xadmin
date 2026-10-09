import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchAuditLog } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function AuditLog() {
  return (
    <DataPage
      title="Audit log"
      subtitle="Every action performed in XADMIN"
      fetcher={fetchAuditLog}
      columns={[
        { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) },
        { key: 'actor', label: 'Actor', render: (r) => <b>{r.actor || 'admin'}</b> },
        { key: 'action', label: 'Action', render: (r) => {
          const a = (r.action || '').toLowerCase();
          const cls = a === 'delete' ? 'badge-rejected'
                    : a === 'create' ? 'badge-approved'
                    : a === 'update' ? 'badge-frozen'
                    : 'badge-pending';
          return <span className={`neu-badge ${cls}`}>{a}</span>;
        } },
        { key: 'table_name', label: 'Table' },
        { key: 'record_id', label: 'Record', render: (r) => String(r.record_id || '').slice(0, 8) || '—' },
        { key: 'before_data', label: 'Before', wrap: true, render: (r) =>
          r.before_data ? <code style={{ fontSize: 10 }}>{JSON.stringify(r.before_data).slice(0, 80)}</code> : '—' },
        { key: 'after_data', label: 'After', wrap: true, render: (r) =>
          r.after_data ? <code style={{ fontSize: 10 }}>{JSON.stringify(r.after_data).slice(0, 80)}</code> : '—' },
      ]}
    />
  );
}
