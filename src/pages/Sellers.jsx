import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchSellers, userCrud } from '../lib/api.js';

export default function Sellers() {
  return (
    <CrudPage
      title="Sellers"
      subtitle="Seller accounts"
      fetcher={fetchSellers}
      searchKeys={['email', 'username', 'full_name']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'name', label: 'Username', render: (r) => r.username || r.full_name || r.display_name || '—' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (r) => r.role || r.user_type || '—' },
      ]}
      formFields={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'full_name', label: 'Full name' },
        { key: 'role', label: 'Role', type: 'select', options: ['seller', 'admin', 'user'] },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
    />
  );
}
