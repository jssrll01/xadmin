import React, { useState } from 'react';
import { opsRpc } from './opsApi';
import { Page, Err, Empty, Table, useLoad, box, btn } from './OpsKit';
export default function FunctionExposure() {
  const { data, err, busy, run } = useLoad(() => opsRpc('admin_function_exposure'), []);
  const [only, setOnly] = useState(true);
  const [e2, setE2] = useState('');
  const all = data || [];
  const rows = only ? all.filter((r) => r.risk === 'review') : all;
  const revoke = async (r) => {
    if (!window.confirm('Remove anonymous access to ' + r.name + '? Signed-in users keep access. Logged-out visitors lose it.')) return;
    setE2('');
    try { await opsRpc('admin_function_revoke_anon', { p_oid: r.oid }); await run(); } catch (x) { setE2(x.message); }
  };
  return (
    <Page title="Function Exposure Scanner" sub="Public functions that anyone logged out can call. 'Review' means a security-definer function with no user or admin check inside.">
      <div style={{ ...box, display: 'flex', gap: 14, alignItems: 'center' }}>
        <b>{all.filter((r) => r.risk === 'review').length} to review</b><span>of {all.length} anon-callable</span>
        <label style={{ marginLeft: 'auto' }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only show review</label>
        <button style={btn} onClick={run} disabled={busy}>{busy ? 'Scanning…' : 'Rescan'}</button>
      </div>
      <Err e={err || e2} />
      {!busy && !err && !rows.length && <Empty t="Nothing to review." />}
      {rows.length > 0 && <Table rows={rows} cols={[['Function', (r) => <b>{r.name}</b>], ['Arguments', (r) => r.args], ['Check inside', (r) => r.checks],
        ['Signed-in access', (r) => (r.authenticated ? 'Yes' : 'No')],
        ['Risk', (r) => <b style={{ color: r.risk === 'review' ? '#B91C1C' : '#15803D' }}>{r.risk}</b>],
        ['', (r) => (/^(admin|adm)_|^_/.test(r.name) ? '' : <button style={{ ...btn, background: '#B91C1C' }} onClick={() => revoke(r)}>Revoke anon</button>)]]} />}
      <p style={{ fontSize: 12, color: '#64748B' }}>Some functions are meant for logged-out visitors (public lists, sign-up helpers). Check before revoking.</p>
    </Page>
  );
}
