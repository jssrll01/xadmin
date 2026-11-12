import React, { useState } from 'react';
import { opsRpc, peso } from './opsApi';
import { Page, Err, Table, useLoad, box, input, btn } from './OpsKit';
const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
export default function DailyCloseReport() {
  const [day, setDay] = useState(today());
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_daily_close', { p_day: day }), [day]);
  const d = data || {};
  const card = (l, v) => <div style={{ ...box, flex: '1 1 180px', marginBottom: 0 }}><div style={{ fontSize: 12, color: '#64748B' }}>{l}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{peso(v)}</div></div>;
  const csv = () => {
    const lines = ['type,count,in,out'].concat((d.by_type || []).map((r) => [r.type, r.count, r.in, r.out].join(',')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'daily-close-' + day + '.csv'; a.click();
  };
  return (
    <Page title="Daily Close Report" sub="Money in and out for one day (Manila time).">
      <div style={{ ...box, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="date" style={input} value={day} onChange={(e) => setDay(e.target.value)} />
        <button style={btn} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
        <button style={{ ...btn, background: '#0F172A' }} onClick={csv} disabled={!d.by_type}>Export CSV</button>
      </div>
      <Err e={err} />
      {data && (<>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {card('Net wallet movement', d.net)}{card('Market sales', d.market_sales)}
          {card('Airdrop bets in', d.airdrop_in)}{card('Airdrop paid out', d.airdrop_out)}{card('Withdrawals open (all time)', d.withdrawals_pending)}
        </div>
        <Table rows={d.by_type || []} cols={[['Type', (r) => r.type], ['Count', (r) => r.count], ['Money in', (r) => peso(r.in)], ['Money out', (r) => peso(r.out)]]} />
      </>)}
    </Page>
  );
}
