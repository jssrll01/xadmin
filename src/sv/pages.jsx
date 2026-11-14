import React, { useMemo, useState } from 'react';
import { dateTime, peso } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp, sel, call, rpcDb, num, who, useLoad, Shell, Stat, Grid, Tbl } from '../tw/pages.jsx';

const arr = (d) => (Array.isArray(d) ? d : []);
const ls = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } };
const btn = { padding: '6px 12px', fontSize: 12 };
const STOCK = ['stock', 'stock_qty', 'quantity', 'qty', 'inventory', 'in_stock'];
const NAME = ['name', 'title', 'product_name'];
const EXP = ['expires_at', 'expiry', 'expiry_date', 'expires_on', 'vip_until', 'valid_until', 'ends_at', 'end_date', 'expiration', 'expired_at'];
const UID = ['user_id', 'profile_id', 'member_id', 'uid', 'id'];
const TYPE = ['perk', 'perk_type', 'type', 'kind', 'badge', 'tier', 'plan', 'name'];
const CAPN = (n) => (n >= 5000 ? <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Capped at 5000 rows (newest first). Older rows are missing, so totals may be understated.</div> : null);
const dayDiff = (t) => (new Date(t).getTime() - Date.now()) / 86400000;
const safeRx = (s) => { try { return s ? new RegExp(s, 'i') : null; } catch (e) { return null; } };

