import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './ylApi.js';
import { S, ACCENT } from './ui.js';
import './anim.css';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const TABS = [['queue', 'Redemption queue'], ['points', 'Points'], ['referrals', 'Referral review'], ['audit', 'Audit log'], ['health', 'System health']];
const NEXT = { pending: ['processing', 'fulfilled', 'rejected', 'cancelled'], processing: ['fulfilled', 'rejected', 'cancelled'] };
const LABEL = { pending: 'Pending', processing: 'Processing', fulfilled: 'Completed', rejected: 'Rejected', cancelled: 'Canceled' };
const pill = (st) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
  background: st === 'fulfilled' ? '#e7f6ec' : st === 'rejected' || st === 'cancelled' ? '#fdecec' : '#fff6e0', color: st === 'fulfilled' ? '#1b6b3a' : st === 'rejected' || st === 'cancelled' ? '#b42323' : '#8a6100' });
const OKB = { background: '#e7f6ec', color: '#1b6b3a', borderRadius: 12, padding: '10px 14px', fontSize: 13, margin: '12px 0' };

function useLoad(fn, deps) {
  const [st, setSt] = useState({ loading: true, data: null, error: '' });
  const run = useCallback(async () => {
    setSt((s) => ({ ...s, loading: true }));
    try { setSt({ loading: false, data: await fn(), error: '' }); } catch (e) { setSt({ loading: false, data: null, error: e.message || String(e) }); }
  }, deps); // eslint-disable-line
  useEffect(() => { run(); }, [run]);
  return { ...st, reload: run };
}
const Box = ({ s }) => (s.loading ? <p style={S.sub}>Loading...</p> : s.error ? <div style={S.err}>{s.error}</div> : null);
const Table = ({ head, children }) => (
  <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead><tr>{head.map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);

function Queue() {
  const [flt, setFlt] = useState('open');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  const s = useLoad(async () => {
    const [r, w, p] = await Promise.all([api.select('redemptions', 200, 0, 'created_at'), api.select('rewards', 500, 0, null), api.select('profiles', 500, 0, null)]);
    return { rows: r.rows || [], rw: Object.fromEntries((w.rows || []).map((x) => [x.id, x.name])), us: Object.fromEntries((p.rows || []).map((x) => [x.id, x.username])) };
  }, []);
  const rows = useMemo(() => (s.data ? s.data.rows.filter((r) => (flt === 'open' ? NEXT[r.status] : flt === 'all' ? true : r.status === flt)) : []), [s.data, flt]);
  const act = async (r, to) => {
    const refund = to === 'rejected' || to === 'cancelled';
    const note = window.prompt((refund ? 'Reason (the member sees this). ' + r.points_spent + ' points will be refunded and stock restored.\n' : 'Optional note for the history.\n') + 'Set to ' + LABEL[to] + ':', '');
    if (note === null) return;
    if (refund && !note.trim()) { setErr('A reason is required to reject or cancel.'); return; }
    setBusy(r.id); setErr(''); setMsg('');
    try { await api.setRedemption(r.id, to, note); setMsg('Updated.' + (refund ? ' Points refunded and stock restored.' : '')); await s.reload(); }
    catch (e) { setErr(e.message || String(e)); }
    setBusy('');
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['open', 'Needs action'], ['all', 'All'], ['fulfilled', 'Completed'], ['rejected', 'Rejected'], ['cancelled', 'Canceled']].map(([k, l]) => <button key={k} type="button" style={{ ...S.btn, color: flt === k ? ACCENT : undefined }} onClick={() => setFlt(k)}>{l}</button>)}
      </div>
      {msg && <div style={OKB}>{msg}</div>}{err && <div style={S.err}>{err}</div>}<Box s={s} />
      {s.data && !rows.length && <p style={S.sub}>Nothing here.</p>}
      {rows.length > 0 && <Table head={['Reference', 'Member', 'Reward', 'Points', 'Placed', 'Status', 'Action']}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td style={S.td}>{r.ref ? String(r.ref).slice(-10) : String(r.id).slice(0, 8)}</td>
            <td style={S.td}>{s.data.us[r.user_id] || String(r.user_id).slice(0, 8)}</td>
            <td style={S.td}>{s.data.rw[r.reward_id] || String(r.reward_id).slice(0, 8)}</td>
            <td style={S.td}>{r.points_spent}</td><td style={S.td}>{fmt(r.created_at)}</td>
            <td style={S.td}><span style={pill(r.status)}>{LABEL[r.status] || r.status}</span></td>
            <td style={{ ...S.td, overflow: 'visible' }}>{(NEXT[r.status] || []).length ? (
              <select style={{ ...S.input, width: 150, padding: '6px 8px' }} value="" disabled={busy === r.id} onChange={(e) => e.target.value && act(r, e.target.value)}>
                <option value="">Change status...</option>{NEXT[r.status].map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}
              </select>) : <span style={S.dim}>Final</span>}</td>
          </tr>))}
      </Table>}
    </div>
  );
}

