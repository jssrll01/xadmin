import React, { useMemo, useState } from 'react';
import { dateTime, peso } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp, call, num, useLoad, Shell, Stat, Grid, Tbl } from '../tw/pages.jsx';

const arr = (d) => (Array.isArray(d) ? d : []);
const nm = (u) => (u ? (u.username ? '@' + u.username : u.email || String(u.id).slice(0, 8)) : '—');
const ls = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } };
const seen = (u) => (u.last_sign_in_at ? dateTime(u.last_sign_in_at) : 'never');
const daysAgo = (t) => (t ? (Date.now() - new Date(t).getTime()) / 86400000 : Infinity);
const localIn = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const byIdMap = (users) => { const m = {}; users.forEach((u) => { m[u.id] = u; }); return m; };
const KIND = { ban: 'Ban', suspend: 'Suspend', shadow_mute: 'Shadow-mute' };
const btn = { padding: '6px 12px', fontSize: 12 };

function useUsers() { return useLoad(async () => arr(await call('admin_ua_users'))); }
function useActive() { return useLoad(async () => arr(await call('admin_ua_restrictions', { p_all: false }))); }
const rStatus = (r) => (r.lifted_at ? 'lifted' : r.expires_at && new Date(r.expires_at) < new Date() ? 'expired' : 'active');
const Cap = ({ n }) => (n >= 5000 ? <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Only the newest 5000 users were loaded, so older users are missing.</div> : null);

function Picker({ users, onPick, placeholder = 'Search username, email or id' }) {
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const hits = t.length < 2 ? [] : users.filter((u) => (nm(u) + ' ' + (u.email || '') + ' ' + u.id).toLowerCase().includes(t)).slice(0, 8);
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <input style={{ ...inp, width: '100%' }} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((u) => (
        <div key={u.id} onClick={() => { onPick(u); setQ(''); }} style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <b>{nm(u)}</b> <span style={muted}>{u.email}</span>
        </div>
      ))}
    </div>
  );
}
function Expiry({ value, onChange }) {
  const add = (d) => onChange(localIn(new Date(Date.now() + d * 86400000)));
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="datetime-local" style={inp} value={value} onChange={(e) => onChange(e.target.value)} />
      {[1, 7, 30].map((d) => <button key={d} type="button" className="neu-btn" style={btn} onClick={() => add(d)}>+{d}d</button>)}
      <button type="button" className="neu-btn" style={btn} onClick={() => onChange('')}>None</button>
    </span>
  );
}
const expISO = (v) => (v ? new Date(v) : null);

