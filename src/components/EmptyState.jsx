import React from 'react';
import { PackageOpen } from 'lucide-react';
export default function EmptyState({ title = 'Nothing here', message = 'No data to display.' }) {
  return (
    <div className="neu-card-flat" style={{ textAlign: 'center', padding: 48 }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 16px',
        borderRadius: 20, background: 'var(--surface-in)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--neu-inset)',
      }}>
        <PackageOpen size={28} color="var(--text-dim)" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>{message}</div>
    </div>
  );
}
