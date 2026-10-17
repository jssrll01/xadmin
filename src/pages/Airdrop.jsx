import React, { useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { supabase } from '../supabase.js';

const CODE = import.meta.env.VITE_XADMIN_PIN || '1010';
const TABS = [['tiers', 'Tiers'], ['draws', 'Draws'], ['bets', 'Bets']];
const when = (d) => (d ? new Date(d).toLocaleString() : '');
const th = { textAlign: 'left', fontSize: 11, padding: '6px 8px', color: 'var(--text-dim)', textTransform: 'uppercase' };
const td = { padding: '6px 8px', fontSize: 13, whiteSpace: 'nowrap' };

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}

export default function Airdrop() {
  const { show } = useToast();
  const [tab, setTab] = useState('tiers');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const fn = tab === 'tiers' ? 'admin_airdrop_tiers' : tab === 'draws' ? 'admin_airdrop_draws' : 'admin_airdrop_bets';
      const list = await rpc(fn, tab === 'tiers' ? {} : { p_limit: 150 });
      setRows(Array.isArray(list) ? list : []); setErr('');
    } catch (e) { setRows([]); setErr(String(e.message || e)); } finally { setLoading(false); }
  }, [tab]);
  useAutoRefresh(load, 8000);

  const switchTab = (k) => { setTab(k); setRows([]); setLoading(true); };
  const toggle = async (t) => {
    try { await rpc('admin_airdrop_toggle', { p_key: t.key, p_enabled: !t.enabled }); show?.(t.label + (t.enabled ? ' turned off' : ' turned on')); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 12px' }}>🎮 Airdrop 88</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {TABS.map(([k, l]) => (
          <Btn key={k} variant={tab === k ? 'primary' : 'default'} onClick={() => switchTab(k)}>{l}</Btn>
        ))}
      </div>
      {err && <Card style={{ padding: 12, color: '#EF4444' }}>{err}</Card>}
      {loading ? <Card style={{ padding: 12 }}>Loading…</Card> : (
        <Card style={{ padding: 8, overflowX: 'auto' }}>
          {rows.length === 0 ? <div style={{ padding: 12 }}>No data yet.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {tab === 'tiers' && ['Game', 'Range', 'Winners', 'Pays', 'Bets', 'In', 'Out', 'Margin', 'Status'].map((h) => <th key={h} style={th}>{h}</th>)}
                {tab === 'draws' && ['Draw time', 'Game', 'Status', 'Winning', 'Bets', 'In', 'Out'].map((h) => <th key={h} style={th}>{h}</th>)}
                {tab === 'bets' && ['Time', 'Game', 'Player', 'Pick', 'Bet', 'Result', 'Payout'].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r) => tab === 'tiers' ? (
                  <tr key={r.key}>
                    <td style={td}>{r.label}</td><td style={td}>1-{r.max_n}</td><td style={td}>{r.win_count}</td>
                    <td style={td}>{r.payout}x</td><td style={td}>{r.bets}</td><td style={td}>{r.total_in}</td>
                    <td style={td}>{r.total_out}</td><td style={td}>{r.total_in - r.total_out}</td>
                    <td style={td}><Btn variant={r.enabled ? 'success' : 'danger'} onClick={() => toggle(r)}>{r.enabled ? 'ON' : 'OFF'}</Btn></td>
                  </tr>
                ) : tab === 'draws' ? (
                  <tr key={r.id}>
                    <td style={td}>{when(r.draw_at)}</td><td style={td}>{r.tier}</td><td style={td}>{r.status}</td>
                    <td style={td}>{(r.winning || []).join(', ')}</td><td style={td}>{r.bets}</td>
                    <td style={td}>{r.total_in}</td><td style={td}>{r.total_out}</td>
                  </tr>
                ) : (
                  <tr key={r.id}>
                    <td style={td}>{when(r.created_at)}</td><td style={td}>{r.tier}</td><td style={td}>{r.email}</td>
                    <td style={td}>{r.pick}</td><td style={td}>{r.amount}</td>
                    <td style={td}>{r.win == null ? 'pending' : r.win ? 'WIN' : 'lose'}</td><td style={td}>{r.payout ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
