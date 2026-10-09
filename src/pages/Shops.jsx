import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchShops, shopCrud } from '../lib/api.js';
import { dateOnly } from '../lib/format.js';

export default function Shops() {
  return (
    <CrudPage
      title="Shops"
      subtitle="All shops"
      fetcher={fetchShops}
      searchKeys={['name', 'category', 'city', 'province']}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
        { key: 'category', label: 'Category', render: (r) => r.category || '—' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'email', label: 'Email', render: (r) => r.email || '—' },
        { key: 'city', label: 'City', render: (r) => r.city || '—' },
        { key: 'province', label: 'Province', render: (r) => r.province || '—' },
        { key: 'rating', label: 'Rating', render: (r) => Number(r.rating || 0).toFixed(1) },
        { key: 'followers', label: 'Followers', render: (r) => r.followers ?? 0 },
        { key: 'verified', label: 'Verified', render: (r) => r.verified ? '✅' : '—' },
        { key: 'active', label: 'Active', render: (r) => r.active ? '✅' : '❌' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'logo_url', label: 'Logo URL' },
        { key: 'banner_url', label: 'Banner URL' },
        { key: 'category', label: 'Category' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address', type: 'textarea' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'city', label: 'City' },
        { key: 'province', label: 'Province' },
        { key: 'verified', label: 'Verified', type: 'boolean' },
        { key: 'active', label: 'Active', type: 'boolean', default: true },
      ]}
      onCreate={shopCrud.create}
      onUpdate={shopCrud.update}
      onDelete={shopCrud.remove}
    />
  );
}
