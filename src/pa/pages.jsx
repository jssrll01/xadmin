import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp, call, rpcDb, num, useLoad, Shell, Stat, Grid, Tbl } from '../tw/pages.jsx';

const ls = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } };
const n2 = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const pct = (v) => (Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : '—');
const T_CANDS = ['created_at', 'played_at', 'ts', 'inserted_at'];
const AMT = ['bet', 'bet_amount', 'stake', 'wager', 'amount', 'cost'];
const PAY = ['payout', 'win_amount', 'winnings', 'won', 'prize', 'reward', 'win'];
const GAME = ['game', 'game_type', 'kind', 'type', 'tier'];
const USER = ['user_id', 'player_id', 'uid'];

function useSchema() { return useLoad(async () => { const d = await call('admin_pa_schema'); return Array.isArray(d) ? d : []; }); }

function useSrc(key, schema, test, prefer) {
  const [name, setName] = useState(() => ls('pa_t_' + key));
  const list = schema || [];
  const auto = useMemo(() => { const ok = list.filter((s) => test(s.cols)); return ((prefer && ok.find((s) => prefer.test(s.t))) || ok[0] || {}).t || ''; }, [schema]); // eslint-disable-line
  const t = list.some((s) => s.t === name) ? name : auto;
  const cols = (list.find((s) => s.t === t) || {}).cols || [];
  const data = useLoad(async () => (t ? rpcDb('select', t, { order_col: cols.find((c) => T_CANDS.includes(c)) || null, lim: 5000 }) : []), [t]);
  return { t, cols, list, rows: data.rows || [], err: data.err, loading: data.loading, reload: data.reload, setT: (v) => { lsSet('pa_t_' + key, v); setName(v); } };
}
function useCol(key, cols, cands) {
  const [saved, setSaved] = useState(() => ls('pa_c_' + key));
  const v = cols.includes(saved) ? saved : (cands.find((c) => cols.includes(c)) || '');
  return { v, cols, label: key, set: (x) => { lsSet('pa_c_' + key, x); setSaved(x); } };
}
const Pick = ({ p, label }) => (
  <label style={{ fontSize: 12 }}>{label}: <select style={inp} value={p.v} onChange={(e) => p.set(e.target.value)}><option value="">none</option>{p.cols.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
);
const Bar0 = ({ src, children }) => (
  <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
    <label style={{ fontSize: 12 }}>Table: <select style={inp} value={src.t} onChange={(e) => src.setT(e.target.value)}>{src.list.map((s) => <option key={s.t} value={s.t}>{s.t}</option>)}</select></label>
    {children}
    <span style={muted}>{src.rows.length} rows read{src.rows.length >= 5000 ? ' (capped at 5000, newest first, so older rows are missing)' : ''}</span>
  </div>
);
const NoTable = ({ what }) => <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>No table found for {what}. If this says the function does not exist, run the SQL first. Otherwise pick a table from the dropdown (tables whose names contain airdrop, playtime, pt_, point, bet or game are listed).</div>;
const chart = (data, keys, colors) => (
  <div style={{ ...card, height: 260 }}>
    <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" /><XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip /><Legend />
      {keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i]} />)}</BarChart></ResponsiveContainer>
  </div>
);
function group(d, keyFn) { const m = {}; d.forEach((x) => { const k = keyFn(x); const g = (m[k] = m[k] || { k, n: 0, a: 0, p: 0, wins: 0 }); g.n++; g.a += x.a; g.p += x.p; if (x.p > 0) g.wins++; }); return Object.values(m); }
const dayOf = (t) => new Date(t).toLocaleDateString('en-CA');

