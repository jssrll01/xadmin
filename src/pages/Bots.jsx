import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchBots, botCrud } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

export default function Bots() {
  return (
    <CrudPage
      title="Bot messages"
      subtitle="Telegram bot logs"
      fetcher={fetchBots}
      searchKeys={['bot', 'text', 'from_name']}
      columns={[
        { key: 'bot', label: 'Bot', render: (r) => <b>{r.bot || '—'}</b> },
        { key: 'direction', label: 'Dir' },
        { key: 'from_name', label: 'From', render: (r) => r.from_name || r.from_id || '—' },
        { key: 'text', label: 'Message', render: (r) => <span style={{ fontSize: 12 }}>{r.text || '—'}</span> },
        { key: 'created_at', label: 'When', render: (r) => timeAgo(r.created_at) },
      ]}
      formFields={[
        { key: 'bot', label: 'Bot', required: true },
        { key: 'direction', label: 'Direction', type: 'select', options: ['in', 'out'] },
        { key: 'from_name', label: 'From name' },
        { key: 'text', label: 'Text', type: 'textarea', required: true },
      ]}
      onCreate={botCrud.create}
      onUpdate={botCrud.update}
      onDelete={botCrud.remove}
    />
  );
}
