import React from 'react';
export default function Input({ label, style, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
      <input className="neu-input" style={style} {...props} />
    </div>
  );
}
