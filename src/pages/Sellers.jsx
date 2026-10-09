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
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
      ]}
      formFields={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'first_name', label: 'First name' },
        { key: 'last_name', label: 'Last name' },
        { key: 'phone', label: 'Phone' },
        { key: 'nearest_landmark', label: 'Landmark', required: true },
        { key: 'barangay', label: 'Barangay', required: true },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
    />
  );
}
