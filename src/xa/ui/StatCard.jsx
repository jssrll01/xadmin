import React from 'react';
import { Sk } from '../Kit.jsx';

// tone: '' | 'ok' | 'warn' | 'bad'
export default function StatCard({ label, value, hint, icon: Icon, tone, loading }) {
  return (
    <div className={'ui-stat' + (tone ? ' ' + tone : '')}>
      <div className="ui-stat-top"><span>{label}</span>{Icon ? <i><Icon size={16} /></i> : null}</div>
      {loading ? <Sk w="50%" h={26} style={{ marginTop: 8 }} /> : <b>{value}</b>}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
