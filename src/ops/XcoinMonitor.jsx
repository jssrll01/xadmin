import React from 'react';
import { opsRpc } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, btn } from './OpsKit';
export default function XcoinMonitor() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_xcoin_overview'), []);
  const fmt = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <Page title="Xcoin Monitor" sub="Live look at every table named xcoin*: row counts and the latest entries (price and supply).">
      <div style={box}><button style={btn} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button></div>
      <Err e={err} />
      {data && !data.length && <Empty t="No tables named xcoin* were found. Tell me the real table names and I will target them." />}
      {(data || []).map((t) => {
        const cols = t.recent && t.recent[0] ? Object.keys(t.recent[0]) : [];
        return (
          <div key={t.table}>
            <h3 style={{ margin: '14px 0 6px' }}>{t.table} <small style={{ color: '#64748B', fontWeight: 400 }}>about {t.rows} rows</small></h3>
            {cols.length ? <Table rows={t.recent} cols={cols.map((c) => [c, (r) => fmt(r[c])])} /> : <Empty t="No rows." />}
          </div>
        );
      })}
    </Page>
  );
}
