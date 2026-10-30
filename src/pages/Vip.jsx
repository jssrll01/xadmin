import React from "react";
import { useState, useEffect } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { getDb } from '../supabase';

export default function Vip() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, [activeSystem]);

  const fetchApps = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vip_applications').select('*').order('created_at', { ascending: false });
    if (!error && data) setApps(data);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('vip_applications').update({ status: newStatus }).eq('id', id);
    if (!error) fetchApps();
  };

  if (activeSystem !== 'YUELIN') return <div className="card" style={{ padding: 32 }}>VIP Applications are only available for YUELIN.</div>;

  return (
    <div>
      <h2 style={{ color: 'var(--text-dark)' }}>VIP Applications</h2>
      {loading ? <p>Loading...</p> : (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apps.length === 0 ? <p>No VIP applications found.</p> : apps.map(app => (
            <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'var(--bg)', borderRadius: 12, boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.5)' }}>
              <div>
                <strong>{app.name || 'Unknown User'}</strong> <br/>
                <span style={{ fontSize: 14 }}>{app.email}</span>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: app.status === 'approved' ? 'var(--success)' : app.status === 'rejected' ? 'var(--danger)' : '#888' }}>Status: {app.status || 'pending'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ padding: '8px 16px', fontSize: 12, color: 'var(--success)' }} onClick={() => updateStatus(app.id, 'approved')}>Approve</button>
                <button className="btn" style={{ padding: '8px 16px', fontSize: 12, color: 'var(--danger)' }} onClick={() => updateStatus(app.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
