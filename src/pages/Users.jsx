import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchUsers, userCrud } from '../lib/api.js';
import { dateOnly, initials } from '../lib/format.js';

export default function Users() {
  return (
    <CrudPage
      title="Users"
      subtitle="All profiles"
      fetcher={fetchUsers}
      searchKeys={['email', 'username', 'first_name', 'last_name']}
      columns={[
        { key: 'name', label: 'User', render: (r) => {
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || r.email || '—';
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
        { key: 'phone', label: 'Phone' },
        { key: 'loyalty_tier', label: 'Tier' },
        { key: 'xwallet_balance', label: 'Wallet', render: (r) => '₱' + Number(r.xwallet_balance || 0).toFixed(2) },
        { key: 'created_at', label: 'Joined', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'first_name', label: 'First name' },
        { key: 'last_name', label: 'Last name' },
        { key: 'phone', label: 'Phone' },
        { key: 'nearest_landmark', label: 'Landmark', required: true },
        { key: 'barangay', label: 'Barangay', required: true },
        { key: 'province', label: 'Province' },
        { key: 'city', label: 'City' },
        { key: 'loyalty_tier', label: 'Tier', type: 'select',
          options: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
        { key: 'xwallet_balance', label: 'Wallet balance', type: 'number', default: 0 },
        { key: 'loyalty_points', label: 'Loyalty points', type: 'number', default: 0 },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
    />
  );
}
