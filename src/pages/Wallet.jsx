import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchWallet } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function Wallet() {
  return (
    <DataPage
      title="Wallet transactions"
      subtitle="All wallet movements"
      fetcher={fetchWallet}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'amount', label: 'Amount', render: (r) => {
          const v = Number(r.amount || r.delta || 0);
          return <b style={{color: v >= 0 ? 'var(--success)' : 'var(--danger)'}}>{peso(v)}</b>;
        } },
        { key: 'type', label: 'Type', render: (r) => r.type || r.reason || '—' },
        { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
      ]}
    />
  );
}