function BetsPage({ title, sub, render, needUser, needTime }) {
  const sc = useSchema();
  const src = useSrc('bets', sc.rows, (c) => AMT.some((a) => c.includes(a)) && PAY.some((a) => c.includes(a)), /bet/i);
  const amt = useCol('amount', src.cols, AMT), pay = useCol('payout', src.cols, PAY), game = useCol('game', src.cols, GAME), user = useCol('user', src.cols, USER), time = useCol('time', src.cols, T_CANDS);
  const d = useMemo(() => src.rows.map((r) => ({ a: num(r[amt.v]), p: num(r[pay.v]), g: game.v ? String(r[game.v] ?? '—') : 'all', u: user.v ? String(r[user.v] ?? '') : '', t: time.v ? new Date(r[time.v]).getTime() : NaN })), [src.rows, amt.v, pay.v, game.v, user.v, time.v]);
  const ok = src.t && amt.v && pay.v && (!needUser || user.v) && (!needTime || time.v);
  return (
    <Shell title={title} sub={sub} onRefresh={() => { sc.reload(); src.reload(); }} loading={sc.loading || src.loading} err={sc.err || src.err}>
      {!sc.loading && !sc.err && !src.t && <NoTable what="bets or plays" />}
      {src.t && <Bar0 src={src}><Pick p={amt} label="Wagered" /><Pick p={pay} label="Paid out" /><Pick p={game} label="Game" /><Pick p={user} label="User" /><Pick p={time} label="Time" /></Bar0>}
      {src.t && <div style={{ ...muted, marginBottom: 10 }}>Assumes the “Paid out” column is the gross amount returned to the player (0 on a loss), not net profit. Fix the dropdowns if not.</div>}
      {src.t && !ok && !src.loading && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>This page also needs: {[!amt.v && 'wagered', !pay.v && 'paid out', needUser && !user.v && 'user', needTime && !time.v && 'time'].filter(Boolean).join(', ')} column.</div>}
      {ok && render(d)}
    </Shell>
  );
}

