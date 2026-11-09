import React from 'react';

export default function Field({ label, error, hint, children }) {
  return (
    <div>
      {label && <div className="ui-lbl">{label}</div>}
      {children}
      {error && <div className="ui-err" role="alert">{error}</div>}
      {hint && !error && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
