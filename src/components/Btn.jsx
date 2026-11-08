import React from 'react';

export default function Btn({ variant = 'default', loading, children, style, disabled, ...rest }) {
  const cls = 'neu-btn' + (variant === 'primary' ? ' neu-btn-primary' : variant === 'success' ? ' neu-btn-success' : variant === 'danger' ? ' neu-btn-danger' : '');
  return (
    <button className={cls} style={style} disabled={disabled || loading} aria-busy={loading ? true : undefined} {...rest}>
      {loading ? <span className="xa-sk" style={{ width: 12, height: 12, borderRadius: 6 }} /> : null}
      {children}
    </button>
  );
}
