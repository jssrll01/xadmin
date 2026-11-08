import React from 'react';

export default function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
      className={'ui-sw' + (checked ? ' on' : '')} onClick={() => onChange(!checked)}><i /></button>
  );
}
