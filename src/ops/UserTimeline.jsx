import React, { useState } from 'react';
import { opsRpc, peso, when } from './opsApi';
import { Page, Err, Empty, Table, box, input, btn } from './OpsKit';
export default function UserTimeline() {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr('');
    try { setData(await opsRpc('admin_user_timeline', { p_query: q.trim(), p_limit: 300 })); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const u = data && data.user;
  return (
    <Page title="User Timeline" sub="One user's wallet, play, airdrop and market activity, newest first.">
      <div style={{ ...box, display: 'flex', gap: 10 }}>
        <input style={{ ...input, flex: 1 }} placeholder="Email, @username or user id" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <button style={btn} onClick={go} disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </div>
      <Err e={err} />
      {data && !data.found && <Empty t="No user found." />}
      {u && <div style={box}><b>{u.username ? '@' + u.username : u.email}</b> · {u.email}<br />Xwallet {peso(u.xwallet_balance)} · Loyalty points {u.loyalty_points || 0}</div>}
      {u && <Table rows={data.events || []} cols={[['When', (r) => when(r.at)], ['Type', (r) => r.kind], ['Detail', (r) => r.text],
        ['Amount', (r) => (r.amount === null || r.amount === undefined ? '' : <b style={{ color: r.amount >= 0 ? '#15803D' : '#B91C1C' }}>{peso(r.amount)}</b>)]]} />}
    </Page>
  );
}
