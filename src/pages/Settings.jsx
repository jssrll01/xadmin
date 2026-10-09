import React from 'react';
import Card from '../components/Card.jsx';

export default function Settings() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Console information</p>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>System</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="neu-card-inset">
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>App</div>
            <div style={{ fontWeight: 700 }}>XADMIN v1.0.0</div>
          </div>
          <div className="neu-card-inset">
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Supabase project</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>dmdjytwrgqnvxdxdlnrp</div>
          </div>
          <div className="neu-card-inset">
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Bots connected</div>
            <div style={{ fontWeight: 700 }}>5</div>
          </div>
          <div className="neu-card-inset">
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Current PIN</div>
            <div style={{ fontWeight: 700 }}>1010</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Coming soon</div>
        <ul style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 2, paddingLeft: 20 }}>
          <li>Admin authentication via email instead of PIN</li>
          <li>Feature flags (enable/disable COD, instant delivery, etc.)</li>
          <li>Broadcast announcements to all users</li>
          <li>Audit log of admin actions</li>
          <li>Payment gateway settings</li>
        </ul>
      </Card>
    </>
  );
}
