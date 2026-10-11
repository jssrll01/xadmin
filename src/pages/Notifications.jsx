import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchNotifications, notificationCrud } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

export default function Notifications() {
  return (
    <CrudPage
      title="Notifications"
      subtitle="Broadcast messages to users"
      fetcher={fetchNotifications}
      searchKeys={['title', 'body', 'type']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'title', label: 'Title', render: (r) => <b>{r.title || '—'}</b> },
        { key: 'body', label: 'Body', wrap: true, render: (r) =>
          <span style={{ fontSize: 12 }}>{String(r.body || '').slice(0, 80)}</span> },
        { key: 'type', label: 'Type', render: (r) => {
          const t = (r.type || 'info').toLowerCase();
          const cls = t === 'error'   ? 'badge-rejected'
                    : t === 'success' ? 'badge-approved'
                    : t === 'warn'    ? 'badge-pending'
                    : 'badge-frozen';
          return <span className={`neu-badge ${cls}`}>{t}</span>;
        } },
        { key: 'read', label: 'Read', render: (r) => r.read ? '✅' : '—' },
        { key: 'user_id', label: 'User', render: (r) =>
          r.user_id ? String(r.user_id).slice(0, 8) : 'Broadcast' },
        { key: 'created_at', label: 'Sent', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'body', label: 'Message', type: 'textarea', required: true },
        { key: 'type', label: 'Type', type: 'select',
          options: ['info', 'success', 'warn', 'error'], default: 'info' },
        { key: 'user_id', label: 'User ID (blank = broadcast to all)' },
        { key: 'read', label: 'Mark as read', type: 'boolean', default: false },
      ]}
      onCreate={notificationCrud.create}
      onUpdate={notificationCrud.update}
      onDelete={notificationCrud.remove}
    />
  );
}
