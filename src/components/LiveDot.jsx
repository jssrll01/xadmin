import React, { useEffect, useState } from 'react';
import { liveBus } from '../lib/live.js';
import { getDbSystem } from '../supabase.js';

const LOOK = {
  live: ['#16a34a', 'Live'],
  connecting: ['#d97706', 'Connecting'],
  error: ['#dc2626', 'Offline'],
  off: ['#dc2626', 'Offline'],
  idle: ['#94a3b8', 'Idle'],
};

// Small status light. Also keeps the realtime channel open on every XMARKET page.
export default function LiveDot() {
  const [st, setSt] = useState(liveBus.status);
  useEffect(() => {
    if (getDbSystem() === 'YUELIN') return undefined;
    const off = liveBus.subscribe(() => {});
    const offS = liveBus.onStatus(setSt);
    return () => { offS(); off(); };
  }, []);
  if (getDbSystem() === 'YUELIN') return null;
  const [color, label] = LOOK[st] || LOOK.idle;
  return (
    <span title={'Realtime: ' + label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, background: color, boxShadow: st === 'live' ? '0 0 0 3px ' + color + '33' : 'none' }} />
      {label}
    </span>
  );
}
