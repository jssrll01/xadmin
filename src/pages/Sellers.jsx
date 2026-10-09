import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchUsers } from '../lib/api.js';

export default function Sellers() {
  return (
    <DataPage
      title="Sellers"
      subtitle="Seller accounts"
      fetcher={fetchUsers}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{fontSize:11}}>{(r.id||'').slice(0,8)}</code> },
        { key: 'username', label: 'Username', render: (r) => r.username || r.full_name || r.display_name || '—' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (r) => r.role || r.user_type || '—' },
      ]}
    />
  );
}
