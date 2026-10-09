import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchUsers } from '../lib/api.js';
import { dateOnly, initials } from '../lib/format.js';

export default function Users() {
  return (
    <DataPage
      title="Users"
      subtitle="User accounts"
      fetcher={fetchUsers}
      columns={[
        { key: 'name', label: 'User', render: (r) => {
          const name = r.full_name || r.display_name || r.username || r.email || '—';
          return (
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <div style={{width:32,height:32,borderRadius:10,
                background:'linear-gradient(135deg,#7C3AED,#2563EB)', color:'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:12,fontWeight:800}}>
                {initials(r.first_name, r.last_name, r.email || name)}
              </div>
              <div>
                <div style={{fontWeight:700}}>{name}</div>
                <div style={{fontSize:11,color:'var(--text-dim)'}}>{(r.id||'').slice(0,8)}</div>
              </div>
            </div>
          );
        } },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (r) => r.role || r.user_type || '—' },
        { key: 'created_at', label: 'Joined', render: (r) => dateOnly(r.created_at) },
      ]}
    />
  );
}