/* 1 Ban / suspend / shadow-mute */
export function Restrictions() {
  const { show } = useToast();
  const us = useUsers();
  const [all, setAll] = useState(false);
  const rs = useLoad(async () => arr(await call('admin_ua_restrictions', { p_all: all })), [all]);
  const [user, setUser] = useState(null);
  const [kind, setKind] = useState('suspend');
  const [reason, setReason] = useState('');
  const [exp, setExp] = useState('');
  const [busy, setBusy] = useState(false);
  const users = us.rows || [];
  const apply = async () => {
    if (!user) return show?.('Pick a user first.', 'error');
    const when = expISO(exp);
    if (kind === 'suspend' && !when) return show?.('A suspension needs an expiry date.', 'error');
    if (when && when <= new Date()) return show?.('Expiry must be in the future.', 'error');
    if (!window.confirm(KIND[kind] + ' ' + nm(user) + (when ? ' until ' + when.toLocaleString() : ' with no expiry') + '?')) return;
    setBusy(true);
    try { await call('admin_ua_restrict', { p_user: user.id, p_kind: kind, p_reason: reason.trim() || null, p_expires: when ? when.toISOString() : null }); show?.('Recorded', 'success'); setUser(null); setReason(''); setExp(''); rs.reload(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  const lift = async (r) => {
    if (!window.confirm('Lift this ' + KIND[r.kind] + ' for ' + (r.username ? '@' + r.username : r.email) + '?')) return;
    try { await call('admin_ua_lift', { p_id: r.id }); show?.('Lifted', 'success'); rs.reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Ban, suspend and shadow-mute" sub="Record a restriction with an optional expiry. Expired ones stop counting automatically." onRefresh={() => { us.reload(); rs.reload(); }} loading={us.loading || rs.loading} err={us.err || rs.err}>
      <div style={{ ...card, color: '#DC2626', fontSize: 13 }}><b>Not enforced by itself.</b> This records the restriction. The app must check <code>ua_restricted(user, kind)</code> at sign-in, chat and posting to actually block anyone.</div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Picker users={users} onPick={setUser} />
          <select style={inp} value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        {user && <div style={{ marginTop: 8, fontSize: 13 }}>Selected: <b>{nm(user)}</b> <span style={muted}>{user.email}</span></div>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Expiry value={exp} onChange={setExp} />
          <button className="neu-btn" disabled={busy} onClick={apply} style={{ padding: '8px 16px', fontWeight: 700, color: '#DC2626' }}>Apply</button>
        </div>
        <div style={{ ...muted, marginTop: 6 }}>Suspensions need an expiry. Bans and mutes with no expiry stay until lifted.</div>
      </div>
      <label style={{ ...muted, display: 'block', marginBottom: 8 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show lifted and expired too</label>
      <Tbl cols={[['User', (r) => (r.username ? '@' + r.username : r.email || String(r.user_id).slice(0, 8))], ['Type', (r) => KIND[r.kind]], ['Reason', (r) => r.reason || '—'], ['Expires', (r) => (r.expires_at ? dateTime(r.expires_at) : 'never')], ['Status', (r) => rStatus(r)], ['Since', (r) => dateTime(r.created_at)], ['', (r) => rStatus(r) === 'active' && <button className="neu-btn" style={btn} onClick={() => lift(r)}>Lift</button>]]} rows={rs.rows || []} empty="No restrictions." />
    </Shell>
  );
}

/* 2 Bulk actions */
export function BulkActions() {
  const { show } = useToast();
  const us = useUsers();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState({});
  const [action, setAction] = useState('notify');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [exp, setExp] = useState('');
  const [amt, setAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const users = us.rows || [];
  const list = users.filter((u) => {
    if (filter === 'creators' && !u.is_creator) return false;
    if (filter === 'inactive' && daysAgo(u.last_sign_in_at) < 60) return false;
    if (filter === 'never_ordered' && num(u.orders) > 0) return false;
    const t = q.trim().toLowerCase();
    return !t || (nm(u) + ' ' + (u.email || '') + ' ' + u.id).toLowerCase().includes(t);
  });
  const ids = Object.keys(sel).filter((k) => sel[k]);
  const run = async () => {
    if (!ids.length) return show?.('Select users first.', 'error');
    if (ids.length > 500) return show?.('Max 500 users per run.', 'error');
    const when = expISO(exp);
    if (action === 'notify' && (!title.trim() || !body.trim())) return show?.('Title and message are required.', 'error');
    if (action === 'grant' && (!(num(amt) > 0) || !reason.trim())) return show?.('A grant needs an amount and a reason.', 'error');
    if (action === 'suspend' && !when) return show?.('A suspension needs an expiry date.', 'error');
    const what = action === 'grant' ? 'GRANT ' + peso(num(amt)) + ' to' : action === 'notify' ? 'Send a notification to' : KIND[action] + ' (' + (when ? 'until ' + when.toLocaleString() : 'no expiry') + ')';
    if (!window.confirm(what + ' ' + ids.length + ' user(s)? This cannot be undone in one step.')) return;
    setBusy(true); setRes(null);
    try {
      const r = await call('admin_ua_bulk', { p_users: ids, p_action: action, p_reason: reason.trim() || null, p_expires: when ? when.toISOString() : null, p_title: title.trim() || null, p_body: body.trim() || null, p_amount: action === 'grant' ? num(amt) : null });
      setRes(r); setSel({}); us.reload();
    } catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  return (
    <Shell title="Bulk user actions" sub="Notify, ban, suspend, shadow-mute or grant wallet credit to many users at once (max 500 per run)." onRefresh={us.reload} loading={us.loading} err={us.err}>
      <Cap n={users.length} />
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={inp} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All users</option><option value="creators">Creators</option><option value="inactive">Inactive 60+ days</option><option value="never_ordered">Never ordered</option></select>
        <button className="neu-btn" style={btn} onClick={() => { const n = {}; list.slice(0, 500).forEach((u) => { n[u.id] = true; }); setSel(n); }}>Select first {Math.min(500, list.length)} of {list.length}</button>
        <button className="neu-btn" style={btn} onClick={() => setSel({})}>Clear</button>
        <b>{ids.length} selected</b>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={inp} value={action} onChange={(e) => setAction(e.target.value)}><option value="notify">Send notification</option><option value="ban">Ban</option><option value="suspend">Suspend</option><option value="shadow_mute">Shadow-mute</option><option value="grant">Grant wallet credit</option></select>
          {action === 'notify' && <><input style={inp} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} /><input style={{ ...inp, flex: 1, minWidth: 180 }} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} /></>}
          {action === 'grant' && <><input type="number" min="0" style={{ ...inp, width: 110 }} placeholder="Amount each" value={amt} onChange={(e) => setAmt(e.target.value)} /><input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Reason (required, saved on the wallet entry)" value={reason} onChange={(e) => setReason(e.target.value)} /></>}
          {['ban', 'suspend', 'shadow_mute'].includes(action) && <><input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} /><Expiry value={exp} onChange={setExp} /></>}
          <button className="neu-btn" disabled={busy} onClick={run} style={{ padding: '8px 16px', fontWeight: 700 }}>{busy ? 'Working…' : 'Run'}</button>
        </div>
        {action === 'grant' && <div style={{ ...muted, marginTop: 6 }}>Credits wallet balance and writes a wallet transaction of type “credit”. Maximum 100,000 per user. Each user is processed on its own, so failures are listed and do not undo the others.</div>}
        {['ban', 'suspend', 'shadow_mute'].includes(action) && <div style={{ ...muted, marginTop: 6 }}>Recorded only. The app must check ua_restricted() to enforce it.</div>}
      </div>
      {res && <div style={{ ...card, fontSize: 13 }}><b>Done:</b> {res.ok} succeeded, {res.skipped} skipped (already restricted), {arr(res.failed).length} failed.{arr(res.failed).slice(0, 10).map((f) => <div key={f.user} style={{ color: '#DC2626' }}>{String(f.user).slice(0, 8)}: {f.error}</div>)}</div>}
      <Tbl cols={[['', (u) => <input type="checkbox" checked={!!sel[u.id]} onChange={(e) => setSel({ ...sel, [u.id]: e.target.checked })} />], ['User', (u) => nm(u)], ['Email', (u) => u.email || '—'], ['Orders', (u) => u.orders], ['Last sign-in', (u) => seen(u)]]} rows={list.slice(0, 200)} empty="No users match." />
      {list.length > 200 && <div style={muted}>Showing the first 200 of {list.length}. “Select first” still picks up to 500.</div>}
    </Shell>
  );
}

/* 3 Duplicate account finder */
export function Duplicates() {
  const { show } = useToast();
  const us = useUsers();
  const dup = useLoad(async () => [await call('admin_ua_duplicates')]);
  const d = (dup.rows || [])[0] || {};
  const map = useMemo(() => byIdMap(us.rows || []), [us.rows]);
  const watchAll = async (g, label) => {
    if (!window.confirm('Add all ' + g.users.length + ' accounts in this group to the watchlist?')) return;
    try { for (const id of g.users) await call('admin_ua_watch', { p_user: id, p_reason: 'Duplicate ' + label + ': ' + String(g.key).slice(0, 80), p_on: true }); show?.('Added to watchlist', 'success'); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const sec = (title, label, list, note) => (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{title} ({arr(list).length} groups)</h3>
      <div style={{ ...muted, marginBottom: 6 }}>{note}</div>
      {arr(list).length === 0 && <div style={{ ...card, opacity: .7 }}>None found.</div>}
      {arr(list).map((g) => (
        <div key={g.key} style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}><b style={{ wordBreak: 'break-word' }}>{String(g.key).slice(0, 120)}</b><span style={muted}>{g.users.length} accounts</span><button className="neu-btn" style={{ ...btn, marginLeft: 'auto' }} onClick={() => watchAll(g, label)}>Watch all</button></div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{g.users.map((id) => <div key={id}>{nm(map[id] || { id })} <span style={muted}>{map[id] ? map[id].email : ''}</span></div>)}</div>
        </div>
      ))}
    </div>
  );
  return (
    <Shell title="Duplicate account finder" sub="Accounts that share a phone number, delivery address or device." onRefresh={() => { us.reload(); dup.reload(); }} loading={us.loading || dup.loading} err={us.err || dup.err}>
      <div style={{ ...card, fontSize: 13 }}>Matches are leads, not proof. Family members share phones, addresses and networks. Check order and wallet history before acting.</div>
      {sec('Same phone', 'phone', d.phones, 'Last 10 digits of the sign-up phone, profile phone, or order mobile number.')}
      {sec('Same delivery address', 'address', d.addresses, 'Identical order addresses of 15+ characters, ignoring case and extra spaces.')}
      {d.devices_error ? <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Device matching unavailable: {d.devices_error}</div> : sec('Same device', 'device', d.devices, 'Same IP address and browser string in sign-in sessions. Shared Wi-Fi or mobile carriers can match unrelated people. This is not a true device ID.')}
    </Shell>
  );
}

/* 4 Referral tree */
const REF_CANDS = ['referred_by', 'referrer_id', 'invited_by', 'referred_by_user', 'referrer', 'referred_by_code', 'referral_by'];
function TreeNode({ id, depth, path, kids, map }) {
  const all = (kids[id] || []).filter((x) => !path.includes(x));
  const [more, setMore] = useState(false);
  const shown = more ? all : all.slice(0, 25);
  return (
    <div style={{ marginLeft: depth ? 16 : 0, borderLeft: depth ? '1px solid rgba(0,0,0,.12)' : 'none', paddingLeft: depth ? 8 : 0 }}>
      <div style={{ fontSize: 13, padding: '2px 0' }}><b>{nm(map[id] || { id })}</b> <span style={muted}>{all.length ? all.length + ' direct' : ''}</span></div>
      {depth < 6 && shown.map((c) => <TreeNode key={c} id={c} depth={depth + 1} path={[...path, id]} kids={kids} map={map} />)}
      {depth < 6 && all.length > 25 && !more && <button className="neu-btn" style={btn} onClick={() => setMore(true)}>+{all.length - 25} more</button>}
      {depth >= 6 && all.length > 0 && <div style={muted}>…deeper levels hidden</div>}
    </div>
  );
}
export function ReferralTree() {
  const us = useUsers();
  const users = us.rows || [];
  const [saved, setSaved] = useState(() => ls('ua_ref_col'));
  const [root, setRoot] = useState(null);
  const keys = useMemo(() => [...new Set(users.slice(0, 100).flatMap((u) => Object.keys(u.profile || {})))].sort(), [users]);
  const refCol = keys.includes(saved) ? saved : (REF_CANDS.find((k) => keys.includes(k)) || '');
  const codeCol = keys.includes('referral_code') ? 'referral_code' : '';
  const { kids, parent, map } = useMemo(() => {
    const map = byIdMap(users); const byCode = {}; const kids = {}; const parent = {};
    if (codeCol) users.forEach((u) => { const c = u.profile[codeCol]; if (c) byCode[String(c).toLowerCase()] = u.id; });
    if (refCol) users.forEach((u) => { const v = u.profile[refCol]; if (v == null || v === '') return; const s = String(v); const p = map[s] ? s : byCode[s.toLowerCase()]; if (p && p !== u.id) { parent[u.id] = p; (kids[p] = kids[p] || []).push(u.id); } });
    return { kids, parent, map };
  }, [users, refCol, codeCol]);
  const count = (id) => { const seenN = new Set([id]); const st = [id]; let n = 0; while (st.length) { const x = st.pop(); (kids[x] || []).forEach((c) => { if (!seenN.has(c)) { seenN.add(c); n++; st.push(c); } }); } return n; };
  const top = Object.keys(kids).map((id) => ({ id, direct: kids[id].length, total: count(id) })).sort((a, b) => b.total - a.total).slice(0, 20);
  const chain = []; if (root) { let c = root.id; const g = new Set(); while (parent[c] && !g.has(c) && chain.length < 10) { g.add(c); c = parent[c]; chain.push(c); } }
  return (
    <Shell title="Referral tree viewer" sub="Who referred whom, built from a referral column on the profiles table." onRefresh={us.reload} loading={us.loading} err={us.err}>
      <Cap n={users.length} />
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <span>“Referred by” column:</span>
        <select style={inp} value={refCol} onChange={(e) => { lsSet('ua_ref_col', e.target.value); setSaved(e.target.value); }}><option value="">choose…</option>{keys.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <span style={muted}>{codeCol ? 'Also matches values against referral_code.' : 'No referral_code column, so values must be user ids.'}</span>
      </div>
      {!refCol && !us.loading && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>No referral column was auto-detected on profiles. Pick one above if it exists. If referrals live in a separate table, tell me its name and columns and I will point this page at it.</div>}
      {refCol && <>
        <Grid><Stat label="Users with a referrer" value={Object.keys(parent).length} /><Stat label="Referrers" value={Object.keys(kids).length} /></Grid>
        <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><Picker users={users} onPick={setRoot} placeholder="Find a user to view their tree" /></div>
        {root && <div style={card}>
          <div style={{ ...muted, marginBottom: 6 }}>Referred by chain: {chain.length ? chain.map((id) => nm(map[id])).join(' ← ') : 'nobody (top of a tree)'}</div>
          <div style={{ marginBottom: 6 }}>Total downline: <b>{count(root.id)}</b></div>
          <TreeNode id={root.id} depth={0} path={[]} kids={kids} map={map} />
        </div>}
        <h3 style={{ fontSize: 14 }}>Top referrers (by total downline)</h3>
        <Tbl cols={[['User', (r) => nm(map[r.id])], ['Direct', (r) => r.direct], ['Total downline', (r) => <b>{r.total}</b>], ['', (r) => <button className="neu-btn" style={btn} onClick={() => setRoot(map[r.id])}>View tree</button>]]} rows={top} empty="No referral links found." />
      </>}
    </Shell>
  );
}

/* 5 Segments */
const VIP_CANDS = ['is_vip', 'vip', 'vip_until', 'vip_expires_at', 'vip_tier', 'vip_level'];
const isVip = (v) => { if (v == null || v === false || v === '' || v === 0 || v === 'false') return false; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v) > new Date(); return true; };
export function Segments() {
  const us = useUsers();
  const users = us.rows || [];
  const [seg, setSeg] = useState('vip');
  const [days, setDays] = useState(60);
  const [min, setMin] = useState(5000);
  const [saved, setSaved] = useState(() => ls('ua_vip_col'));
  const keys = useMemo(() => [...new Set(users.slice(0, 100).flatMap((u) => Object.keys(u.profile || {})))].sort(), [users]);
  const vipCol = keys.includes(saved) ? saved : (saved === '-' ? '' : VIP_CANDS.find((k) => keys.includes(k)) || '');
  const segs = useMemo(() => ({
    vip: vipCol ? users.filter((u) => isVip(u.profile[vipCol])) : [],
    creators: users.filter((u) => u.is_creator),
    big: users.filter((u) => num(u.spent) >= num(min)).sort((a, b) => num(b.spent) - num(a.spent)),
    inactive: users.filter((u) => daysAgo(u.last_sign_in_at) >= num(days)).sort((a, b) => daysAgo(b.last_sign_in_at) - daysAgo(a.last_sign_in_at)),
  }), [users, vipCol, days, min]);
  const list = segs[seg] || [];
  const tab = (k, l) => <button key={k} className="neu-btn" onClick={() => setSeg(k)} style={{ padding: '8px 14px', fontWeight: 700, opacity: seg === k ? 1 : .6 }}>{l} ({segs[k].length})</button>;
  return (
    <Shell title="User segments" sub="VIP, creators, big spenders and inactive users." onRefresh={us.reload} loading={us.loading} err={us.err}>
      <Cap n={users.length} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>{tab('vip', 'VIP')}{tab('creators', 'Creators')}{tab('big', 'Big spenders')}{tab('inactive', 'Inactive')}</div>
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <label>VIP column: <select style={inp} value={vipCol} onChange={(e) => { lsSet('ua_vip_col', e.target.value || '-'); setSaved(e.target.value || '-'); }}><option value="">none</option>{keys.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
        <label>Big spender at least <input type="number" style={{ ...inp, width: 90 }} value={min} onChange={(e) => setMin(e.target.value)} /></label>
        <label>Inactive for <input type="number" style={{ ...inp, width: 70 }} value={days} onChange={(e) => setDays(e.target.value)} /> days</label>
      </div>
      <div style={muted}>Spend counts orders marked paid, shipped, delivered or completed. Inactive uses last sign-in, which is not the same as last activity. {seg === 'vip' && !vipCol && 'No VIP column was detected on profiles. Pick one above, or tell me where VIP status is stored.'}</div>
      <Tbl cols={[['User', (u) => nm(u)], ['Email', (u) => u.email || '—'], ['Spent', (u) => peso(u.spent)], ['Orders', (u) => u.orders], ['Balance', (u) => peso(u.balance)], ['Last sign-in', (u) => seen(u)]]} rows={list.slice(0, 200)} empty="Nobody in this segment." />
      {list.length > 200 && <div style={muted}>Showing the first 200 of {list.length}.</div>}
    </Shell>
  );
}

/* 6 Last seen and device */
const parseUA = (s) => { if (!s) return '—'; const b = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Other'; const o = /Android/.test(s) ? 'Android' : /iPhone|iPad|iOS/.test(s) ? 'iOS' : /Windows/.test(s) ? 'Windows' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : '?'; return b + ' on ' + o; };
export function LastSeen() {
  const us = useUsers();
  const dv = useLoad(async () => [await call('admin_ua_devices')]);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const d = (dv.rows || [])[0] || {};
  const dm = useMemo(() => { const m = {}; arr(d.items).forEach((x) => { m[x.user_id] = x; }); return m; }, [d]);
  const t = q.trim().toLowerCase();
  const list = (us.rows || []).filter((u) => !t || (nm(u) + ' ' + (u.email || '') + ' ' + u.id).toLowerCase().includes(t)).sort((a, b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0));
  return (
    <Shell title="Last seen and device info" sub="Most recent sign-in and session per user." onRefresh={() => { us.reload(); dv.reload(); }} loading={us.loading || dv.loading} err={us.err || dv.err}>
      <Cap n={(us.rows || []).length} />
      <div style={{ ...card, fontSize: 13 }}>“Last sign-in” is when the account last logged in, not when it was last active. Device and IP come from the newest sign-in session only, and the IP may be a carrier or proxy address.</div>
      {d.available === false && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Device data unavailable: {d.error}</div>}
      <input style={{ ...inp, width: '100%', marginBottom: 10 }} placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(100); }} />
      <Tbl cols={[['User', (u) => nm(u)], ['Last sign-in', (u) => seen(u)], ['Session updated', (u) => (dm[u.id] && dm[u.id].at ? dateTime(dm[u.id].at) : '—')], ['Device', (u) => <span title={dm[u.id] ? dm[u.id].ua || '' : ''}>{dm[u.id] ? parseUA(dm[u.id].ua) : '—'}</span>], ['IP', (u) => (dm[u.id] && dm[u.id].ip) || '—'], ['Joined', (u) => (u.created_at ? dateTime(u.created_at) : '—')]]} rows={list.slice(0, limit)} empty="No users." />
      {list.length > limit && <div style={{ textAlign: 'center', marginTop: 10 }}><button className="neu-btn" style={{ padding: '8px 16px' }} onClick={() => setLimit(limit + 100)}>Load more ({list.length - limit} left)</button></div>}
    </Shell>
  );
}

/* 7 Watchlist */
export function Watchlist() {
  const { show } = useToast();
  const us = useUsers();
  const wl = useLoad(async () => arr(await call('admin_ua_watchlist')));
  const ar = useActive();
  const [user, setUser] = useState(null);
  const [reason, setReason] = useState('');
  const map = useMemo(() => byIdMap(us.rows || []), [us.rows]);
  const restr = useMemo(() => { const m = {}; (ar.rows || []).forEach((r) => { (m[r.user_id] = m[r.user_id] || []).push(KIND[r.kind]); }); return m; }, [ar.rows]);
  const reload = () => { us.reload(); wl.reload(); ar.reload(); };
  const add = async () => {
    if (!user) return show?.('Pick a user first.', 'error');
    try { await call('admin_ua_watch', { p_user: user.id, p_reason: reason.trim() || null, p_on: true }); show?.('Added', 'success'); setUser(null); setReason(''); wl.reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Remove ' + nm(map[id] || { id }) + ' from the watchlist?')) return;
    try { await call('admin_ua_watch', { p_user: id, p_on: false }); show?.('Removed', 'success'); wl.reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Watchlist" sub="Users you are keeping an eye on." onRefresh={reload} loading={us.loading || wl.loading} err={us.err || wl.err}>
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Picker users={us.rows || []} onPick={setUser} />
        <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Why are they on the list?" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="neu-btn" onClick={add} style={{ padding: '8px 16px', fontWeight: 700 }}>Add{user ? ' ' + nm(user) : ''}</button>
      </div>
      <div style={{ ...muted, marginBottom: 8 }}>Being on the list changes nothing for the user. It is a note for admins.</div>
      <Tbl cols={[['User', (w) => nm(map[w.user_id] || { id: w.user_id })], ['Reason', (w) => w.reason || '—'], ['Balance', (w) => (map[w.user_id] ? peso(map[w.user_id].balance) : '—')], ['Orders', (w) => (map[w.user_id] ? map[w.user_id].orders : '—')], ['Last sign-in', (w) => (map[w.user_id] ? seen(map[w.user_id]) : '—')], ['Restrictions', (w) => (restr[w.user_id] || []).join(', ') || 'none'], ['Added', (w) => dateTime(w.added_at)], ['', (w) => <button className="neu-btn" style={btn} onClick={() => remove(w.user_id)}>Remove</button>]]} rows={(wl.rows || []).map((w) => ({ ...w, id: w.user_id }))} empty="Watchlist is empty." />
    </Shell>
  );
}
