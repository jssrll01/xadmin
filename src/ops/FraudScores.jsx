import React from 'react';
import { opsRpc } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, btn } from './OpsKit';
export default function FraudScores() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_fraud_scores', { p_limit: 300 }), []);
  const rows = data || [];
  const col = (s) => (s >= 60 ? '#B91C1C' : s >= 30 ? '#B45309' : '#15803D');
  return (
    <Page title="Fraud Score" sub="Score 0 to 100 per user, built from the weights of every rule they match.">
      <div style={{ ...box, display: 'flex', alignItems: 'center' }}><b>{rows.length} flagged user{rows.length === 1 ? '' : 's'}</b>
        <button style={{ ...btn, marginLeft: 'auto' }} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button></div>
      <Err e={err} />
      {!busy && !err && !rows.length && <Empty t="No user has a fraud score right now." />}
      {rows.length > 0 && <Table rows={rows} cols={[['User', (r) => (r.username ? '@' + r.username : r.email || r.uid)], ['Email', (r) => r.email],
        ['Score', (r) => <span><b style={{ color: col(r.score) }}>{r.score}</b>
          <div style={{ background: '#E2E8F0', borderRadius: 99, height: 6, width: 100, marginTop: 4 }}><div style={{ width: r.score + '%', height: 6, borderRadius: 99, background: col(r.score) }} /></div></span>],
        ['Reasons', (r) => r.reasons]]} />}
    </Page>
  );
}