// Tables the admin_db function accepts for reading. Keep in step with that function.
const READABLE = new Set(['airdrop_bets', 'creator_gifts', 'user_perks', 'vip_memberships', 'products', 'airdrop_tiers', 'airdrop_settings', 'airdrop_draws', 'playtime_txns', 'playtime_log', 'profiles', 'orders', 'order_items', 'xwallet_topups', 'xwallet_txns', 'promo_codes', 'return_requests', 'bundles', 'xcards', 'report_tickets', 'xquote_receipts', 'reviews', 'shops', 'audit_log', 'settings', 'notifications', 'loyalty_ledger', 'loyalty_vouchers', 'stores', 'store_vouchers', 'playtime_config']);
function useSchema() { return useLoad(async () => arr(await call('admin_sv_schema'))); }
function useTbl(key, schema, test, prefer, allowNone) {
  const [name, setName] = useState(() => ls('sv_t_' + key));
  const ok = useMemo(() => arr(schema).filter((s) => READABLE.has(s.t) && test(s.cols)), [schema]); // eslint-disable-line
  const auto = useMemo(() => ((prefer && ok.find((s) => prefer.test(s.t))) || ok[0] || {}).t || '', [ok]); // eslint-disable-line
  const t = name === '-' && allowNone ? '' : ok.some((s) => s.t === name) ? name : auto;
  const cols = (ok.find((s) => s.t === t) || {}).cols || [];
  const data = useLoad(async () => (t ? arr(await rpcDb('select', t, { order_col: cols.includes('created_at') ? 'created_at' : null, lim: 5000 })) : []), [t]);
  return { t, cols, ok, rows: data.rows || [], err: data.err, loading: data.loading, reload: data.reload, setT: (v) => { lsSet('sv_t_' + key, v); setName(v); } };
}
function useCol(key, cols, cands) {
  const [saved, setSaved] = useState(() => ls('sv_c_' + key));
  const v = cols.includes(saved) ? saved : (saved === '-' ? '' : cands.find((c) => cols.includes(c)) || '');
  return { v, cols, set: (x) => { lsSet('sv_c_' + key, x || '-'); setSaved(x || '-'); } };
}
const Pick = ({ p, label }) => (
  <label style={{ fontSize: 12 }}>{label}: <select style={inp} value={p.v} onChange={(e) => p.set(e.target.value)}><option value="">none</option>{p.cols.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
);
const TblPick = ({ src, none }) => (
  <label style={{ fontSize: 12 }}>Table: <select style={inp} value={src.t || '-'} onChange={(e) => src.setT(e.target.value)}>{none && <option value="-">none</option>}{src.ok.map((s) => <option key={s.t} value={s.t}>{s.t}</option>)}</select></label>
);
const NoTbl = ({ what }) => <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>No table found for {what}. If the page says a function does not exist, run the SQL first.</div>;
const nameMap = (rows) => { const m = {}; arr(rows).forEach((p) => { m[p.id] = who(p); }); return m; };

function useStockSrc() {
  const data = useLoad(async () => arr(await call('adm_stock_overview')));
  const cols = ['id', 'name', 'stock'];
  return { t: 'product_stock_summary', cols, ok: [{ t: 'product_stock_summary', cols }], rows: data.rows || [], err: data.err, loading: data.loading, reload: data.reload, setT: () => {} };
}
/* 1 Stock alerts */
export function StockAlerts() {
  const sc = useSchema();
  const src = useStockSrc();
  const sk = useCol('stockc', src.cols, STOCK), nm = useCol('stockn', src.cols, NAME);
  const [low, setLow] = useState(5);
  const [view, setView] = useState('all');
  const d = useMemo(() => src.rows.filter((r) => sk.v && r[sk.v] != null && r[sk.v] !== '').map((r) => ({ id: r.id, name: String(r[nm.v] ?? r.id), n: num(r[sk.v]), r })).filter((x) => x.n <= num(low)).sort((a, b) => a.n - b.n), [src.rows, sk.v, nm.v, low]);
  const untracked = sk.v ? src.rows.filter((r) => r[sk.v] == null || r[sk.v] === '').length : 0;
  const out = d.filter((x) => x.n <= 0), lowN = d.filter((x) => x.n > 0);
  const list = view === 'out' ? out : view === 'low' ? lowN : d;
  return (
    <Shell title="Stock alerts" sub="Products that are out of stock or running low." onRefresh={() => { sc.reload(); src.reload(); }} loading={sc.loading || src.loading} err={sc.err || src.err}>
      {!sc.loading && !sc.err && !src.t && <NoTbl what="products with a stock column" />}
      {src.t && <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <TblPick src={src} /><Pick p={sk} label="Stock" /><Pick p={nm} label="Name" />
        <label style={{ fontSize: 12 }}>Low at or below <input type="number" min="0" style={{ ...inp, width: 70 }} value={low} onChange={(e) => setLow(e.target.value)} /></label>
        <span style={muted}>{src.rows.length} rows read</span>
      </div>}
      {CAPN(src.rows.length)}
      {sk.v && <>
        <Grid><Stat label="Out of stock" value={out.length} /><Stat label="Low stock" value={lowN.length} /><Stat label="Stock not tracked" value={untracked} sub="blank stock value, ignored" /></Grid>
        <div style={muted}>Stock is the total of each product's variant stock, read live from the database.</div>
        <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>{[['all', 'All'], ['out', 'Out'], ['low', 'Low']].map(([k, l]) => <button key={k} className="neu-btn" onClick={() => setView(k)} style={{ ...btn, opacity: view === k ? 1 : .6 }}>{l}</button>)}</div>
        <Tbl cols={[['Product', (x) => x.name], ['Stock', (x) => <b style={{ color: x.n <= 0 ? '#DC2626' : '#F59E0B' }}>{x.n}</b>], ['State', (x) => (x.n <= 0 ? 'OUT' : 'LOW')]]} rows={list.slice(0, 300)} empty="Nothing low or out." />
        {list.length > 300 && <div style={muted}>Showing 300 of {list.length}.</div>}
      </>}
    </Shell>
  );
}

/* Expiry list + reminder (VIP list and perk reminders) */
function ExpiryPage({ k, title, sub, prefer, label }) {
  const { show } = useToast();
  const sc = useSchema();
  const pr = useLoad(() => sel('profiles'));
  const src = useTbl(k, sc.rows, (c) => EXP.some((e) => c.includes(e)) && UID.some((u) => c.includes(u)), prefer);
  const uid = useCol(k + 'u', src.cols, UID), ex = useCol(k + 'e', src.cols, EXP), ty = useCol(k + 't', src.cols, ['perk', 'perk_type', 'type', 'kind', 'badge', 'tier', 'plan']);
  const [win, setWin] = useState(7);
  const [view, setView] = useState('upcoming');
  const [rx, setRx] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const names = useMemo(() => nameMap(pr.rows), [pr.rows]);
  const re = safeRx(rx);
  const d = useMemo(() => src.rows.filter((r) => uid.v && ex.v && r[ex.v] && r[uid.v]).map((r) => ({ id: r.id || r[uid.v] + String(r[ex.v]), u: String(r[uid.v]), exp: r[ex.v], days: dayDiff(r[ex.v]), type: ty.v ? String(r[ty.v] ?? '') : '' })).filter((x) => Number.isFinite(x.days) && (!re || re.test(x.type))).sort((a, b) => a.days - b.days), [src.rows, uid.v, ex.v, ty.v, rx]); // eslint-disable-line
  const upcoming = d.filter((x) => x.days >= 0 && x.days <= num(win));
  const perUser = useMemo(() => { const m = {}; upcoming.forEach((x) => { if (!m[x.u] || x.days < m[x.u].days) m[x.u] = x; }); return Object.values(m); }, [upcoming]);
  const list = view === 'expired' ? d.filter((x) => x.days < 0).reverse() : view === 'all' ? d : upcoming;
  const send = async () => {
    if (!perUser.length) return show?.('Nobody expires in that window.', 'error');
    if (perUser.length > 500) return show?.('More than 500 users. Shorten the window and send in batches.', 'error');
    if (!window.confirm('Send a ' + label + ' expiry reminder to ' + perUser.length + ' user(s)? Anyone reminded in the last 72 hours is skipped.')) return;
    setBusy(true); setRes(null);
    try {
      const bodies = perUser.map((x) => 'Your ' + label + (x.type ? ' (' + x.type + ')' : '') + ' expires on ' + new Date(x.exp).toLocaleDateString() + (x.days < 1 ? ' (today)' : ' (in ' + Math.ceil(x.days) + ' day' + (Math.ceil(x.days) === 1 ? '' : 's') + ')') + '. Renew to keep your perks.');
      setRes(await call('admin_sv_remind', { p_users: perUser.map((x) => x.u), p_bodies: bodies, p_kind: k, p_title: label + ' expiring soon', p_skip_hours: 72 }));
    } catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  return (
    <Shell title={title} sub={sub} onRefresh={() => { sc.reload(); src.reload(); pr.reload(); }} loading={sc.loading || src.loading || pr.loading} err={sc.err || src.err || pr.err}>
      {!sc.loading && !sc.err && !src.t && <NoTbl what={label + ' records with a user and an expiry date'} />}
      {src.t && <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <TblPick src={src} /><Pick p={uid} label="User" /><Pick p={ex} label="Expiry" /><Pick p={ty} label="Type" />
        <label style={{ fontSize: 12 }}>Type matches <input style={{ ...inp, width: 110 }} placeholder="regex, optional" value={rx} onChange={(e) => setRx(e.target.value)} /></label>
      </div>}
      {CAPN(src.rows.length)}
      {uid.v && ex.v && <>
        <Grid><Stat label="Expiring in window" value={perUser.length} sub="users, soonest expiry each" /><Stat label="Already expired" value={d.filter((x) => x.days < 0).length} sub="records" /><Stat label="Active (future expiry)" value={d.filter((x) => x.days >= 0).length} /></Grid>
        <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
          <label>Remind users expiring within <input type="number" min="0" style={{ ...inp, width: 70 }} value={win} onChange={(e) => setWin(e.target.value)} /> days</label>
          <button className="neu-btn" disabled={busy || !perUser.length} onClick={send} style={{ padding: '8px 16px', fontWeight: 700 }}>{busy ? 'Sending…' : 'Send reminder to ' + perUser.length + ' user(s)'}</button>
          <span style={muted}>Goes to each user’s notification page. One click, not scheduled.</span>
        </div>
        {res && <div style={{ ...card, fontSize: 13 }}><b>Done:</b> {res.ok} sent, {res.skipped} skipped (reminded in last 72h), {arr(res.failed).length} failed.{arr(res.failed).slice(0, 8).map((f) => <div key={f.user} style={{ color: '#DC2626' }}>{String(f.user).slice(0, 8)}: {f.error}</div>)}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>{[['upcoming', 'Expiring soon'], ['expired', 'Expired'], ['all', 'All']].map(([v, l]) => <button key={v} className="neu-btn" onClick={() => setView(v)} style={{ ...btn, opacity: view === v ? 1 : .6 }}>{l}</button>)}</div>
        <Tbl cols={[['User', (x) => names[x.u] || x.u.slice(0, 8)], ['Type', (x) => x.type || '—'], ['Expires', (x) => dateTime(x.exp)], ['Days left', (x) => <b style={{ color: x.days < 0 ? '#DC2626' : x.days <= 3 ? '#F59E0B' : 'inherit' }}>{x.days < 0 ? 'expired ' + Math.ceil(-x.days) + 'd ago' : Math.ceil(x.days)}</b>]]} rows={list.slice(0, 300)} empty="Nothing here." />
        {list.length > 300 && <div style={muted}>Showing 300 of {list.length}.</div>}
      </>}
    </Shell>
  );
}
export const VipMembers = () => <ExpiryPage k="vip" label="VIP" prefer={/vip/i} title="VIP members and expiry" sub="Members with expiry dates, plus a one-click reminder to their notification page." />;
export const PerkReminders = () => <ExpiryPage k="perk" label="perk" prefer={/perk|badge|verif|boost/i} title="Perk expiry reminders" sub="Verified, Creator Verified, Booster and other perks that are about to expire." />;

/* 4 Perk dashboard */
const isAct = (v) => { if (v == null || v === false || v === '' || v === 0 || v === 'false') return false; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v) > new Date(); return true; };
const isDateCol = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const PERKS = [['vip', 'VIP', ['is_vip', 'vip', 'vip_until', 'vip_expires_at', 'vip_expiry'], /vip/i], ['verified', 'Verified', ['is_verified', 'verified', 'verified_until'], /^(?!.*creator).*verif/i], ['cver', 'Creator Verified', ['creator_verified', 'is_creator_verified', 'creator_verified_until'], /(creator.*verif|verif.*creator)/i], ['booster', 'Booster', ['is_booster', 'booster', 'booster_until', 'booster_expires_at'], /boost/i]];
function PerkRow({ p, profiles, keys, src, uid, ty, ex }) {
  const [key, label, cands, rx] = p;
  const [saved, setSaved] = useState(() => ls('sv_pc_' + key));
  const col = keys.includes(saved) ? saved : (saved === '-' ? '' : cands.find((c) => keys.includes(c)) || '');
  const pv = col ? profiles.filter((u) => isAct(u[col])) : [];
  const soon = col ? profiles.filter((u) => isDateCol(u[col]) && dayDiff(u[col]) >= 0 && dayDiff(u[col]) <= 7).length : null;
  let lg = null;
  if (src.t && uid.v && ty.v) { const s = new Set(); src.rows.forEach((r) => { if (rx.test(String(r[ty.v] ?? '')) && r[uid.v] && (!ex.v || !r[ex.v] || new Date(r[ex.v]) > new Date())) s.add(String(r[uid.v])); }); lg = s.size; }
  return (
    <tr>
      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{label}</td>
      <td style={{ padding: '8px 10px' }}><select style={inp} value={col} onChange={(e) => { lsSet('sv_pc_' + key, e.target.value || '-'); setSaved(e.target.value || '-'); }}><option value="">none</option>{keys.map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
      <td style={{ padding: '8px 10px' }}><b>{col ? pv.length : '—'}</b></td>
      <td style={{ padding: '8px 10px' }}>{soon == null ? '—' : soon}</td>
      <td style={{ padding: '8px 10px' }}><b>{lg == null ? '—' : lg}</b></td>
    </tr>
  );
}
export function PerkDashboard() {
  const sc = useSchema();
  const pr = useLoad(() => sel('profiles'));
  const src = useTbl('dash', sc.rows, (c) => UID.some((u) => c.includes(u)) && TYPE.some((t) => c.includes(t)), /perk|badge/i, true);
  const uid = useCol('dashu', src.cols, ['user_id', 'profile_id', 'member_id', 'uid']), ty = useCol('dasht', src.cols, ['perk', 'perk_type', 'type', 'kind', 'badge']), ex = useCol('dashe', src.cols, EXP);
  const profiles = pr.rows || [];
  const keys = useMemo(() => [...new Set(profiles.slice(0, 100).flatMap((u) => Object.keys(u)))].sort(), [profiles]);
  return (
    <Shell title="Active perks dashboard" sub="How many users hold VIP, Verified, Creator Verified and Booster right now." onRefresh={() => { sc.reload(); pr.reload(); src.reload(); }} loading={sc.loading || pr.loading || src.loading} err={sc.err || pr.err || src.err}>
      <div style={{ ...card, fontSize: 13 }}>Perks can be stored as a column on <b>profiles</b> or as rows in a perk table. Pick where each one lives, and both counts are shown side by side. A boolean column counts when true. A date column counts when it is in the future. Check that the numbers match what you expect before relying on them.</div>
      {CAPN(profiles.length)}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <TblPick src={src} none /><Pick p={uid} label="User" /><Pick p={ty} label="Type" /><Pick p={ex} label="Expiry" />
        <span style={muted}>Optional perk table. Type values are matched by name: vip, verif, creator+verif, boost.</span>
      </div>
      <div style={{ ...card, overflowX: 'auto', padding: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Perk', 'Profiles column', 'Active (profiles)', 'Expiring in 7d', 'Active (perk table)'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', color: '#8a93a3' }}>{h}</th>)}</tr></thead>
          <tbody>{PERKS.map((p) => <PerkRow key={p[0]} p={p} profiles={profiles} keys={keys} src={src} uid={uid} ty={ty} ex={ex} />)}</tbody>
        </table>
      </div>
    </Shell>
  );
}

/* 5 Gift purchases log */
export function GiftLog() {
  const sc = useSchema();
  const pr = useLoad(() => sel('profiles'));
  const src = useTbl('gift', sc.rows, (c) => c.includes('is_gift') || c.length > 0, /^orders$/, false);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const names = useMemo(() => nameMap(pr.rows), [pr.rows]);
  const isOrders = src.cols.includes('is_gift');
  const rows = useMemo(() => (isOrders ? src.rows.filter((r) => r.is_gift === true || r.is_gift === 'true') : src.rows), [src.rows, isOrders]);
  const t = q.trim().toLowerCase();
  const list = rows.filter((r) => !t || JSON.stringify(r).toLowerCase().includes(t));
  const total = isOrders ? list.reduce((s, r) => s + num(r.total), 0) : null;
  const gc = src.cols.filter((c) => !/(photo|image|items|metadata|payload|socials)/.test(c)).slice(0, 7);
  return (
    <Shell title="Gift purchases log" sub="Orders placed as gifts, with the message and recipient." onRefresh={() => { sc.reload(); src.reload(); pr.reload(); }} loading={sc.loading || src.loading || pr.loading} err={sc.err || src.err || pr.err}>
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <TblPick src={{ ...src, ok: arr(sc.rows).filter((s) => s.t === 'orders' || /gift/i.test(s.t)) }} />
        <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(100); }} />
        <span style={muted}>{isOrders ? 'Showing orders where is_gift is true.' : 'Showing the first columns of this table as stored.'}</span>
      </div>
      {CAPN(src.rows.length)}
      <Grid><Stat label="Gift records" value={list.length} />{total != null && <Stat label="Gift order value" value={peso(total)} />}</Grid>
      {isOrders
        ? <Tbl cols={[['Order', (r) => r.order_code || String(r.id).slice(0, 8)], ['Buyer', (r) => names[r.buyer_id] || r.email || String(r.buyer_id || '').slice(0, 8)], ['Recipient email', (r) => r.gift_recipient_email || '—'], ['Message', (r) => r.gift_message || '—'], ['Total', (r) => peso(r.total)], ['Status', (r) => r.status], ['Date', (r) => dateTime(r.created_at)]]} rows={list.slice(0, limit)} empty="No gift orders." />
        : <Tbl cols={gc.map((c) => [c, (r) => (r[c] == null ? '—' : String(typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c]).slice(0, 60))])} rows={list.slice(0, limit)} empty="No rows." />}
      {list.length > limit && <div style={{ textAlign: 'center', marginTop: 10 }}><button className="neu-btn" style={{ padding: '8px 16px' }} onClick={() => setLimit(limit + 100)}>Load more ({list.length - limit} left)</button></div>}
    </Shell>
  );
}
