import React from 'react';
import { opsRpc, peso, when } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, btn } from './OpsKit';
export default function CreatorPayouts() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_creator_payouts'), []);
  const rows = data || [];
  const sum = (k) => rows.reduce((n, r) => n + Number(r[k] || 0), 0);
  return (
    <Page title="Creator Payouts" sub="Approved creators: earnings balance and what has been withdrawn.">
      <div style={{ ...box, display: 'flex', gap: 18, alignItems: 'center' }}>
        <span>Creators <b>{rows.length}</b></span><span>Unpaid balance <b>{peso(sum('balance'))}</b></span><span>Withdrawn <b>{peso(sum('withdrawn'))}</b></span>
        <button style={{ ...btn, marginLeft: 'auto' }} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
      </div>
      <Err e={err} />
      {!busy && !err && !rows.length && <Empty t="No approved creators yet." />}
      {rows.length > 0 && <Table rows={rows} cols={[['Creator', (r) => '@' + r.username], ['Balance', (r) => peso(r.balance)], ['Withdrawn', (r) => peso(r.withdrawn)], ['Last payout', (r) => when(r.last_payout) || 'Never']]} />}
    </Page>
  );
}