/* 1 Tier draw_minutes */
export function TierEditor() {
  const { show } = useToast();
  const sc = useSchema();
  const src = useSrc('tiers', sc.rows, (c) => c.includes('draw_minutes'));
  const [ed, setEd] = useState({});
  const pk = src.cols.includes('id') ? 'id' : src.cols[0];
  const shown = src.cols.filter((c) => c !== 'draw_minutes' && !/(created|updated)_at|description/.test(c)).slice(0, 4);
  const save = async (r) => {
    const n = Number(ed[r[pk]]);
    if (!Number.isInteger(n) || n < 1 || n > 1440) return show?.('Enter whole minutes, 1 to 1440.', 'error');
    if (!window.confirm('Set draw_minutes to ' + n + ' for ' + shown.map((c) => r[c]).join(' / ') + '?')) return;
    try { await rpcDb('update', src.t, { payload: { draw_minutes: n }, match_col: pk, match_val: String(r[pk]) }); show?.('Saved', 'success'); setEd((e) => { const x = { ...e }; delete x[r[pk]]; return x; }); src.reload(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Per-tier draw minutes" sub="Edit how many minutes each tier’s draw runs." onRefresh={() => { sc.reload(); src.reload(); }} loading={sc.loading || src.loading} err={sc.err || src.err}>
      {!sc.loading && !sc.err && !src.t && <NoTable what="a tier table with a draw_minutes column" />}
      {src.t && <>
        <div style={{ ...card, fontSize: 13 }}>This writes <code>draw_minutes</code> directly to <b>{src.t}</b>. It does not run your existing tier-save or draw-time functions, so if changing a tier should also reschedule the next draw, set the draw time on the Airdrop page afterwards.</div>
        <Tbl cols={[...shown.map((c) => [c, (r) => String(r[c] ?? '—')]), ['Current', (r) => <b>{r.draw_minutes}</b>], ['New minutes', (r) => <input type="number" min="1" max="1440" style={{ ...inp, width: 90 }} value={ed[r[pk]] ?? ''} onChange={(e) => setEd({ ...ed, [r[pk]]: e.target.value })} />], ['', (r) => <button className="neu-btn" disabled={ed[r[pk]] === undefined || ed[r[pk]] === ''} onClick={() => save(r)} style={{ padding: '4px 12px', fontSize: 12 }}>Save</button>]]} rows={src.rows} empty="No tiers." />
      </>}
    </Shell>
  );
}

/* 2 House edge and RTP */
export function HouseEdge() {
  return <BetsPage title="House edge and RTP per game" sub="RTP = paid out ÷ wagered. House edge = 1 − RTP." render={(d) => {
    const g = group(d, (x) => x.g).sort((a, b) => b.a - a.a); const A = d.reduce((s, x) => s + x.a, 0), P = d.reduce((s, x) => s + x.p, 0);
    return <>
      <Grid><Stat label="Total wagered" value={n2(A)} /><Stat label="Total paid" value={n2(P)} /><Stat label="Overall RTP" value={pct(A ? P / A : NaN)} /><Stat label="House edge" value={pct(A ? 1 - P / A : NaN)} sub={'house net ' + n2(A - P)} /></Grid>
      <Tbl cols={[['Game', (r) => r.k], ['Plays', (r) => r.n], ['Wagered', (r) => n2(r.a)], ['Paid', (r) => n2(r.p)], ['RTP', (r) => <b>{pct(r.a ? r.p / r.a : NaN)}</b>], ['House edge', (r) => pct(r.a ? 1 - r.p / r.a : NaN)], ['', (r) => (r.n < 100 ? <span style={{ color: '#F59E0B' }}>small sample</span> : r.p > r.a ? <span style={{ color: '#DC2626' }}>paying out more than taken</span> : '')]]} rows={g} />
    </>;
  }} />;
}

/* 3 Daily payout vs intake */
export function DailyFlow() {
  return <BetsPage needTime title="Daily payout vs intake" sub="Per day: money wagered (intake) against money paid out. Alerts on a payout spike or paying out more than taken." render={(d) => {
    const days = group(d.filter((x) => Number.isFinite(x.t)), (x) => dayOf(x.t)).sort((a, b) => (a.k < b.k ? -1 : 1));
    const last = days[days.length - 1]; const prev = days.slice(-31, -1); const alerts = [];
    if (last && prev.length >= 7) { const m = prev.reduce((s, x) => s + x.p, 0) / prev.length; const sd = Math.sqrt(prev.reduce((s, x) => s + (x.p - m) ** 2, 0) / prev.length); if (last.p > m + 2 * sd && last.p > 0) alerts.push('Payout on ' + last.k + ' (' + n2(last.p) + ') is above the 30-day norm (' + n2(m) + ' ± ' + n2(sd) + ').'); }
    days.slice(-3).forEach((x) => { if (x.p > x.a) alerts.push(x.k + ': paid ' + n2(x.p) + ' but took in only ' + n2(x.a) + '.'); });
    return <>
      {alerts.length > 0 ? alerts.map((a) => <div key={a} style={{ ...card, color: '#DC2626', fontWeight: 700, fontSize: 13 }}>ALERT: {a}</div>) : <div style={{ ...card, color: '#10B981', fontSize: 13 }}>No spike detected{prev.length < 7 ? ' (needs 7+ earlier days of data to judge a spike)' : ''}.</div>}
      <div style={muted}>The latest day may be partial. A spike here is a prompt to look, not proof of a problem. This page cannot send notifications; it only alerts while open.</div>
      {chart(days.slice(-30).map((x) => ({ k: x.k.slice(5), Intake: x.a, Payout: x.p })), ['Intake', 'Payout'], ['#3B82F6', '#EF4444'])}
      <Tbl cols={[['Day', (r) => r.k], ['Plays', (r) => r.n], ['Intake', (r) => n2(r.a)], ['Payout', (r) => n2(r.p)], ['House net', (r) => <b style={{ color: r.a - r.p < 0 ? '#DC2626' : 'inherit' }}>{n2(r.a - r.p)}</b>]]} rows={[...days].reverse().slice(0, 30)} />
    </>;
  }} />;
}

/* 4 Cron health */
export function CronHealth() {
  const [f, setF] = useState('draw|airdrop|play');
  const { rows, err, loading, reload } = useLoad(async () => [await call('admin_cron_health')]);
  const d = (rows || [])[0] || {};
  let rx = null; try { rx = f ? new RegExp(f, 'i') : null; } catch (e) { rx = null; }
  const jobs = (d.jobs || []).filter((j) => !rx || rx.test((j.jobname || '') + ' ' + (j.command || '')));
  const rowsOut = jobs.map((j) => { const r = (d.runs || []).filter((x) => x.jobid === j.jobid); const last = r[0]; const fails = r.filter((x) => x.status === 'failed').length; const age = last ? (Date.now() - new Date(last.start_time).getTime()) / 3600000 : null; return { id: j.jobid, j, last, fails, age, bad: j.active && (!last || last.status === 'failed' || age > 24) }; });
  return (
    <Shell title="Draw job cron health" sub="pg_cron jobs matching the filter, with their recent runs (last 3 days)." onRefresh={reload} loading={loading} err={err}>
      {d.available === false && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Cron data unavailable: {d.error}</div>}
      <div style={{ ...card, fontSize: 13 }}>Job filter (regex on name or command): <input style={inp} value={f} onChange={(e) => setF(e.target.value)} /></div>
      {d.available && <>
        <Grid><Stat label="Matching jobs" value={jobs.length} /><Stat label="Needing attention" value={rowsOut.filter((r) => r.bad).length} /><Stat label="Failed runs (3d)" value={rowsOut.reduce((s, r) => s + r.fails, 0)} /></Grid>
        <div style={muted}>“Needs attention” means active and (never ran in 3 days, last run failed, or last run over 24h ago). A weekly job will show this wrongly.</div>
        <Tbl cols={[['Job', (r) => r.j.jobname || 'job ' + r.id], ['Schedule', (r) => <code>{r.j.schedule}</code>], ['Active', (r) => (r.j.active ? 'yes' : 'no')], ['Last run', (r) => (r.last ? dateTime(r.last.start_time) + ' · ' + r.last.status : 'none in 3 days')], ['Age (h)', (r) => (r.age == null ? '—' : r.age.toFixed(1))], ['Failures', (r) => r.fails], ['Last message', (r) => (r.last && r.last.return_message) || ''], ['', (r) => (r.bad ? <b style={{ color: '#DC2626' }}>CHECK</b> : <span style={{ color: '#10B981' }}>ok</span>)]]} rows={rowsOut} empty="No jobs match the filter." />
      </>}
    </Shell>
  );
}

/* 5 Suspicious bets */
export function SuspiciousBets() {
  return <BetsPage needUser needTime title="Suspicious bet pattern detector" sub="Flags users to review. These are statistical signals, not proof of cheating." render={(d) => {
    const N = d.length, W = d.filter((x) => x.p > 0).length, p0 = N ? W / N : 0; const m = {};
    d.filter((x) => x.u).forEach((x) => { const g = (m[x.u] = m[x.u] || { k: x.u, n: 0, a: 0, p: 0, w: 0, ts: [] }); g.n++; g.a += x.a; g.p += x.p; if (x.p > 0) g.w++; if (Number.isFinite(x.t)) g.ts.push(x.t); });
    const out = Object.values(m).map((g) => {
      const flags = []; if (g.n >= 30 && p0 > 0 && p0 < 1) { const z = (g.w - p0 * g.n) / Math.sqrt(g.n * p0 * (1 - p0)); if (z > 3) flags.push('wins far more often than average (z=' + z.toFixed(1) + ')'); }
      if (g.n >= 30 && g.a > 0 && g.p / g.a > 1.5) flags.push('RTP ' + pct(g.p / g.a));
      g.ts.sort((a, b) => a - b); let mx = 0, i = 0; g.ts.forEach((t, j) => { while (t - g.ts[i] > 60000) i++; mx = Math.max(mx, j - i + 1); }); if (mx >= 20) flags.push(mx + ' bets within 60 seconds');
      return { ...g, flags, burst: mx };
    }).filter((g) => g.flags.length).sort((a, b) => b.flags.length - a.flags.length || b.p - a.p);
    return <>
      <Grid><Stat label="Plays analysed" value={N} /><Stat label="Overall win rate" value={pct(p0)} /><Stat label="Users flagged" value={out.length} /></Grid>
      <div style={muted}>Rules: win rate z-score above 3 or RTP above 150% (30+ bets), or 20+ bets in a minute. High-variance games and bots both trigger these, so check the history before acting.</div>
      <Tbl cols={[['User', (r) => r.k.slice(0, 12)], ['Bets', (r) => r.n], ['Win rate', (r) => pct(r.w / r.n)], ['Wagered', (r) => n2(r.a)], ['Paid', (r) => n2(r.p)], ['Why flagged', (r) => r.flags.join(' · ')]]} rows={out} empty="No suspicious patterns found." />
    </>;
  }} />;
}

/* 6 Activity by hour */
export function HourlyActivity() {
  const [utc, setUtc] = useState(false);
  return <BetsPage needTime title="Play Time activity by hour" sub="When people play: plays and amount wagered by hour of day." render={(d) => {
    const h = Array.from({ length: 24 }, (_, i) => ({ k: String(i).padStart(2, '0'), Plays: 0, Wagered: 0 }));
    d.filter((x) => Number.isFinite(x.t)).forEach((x) => { const i = utc ? new Date(x.t).getUTCHours() : new Date(x.t).getHours(); h[i].Plays++; h[i].Wagered += x.a; });
    const peak = [...h].sort((a, b) => b.Plays - a.Plays)[0];
    return <>
      <div style={{ ...card, fontSize: 13 }}>Hours in: <select style={inp} value={utc ? 'utc' : 'local'} onChange={(e) => setUtc(e.target.value === 'utc')}><option value="local">this device’s time zone</option><option value="utc">UTC</option></select> · Peak hour: <b>{peak.k}:00</b> ({peak.Plays} plays)</div>
      {chart(h, ['Plays'], ['#3B82F6'])}{chart(h, ['Wagered'], ['#10B981'])}
    </>;
  }} />;
}

/* 7 Points economy */
const EX = /exchang|redeem|convert|cash|withdraw/i;
export function PointsEconomy() {
  const sc = useSchema();
  const src = useSrc('pts', sc.rows, (c) => c.some((x) => ['points', 'pts', 'delta', 'amount'].includes(x)) && c.some((x) => ['type', 'kind', 'reason'].includes(x)), /(play|^pt|point)/i);
  const val = useCol('pval', src.cols, ['points', 'pts', 'delta', 'amount']), typ = useCol('ptype', src.cols, ['type', 'kind', 'reason']), time = useCol('ptime', src.cols, T_CANDS);
  const d = useMemo(() => src.rows.map((r) => ({ v: num(r[val.v]), ty: String(r[typ.v] ?? '—'), t: time.v ? new Date(r[time.v]).getTime() : NaN })), [src.rows, val.v, typ.v, time.v]);
  const earned = d.filter((x) => !EX.test(x.ty) && x.v > 0).reduce((s, x) => s + x.v, 0);
  const exch = d.filter((x) => EX.test(x.ty)).reduce((s, x) => s + Math.abs(x.v), 0);
  const days = group(d.filter((x) => Number.isFinite(x.t)).map((x) => ({ ...x, a: EX.test(x.ty) ? 0 : Math.max(0, x.v), p: EX.test(x.ty) ? Math.abs(x.v) : 0 })), (x) => dayOf(x.t)).sort((a, b) => (a.k < b.k ? -1 : 1)).slice(-30);
  const types = {}; d.forEach((x) => { const g = (types[x.ty] = types[x.ty] || { k: x.ty, n: 0, s: 0 }); g.n++; g.s += x.v; });
  return (
    <Shell title="Points economy health" sub="Points earned versus points exchanged." onRefresh={() => { sc.reload(); src.reload(); }} loading={sc.loading || src.loading} err={sc.err || src.err}>
      {!sc.loading && !sc.err && !src.t && <NoTable what="a points ledger" />}
      {src.t && <Bar0 src={src}><Pick p={val} label="Points" /><Pick p={typ} label="Type" /><Pick p={time} label="Time" /></Bar0>}
      {src.t && val.v && typ.v && <>
        <div style={muted}>Rows whose type matches exchange, redeem, convert, cash or withdraw count as exchanged. Any other positive row counts as earned. Check the breakdown below to confirm the split is right.</div>
        <Grid><Stat label="Earned" value={n2(earned)} /><Stat label="Exchanged" value={n2(exch)} /><Stat label="Exchanged ÷ earned" value={pct(earned ? exch / earned : NaN)} sub={exch > earned ? 'More exchanged than earned in this data' : ''} /><Stat label="Net outstanding" value={n2(earned - exch)} /></Grid>
        {days.length > 0 && chart(days.map((x) => ({ k: x.k.slice(5), Earned: x.a, Exchanged: x.p })), ['Earned', 'Exchanged'], ['#10B981', '#F59E0B'])}
        <Tbl cols={[['Type', (r) => r.k], ['Rows', (r) => r.n], ['Sum', (r) => n2(r.s)], ['Counted as', (r) => (EX.test(r.k) ? 'exchanged' : 'earned/other')]]} rows={Object.values(types).sort((a, b) => b.n - a.n)} />
      </>}
    </Shell>
  );
}
