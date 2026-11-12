import React, { useState } from 'react';
import { opsRpc } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, input, btn } from './OpsKit';
export default function SuspiciousRules() {
  const rules = useLoad(() => opsRpc('admin_fraud_rules'), []);
  const hits = useLoad(() => opsRpc('admin_fraud_hits'), []);
  const [d, setD] = useState({});
  const [msg, setMsg] = useState('');
  const val = (r, k) => (d[r.key] && d[r.key][k] !== undefined ? d[r.key][k] : r[k]);
  const set = (r, k, v) => setD({ ...d, [r.key]: { ...(d[r.key] || {}), [k]: v } });
  const save = async (r) => {
    setMsg('');
    try {
      await opsRpc('admin_fraud_rule_save', { p_key: r.key, p_threshold: Number(val(r, 'threshold')), p_window: Number(val(r, 'window_minutes')), p_weight: Number(val(r, 'weight')), p_enabled: !!val(r, 'enabled') });
      setD({ ...d, [r.key]: {} }); rules.run(); hits.run(); setMsg('Saved');
    } catch (e) { setMsg(e.message); }
  };
  const num = (r, k) => <input type="number" style={{ ...input, width: 90 }} value={val(r, k)} onChange={(e) => set(r, k, e.target.value)} />;
  return (
    <Page title="Suspicious Pattern Rules" sub="Set the limits that flag a user. Matches feed the Fraud Score page.">
      <Err e={rules.err || hits.err} />
      {msg && <div style={box}>{msg}</div>}
      <Table rows={rules.data || []} cols={[['Rule', (r) => <span><b>{r.label}</b><br /><small style={{ color: '#64748B' }}>{r.description}</small></span>],
        ['Hits to flag', (r) => num(r, 'threshold')], ['Window (min)', (r) => num(r, 'window_minutes')], ['Score weight', (r) => num(r, 'weight')],
        ['On', (r) => <input type="checkbox" checked={!!val(r, 'enabled')} onChange={(e) => set(r, 'enabled', e.target.checked)} />],
        ['', (r) => <button style={btn} onClick={() => save(r)}>Save</button>]]} />
      <h3 style={{ margin: '18px 0 8px' }}>Users matching a rule right now</h3>
      {!hits.busy && !(hits.data || []).length && <Empty t="No user matches any rule." />}
      {(hits.data || []).length > 0 && <Table rows={hits.data} cols={[['User', (r) => (r.username ? '@' + r.username : r.email || r.uid)], ['Email', (r) => r.email], ['Rule', (r) => r.rule], ['Hits', (r) => <b>{r.hits}</b>]]} />}
    </Page>
  );
}
