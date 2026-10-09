import React, { useEffect, useState } from 'react';
import { Search, Trash2, UserX, UserCheck } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchUsers, updateUser, deleteUser } from '../lib/api.js';
import { initials, dateTime } from '../lib/format.js';

export default function Users() {
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    fetchUsers({ search }).then(({ items }) => { setItems(items); setLoading(false); });
  };
  useEffect(load, []); // eslint-disable-line

  const ban = async (u) => {
    const banned = !u.banned;
    const { error } = await updateUser(u.id, { banned });
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === u.id ? { ...x, banned } : x));
    show(banned ? 'User banned' : 'User unbanned', 'success');
    setSelected(null);
  };

  const hardDelete = async (u) => {
    if (!confirm(`Delete ${u.username || u.email}? This cannot be undone.`)) return;
    const { error } = await deleteUser(u.id);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.filter(x => x.id !== u.id));
    show('User deleted', 'success');
    setSelected(null);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>{items.length} accounts</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="neu-input" placeholder="Search username, first name, last name…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          <Btn variant="primary" onClick={load}><Search size={16} /> Search</Btn>
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No users" message="No accounts match your search." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email / Username</th>
              <th>Created</th>
              <th>Wallet</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} onClick={() => setSelected(u)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
                      color: '#fff', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{initials(u.first_name, u.last_name, u.email)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.first_name || u.username || '—'} {u.last_name || ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td>{u.email || u.username || '—'}</td>
                <td>{dateTime(u.created_at)}</td>
                <td><b>₱{Number(u.xwallet_balance || 0).toFixed(2)}</b></td>
                <td>
                  {u.banned ? (
                    <span className="neu-badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>Banned</span>
                  ) : (
                    <span className="neu-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>Active</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="User details">
        {selected && (
          <>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.first_name} {selected.last_name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>{selected.email}</div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Username</div><div style={{ fontWeight: 700 }}>{selected.username || '—'}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Wallet</div><div style={{ fontWeight: 700 }}>₱{Number(selected.xwallet_balance || 0).toFixed(2)}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loyalty</div><div style={{ fontWeight: 700 }}>{selected.loyalty_points || 0} pts</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Joined</div><div style={{ fontWeight: 700 }}>{dateTime(selected.created_at)}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Btn variant={selected.banned ? 'success' : 'default'} onClick={() => ban(selected)} style={{ flex: 1 }}>
                {selected.banned ? <><UserCheck size={16} /> Unban</> : <><UserX size={16} /> Ban</>}
              </Btn>
              <Btn variant="danger" onClick={() => hardDelete(selected)} style={{ flex: 1 }}>
                <Trash2 size={16} /> Delete
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
