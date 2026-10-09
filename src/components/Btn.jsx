import React from 'react';
export default function Btn({ variant = 'default', children, style, ...rest }) {
  const cls =
    'neu-btn' +
    (variant === 'primary' ? ' neu-btn-primary' :
     variant === 'success' ? ' neu-btn-success' :
     variant === 'danger'  ? ' neu-btn-danger'  : '');
  return <button className={cls} style={style} {...rest}>{children}</button>;
}
