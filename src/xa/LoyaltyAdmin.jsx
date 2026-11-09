import React, { useCallback, useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { adm } from './db.js';
import StatCard from './ui/StatCard.jsx';
import PageHeader from './ui/PageHeader.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { askConfirm } from './dialogs.jsx';
import { SkRows, ErrorState, EmptyState } from './Kit.jsx';

const tier = (p) => (p >= 1000 ? 'Gold' : p >= 700 ? 'Silver' : p >= 300 ? 'Bronze' : 'No tier');
const when = (d) => new Date(d).toLocaleString();

export default function LoyaltyAdmin() {
  const { show } = useToast();
  const [sum, setSum] = useState(null);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [who, setWho] = useState(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (uid) => {
    try {
      const [s, l] = await Promise.all([adm('adm_loyalty_summary'), adm('adm_loyalty_ledger', { p_user: uid || null, p_limit: 100 })]);
      setSum(s); setRows(Array.isArray(l) ? l : []); setErr('');
    } catch (e) { setErr(e.message); setRows([]); }
  }, []);
  useEffect(() => { load(null); }, [load]);

  const search = async (e) => {
    e.preventDefault();
    try { setFound((await adm('adm_loyalty_find', { p_q: q })) || []); } catch (x) { show?.(x.message, 'error'); }
  };
  const pick = (m) => { setWho(m); setFound([]); setDelta(''); setReason(''); setRows(null); load(m.id); };
  const apply = async (e) => {
    e.preventDefault();
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return show?.('Enter a whole number other than 0', 'error');
    if (reason.trim().length < 5) return show?.('Reason needs at least 5 characters', 'error');
    if (!(await askConfirm({ title: (n > 0 ? 'Add ' : 'Remove ') + Math.abs(n) + ' points?', message: (n > 0 ? 'To ' : 'From ') + (who.username || who.email) + '. Reason: ' + reason.trim() + '. It is recorded in the ledger and audit log.', confirmText: 'Apply', danger: n < 0 }))) return;
    setBusy(true);
    try {
      const r = await adm('adm_loyalty_adjust', { p_user: who.id, p_delta: n, p_reason: reason });
      show?.('Done. New balance ' + r.balance, 'success');
      setWho({ ...who, points: r.balance }); setDelta(''); setReason(''); load(who.id);
    } catch (x) { show?.(x.message, 'error'); }
    setBusy(false);
  };
  const ld = !sum && !err;

  return (
    <div style={{ padding: 4 }}>
      <PageHeader title="Loyalty Points" subtitle="Balances, earning history and adjustments" actions={<Btn onClick={() => { setWho(null); setRows(null); load(null); }}>Refresh</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 14 }}>
        <StatCard icon={Coins} label="Points in circulation" value={sum ? Number(sum.circulation).toLocaleString() : null} loading={ld} />
        <StatCard icon={Users} label="Users with points" value={sum ? sum.holders : null} loading={ld} />
        <StatCard icon={TrendingUp} label="Earned, 30 days" value={sum ? Number(sum.earned_30d).toLocaleString() : null} tone="ok" loading={ld} />
        <StatCard icon={TrendingDown} label="Spent, 30 days" value={sum ? Number(sum.spent_30d).toLocaleString() : null} loading={ld} />
      </div>

      <div className="neu-card" style={{ padding: 12, marginBottom: 14 }}>
        <form onSubmit={search} style={{ display: 'flex', gap: 8 }}>
          <input className="xa-input" style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a user by email, username or ID" aria-label="Find a user" />
          <Btn variant="primary" type="submit" disabled={q.trim().length < 2}>Find</Btn>
        </form>
        {found.map((m) => (
          <button key={m.id} type="button" onClick={() => pick(m)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '10px 4px', textAlign: 'left', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <span><b>{m.username || '—'}</b> <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{m.email}</span></span><span>{m.points} pts</span>
          </button>
        ))}
        {who && (
          <form onSubmit={apply} style={{ marginTop: 12 }}>
            <div><b>{who.username || who.email}</b> · {Number(who.points).toLocaleString()} points · {tier(Number(who.points))}</div>
            <input className="xa-input" style={{ marginTop: 8 }} inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Points to add, or negative to remove" aria-label="Points change" />
            <input className="xa-input" style={{ marginTop: 8 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 5 characters)" aria-label="Reason" />
            <div style={{ marginTop: 10 }}><Btn variant="primary" type="submit" disabled={busy || !delta || reason.trim().length < 5}>{busy ? 'Saving…' : 'Apply adjustment'}</Btn></div>
          </form>
        )}
      </div>

      <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '10px 14px', fontWeight: 800, fontSize: 13 }}>{who ? 'Ledger for ' + (who.username || who.email) : 'Latest ledger entries'}</div>
        {err && <ErrorState message={err} onRetry={() => load(who && who.id)} />}
        {!err && rows === null && <div style={{ padding: 8 }}><SkRows rows={5} cols={4} /></div>}
        {rows && !rows.length && <EmptyState title="No ledger entries" />}
        {rows && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--surface-2)', textAlign: 'left', color: 'var(--text-dim)' }}>{['When', 'User', 'Points', 'Reason'].map((h) => <th key={h} style={{ padding: '8px 12px' }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{when(r.created_at)}</td>
                <td style={{ padding: '8px 12px' }}>{r.username || String(r.user_id).slice(0, 8)}</td>
                <td style={{ padding: '8px 12px', fontWeight: 800, color: r.delta > 0 ? 'var(--success, #059669)' : 'var(--danger)' }}>{r.delta > 0 ? '+' : ''}{r.delta}</td>
                <td style={{ padding: '8px 12px' }}>{r.reason}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>Earning rule: 30% of the order, limited by a cap table in the database trigger. Tiers: Bronze 300, Silver 700, Gold 1,000.</div>
    </div>
  );
}
