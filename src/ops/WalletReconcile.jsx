import React from 'react';
import { opsRpc, peso } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, btn } from './OpsKit';
export default function WalletReconcile() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_wallet_reconcile', { p_limit: 500 }), []);
  const rows = data || [];
  const total = rows.reduce((n, r) => n + Number(r.diff), 0);
  return (
    <Page title="Wallet Reconcile" sub="Users whose Xwallet balance differs from the sum of their transactions.">
      <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center' }}>
        <b>{rows.length} mismatch{rows.length === 1 ? '' : 'es'}</b><span>Net difference {peso(total)}</span>
        <button style={{ ...btn, marginLeft: 'auto' }} onClick={run} disabled={busy}>{busy ? 'Checking…' : 'Re-run'}</button>
      </div>
      <Err e={err} />
      {!busy && !err && !rows.length && <Empty t="All balances match their transactions." />}
      {rows.length > 0 && <Table rows={rows} cols={[
        ['User', (r) => r.username ? '@' + r.username : r.email], ['Email', (r) => r.email],
        ['Balance', (r) => peso(r.balance)], ['Txn sum', (r) => peso(r.txn_sum)],
        ['Difference', (r) => <b style={{ color: r.diff > 0 ? '#B45309' : '#B91C1C' }}>{peso(r.diff)}</b>]]} />}
      <p style={{ fontSize: 12, color: '#64748B' }}>Older accounts may differ if their opening balance was never logged as a transaction.</p>
    </Page>
  );
}