function Points() {
  const [q, setQ] = useState(''); const [found, setFound] = useState([]); const [who, setWho] = useState(null);
  const [delta, setDelta] = useState(''); const [reason, setReason] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const search = async (e) => { e.preventDefault(); setErr(''); setMsg(''); setWho(null); try { setFound((await api.lookup(q)) || []); } catch (x) { setErr(x.message || String(x)); } };
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return setErr('Enter a whole number other than 0 (negative removes points).');
    if (!window.confirm((n > 0 ? 'Add ' : 'Remove ') + Math.abs(n) + ' points ' + (n > 0 ? 'to ' : 'from ') + who.username + '?\nReason: ' + reason)) return;
    setBusy(true);
    try { const r = await api.adjust(who.id, n, reason); setMsg('Done. New balance: ' + r.balance + ' (ref ' + r.ref + ')'); setWho({ ...who, points: r.balance }); setDelta(''); setReason(''); }
    catch (x) { setErr(x.message || String(x)); }
    setBusy(false);
  };
  return (
    <div style={{ maxWidth: 560 }}>
      <form onSubmit={search} style={{ display: 'flex', gap: 8 }}>
        <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a member by username, email, phone or ID" />
        <button type="submit" style={S.btnAccent} disabled={q.trim().length < 2}>Find</button>
      </form>
      {found.map((m) => <div key={m.id} style={{ ...S.card, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setWho(m); setFound([]); setMsg(''); setErr(''); }}>
        <span><b>{m.username}</b> <span style={S.dim}>{m.first_name} {m.last_name}</span></span><span>{m.points} pts</span></div>)}
      {who && (
        <form onSubmit={submit} style={{ ...S.card, marginTop: 14 }}>
          <b>{who.username}</b> <span style={S.dim}>current balance {who.points} points</span>
          <label style={S.label}>Points to add (negative to remove)</label><input style={S.input} value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="e.g. 100 or -50" />
          <label style={S.label}>Reason (saved in the ledger and audit log)</label><input style={S.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 5 characters" />
          <button type="submit" style={{ ...S.btnAccent, marginTop: 16 }} disabled={busy || reason.trim().length < 5 || !delta}>{busy ? 'Saving...' : 'Apply adjustment'}</button>
        </form>)}
      {msg && <div style={OKB}>{msg}</div>}{err && <div style={S.err}>{err}</div>}
    </div>
  );
}

