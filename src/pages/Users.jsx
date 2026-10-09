import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchUsers, userCrud } from '../lib/api.js';
import { dateOnly, initials } from '../lib/format.js';

export default function Users() {
  return (
    <CrudPage
      title="Users"
      subtitle="All accounts"
      fetcher={fetchUsers}
      searchKeys={['email', 'username', 'full_name', 'display_name']}
      columns={[
        { key: 'name', label: 'User', render: (r) => {
          const name = r.full_name || r.display_name || r.username || r.email || '—';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800 }}>
                {initials(r.first_name, r.last_name, r.email || name)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(r.id || '').slice(0, 8)}</div>
              </div>
            </div>
          );
        } },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (r) => r.role || r.user_type || '—' },
        { key: 'created_at', label: 'Joined', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'full_name', label: 'Full name' },
        { key: 'role', label: 'Role', type: 'select', options: ['user', 'seller', 'admin'] },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
    />
  );
}
