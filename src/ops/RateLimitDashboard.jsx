import React, { useState } from 'react';
import { opsRpc, when } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, input, btn } from './OpsKit';
export default function RateLimitDashboard() {
  const [h, setH] = useState(24);
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_rate_limits', { p_hours: Number(h) || 24 }), [h]);
  const rows = data || [];
  return (
    <Page title="Rate Limit Dashboard" sub="Users who hit Play Time rate limits or entered wrong YT Premium PINs.">
      <div style={{ ...box, display: 'flex', gap: 10, alignItems: 'center' }}>
        <select style={input} value={h} onChange={(e) => setH(e.target.value)}>
          {[1, 6, 24, 72, 168].map((n) => <option key={n} value={n}>Last {n} hour{n === 1 ? '' : 's'}</option>)}
        </select>
        <button style={btn} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
        <b style={{ marginLeft: 'auto' }}>{rows.length} row{rows.length === 1 ? '' : 's'}</b>
      </div>
      <Err e={err} />
      {!busy && !err && !rows.length && <Empty t="Nobody hit a limit in this period." />}
      {rows.length > 0 && <Table rows={rows} cols={[['User', (r) => (r.username ? '@' + r.username : r.email || r.user_id)], ['Email', (r) => r.email],
        ['Limit', (r) => r.src], ['Hits', (r) => <b>{r.hits}</b>], ['Last hit', (r) => when(r.last_at)]]} />}
    </Page>
  );
}
