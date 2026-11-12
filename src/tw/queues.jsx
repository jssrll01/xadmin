import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { xmSupabase, supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { peso, dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp, sel, call, rpcDb, num, who, useLoad, Shell, Stat, Grid } from './pages.jsx';

const arr = (d) => (Array.isArray(d) ? d : (d && (d.rows || d.items || d.data || d.list)) || []);
const actor = () => { try { return sessionStorage.getItem('xadmin_actor') || 'admin'; } catch (e) { return 'admin'; } };
const upd = (tbl, id, payload) => rpcDb('update', tbl, { payload, match_col: 'id', match_val: String(id) });

function useAct(reload) {
  const { show } = useToast();
  const [busy, setBusy] = useState('');
  const run = async (id, question, fn, okMsg) => {
    if (!window.confirm(question)) return;
    setBusy(String(id));
    try { await fn(); show?.(okMsg || 'Done', 'success'); await reload(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy('');
  };
  return { busy, run };
}

function Item({ head, sub, children, busy, onApprove, onReject, needNote, okText = 'Approve', noText = 'Reject' }) {
  const { show } = useToast();
  const [note, setNote] = useState('');
  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>{head}</div>
      {sub && <div style={{ ...muted, marginTop: 2 }}>{sub}</div>}
      {children}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {onReject && <input style={{ ...inp, flex: 1, minWidth: 140 }} placeholder={needNote ? 'Reason (required to reject)' : 'Note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} />}
        <button className="neu-btn neu-btn-success" disabled={busy} onClick={() => onApprove(note.trim())} style={{ padding: '8px 16px', fontWeight: 700 }}>{okText}</button>
        {onReject && <button className="neu-btn" disabled={busy} onClick={() => { if (needNote && !note.trim()) return show?.('Write a reason first.', 'error'); onReject(note.trim()); }} style={{ padding: '8px 16px', fontWeight: 700, color: '#DC2626' }}>{noText}</button>}
      </div>
    </div>
  );
}
const Empty = ({ loading, text = 'Queue is empty.' }) => (loading ? null : <div style={{ ...card, opacity: .7 }}>{text}</div>);
const CAP = (n) => (n >= 5000 ? <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>Capped at 5000 rows. Older items may be missing.</div> : null);

/* Buy load */
const xl = async (fn, args) => { const { data, error } = await xmSupabase.rpc(fn, { p_pin: getAdminPin(), ...args }); if (error) throw error; return data; };
export function BuyLoadQueue() {
  const { rows, err, loading, reload } = useLoad(async () => arr(await xl('xload_admin_list', { p_status: 'processing', p_search: null, p_limit: 200 })));
  const { busy, run } = useAct(reload);
  const set = (r, s) => run(r.id, (s === 'completed' ? 'Mark as completed (load delivered): ' : 'Cancel: ') + r.mobile + ' ' + (r.network || '') + ' ' + peso(r.amount) + '?', () => xl('xload_admin_set_status', { p_actor: actor(), p_id: r.id, p_status: s }), s === 'completed' ? 'Completed' : 'Cancelled');
  return (
    <Shell title="Buy load approval queue" sub="Orders in processing. Complete only after the load is actually sent. Cancel if it cannot be delivered." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="In queue" value={(rows || []).length} /><Stat label="Amount" value={peso((rows || []).reduce((s, r) => s + num(r.amount), 0))} /></Grid>
      {(rows || []).length === 0 && <Empty loading={loading} />}
      {(rows || []).map((r) => (
        <Item key={r.id} busy={busy === String(r.id)} okText="Complete" noText="Cancel" onApprove={() => set(r, 'completed')} onReject={() => set(r, 'cancelled')}
          head={<><b style={{ fontSize: 18 }}>{peso(r.amount)}</b><span>{r.mobile}</span><span style={muted}>{r.network}</span><span style={{ ...muted, marginLeft: 'auto' }}>{r.created_at ? dateTime(r.created_at) : ''}</span></>} />
      ))}
    </Shell>
  );
}

/* Top-ups */
export function TopupQueue() {
  const tu = useLoad(() => sel('xwallet_topups'));
  const pr = useLoad(() => sel('profiles'));
  const reload = () => { tu.reload(); pr.reload(); };
  const { busy, run } = useAct(reload);
  const names = useMemo(() => { const m = {}; (pr.rows || []).forEach((p) => { m[p.id] = who(p); }); return m; }, [pr.rows]);
  const open = (tu.rows || []).filter((r) => ['pending', 'processing'].includes(String(r.status || 'processing').toLowerCase()));
  const set = (r, s) => run(r.id, (s === 'approved' ? 'Approve and credit ' + peso(r.amount) : 'Reject this top-up') + '?', async () => {
    const { error } = await supabase.rpc('admin_topup_set', { code: getAdminPin(), p_id: r.id, p_status: s }); if (error) throw error;
  }, s === 'approved' ? 'Approved · wallet credited' : 'Rejected');
  return (
    <Shell title="Top-up approval queue" sub="Approving credits the wallet immediately. To check the receipt image first, use the Receipt Viewer." onRefresh={reload} loading={tu.loading} err={tu.err}>
      <Grid><Stat label="In queue" value={open.length} /><Stat label="Amount" value={peso(open.reduce((s, r) => s + num(r.amount), 0))} /></Grid>
      {CAP((tu.rows || []).length)}
      {open.length === 0 && <Empty loading={tu.loading} />}
      {open.map((r) => (
        <Item key={r.id} busy={busy === String(r.id)} onApprove={() => set(r, 'approved')} onReject={() => set(r, 'rejected')}
          head={<><b style={{ fontSize: 18 }}>{peso(r.amount)}</b><span>{names[r.user_id] || String(r.user_id || '').slice(0, 8)}</span><span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(r.created_at)}</span></>}>
          <Link to="/tw/receipts" style={{ fontSize: 12 }}>Open Receipt Viewer ›</Link>
        </Item>
      ))}
    </Shell>
  );
}

/* Orders */
export function OrdersQueue() {
  const { rows, err, loading, reload } = useLoad(() => sel('orders'));
  const { busy, run } = useAct(reload);
  const open = (rows || []).filter((o) => String(o.status || 'pending').toLowerCase() === 'pending');
  const pay = (o) => run(o.id, 'Mark order ' + o.order_code + ' (' + peso(o.total) + ') as PAID?', () => upd('orders', o.id, { status: 'paid' }), 'Marked paid');
  const cancel = (o, note) => run(o.id, 'Cancel order ' + o.order_code + '?', () => upd('orders', o.id, { status: 'cancelled', cancel_reason: note, cancelled_at: new Date().toISOString() }), 'Cancelled');
  return (
    <Shell title="Orders approval queue" sub="Pending orders. Approve marks them paid (same status change as the Orders page). Cancel needs a reason." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="Pending orders" value={open.length} /><Stat label="Value" value={peso(open.reduce((s, o) => s + num(o.total), 0))} /></Grid>
      {CAP((rows || []).length)}
      {open.length === 0 && <Empty loading={loading} />}
      {open.map((o) => (
        <Item key={o.id} busy={busy === String(o.id)} okText="Mark paid" noText="Cancel" needNote onApprove={() => pay(o)} onReject={(n) => cancel(o, n)}
          head={<><b>{o.order_code}</b><b style={{ fontSize: 18 }}>{peso(o.total)}</b><span>{o.name}</span><span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(o.created_at)}</span></>}
          sub={[o.email, o.payment_method, o.delivery_method].filter(Boolean).join(' · ')}>
          {o.receipt_url ? <a href={o.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View payment receipt ›</a> : <span style={muted}>No payment receipt uploaded</span>}
        </Item>
      ))}
    </Shell>
  );
}

/* Quotations */
export function QuotationQueue() {
  const { rows, err, loading, reload } = useLoad(() => sel('xquote_receipts'));
  const { busy, run } = useAct(reload);
  const [f, setF] = useState('pending');
  const open = (rows || []).filter((q) => (f === 'all' ? ['pending', 'unpaid', 'overdue'] : [f]).includes(String(q.status || 'unpaid').toLowerCase()));
  const pay = (q) => run(q.id, 'Mark ' + q.receipt_no + ' (' + peso(q.total) + ') as PAID?', () => upd('xquote_receipts', q.id, { status: 'paid' }), 'Marked paid');
  return (
    <Shell title="Quotation approval queue" sub="Quotations awaiting payment. Quotations have no rejected status, so the only action is marking one paid." onRefresh={reload} loading={loading} err={err}>
      <div style={{ ...card, fontSize: 13 }}>Show: <select style={inp} value={f} onChange={(e) => setF(e.target.value)}>{['pending', 'unpaid', 'overdue', 'all'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      <Grid><Stat label="In view" value={open.length} /><Stat label="Value" value={peso(open.reduce((s, q) => s + num(q.total), 0))} /></Grid>
      {CAP((rows || []).length)}
      {open.length === 0 && <Empty loading={loading} />}
      {open.map((q) => (
        <Item key={q.id} busy={busy === String(q.id)} okText="Mark paid" onApprove={() => pay(q)}
          head={<><b>{q.receipt_no}</b><b style={{ fontSize: 18 }}>{peso(q.total)}</b><span>{q.customer_name}</span><span style={{ ...muted, marginLeft: 'auto' }}>{String(q.status).toUpperCase()} · {dateTime(q.created_at)}</span></>}
          sub={[q.customer_email, q.payment_method].filter(Boolean).join(' · ')} />
      ))}
    </Shell>
  );
}

/* Returns */
export function ReturnQueue() {
  const { rows, err, loading, reload } = useLoad(() => sel('return_requests'));
  const { busy, run } = useAct(reload);
  const open = (rows || []).filter((r) => String(r.status || 'pending').toLowerCase() === 'pending');
  const set = (r, s, note) => run(r.id, (s === 'approved' ? 'Approve' : 'Reject') + ' this return request?', () => upd('return_requests', r.id, { status: s, ...(note ? { note: (r.note ? r.note + ' | ' : '') + 'Admin: ' + note } : {}) }), s === 'approved' ? 'Approved' : 'Rejected');
  return (
    <Shell title="Return approval queue" sub="Pending return requests. This changes the status only, exactly like the Returns page. It does not issue a refund by itself." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="Pending returns" value={open.length} /></Grid>
      {CAP((rows || []).length)}
      {open.length === 0 && <Empty loading={loading} />}
      {open.map((r) => (
        <Item key={r.id} busy={busy === String(r.id)} onApprove={(n) => set(r, 'approved', n)} onReject={(n) => set(r, 'rejected', n)}
          head={<><b>Order {String(r.order_id || '').slice(0, 8)}</b>{r.refund_amount != null && <span>Refund {peso(r.refund_amount)}</span>}<span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(r.created_at)}</span></>}
          sub={'Reason: ' + (r.reason || '—') + (r.note ? ' · Note: ' + r.note : '')}>
          {Array.isArray(r.photos) && r.photos.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{r.photos.filter((p) => typeof p === 'string').map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="return" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} /></a>)}</div>}
        </Item>
      ))}
    </Shell>
  );
}

/* Creators */
export function CreatorQueue() {
  const { rows, err, loading, reload } = useLoad(async () => arr(await call('admin_creator_apps_list', { p_status: 'pending' })));
  const { busy, run } = useAct(reload);
  const set = (r, s, note) => run(r.id, (s === 'approved' ? 'Approve' : 'Reject') + ' creator application of ' + r.username + '?', () => call('admin_creator_app_set', { p_id: r.id, p_status: s, p_note: note || null }), s === 'approved' ? 'Approved' : 'Rejected');
  return (
    <Shell title="Creator approval queue" sub="Pending creator applications. The rejection reason is shown to the applicant." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="Pending applications" value={(rows || []).length} /></Grid>
      {(rows || []).length === 0 && <Empty loading={loading} />}
      {(rows || []).map((r) => (
        <Item key={r.id} busy={busy === String(r.id)} needNote onApprove={() => set(r, 'approved')} onReject={(n) => set(r, 'rejected', n)}
          head={<><b>@{r.username}</b><span>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</span><span style={{ ...muted, marginLeft: 'auto' }}>{r.submitted_at ? dateTime(r.submitted_at) : ''}</span></>}
          sub={[r.email, r.phone].filter(Boolean).join(' · ')}>
          {r.bio && <div style={{ fontSize: 13, marginTop: 6 }}>{r.bio}</div>}
          {r.socials && <div style={{ ...muted, marginTop: 4, wordBreak: 'break-all' }}>Socials: {typeof r.socials === 'string' ? r.socials : JSON.stringify(r.socials)}</div>}
        </Item>
      ))}
    </Shell>
  );
}

/* Logistics (read-only) */
export function LogisticsQueue() {
  const { rows, err, loading, reload } = useLoad(async () => {
    const { data, error } = await supabase.rpc('admin_logistics_list', { code: getAdminPin(), p_search: '', p_filter: 'awaiting', p_limit: 200, p_offset: 0 });
    if (error) throw error; return arr(data);
  });
  return (
    <Shell title="Logistics queue" sub="Orders awaiting a tracking number. Saving tracking and changing shipment status is done on the Logistics page, which this list links to." onRefresh={reload} loading={loading} err={err}>
      <Grid><Stat label="Awaiting tracking" value={(rows || []).length} /></Grid>
      <Link to="/logistics" className="neu-btn" style={{ display: 'inline-block', padding: '8px 16px', textDecoration: 'none', marginBottom: 12 }}>Open Logistics ›</Link>
      {(rows || []).length === 0 && <Empty loading={loading} text="Nothing awaiting tracking." />}
      {(rows || []).map((r, i) => (
        <div key={r.id || i} style={card}>
          <b>{r.order_code || String(r.id || '').slice(0, 8)}</b> <span style={muted}>{String(r.status || '')}</span>
          <div style={muted}>{[r.name || r.customer_name, r.city || r.province, r.created_at ? dateTime(r.created_at) : ''].filter(Boolean).join(' · ')}</div>
        </div>
      ))}
    </Shell>
  );
}
