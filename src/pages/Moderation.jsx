import React, { useState } from 'react';
import WordsTab from './mod/WordsTab.jsx';
import SlowTab from './mod/SlowTab.jsx';
import MuteTab from './mod/MuteTab.jsx';
import LogTab from './mod/LogTab.jsx';

const TABS = [['words', 'Banned words', WordsTab], ['slow', 'Slow mode', SlowTab], ['mute', 'Mute / Timeout', MuteTab], ['log', 'Takedown log', LogTab]];

export default function Moderation() {
  const [tab, setTab] = useState('words');
  const Active = TABS.find((t) => t[0] === tab)[2];
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Moderation</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: tab === id ? 1 : 0.6, outline: tab === id ? '2px solid #2563EB' : 'none' }}>{l}</button>
        ))}
      </div>
      <Active />
    </div>
  );
}
