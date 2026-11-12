import React, { useState } from 'react';
import { opsRpc } from './opsApi';
import { Page, Err, Table, useLoad, box, btn } from './OpsKit';
export default function KillSwitches() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_killswitch_list'), []);
  const [e2, setE2] = useState('');
  const flip = async (scope, key, blocked, label) => {
    if (!blocked && !window.confirm('Turn OFF ' + label + '? Users will not be able to use it.')) return;
    setE2('');
    try { await opsRpc('admin_killswitch_set', { p_scope: scope, p_key: key, p_blocked: !blocked, p_reason: blocked ? 'Turned on in xadmin' : 'Turned off in xadmin' }); await run(); }
    catch (x) { setE2(x.message); }
  };
  const sec = (title, scope, rows) => (
    <div key={title}>
      <h3 style={{ margin: '16px 0 8px' }}>{title}</h3>
      <Table rows={rows || []} cols={[
        ['Name', (r) => r.label],
        ['Status', (r) => (r.blocked ? <b style={{ color: '#B91C1C' }}>OFF</b> : <b style={{ color: '#15803D' }}>ON</b>)],
        ['Action', (r) => <button style={{ ...btn, background: r.blocked ? '#15803D' : '#B91C1C' }} onClick={() => flip(scope, r.key, r.blocked, r.label)}>{r.blocked ? 'Turn on' : 'Turn off'}</button>]]} />
    </div>
  );
  const d = data || {};
  return (
    <Page title="Kill Switches" sub="Turn a game, shop item or payment method off instantly. Off items stop working for users.">
      <div style={box}><button style={btn} onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button></div>
      <Err e={err || e2} />
      {data && sec('Games', 'game', d.games)}
      {data && sec('Shop items', 'shop', d.shop)}
      {data && sec('Payment methods', 'payment', d.payments)}
    </Page>
  );
}
