import React from 'react';
export default function Card({ children, style, className = '', ...props }) {
  return <div className={'neu-card ' + className} style={style} {...props}>{children}</div>;
}