function Referrals() {
  const s = useLoad(() => api.referrals(), []);
  const d = s.data;
  return (
    <div><Box s={s} />
      {d && <>
        <div style={S.grid}>{[['Referrals', d.totals.referrals], ['Rewards paid', d.totals.rewards_paid], ['Points paid', d.totals.points_paid]].map(([k, v]) => <div key={k} style={S.card}><div style={S.sub}>{k}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{v}</div></div>)}</div>
        <p style={{ ...S.sub, margin: '14px 0' }}>Flags are review indicators only, not proof of fraud: 5+ referrals in 24 hours, or 3+ accounts from one IP address.</p>
        {!d.referrers.length && <p style={S.sub}>No referrals yet.</p>}
        {d.referrers.length > 0 && <Table head={['Referrer', 'Referrals', 'Last 24h', 'Points earned', 'Indicator']}>
          {d.referrers.map((r) => <tr key={r.referrer_id}><td style={S.td}>{r.username || String(r.referrer_id).slice(0, 8)}</td><td style={S.td}>{r.referrals}</td><td style={S.td}>{r.last_24h}</td><td style={S.td}>{r.points_earned}</td>
            <td style={S.td}>{r.flag_burst ? <span style={pill('pending')}>Review: burst</span> : <span style={S.dim}>None</span>}</td></tr>)}</Table>}
        {d.shared_ips.length > 0 && <><h3 style={{ margin: '20px 0 8px' }}>Shared IP addresses</h3><Table head={['IP address', 'Accounts']}>{d.shared_ips.map((x) => <tr key={x.ip_address}><td style={S.td}>{x.ip_address}</td><td style={S.td}>{x.accounts}</td></tr>)}</Table></>}
      </>}
    </div>
  );
}

function Audit() {
  const [page, setPage] = useState(0);
  const s = useLoad(() => api.audit(50, page * 50), [page]);
  const d = s.data;
  return (
    <div><Box s={s} />
      {d && !d.rows.length && <p style={S.sub}>No admin changes recorded yet. Changes made from now on appear here.</p>}
      {d && d.rows.length > 0 && <Table head={['When', 'Action', 'Table', 'Row', 'Details']}>
        {d.rows.map((r) => <tr key={r.id}><td style={S.td}>{fmt(r.at)}</td><td style={S.td}>{r.action}</td><td style={S.td}>{r.tbl}</td><td style={S.td}>{String(r.row_key || '').slice(0, 10)}</td>
          <td style={{ ...S.td, whiteSpace: 'normal', maxWidth: 420, fontFamily: 'monospace', fontSize: 11 }}>{JSON.stringify(r.detail).slice(0, 220)}</td></tr>)}</Table>}
      {d && <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button type="button" style={S.btn} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
        <span style={S.sub}>{d.count} entries</span>
        <button type="button" style={S.btn} disabled={(page + 1) * 50 >= d.count} onClick={() => setPage(page + 1)}>Next</button></div>}
    </div>
  );
}

function Health() {
  const s = useLoad(async () => { const t0 = performance.now(); const h = await api.health(); return { ...h, ms: Math.round(performance.now() - t0) }; }, []);
  const d = s.data;
  return (
    <div><Box s={s} />
      {d && <>
        <div style={S.grid}>
          {[['Connection', 'OK · ' + d.ms + ' ms'], ['Tables', d.tables], ['Exchanges waiting', d.pending.exchanges], ['VIP applications waiting', d.pending.vip_applications]].map(([k, v]) => <div key={k} style={S.card}><div style={S.sub}>{k}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div></div>)}
        </div>
        <h3 style={{ margin: '20px 0 8px' }}>Data integrity checks</h3>
        <Table head={['Check', 'Result']}>{d.checks.map((c) => <tr key={c.name}><td style={S.td}>{c.name}</td>
          <td style={S.td}><span style={pill(c.bad ? 'rejected' : 'fulfilled')}>{c.bad ? c.bad + ' to review' : 'OK'}</span></td></tr>)}</Table>
        <p style={{ ...S.sub, marginTop: 10 }}>Checked {fmt(d.checked_at)}. Results come straight from the database.</p>
      </>}
    </div>
  );
}

export default function YlOps() {
  const [tab, setTab] = useState('queue');
  return (
    <div className="yl-page">
      <h1 style={S.h1}>Operations</h1>
      <p style={S.sub}>Handle exchanges, adjust points, review referrals and check system health. Edit missions, rewards, codes and check-in settings from their own pages in the sidebar.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 18px' }}>
        {TABS.map(([k, l]) => <button key={k} type="button" style={{ ...S.btn, color: tab === k ? ACCENT : undefined }} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div style={S.card}>
        {tab === 'queue' && <Queue />}{tab === 'points' && <Points />}{tab === 'referrals' && <Referrals />}{tab === 'audit' && <Audit />}{tab === 'health' && <Health />}
      </div>
    </div>
  );
}
