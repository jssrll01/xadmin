import { useAdminContext } from "../context/AdminContext";
import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchUsers, userCrud } from '../lib/api.js';
import { peso, dateOnly, initials } from '../lib/format.js';

import { getDb } from '../supabase.js';

const CODE = import.meta.env.VITE_XADMIN_PIN;
async function adminCall(fn, args) {
  const { error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) { alert(error.message); return false; }
  return true;
}
const adjustWallet = async (row) => {
  const v = prompt('Add (+) or remove (-) wallet amount for ' + (row.email || row.id));
  const amt = Number(v);
  if (!v || !amt) return;
  const note = prompt('Note (optional)') || 'Admin adjustment';
  if (await adminCall('admin_wallet_adjust', { p_uid: row.id, p_amt: amt, p_type: 'adjustment', p_note: note })) alert('Wallet updated');
};
const setPoints = async (row) => {
  const v = prompt('Set loyalty points for ' + (row.email || row.id), String(row.loyalty_points || 0));
  if (v === null || v === '' || isNaN(Number(v))) return;
  if (await adminCall('admin_user_set', { p_uid: row.id, p_points: Math.floor(Number(v)) })) alert('Points updated');
};

const STATUS_OPTS = ['active', 'frozen', 'banned'];

export default function Users() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  return (
    <CrudPage
      title="Users"
      subtitle="All profiles"
      fetcher={fetchUsers}
      searchKeys={['email', 'username', 'first_name', 'last_name', 'phone']}
      columns={[
        { key: 'name', label: 'User', render: (r) => {
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || r.email || '—';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>
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
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
        { key: 'loyalty_tier', label: 'Tier', render: (r) => r.loyalty_tier || '—' },
        { key: 'xwallet_balance', label: 'Wallet', render: (r) => peso(r.xwallet_balance || 0) },
        { key: 'loyalty_points', label: 'Points', render: (r) => r.loyalty_points || 0 },
        { key: 'status', label: 'Status', render: (r) => {
          const s = (r.status || 'active').toLowerCase();
          return <span className={`neu-badge badge-${s}`}>{s}</span>;
        } },
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
        { key: 'delivery_address', label: 'Address', type: 'textarea' },
      ]}
      onCreate={userCrud.create}
      onUpdate={userCrud.update}
      onDelete={userCrud.remove}
      extraRowActions={(row) => (
        <>
          <select
            className="neu-input-sm"
            value={(row.status || 'active').toLowerCase()}
            onChange={(e) => adminCall('admin_user_set', { p_uid: row.id, p_status: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="banned">Banned</option>
          </select>
          <button className="neu-btn" style={{ padding: 7 }} title="Adjust wallet" onClick={() => adjustWallet(row)}>₱</button>
          <button className="neu-btn" style={{ padding: 7 }} title="Set points" onClick={() => setPoints(row)}>P</button>
        </>
      )}
    />
  );
}
