import React from 'react';
export default function Stat({ icon: Icon, value, label, color = '#2563EB' }) {
  return (
    <div className="stat">
      <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
