import React from 'react';
import useCountUp from '../lib/useCountUp.js';

export default function AnimatedNumber({ value, format }) {
  const target = Number(value) || 0;
  const v = useCountUp(target);
  const dec = Math.min((String(value).split('.')[1] || '').length, 2);
  return (
    <span>
      {format ? format(v) : v.toLocaleString('en-PH', { minimumFractionDigits: dec, maximumFractionDigits: dec })}
    </span>
  );
}
