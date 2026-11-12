import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { peso, dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';

const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: '#8a93a3', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid rgba(0,0,0,.06)', verticalAlign: 'top' };
const muted = { color: '#8a93a3', fontSize: 12 };
const inp = { padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', background: 'transparent', fontSize: 13, minWidth: 0 };

const rpcDb = async (action, tbl, extra = {}) => {
  const { data, error } = await supabase.rpc('admin_db', { code: getAdminPin(), action, tbl, ...extra });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
const sel = (tbl, order = 'created_at') => rpcDb('select', tbl, { order_col: order, lim: 5000 });
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const who = (p) => (p.username ? '@' + p.username : p.email || String(p.id || p.user_id || '').slice(0, 8) || '—');
const OPEN = ['pending', 'processing'];
const rcOf = (r) => r.receipt_data || r.receipt || {};
const srcOf = (r) => { const rc = rcOf(r); return typeof rc === 'string' ? rc : rc.url || rc.dataUrl || ''; };
const refOf = (r) => { const rc = rcOf(r); const v = r.reference || r.ref_no || r.reference_no || (typeof rc === 'object' ? rc.reference || rc.ref || rc.ref_no || rc.reference_no : '') || ''; return String(v).trim().toLowerCase(); };

function useLoad(fn, deps = []) {
  const [st, setSt] = useState({ rows: null, err: '', loading: true });
  const load = useCallback(async () => {
    setSt((s) => ({ ...s, loading: true }));
    try { setSt({ rows: await fn(), err: '', loading: false }); }
    catch (e) { setSt({ rows: [], err: e.message || String(e), loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...st, reload: load };
}

function Shell({ title, sub, onRefresh, loading, err, children }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, flex: 1 }}>{title}</h2>
        {onRefresh && <button className="neu-btn" onClick={onRefresh} disabled={loading} style={{ padding: '6px 12px', fontSize: 12 }}>{loading ? 'Loading…' : 'Refresh'}</button>}
      </div>
      <p style={{ ...muted, margin: '2px 0 14px' }}>{sub}</p>
      {err && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Error: {err}</div>}
      {children}
    </div>
  );
}
function Stat({ label, value, sub }) {
  return (
    <div style={{ ...card, marginBottom: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a93a3', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
      {sub && <div style={{ ...muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
const Grid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 12 }}>{children}</div>;
function Tbl({ cols, rows, empty = 'Nothing here.' }) {
  if (!rows || !rows.length) return <div style={{ ...card, opacity: .7 }}>{empty}</div>;
  return (
    <div style={{ ...card, overflowX: 'auto', padding: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{cols.map((c) => <th key={c[0]} style={th}>{c[0]}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id || r.key || i}>{cols.map((c) => <td key={c[0]} style={td}>{c[1](r, i)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const BAL_CANDS = ['xwallet_balance', 'wallet_balance', 'balance', 'xwallet'];
function useBalCol(profiles) {
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem('tw_bal_col') || ''; } catch (e) { return ''; } });
  const numeric = useMemo(() => {
    const keys = new Set();
    (profiles || []).slice(0, 80).forEach((p) => Object.keys(p).forEach((k) => {
      const v = p[k];
      if (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && isFinite(v) && BAL_CANDS.includes(k))) keys.add(k);
    }));
    return [...keys];
  }, [profiles]);
  const col = numeric.includes(saved) ? saved : (BAL_CANDS.find((c) => numeric.includes(c)) || '');
  const set = (c) => { try { localStorage.setItem('tw_bal_col', c); } catch (e) { /* blocked */ } setSaved(c); };
  return { col, numeric, set };
}
function BalPicker({ bc }) {
  if (!bc.numeric.length) return <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>No numeric balance column found on the profiles table.</div>;
  return (
    <div style={{ ...card, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
      <span>Balance column in <code>profiles</code>:</span>
      <select style={inp} value={bc.col} onChange={(e) => bc.set(e.target.value)}>
        {!bc.col && <option value="">choose…</option>}
        {bc.numeric.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <span style={muted}>Auto-detected. Change it if the wrong column was picked.</span>
    </div>
  );
}

/* 1. Withdrawal approval queue */
export function WithdrawalQueue() {
  const { show } = useToast();
  const { rows, err, loading, reload } = useLoad(async () => { const d = await call('admin_withdrawals_list', { p_status: null }); return Array.isArray(d) ? d : []; });
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');
  const open = (rows || []).filter((w) => OPEN.includes(String(w.status).toLowerCase()));
  const act = async (w, status) => {
    const note = (notes[w.id] || '').trim();
    if (status === 'rejected' && !note) return show?.('Write a reason first. It is shown to the user and the amount is refunded.', 'error');
    setBusy(w.id);
    try { await call('admin_withdrawal_set', { p_id: w.id, p_status: status, p_note: note || null }); show?.(status === 'rejected' ? 'Rejected · refunded' : 'Approved', 'success'); await reload(); }
    catch (e) { show?.(e.message, 'error'); }
    setBusy('');
  };
  return (
    <Shell title="Withdrawal approval queue" sub="Pending and processing withdrawals. Approve in one tap. Reject needs a note and refunds the user." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="In queue" value={open.length} /><Stat label="Amount in queue" value={peso(open.reduce((s, w) => s + num(w.amount), 0))} /></Grid>
      {open.length === 0 && !loading && <div style={{ ...card, opacity: .7 }}>Queue is empty.</div>}
      {open.map((w) => (
        <div key={w.id} style={card}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b style={{ fontSize: 18 }}>{peso(w.amount)}</b>
            <span>{who(w)}</span>
            <span style={muted}>{String(w.method || '').toUpperCase()} {w.account || w.account_number || w.details || ''}</span>
            <span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(w.created_at)} · {w.status}</span>
          </div>
          {w.fee != null && <div style={muted}>Fee {peso(w.fee)}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 1, minWidth: 140 }} placeholder="Note / rejection reason" value={notes[w.id] || ''} onChange={(e) => setNotes({ ...notes, [w.id]: e.target.value })} />
            <button className="neu-btn neu-btn-success" disabled={busy === w.id} onClick={() => act(w, 'approved')} style={{ padding: '8px 16px', fontWeight: 700 }}>Approve</button>
            <button className="neu-btn" disabled={busy === w.id} onClick={() => act(w, 'rejected')} style={{ padding: '8px 16px', fontWeight: 700, color: '#DC2626' }}>Reject</button>
          </div>
        </div>
      ))}
    </Shell>
  );
}

/* 2. Top-up receipt viewer */
export function ReceiptViewer() {
  const { show } = useToast();
  const { rows, err, loading, reload } = useLoad(() => sel('xwallet_topups'));
  const profiles = useLoad(() => sel('profiles'));
  const [all, setAll] = useState(false);
  const [pick, setPick] = useState(null);
  const [z, setZ] = useState(1);
  const names = useMemo(() => { const m = {}; (profiles.rows || []).forEach((p) => { m[p.id] = who(p); }); return m; }, [profiles.rows]);
  const list = (rows || []).filter((r) => all || OPEN.includes(String(r.status || 'processing').toLowerCase()));
  const cur = list.find((r) => r.id === pick) || null;
  const decide = async (status) => {
    if (!window.confirm((status === 'approved' ? 'Approve and credit ' + peso(cur.amount) : 'Reject') + ' this top-up?')) return;
    const { error } = await supabase.rpc('admin_topup_set', { code: getAdminPin(), p_id: cur.id, p_status: status });
    if (error) return show?.(error.message, 'error');
    show?.(status === 'approved' ? 'Approved · wallet credited' : 'Rejected', 'success'); setPick(null); reload();
  };
  const src = cur ? srcOf(cur) : '';
  return (
    <Shell title="Top-up receipt viewer" sub="Compare the receipt image to the amount the user claimed. Amounts are not read from the image automatically, so check by eye." onRefresh={reload} loading={loading} err={err}>
      <label style={{ ...muted, display: 'block', marginBottom: 8 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show decided top-ups too</label>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 240px', maxHeight: '70vh', overflowY: 'auto' }}>
          {list.length === 0 && !loading && <div style={{ ...card, opacity: .7 }}>No top-ups to review.</div>}
          {list.map((r) => (
            <div key={r.id} onClick={() => { setPick(r.id); setZ(1); }} style={{ ...card, cursor: 'pointer', marginBottom: 8, outline: r.id === pick ? '2px solid #3B82F6' : 'none' }}>
              <b>{peso(r.amount)}</b> <span style={muted}>{String(r.status || 'processing')}</span>
              <div style={muted}>{names[r.user_id] || String(r.user_id || '').slice(0, 8)} · {dateTime(r.created_at)}{srcOf(r) ? '' : ' · no receipt'}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: '2 1 320px', minWidth: 0 }}>
          {!cur ? <div style={{ ...card, opacity: .7 }}>Select a top-up.</div> : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className="neu-btn" onClick={() => setZ((v) => Math.max(1, v - 0.5))} style={{ padding: '4px 12px' }}>−</button>
                  <button className="neu-btn" onClick={() => setZ((v) => Math.min(5, v + 0.5))} style={{ padding: '4px 12px' }}>+</button>
                  <button className="neu-btn" onClick={() => setZ(1)} style={{ padding: '4px 12px' }}>Reset</button>
                  <span style={{ ...muted, alignSelf: 'center' }}>{Math.round(z * 100)}%</span>
                </div>
                <div style={{ overflow: 'auto', maxHeight: '60vh', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)' }}>
                  {src ? <img src={src} alt="receipt" style={{ width: z * 100 + '%', display: 'block' }} /> : <div style={{ padding: 20, ...muted }}>No receipt image attached.</div>}
                </div>
              </div>
              <div style={{ ...card, flex: '1 1 200px' }}>
                <div style={muted}>CLAIMED AMOUNT</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{peso(cur.amount)}</div>
                <div style={{ marginTop: 10, fontSize: 13 }}>User: <b>{names[cur.user_id] || String(cur.user_id || '').slice(0, 8)}</b></div>
                <div style={{ fontSize: 13 }}>Reference: <b>{refOf(cur) || '—'}</b></div>
                <div style={{ fontSize: 13 }}>Requested: {dateTime(cur.created_at)}</div>
                <div style={{ fontSize: 13 }}>Status: {String(cur.status || 'processing')}</div>
                {OPEN.includes(String(cur.status || 'processing').toLowerCase()) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="neu-btn neu-btn-success" onClick={() => decide('approved')} style={{ padding: '8px 14px', fontWeight: 700 }}>Approve</button>
                    <button className="neu-btn" onClick={() => decide('rejected')} style={{ padding: '8px 14px', fontWeight: 700, color: '#DC2626' }}>Reject</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* 3. Duplicate receipt detector */
export function DuplicateReceipts() {
  const { rows, err, loading, reload } = useLoad(() => sel('xwallet_topups'));
  const profiles = useLoad(() => sel('profiles'));
  const names = useMemo(() => { const m = {}; (profiles.rows || []).forEach((p) => { m[p.id] = who(p); }); return m; }, [profiles.rows]);
  const groups = useMemo(() => {
    const img = {}, ref = {};
    (rows || []).forEach((r) => {
      const s = srcOf(r); if (s) (img[s] = img[s] || []).push(r);
      const f = refOf(r); if (f) (ref[f] = ref[f] || []).push(r);
    });
    const out = [];
    Object.entries(img).forEach(([k, v]) => { if (v.length > 1) out.push({ key: 'i' + k.slice(0, 40) + v.length, kind: 'Same image', label: k.startsWith('data:') ? 'identical embedded image' : k.slice(0, 60), rows: v }); });
    Object.entries(ref).forEach(([k, v]) => { if (v.length > 1) out.push({ key: 'r' + k, kind: 'Same reference', label: k, rows: v }); });
    return out;
  }, [rows]);
  return (
    <Shell title="Duplicate receipt detector" sub="Flags top-ups that reuse the exact same image or the same reference number. Only identical files are caught, not re-photographed or edited ones." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="Top-ups scanned" value={(rows || []).length} sub={(rows || []).length >= 5000 ? 'Capped at 5000 rows. Older ones may be missing.' : ''} /><Stat label="Duplicate groups" value={groups.length} /></Grid>
      {groups.length === 0 && !loading && <div style={{ ...card, opacity: .7 }}>No duplicates found.</div>}
      {groups.map((g) => (
        <div key={g.key} style={card}>
          <b style={{ color: '#DC2626' }}>{g.kind}</b> <span style={muted}>{g.label} · used {g.rows.length}×</span>
          <Tbl cols={[['User', (r) => names[r.user_id] || String(r.user_id || '').slice(0, 8)], ['Amount', (r) => peso(r.amount)], ['Status', (r) => String(r.status || '')], ['Requested', (r) => dateTime(r.created_at)]]} rows={g.rows} />
        </div>
      ))}
    </Shell>
  );
}

/* 4. Freeze / unfreeze */
const FREEZE_CANDS = ['wallet_frozen', 'xwallet_frozen', 'is_frozen', 'frozen'];
export function WalletFreeze() {
  const { show } = useToast();
  const { rows, err, loading, reload } = useLoad(() => sel('profiles'));
  const bc = useBalCol(rows);
  const [q, setQ] = useState('');
  const fcol = useMemo(() => { const keys = new Set(); (rows || []).forEach((p) => Object.keys(p).forEach((k) => keys.add(k))); return FREEZE_CANDS.find((c) => keys.has(c)) || ''; }, [rows]);
  const list = (rows || []).filter((p) => !q.trim() || (who(p) + ' ' + (p.full_name || '') + ' ' + p.id).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 100);
  const toggle = async (p) => {
    const next = !p[fcol];
    if (!window.confirm((next ? 'Freeze' : 'Unfreeze') + ' the wallet of ' + who(p) + '?')) return;
    try { await rpcDb('update', 'profiles', { payload: { [fcol]: next }, match_col: 'id', match_val: String(p.id) }); show?.(next ? 'Frozen' : 'Unfrozen', 'success'); reload(); }
    catch (e) { show?.(e.message, 'error'); }
  };
  return (
    <Shell title="Wallet freeze / unfreeze" sub="Flip the freeze flag per user." onRefresh={reload} loading={loading} err={err}>
      {!fcol && !loading && (
        <div style={{ ...card, fontSize: 13 }}>
          <b style={{ color: '#DC2626' }}>No freeze column found on profiles.</b> Run this once in the SQL editor, then refresh:
          <pre style={{ whiteSpace: 'pre-wrap', userSelect: 'all' }}>alter table profiles add column if not exists wallet_frozen boolean not null default false;</pre>
          <b>Important:</b> a flag only stores the state. The user-side wallet functions (withdraw, transfer, pay) must check it to actually block money movement. That is not something this page can enforce.
        </div>
      )}
      <BalPicker bc={bc} />
      <input style={{ ...inp, width: '100%', marginBottom: 10 }} placeholder="Search username, email or id" value={q} onChange={(e) => setQ(e.target.value)} />
      <Tbl cols={[['User', (p) => who(p)], ['Balance', (p) => (bc.col ? peso(p[bc.col]) : '—')], ['State', (p) => (fcol ? (p[fcol] ? <b style={{ color: '#DC2626' }}>FROZEN</b> : 'active') : '—')], ['', (p) => fcol && <button className="neu-btn" onClick={() => toggle(p)} style={{ padding: '4px 12px', fontSize: 12 }}>{p[fcol] ? 'Unfreeze' : 'Freeze'}</button>]]} rows={list} />
    </Shell>
  );
}

/* 5. Liability */
export function Liability() {
  const { rows, err, loading, reload } = useLoad(() => sel('profiles'));
  const bc = useBalCol(rows);
  const vals = (rows || []).map((p) => num(p[bc.col]));
  const total = vals.reduce((s, v) => s + v, 0);
  return (
    <Shell title="Xwallet liability" sub="All user balances combined: what the platform owes its users." onRefresh={reload} loading={loading} err={err}>
      <BalPicker bc={bc} />
      {bc.col && <Grid>
        <Stat label="Total liability" value={peso(total)} sub={'column: ' + bc.col} />
        <Stat label="Users with balance" value={vals.filter((v) => v > 0).length} sub={'of ' + vals.length + ' profiles'} />
        <Stat label="Average balance" value={peso(vals.filter((v) => v > 0).length ? vals.filter((v) => v > 0).reduce((s, v) => s + v, 0) / vals.filter((v) => v > 0).length : 0)} />
        <Stat label="Negative balances" value={vals.filter((v) => v < 0).length} sub={vals.some((v) => v < 0) ? 'Investigate these' : ''} />
      </Grid>}
      {(rows || []).length >= 5000 && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Profiles capped at 5000 rows, so this total may be understated.</div>}
      <div style={muted}>Cross-check against Operations › Wallet Reconcile.</div>
    </Shell>
  );
}

/* 6. Fee income */
export function FeeIncome() {
  const sum = useLoad(() => call('admin_xwallet_summary').then((d) => [d || {}]));
  const wd = useLoad(async () => { const d = await call('admin_withdrawals_list', { p_status: null }); return Array.isArray(d) ? d : []; });
  const s = (sum.rows || [{}])[0] || {};
  const days = useMemo(() => {
    const m = {};
    (wd.rows || []).filter((w) => String(w.status).toLowerCase() !== 'rejected' && w.fee != null).forEach((w) => { const d = String(w.created_at).slice(0, 10); m[d] = (m[d] || 0) + num(w.fee); });
    return Object.keys(m).sort().slice(-30).map((d) => ({ day: d.slice(5), fee: m[d] }));
  }, [wd.rows]);
  const reload = () => { sum.reload(); wd.reload(); };
  return (
    <Shell title="Fee income report" sub="Withdrawal fees collected (rejected withdrawals are refunded, so excluded from the chart)." onRefresh={reload} loading={sum.loading || wd.loading} err={sum.err || wd.err}>
      <Grid><Stat label="Fees collected (all time)" value={peso(s.fees_collected)} sub="from the wallet summary" /><Stat label="Fees in chart window" value={peso(days.reduce((t, d) => t + d.fee, 0))} sub="last 30 days with fees" /></Grid>
      <div style={{ ...card, height: 240 }}>
        {days.length === 0 ? <div style={muted}>No fee data on withdrawal rows.</div> : (
          <ResponsiveContainer><BarChart data={days}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip formatter={(v) => peso(v)} /><Bar dataKey="fee" fill="#10B981" /></BarChart></ResponsiveContainer>
        )}
      </div>
    </Shell>
  );
}

/* 7. Pending money */
export function PendingMoney() {
  const tu = useLoad(() => sel('xwallet_topups'));
  const wd = useLoad(async () => { const d = await call('admin_withdrawals_list', { p_status: null }); return Array.isArray(d) ? d : []; });
  const topPending = (tu.rows || []).filter((r) => OPEN.includes(String(r.status || 'processing').toLowerCase()));
  const wdOpen = (wd.rows || []).filter((w) => ['pending', 'processing', 'approved'].includes(String(w.status).toLowerCase()));
  const sumOf = (a) => a.reduce((s, r) => s + num(r.amount), 0);
  const reload = () => { tu.reload(); wd.reload(); };
  return (
    <Shell title="Pending money tracker" sub="Money requested but not yet settled." onRefresh={reload} loading={tu.loading || wd.loading} err={tu.err || wd.err}>
      <Grid>
        <Stat label="Top-ups to approve" value={peso(sumOf(topPending))} sub={topPending.length + ' requests'} />
        <Stat label="Withdrawals / payouts unsettled" value={peso(sumOf(wdOpen))} sub={wdOpen.length + ' requests (pending, processing, approved)'} />
        <Stat label="Net pending" value={peso(sumOf(topPending) - sumOf(wdOpen))} sub="top-ups minus payouts" />
      </Grid>
      <h3 style={{ fontSize: 14 }}>Unsettled withdrawals / payouts</h3>
      <Tbl cols={[['Amount', (w) => peso(w.amount)], ['User', (w) => who(w)], ['Status', (w) => w.status], ['Since', (w) => dateTime(w.created_at)]]} rows={wdOpen} empty="None." />
      <h3 style={{ fontSize: 14 }}>Top-ups awaiting approval</h3>
      <Tbl cols={[['Amount', (r) => peso(r.amount)], ['User', (r) => String(r.user_id || '').slice(0, 8)], ['Status', (r) => String(r.status || 'processing')], ['Since', (r) => dateTime(r.created_at)]]} rows={topPending} empty="None." />
      <div style={muted}>Creator payouts are not included here (they live under Operations › Creator Payouts).</div>
    </Shell>
  );
}

/* 8. Top 50 balances */
export function TopBalances() {
  const { rows, err, loading, reload } = useLoad(() => sel('profiles'));
  const bc = useBalCol(rows);
  const top = bc.col ? [...(rows || [])].sort((a, b) => num(b[bc.col]) - num(a[bc.col])).slice(0, 50) : [];
  return (
    <Shell title="Top 50 balances" sub="Largest Xwallet balances." onRefresh={reload} loading={loading} err={err}>
      <BalPicker bc={bc} />
      {bc.col && <Tbl cols={[['#', (p, i) => i + 1], ['User', (p) => who(p)], ['Balance', (p) => <b>{peso(p[bc.col])}</b>], ['Joined', (p) => dateTime(p.created_at)]]} rows={top} />}
    </Shell>
  );
}

/* 9. Dormant balances */
export function DormantBalances() {
  const pr = useLoad(() => sel('profiles'));
  const tx = useLoad(() => sel('xwallet_txns'));
  const bc = useBalCol(pr.rows);
  const [days, setDays] = useState(90);
  const rows = useMemo(() => {
    if (!bc.col) return [];
    const last = {};
    (tx.rows || []).forEach((t) => { const k = t.user_id; const d = new Date(t.created_at).getTime(); if (!last[k] || d > last[k]) last[k] = d; });
    const cut = Date.now() - days * 86400000;
    return (pr.rows || []).filter((p) => num(p[bc.col]) > 0).map((p) => { const l = last[p.id] || new Date(p.created_at).getTime(); return { ...p, _last: l, _bal: num(p[bc.col]), _idle: Math.floor((Date.now() - l) / 86400000), _noTx: !last[p.id] }; }).filter((p) => p._last < cut).sort((a, b) => b._bal - a._bal);
  }, [pr.rows, tx.rows, bc.col, days]);
  const capped = (tx.rows || []).length >= 5000;
  return (
    <Shell title="Dormant balance report" sub="Money sitting idle: users with a balance and no wallet activity for the chosen number of days." onRefresh={() => { pr.reload(); tx.reload(); }} loading={pr.loading || tx.loading} err={pr.err || tx.err}>
      <BalPicker bc={bc} />
      <div style={{ ...card, fontSize: 13 }}>Idle for at least <input type="number" min="1" style={{ ...inp, width: 70 }} value={days} onChange={(e) => setDays(Math.max(1, num(e.target.value)))} /> days</div>
      {capped && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Transactions are capped at 5000 rows. Last activity may be wrong for some users, so verify before acting.</div>}
      <Grid><Stat label="Dormant users" value={rows.length} /><Stat label="Idle money" value={peso(rows.reduce((s, p) => s + p._bal, 0))} /></Grid>
      <Tbl cols={[['User', (p) => who(p)], ['Balance', (p) => <b>{peso(p._bal)}</b>], ['Idle days', (p) => p._idle], ['Last activity', (p) => (p._noTx ? 'no txns (joined ' + dateTime(p.created_at) + ')' : dateTime(p._last))]]} rows={rows} empty="No dormant balances." />
    </Shell>
  );
}

/* 10. Loyalty issued vs spent */
const LOY_TABLES = ['loyalty_txns', 'loyalty_points', 'loyalty_ledger', 'points_ledger', 'xwallet_points'];
export function LoyaltyReport() {
  const [tbl, setTbl] = useState(() => { try { return localStorage.getItem('tw_loy_tbl') || ''; } catch (e) { return ''; } });
  const [draft, setDraft] = useState(tbl);
  const { rows, err, loading, reload } = useLoad(async () => {
    const tries = tbl ? [tbl] : LOY_TABLES;
    for (const t of tries) { try { const r = await sel(t); return { table: t, data: r }; } catch (e) { /* try next */ } }
    return { table: '', data: [] };
  }, [tbl]);
  const data = rows?.data || [];
  const vcol = ['points', 'delta', 'amount', 'value'].find((c) => data.some((r) => r[c] != null)) || '';
  let issued = 0, spent = 0;
  data.forEach((r) => {
    const v = num(r[vcol]); const ty = String(r.type || r.kind || r.reason || '').toLowerCase();
    if (v < 0 || /redeem|spen|use|deduct/.test(ty)) spent += Math.abs(v); else issued += v;
  });
  const save = () => { try { localStorage.setItem('tw_loy_tbl', draft.trim()); } catch (e) { /* blocked */ } setTbl(draft.trim()); };
  return (
    <Shell title="Loyalty points: issued vs spent" sub="Positive entries count as issued. Negative entries, or types like redeem/spend, count as spent." onRefresh={reload} loading={loading} err={err}>
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <span>Ledger table:</span>
        <input style={inp} placeholder="auto-detect" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="neu-btn" onClick={save} style={{ padding: '6px 12px', fontSize: 12 }}>Use table</button>
        <span style={muted}>{rows?.table ? 'Reading: ' + rows.table + ' · value column: ' + (vcol || 'none') : 'No ledger table found. Type its exact name.'}</span>
      </div>
      {data.length > 0 && <>
        <Grid><Stat label="Issued" value={issued.toLocaleString()} /><Stat label="Spent" value={spent.toLocaleString()} /><Stat label="Outstanding" value={(issued - spent).toLocaleString()} sub={issued ? Math.round((spent / issued) * 100) + '% redeemed' : ''} /></Grid>
        {data.length >= 5000 && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Capped at 5000 rows. Totals may be incomplete.</div>}
        <div style={muted}>Columns seen: {Object.keys(data[0]).join(', ')}</div>
      </>}
    </Shell>
  );
}

export { card, muted, inp, sel, call, rpcDb, num, who, OPEN, useLoad, Shell, Stat, Grid, Tbl };
