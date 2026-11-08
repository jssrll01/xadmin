import React from 'react';

// tabs: [[id, label, count?]]
export default function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  const onKey = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[n][0]);
    const el = e.currentTarget.parentElement.children[n];
    if (el) el.focus();
  };
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map(([id, text, count], i) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} tabIndex={value === id ? 0 : -1}
          className={value === id ? 'on' : ''} onClick={() => onChange(id)} onKeyDown={(e) => onKey(e, i)}>
          {text}{count != null ? <small>{count}</small> : null}
        </button>
      ))}
    </div>
  );
}
