import React from 'react';
export default function Btn({ variant = 'default', size = 'md', children, style, ...props }) {
  const variantClass =
    variant === 'primary' ? 'neu-btn-primary' :
    variant === 'success' ? 'neu-btn-success' :
    variant === 'danger'  ? 'neu-btn-danger'  :
    variant === 'ghost'   ? 'neu-btn-ghost'   : '';
  const sizeStyle = size === 'sm' ? { padding: '8px 14px', fontSize: 12.5 } :
                    size === 'lg' ? { padding: '14px 24px', fontSize: 15 } : {};
  return (
    <button className={'neu-btn ' + variantClass} style={{ ...sizeStyle, ...style }} {...props}>
      {children}
    </button>
  );
}
