import { getAdminPin } from '../lib/pin.js';
import React, { useCallback, useEffect, useState } from 'react';
import useAutoClear from '../xa/useAutoClear.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../supabase.js';
import { peso, dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';

const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
const STATUSES = ['pending', 'processing', 'approved', 'rejected', 'completed'];
const COLORS = { pending: '#F59E0B', processing: '#3B82F6', approved: '#10B981', rejected: '#DC2626', completed: '#059669' };
const METHOD = { gcash: 'GCash', maya: 'Maya', bank: 'Bank' };
const TABS = [['withdrawals', 'Withdrawals'], ['interest', 'Interest log'], ['growth', 'Balance growth'], ['txns', 'Transactions']];

const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: '#8a93a3', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid rgba(0,0,0,.06)', verticalAlign: 'top' };

function Stat({ label, value, sub }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a93a3', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8a93a3', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function WalletPayouts() {
  const { show } = useToast();
  const [tab, setTab] = useState('withdrawals');
  const [sum, setSum] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  useAutoClear(q, setQ);
  const [busy, setBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    try { setSum(await call('admin_xwallet_summary')); } catch (e) { show?.(e.message, 'error'); }
  }, [show]);

  const loadRows = useCallback(async () => {
    try {
      const d = tab === 'withdrawals' ? await call('admin_withdrawals_list', { p_status: filter || null })
        : tab === 'interest' ? await call('admin_interest_log', { p_user: q || null })
        : tab === 'growth' ? await call('admin_wallet_growth', { p_user: q || null })
        : await call('admin_xwallet_txns', { p_kind: 'all' });
      setRows(Array.isArray(d) ? d : []);
    } catch (e) { setRows([]); show?.(e.message, 'error'); }
  }, [tab, filter, q, show]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => {
    const t = setInterval(() => { loadSummary(); loadRows(); }, 20000);
    return () => clearInterval(t);
  }, [loadSummary, loadRows]);

  const setStatus = async (w, status) => {
    let note = null;
    if (status === 'rejected') {
      note = window.prompt('Reason for rejection (shown to the user). The amount and fee will be refunded.', '');
      if (note === null) return;
    } else if (!window.confirm(`Mark ₱${w.amount} withdrawal as ${status}?`)) return;
    setBusy(true);
    try {
      await call('admin_withdrawal_set', { p_id: w.id, p_status: status, p_note: note });
      show?.(status === 'rejected' ? 'Rejected · refunded' : `Marked ${status}`, 'success');
      await Promise.all([loadRows(), loadSummary()]);
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };

  const runInterest = async () => {
    if (!window.confirm('Credit interest for all finished days not yet processed? Days already credited are skipped.')) return;
    setBusy(true);
    try { const r = await call('admin_run_interest'); show?.('Interest run done: ' + JSON.stringify(r).slice(0, 120), 'success'); await Promise.all([loadRows(), loadSummary()]); }
    catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };

  const next = { pending: ['processing', 'approved', 'rejected'], processing: ['approved', 'completed', 'rejected'], approved: ['completed', 'rejected'] };
  const chart = (sum?.by_day || []).map(d => ({ day: String(d.day).slice(5), total: Number(d.total) }));

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Withdrawals & Interest</h2>
      <p style={{ color: '#8a93a3', fontSize: 13, margin: '2px 0 14px' }}>Xwallet payouts, 1% fee and 1.5% p.a. daily interest</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
        <Stat label="Total withdrawals" value={peso(sum?.withdrawn_total)} sub={`${sum?.requests ?? 0} requests · ${sum?.open_requests ?? 0} open`} />
        <Stat label="Paid out (completed)" value={peso(sum?.withdrawn_paid)} sub={`Awaiting: ${peso(sum?.withdrawn_pending)}`} />
        <Stat label="Fees collected (1%)" value={peso(sum?.fees_collected)} />
        <Stat label="Interest credited" value={peso(sum?.interest_total)} sub={`${sum?.interest_users ?? 0} users · last day ${peso(sum?.interest_today)}`} />
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <b style={{ fontSize: 14 }}>Interest distributed per day (30d)</b>
          <button className="neu-btn" disabled={busy} onClick={runInterest} style={{ padding: '6px 12px', fontSize: 12 }}>Run pending interest</button>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v) => peso(v)} />
              <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {TABS.map(([id, label]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)}
            style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, opacity: tab === id ? 1 : .6, outline: tab === id ? '2px solid #10B981' : 'none' }}>{label}</button>
        ))}
        {tab === 'withdrawals' && (
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 10 }}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {(tab === 'interest' || tab === 'growth') && (
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by email or user id" style={{ padding: 8, borderRadius: 10, minWidth: 220 }} />
        )}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {tab === 'withdrawals' && <tr>{['Requested', 'User', 'Method', 'Account', 'Debited', 'Fee', 'Send (99%)', 'Status', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr>}
            {tab === 'interest' && <tr>{['Day', 'User', 'Lowest balance', 'Rate', 'Interest', 'Credited'].map(h => <th key={h} style={th}>{h}</th>)}</tr>}
            {tab === 'growth' && <tr>{['Day', 'User', 'Lowest', 'Closing', 'Interest'].map(h => <th key={h} style={th}>{h}</th>)}</tr>}
            {tab === 'txns' && <tr>{['Date', 'User', 'Type', 'Amount', 'Note'].map(h => <th key={h} style={th}>{h}</th>)}</tr>}
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#8a93a3' }} colSpan={9}>No records.</td></tr>}
            {tab === 'withdrawals' && rows.map(w => (
              <tr key={w.id}>
                <td style={td}>{dateTime(w.created_at)}</td>
                <td style={td}>{w.email || w.user_id.slice(0, 8)}</td>
                <td style={td}>{METHOD[w.method]}{w.bank_name ? ` · ${w.bank_name}` : ''}</td>
                <td style={td}><b>{w.account_name}</b><br /><code style={{ fontSize: 12 }}>{w.account_number}</code></td>
                <td style={td}>{peso(w.amount)}</td>
                <td style={td}>{peso(w.fee)}</td>
                <td style={{ ...td, fontWeight: 800 }}>{peso(w.net_amount)}</td>
                <td style={td}><span style={{ color: '#fff', background: COLORS[w.status], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{w.status}</span>
                  {w.admin_note && <div style={{ fontSize: 11, color: '#8a93a3', marginTop: 4 }}>{w.admin_note}</div>}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(next[w.status] || []).map(s => (
                      <button key={s} disabled={busy} className="neu-btn" onClick={() => setStatus(w, s)}
                        style={{ padding: '4px 9px', fontSize: 11, color: s === 'rejected' ? '#DC2626' : undefined }}>{s}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {tab === 'interest' && rows.map(r => (
              <tr key={r.id}><td style={td}>{r.day}</td><td style={td}>{r.email || r.user_id.slice(0, 8)}</td><td style={td}>{peso(r.eligible_balance)}</td>
                <td style={td}>{(Number(r.rate_pa) * 100).toFixed(2)}%</td><td style={{ ...td, fontWeight: 800, color: '#059669' }}>+{peso(r.interest)}</td><td style={td}>{dateTime(r.created_at)}</td></tr>
            ))}
            {tab === 'growth' && rows.map(r => (
              <tr key={r.user_id + r.day}><td style={td}>{r.day}</td><td style={td}>{r.email || r.user_id.slice(0, 8)}</td><td style={td}>{peso(r.min_balance)}</td>
                <td style={td}>{peso(r.close_balance)}</td><td style={td}>{Number(r.interest) ? '+' + peso(r.interest) : '—'}</td></tr>
            ))}
            {tab === 'txns' && rows.map(r => (
              <tr key={r.id}><td style={td}>{dateTime(r.created_at)}</td><td style={td}>{r.email || String(r.user_id).slice(0, 8)}</td><td style={td}>{String(r.type).replace(/_/g, ' ')}</td>
                <td style={{ ...td, fontWeight: 800, color: Number(r.amount) >= 0 ? '#059669' : '#DC2626' }}>{peso(r.amount)}</td><td style={td}>{r.note || '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
