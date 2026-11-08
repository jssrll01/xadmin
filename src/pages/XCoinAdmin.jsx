import { getAdminPin } from '../lib/pin.js';
import React, { useCallback, useEffect, useState } from 'react';
import { xmSupabase } from '../supabase.js';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';

const PIN = getAdminPin();
const actor = () => sessionStorage.getItem('xadmin_actor') || 'admin';
async function rpc(fn, args) {
  const { data, error } = await xmSupabase.rpc(fn, { p_pin: PIN, ...args });
  if (error) throw error;
  return data;
}
const FIELDS = [
  ['fee_percentage', 'Fee (%)', 'Charged on every buy and sell. 0 to 20.'],
  ['max_buy_php', 'Max buy (PHP)', 'Largest single purchase.'],
  ['volatility', 'Volatility', 'Typical move per tick (0.012 = 1.2%). Max 0.1.'],
  ['drift', 'Base drift', 'Constant bias per tick. Keep near 0.'],
  ['anchor_price', 'Anchor price', 'Price the market is gently pulled toward.'],
  ['min_price', 'Min price', 'Hard floor.'],
  ['max_price', 'Max price', 'Hard ceiling.'],
  ['max_move_pct', 'Max move per tick', '0.12 = 12%.'],
  ['reversion', 'Mean reversion', 'Pull toward the anchor. 0 to 0.2.'],
];
const n = (v, d = 2) => Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: d });
const lbl = { fontSize: 11, fontWeight: 700, color: '#8a93a3', textTransform: 'uppercase', margin: '10px 0 4px', display: 'block' };

export default function XCoinAdmin() {
  const { show } = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [adj, setAdj] = useState({ user: '', delta: '', reason: '' });

  const load = useCallback(async () => {
    try {
      setErr('');
      const r = await rpc('xcoin_admin_read');
      setD(r);
      const s = r.settings || {};
      const o = {};
      FIELDS.forEach(([k]) => { o[k] = String(s[k] ?? ''); });
      setF(o);
    } catch (e) { setErr(e.message || 'Load failed'); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const run = async (fn, args, ok) => {
    if (busy) return;
    setBusy(true);
    try { await rpc(fn, { p_actor: actor(), ...args }); show(ok, 'success'); await load(); }
    catch (e) { show(e.message || 'Failed', 'error'); }
    setBusy(false);
  };
  const save = () => {
    const data = {};
    FIELDS.forEach(([k]) => { if (f[k] !== '') data[k] = Number(f[k]); });
    run('xcoin_admin_settings_save', { p_data: data }, 'Settings saved');
  };
  const toggle = () => run('xcoin_admin_settings_save', { p_data: { is_enabled: !d.settings.is_enabled } }, d.settings.is_enabled ? 'Market paused' : 'Market resumed');
  const adjust = () => {
    if (!window.confirm('Apply this audited balance adjustment?')) return;
    run('xcoin_admin_adjust', { p_user: adj.user.trim(), p_delta: Number(adj.delta), p_reason: adj.reason }, 'Balance adjusted').then(() => setAdj({ user: '', delta: '', reason: '' }));
  };

  if (err) return <Card><div style={{ color: '#b42323', marginBottom: 10 }}>{err}</div><Btn onClick={load}>Retry</Btn></Card>;
  if (!d) return <Card>Loading…</Card>;
  const { settings: s, market: m, engine: e, stats: st } = d;
  const stat = (k, v) => <Card key={k} style={{ padding: 14 }}><div style={{ fontSize: 11, color: '#8a93a3' }}>{k}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div></Card>;
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#8a93a3', whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', fontSize: 12, whiteSpace: 'nowrap' };

  return (
    <>
      <div className="page-head"><div><h1>XCOIN</h1><p>Market controls, analytics and audited adjustments</p></div></div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8a93a3' }}>Current price</div>
            <div style={{ fontSize: 30, fontWeight: 900 }}>₱{n(m.current_price, 4)}</div>
            <div style={{ fontSize: 12 }}>Label: {m.market_state} · Hidden regime: {e.regime} ({e.ticks_left} ticks left)</div>
            <div style={{ fontSize: 12, color: '#8a93a3' }}>24h high ₱{n(m.high_24h, 4)} · low ₱{n(m.low_24h, 4)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Btn variant={s.is_enabled ? 'danger' : 'success'} onClick={toggle} disabled={busy}>{s.is_enabled ? 'Pause market' : 'Resume market'}</Btn>
            <Btn onClick={() => run('xcoin_admin_tick', {}, 'Tick executed')} disabled={busy}>Force tick</Btn>
            <Btn onClick={load}>Refresh</Btn>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#8a93a3', marginTop: 8 }}>Status: {s.is_enabled ? 'Trading open' : 'Paused. Ticks and trades are stopped.'}</p>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
        {stat('Holders', st.holders)}{stat('Circulating XCOIN', n(st.supply, 4))}{stat('Market cap', '₱' + n(st.supply * m.current_price))}
        {stat('Buy volume', '₱' + n(st.buy_php))}{stat('Sell volume', '₱' + n(st.sell_php))}{stat('Fee revenue', '₱' + n(st.fees))}
        {stat('Trades', st.trades)}{stat('All-time high', '₱' + n(st.ath, 4))}{stat('All-time low', '₱' + n(st.atl, 4))}{stat('Ticks stored', st.ticks)}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Settings</h3>
        <p style={{ fontSize: 12, color: '#8a93a3' }}>Every save is logged. Values outside the allowed ranges are rejected.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0 14px' }}>
          {FIELDS.map(([k, l, h]) => (
            <div key={k}><label style={lbl}>{l}</label>
              <input className="neu-input" type="number" step="any" value={f[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} />
              <div style={{ fontSize: 11, color: '#8a93a3' }}>{h}</div></div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Btn></div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Audited balance adjustment</h3>
        <label style={lbl}>User ID (uuid)</label><input className="neu-input" value={adj.user} onChange={(ev) => setAdj({ ...adj, user: ev.target.value })} />
        <label style={lbl}>XCOIN change (use a minus to remove)</label><input className="neu-input" type="number" step="any" value={adj.delta} onChange={(ev) => setAdj({ ...adj, delta: ev.target.value })} />
        <label style={lbl}>Reason (required)</label><input className="neu-input" value={adj.reason} onChange={(ev) => setAdj({ ...adj, reason: ev.target.value })} />
        <div style={{ marginTop: 12 }}><Btn variant="danger" onClick={adjust} disabled={busy || !adj.user || !adj.delta || adj.reason.trim().length < 5}>Apply adjustment</Btn></div>
      </Card>

      {[['Top holders', ['user_id', 'real_balance', 'avg_buy_price'], d.wallets],
        ['Recent trades', ['created_at', 'user_id', 'txn_type', 'xcoin_amount', 'php_amount', 'price_at_trade'], d.ledger],
        ['Admin log', ['created_at', 'actor', 'action', 'reason'], d.logs]].map(([title, cols, rows]) => (
        <Card key={title} style={{ marginBottom: 14, overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} style={td}>{c === 'created_at' ? new Date(r[c]).toLocaleString() : /id$/.test(c) ? String(r[c] || '').slice(0, 8) : typeof r[c] === 'number' || /^[0-9.]+$/.test(String(r[c])) ? n(r[c], 4) : String(r[c] ?? '-')}</td>)}</tr>)}
              {!rows.length && <tr><td style={td} colSpan={cols.length}>Nothing yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      ))}
    </>
  );
}
