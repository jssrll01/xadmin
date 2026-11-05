import React, { useCallback, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../supabase.js';
import { peso, dateTime } from '../lib/format.js';
import ImportTasks from './ImportTasks.jsx';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const EMPTY = { id: null, title: '', description: '', requirements: '', notes: '', deadline: '', reward: '', active: true };
const toLocal = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const COLORS = { pending: '#F59E0B', approved: '#10B981', rejected: '#DC2626', suspended: '#6B7280', successful: '#10B981', earned: '#10B981', reversed: '#DC2626' };
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', color: '#8a93a3', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid rgba(0,0,0,.06)', verticalAlign: 'top' };
const Pill = ({ s }) => <span style={{ color: '#fff', background: COLORS[s] || '#64748b', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{s}</span>;
const Stat = ({ label, value, sub }) => (
  <div style={card}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#8a93a3', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#8a93a3', marginTop: 2 }}>{sub}</div>}
  </div>
);

const TABS = [
  ['overview', 'Analytics', 'admin_creator_overview'],
  ['submissions', 'Submissions', 'admin_creator_submissions'],
  ['creators', 'Creators', 'admin_creator_list'],
  ['referrals', 'Referrals', 'admin_creator_referrals'],
  ['commissions', 'Commissions', 'admin_creator_commissions'],
  ['withdrawals', 'Withdrawals', 'admin_creator_withdrawals'],
  ['tasks', 'Tasks', 'admin_creator_tasks'],
];

const COLS = {
  creators: [['Creator', r => <><b>{r.username}</b><br />{r.email}</>], ['Code', r => r.referral_code || '—'], ['Status', r => <Pill s={r.status} />],
    ['Referrals', r => `${r.successful} / ${r.referrals}`], ['Commissions', r => peso(r.commissions)], ['Tasks', r => peso(r.task_earnings)],
    ['Withdrawn', r => peso(r.withdrawn)], ['Balance', r => <b>{peso(r.balance)}</b>]],
  referrals: [['Applied', r => dateTime(r.applied_at)], ['Creator', r => r.creator], ['Referred user', r => <>{r.referred}<br />{r.email}</>],
    ['Code', r => r.code], ['Status', r => <Pill s={r.status} />], ['Orders', r => r.orders], ['Purchases', r => peso(r.purchases)], ['Commission', r => peso(r.commission)]],
  commissions: [['Date', r => dateTime(r.created_at)], ['Creator', r => r.creator], ['Order', r => r.order_code || '—'], ['Purchase', r => peso(r.purchase)],
    ['Rate / cap', r => `${(Number(r.rate) * 100).toFixed(0)}% / ${peso(r.cap)}`], ['Commission', r => <b>{peso(r.commission)}</b>], ['Status', r => <Pill s={r.status} />]],
  withdrawals: [['Date', r => dateTime(r.created_at)], ['Creator', r => r.creator], ['Amount to Xwallet', r => <b>{peso(r.amount)}</b>]],
};

export default function CreatorMgmt() {
  const [tab, setTab] = useState('overview');
  const [rows, setRows] = useState([]);
  const [ov, setOv] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    const fn = TABS.find(t => t[0] === tab)[2];
    setLoading(true);
    try {
      const args = tab === 'submissions' ? { p_status: filter || null } : {};
      const d = await call(fn, args);
      if (tab === 'overview') setOv(d); else setRows(Array.isArray(d) ? d : []);
      setErr('');
    } catch (e) { setRows([]); setErr(e.message); }
    setLoading(false);
  }, [tab, filter]);
  useEffect(() => { load(); }, [load]);

  const review = async (r, status) => {
    let reward = null;
    if (status === 'approved') {
      const v = window.prompt('Reward to award (₱):', r.task_reward);
      if (v === null) return;
      reward = Number(v);
      if (!(reward >= 0)) return setErr('Invalid reward');
    }
    const fb = window.prompt(status === 'rejected' ? 'Reason (shown to the creator):' : 'Feedback (optional):', '');
    if (fb === null) return;
    setBusy(true);
    try { await call('admin_creator_submission_review', { p_id: r.id, p_status: status, p_feedback: fb, p_reward: reward }); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const saveTask = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await call('admin_creator_task_save', { p_id: form.id, p_title: form.title, p_description: form.description, p_reward: Number(form.reward) || 0, p_active: form.active, p_requirements: form.requirements, p_notes: form.notes, p_deadline: form.deadline ? new Date(form.deadline).toISOString() : null });
      setForm(EMPTY); await load();
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  const table = (cols, data, extra) => (
    <div style={{ ...card, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{cols.map(c => <th key={c[0]} style={th}>{c[0]}</th>)}{extra && <th style={th}>Actions</th>}</tr></thead>
        <tbody>
          {loading && [0, 1, 2, 3, 4].map(i => <tr key={'sk'+i}><td style={td} colSpan={9}><div style={{ height: 16, borderRadius: 8, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' }} /></td></tr>)}
          {!loading && data.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#8a93a3' }} colSpan={cols.length + 1}>No records.</td></tr>}
          {!loading && data.map((r, i) => <tr key={r.id || r.user_id || i}>{cols.map(c => <td key={c[0]} style={td}>{c[1](r)}</td>)}{extra && <td style={td}>{extra(r)}</td>}</tr>)}
        </tbody>
      </table>
    </div>
  );

  const subCols = [['Submitted', r => dateTime(r.submitted_at)], ['Creator', r => r.creator], ['Task', r => <><b>{r.title}</b><br />{peso(r.task_reward)}</>],
    ['Content', r => <div style={{ maxWidth: 260, wordBreak: 'break-word' }}>{r.content}{r.link && <><br /><a href={r.link} target="_blank" rel="noreferrer">{r.link}</a></>}</div>],
    ['Status', r => <><Pill s={r.status} />{r.feedback && <div style={{ fontSize: 11, color: '#8a93a3' }}>{r.feedback}</div>}</>], ['Awarded', r => peso(r.reward)]];
  const taskCols = [['Title', r => <b>{r.title}</b>], ['Description', r => r.description], ['Type', r => r.kind], ['Reward', r => r.kind === 'referral' ? 'Commission' : peso(r.reward)], ['Active', r => r.active ? 'Yes' : 'No']];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Creator Management</h2>
      <style>{'@keyframes xsk{0%,100%{opacity:.4}50%{opacity:1}}'}</style>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map(([id, label]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, opacity: tab === id ? 1 : .6, outline: tab === id ? '2px solid #2563EB' : 'none' }}>{label}</button>
        ))}
        {tab === 'submissions' && (
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 10 }}>
            <option value="">All</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option>
          </select>
        )}
      </div>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}

      {tab === 'overview' && !ov && loading && <div style={{ height: 220, borderRadius: 16, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' }} />}
      {tab === 'overview' && ov && (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
          <Stat label="Approved creators" value={ov.creators} sub={`${ov.apps_pending} applications pending`} />
          <Stat label="Referrals" value={`${ov.ref_successful} / ${Number(ov.ref_successful) + Number(ov.ref_pending)}`} sub="successful / total" />
          <Stat label="Referral purchases" value={peso(ov.purchases)} />
          <Stat label="Commissions earned" value={peso(ov.commissions)} sub={`Reversed ${peso(ov.reversed)}`} />
          <Stat label="Task rewards" value={peso(ov.task_rewards)} sub={`${ov.subs_pending} submissions pending`} />
          <Stat label="Withdrawn to Xwallet" value={peso(ov.withdrawn)} />
          <Stat label="Owed to creators" value={peso(ov.owed)} />
        </div>
        <div style={card}>
          <b style={{ fontSize: 14 }}>Commissions per day (30d)</b>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={(ov.series || []).map(d => ({ day: String(d.day).slice(5), total: Number(d.total) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v) => peso(v)} /><Line type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>)}

      {tab === 'submissions' && table(subCols, rows, r => r.status === 'pending' && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button disabled={busy} className="neu-btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => review(r, 'approved')}>approve</button>
          <button disabled={busy} className="neu-btn" style={{ padding: '4px 9px', fontSize: 11, color: '#DC2626' }} onClick={() => review(r, 'rejected')}>reject</button>
        </div>))}

      {COLS[tab] && table(COLS[tab], rows)}

      {tab === 'tasks' && (<>
        <ImportTasks call={call} onDone={load} />
        <form onSubmit={saveTask} style={{ ...card, marginBottom: 12, display: 'grid', gap: 8 }}>
          <b>{form.id ? 'Edit task' : 'New content task'}</b>
          <input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ padding: 8, borderRadius: 10 }} />
          <textarea placeholder="Description" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ padding: 8, borderRadius: 10 }} />
          <textarea placeholder="Requirements (one per line)" value={form.requirements || ''} onChange={e => setForm({ ...form, requirements: e.target.value })} style={{ padding: 8, borderRadius: 10, minHeight: 80 }} />
          <textarea placeholder="Notes for creators" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ padding: 8, borderRadius: 10 }} />
          <label style={{ fontSize: 13 }}>Deadline (optional) <input type="datetime-local" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} style={{ padding: 8, borderRadius: 10, marginLeft: 6 }} /></label>
          <input type="number" min="0" step="0.01" placeholder="Reward (₱)" value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} style={{ padding: 8, borderRadius: 10 }} />
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="neu-btn" disabled={busy} type="submit" style={{ padding: '8px 14px' }}>Save</button>
            {form.id && <button className="neu-btn" type="button" onClick={() => setForm(EMPTY)} style={{ padding: '8px 14px' }}>Cancel</button>}
          </div>
        </form>
        {table(taskCols, rows, r => <button className="neu-btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => setForm({ id: r.id, title: r.title, description: r.description || '', requirements: r.requirements || '', notes: r.notes || '', deadline: r.deadline ? toLocal(r.deadline) : '', reward: r.reward, active: r.active })}>edit</button>)}
      </>)}
    </div>
  );
}

// SKELETON_DONE
