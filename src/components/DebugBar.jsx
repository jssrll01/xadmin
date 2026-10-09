import React from 'react';

export default function DebugBar({ count, label }) {
  return (
    <div style={{
      background: '#FEF3C7',
      border: '1px solid #F59E0B',
      color: '#92400E',
      padding: '6px 12px',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 12,
    }}>
      🐛 {label || 'page'} — loaded <b>{count}</b> items
    </div>
  );
}
