import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchBotMessages } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

export default function Bots() {
  return (
    <DataPage
      title="Bots"
      subtitle="Bot messages"
      fetcher={fetchBotMessages}
      columns={[
        { key: 'bot', label: 'Bot', render: (r) => <b>{r.bot || '—'}</b> },
        { key: 'direction', label: 'Dir' },
        { key: 'from_name', label: 'From', render: (r) => r.from_name || r.from_id || '—' },
        { key: 'text', label: 'Message', render: (r) => <span style={{fontSize:12}}>{r.text || '—'}</span> },
        { key: 'created_at', label: 'When', render: (r) => timeAgo(r.created_at) },
      ]}
    />
  );
}
