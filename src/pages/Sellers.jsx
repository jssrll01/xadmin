import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchSellers, userCrud } from '../lib/api.js';

export default function Sellers() {
  return (
    <CrudPage
      title="Sellers"
      subtitle="Seller accounts"
      fetcher={fetchSellers}
      searchKeys={['email', 'username', 'first_name', 'last_name']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'username', label: 'Username', render: (r) => r.username || '—' },
        { key: 'email', label: 'Email', render: (r) => r.email || '—' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'status', label: 'Status', render: (r) => {
          const s = (r.status || 'active').toLowerCase();
          return <span className={`neu-badge badge-${s}`}>{s}</span>;
        } },
      ]}
      formFields={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'first_name', label: 'First name' },
        { key: 'last_name', label: 'Last name' },
        { key: 'phone', label: 'Phone' },
        { key: 'nearest_landmark', label: 'Landmark', required: true },
        { key: 'barangay', label: 'Barangay', required: true },
        { key: 'status', label: 'Status', type: 'select',
          options: ['active', 'frozen', 'banned'], default: 'active' },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
    />
  );
}
