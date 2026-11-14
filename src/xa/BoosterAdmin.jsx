import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Zap } from 'lucide-react';
import { adm } from './db.js';
import Modal from '../components/Modal.jsx';
import { Badge, EmptyState, ErrorState, LoadingBtn, SkRows, useXaToast } from './Kit.jsx';
import { ago, peso, when } from './xaFmt.js';

const SIZE = 20;
const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube'];
const STATUSES = ['pending', 'starting', 'ongoing', 'completed', 'cancelled'];
const LABEL = { pending: 'Pending', starting: 'Starting', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' };
const TONE = { pending: 'warn', starting: undefined, ongoing: undefined, completed: 'ok', cancelled: 'bad' };
const NEXT = { pending: 'starting', starting: 'ongoing', ongoing: 'completed' };
const NEXT_BTN = { starting: 'Start order', ongoing: 'Mark ongoing', completed: 'Mark completed' };
const LABEL_KEY = 'xa_admin_label';
const readLabel = () => { try { return localStorage.getItem(LABEL_KEY) || ''; } catch (e) { return ''; } };
const writeLabel = (v) => { try { localStorage.setItem(LABEL_KEY, v); } catch (e) { /* storage blocked */ } };
const isUrl = (t) => /^https:\/\/\S+$/i.test(String(t || ''));
const lbl = { fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', margin: '10px 0 4px' };

/* ---------------- orders ---------------- */
export function OrderCard({ o, onAct, onHist }) {
  const nxt = NEXT[o.status];
  const final = o.status === 'completed' || o.status === 'cancelled';
  return (
    <div className="neu-card" style={{ padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13.5 }}>{o.order_no}</b>
        <Badge tone={TONE[o.status]}>{LABEL[o.status]}</Badge>
        {o.edit_count > 0 && <Badge>edited {o.edit_count}x</Badge>}
        <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.65 }}>{ago(o.created_at)}</span>
      </div>
      <div style={{ marginTop: 6, fontWeight: 800, fontSize: 14 }}>{o.service_name}</div>
      <div style={{ fontSize: 12.5, opacity: 0.75 }}>{o.platform} / {o.category} / {Number(o.quantity).toLocaleString()} units / <b>{peso(o.total_price)}</b></div>
      <div style={{ fontSize: 12.5, marginTop: 4, wordBreak: 'break-all' }}>
        <span style={{ opacity: 0.65 }}>Target </span>
        {isUrl(o.target) ? <a href={o.target} target="_blank" rel="noopener noreferrer nofollow">{o.target}</a> : <b>{o.target}</b>}
      </div>
      <div style={{ fontSize: 12.5, marginTop: 4 }}>
        <span style={{ opacity: 0.65 }}>User </span><b>{o.username ? '@' + o.username : 'unknown'}</b> <span style={{ opacity: 0.65 }}>{o.email || ''}</span>
      </div>
      {o.user_note && <div style={{ fontSize: 12.5, marginTop: 6, padding: 8, borderRadius: 10, background: 'var(--surface-2)', wordBreak: 'break-word' }}>Customer note: {o.user_note}</div>}
      {o.admin_note && <div style={{ fontSize: 12.5, marginTop: 6, padding: 8, borderRadius: 10, background: 'var(--primary-soft)', wordBreak: 'break-word' }}>Admin note: {o.admin_note}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {nxt && <button type="button" className="neu-btn neu-btn-primary" onClick={() => onAct(o, nxt)}>{NEXT_BTN[nxt]}</button>}
        {!final && <button type="button" className="neu-btn neu-btn-danger" onClick={() => onAct(o, 'cancelled')}>Cancel and refund</button>}
        <button type="button" className="neu-btn" data-xa-skip onClick={() => onHist(o)}>History</button>
      </div>
    </div>
  );
}

export function StatusDialog({ act, onClose, onDone }) {
  const { push } = useXaToast();
  const [note, setNote] = useState('');
  const [by, setBy] = useState(readLabel);
  const [busy, setBusy] = useState(false);
  const cancel = act.status === 'cancelled';
  const go = async () => {
    setBusy(true);
    try {
      if (by.trim()) writeLabel(by.trim());
      await adm('adm_booster_order_set', { p_order: act.order.id, p_status: act.status, p_note: note.trim() || null, p_by: by.trim() || null });
      push(cancel ? 'Order cancelled and refunded' : 'Order moved to ' + LABEL[act.status].toLowerCase(), 'success');
      onDone();
    } catch (e) {
      push(e.message, 'error', 6000);
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} title={cancel ? 'Cancel and refund' : 'Move to ' + LABEL[act.status].toLowerCase()}>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <b>{act.order.order_no}</b> / {act.order.service_name} / {peso(act.order.total_price)}
      </div>
      {cancel && <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>The customer gets a full refund of {peso(act.order.total_price)} to their Xwallet right away.</div>}
      <label style={lbl}>Note for the customer (optional, shown in their order and notification)</label>
      <textarea className="xa-input" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={cancel ? 'Reason for cancelling' : 'Optional'} />
      <label style={lbl}>Handled by (optional, saved in the history)</label>
      <input className="xa-input" maxLength={40} value={by} onChange={(e) => setBy(e.target.value)} placeholder="Your name" />
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="neu-btn" disabled={busy} onClick={onClose}>Close</button>
        <LoadingBtn variant={cancel ? 'danger' : 'primary'} loading={busy} onClick={go}>{cancel ? 'Cancel and refund' : 'Confirm'}</LoadingBtn>
      </div>
    </Modal>
  );
}

export function HistoryDialog({ order, onClose }) {
  const [ev, setEv] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    adm('adm_booster_order_events', { p_order: order.id }).then((r) => { if (alive) setEv(r); }).catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [order.id]);
  return (
    <Modal open onClose={onClose} title={'History ' + order.order_no}>
      {err && <ErrorState message={err} />}
      {!err && !ev && <SkRows rows={3} cols={2} />}
      {ev && ev.length === 0 && <EmptyState title="No history" />}
      {ev && ev.map((e) => (
        <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
          <b>{e.from_status ? LABEL[e.from_status] + ' to ' + LABEL[e.to_status] : LABEL[e.to_status]}</b>
          <span style={{ opacity: 0.65 }}> / {e.actor} / {when(e.created_at)}</span>
          {e.note && <div style={{ opacity: 0.8, wordBreak: 'break-word' }}>{e.note}</div>}
        </div>
      ))}
    </Modal>
  );
}

export function Orders() {
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [act, setAct] = useState(null);
  const [hist, setHist] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const my = ++reqRef.current;
    try {
      const r = await adm('adm_booster_orders', {
        p_status: status || null, p_platform: platform || null, p_from: from || null, p_to: to || null,
        p_q: dq || null, p_limit: SIZE, p_offset: page * SIZE
      });
      if (my !== reqRef.current) return;
      setData(r);
      setErr('');
    } catch (e) {
      if (my === reqRef.current) setErr(e.message);
    }
  }, [status, platform, from, to, dq, page]);

  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(t);
  }, [load]);

  const counts = (data && data.counts) || {};
  const all = STATUSES.reduce((s, k) => s + Number(counts[k] || 0), 0);
  const pages = data ? Math.max(1, Math.ceil(Number(data.total) / SIZE)) : 1;

  return (
    <>
      <div className="neu-card" style={{ padding: 12, marginBottom: 12 }}>
        <input className="xa-input" placeholder="Search order no, @user, email, link or service" aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <select className="xa-input" style={{ width: 'auto', flex: '1 1 130px' }} value={platform} aria-label="Platform" onChange={(e) => { setPlatform(e.target.value); setPage(0); }}>
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" className="xa-input" style={{ width: 'auto', flex: '1 1 130px' }} value={from} aria-label="From date" onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
          <input type="date" className="xa-input" style={{ width: 'auto', flex: '1 1 130px' }} value={to} aria-label="To date" onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" data-xa-skip className={'neu-btn' + (status === '' ? ' neu-btn-primary' : '')} onClick={() => { setStatus(''); setPage(0); }}>All ({all})</button>
        {STATUSES.map((s) => (
          <button key={s} type="button" data-xa-skip className={'neu-btn' + (status === s ? ' neu-btn-primary' : '')} onClick={() => { setStatus(s); setPage(0); }}>{LABEL[s]} ({counts[s] || 0})</button>
        ))}
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={load} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !data && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {data && data.rows.length === 0 && <EmptyState title="No orders found" hint="Try a different filter." />}
      {data && data.rows.map((o) => <OrderCard key={o.id} o={o} onAct={(order, st) => setAct({ order, status: st })} onHist={setHist} />)}
      {data && Number(data.total) > SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <button type="button" data-xa-skip className="neu-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Page {page + 1} of {pages}</span>
          <button type="button" data-xa-skip className="neu-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {act && <StatusDialog act={act} onClose={() => setAct(null)} onDone={() => { setAct(null); load(); }} />}
      {hist && <HistoryDialog order={hist} onClose={() => setHist(null)} />}
    </>
  );
}

/* ---------------- services ---------------- */
const rowOf = (s, over) => ({
  id: s.id, platform: s.platform, category: s.category, name: s.name, description: s.description, price: s.price,
  per_qty: s.per_qty, min_qty: s.min_qty, max_qty: s.max_qty, est_time: s.est_time, target_kind: s.target_kind,
  popular: s.popular, is_active: s.is_active, ...over
});

function ServiceForm({ initial, cats, onClose, onSaved }) {
  const { push } = useXaToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(() => ({
    id: initial ? initial.id : '',
    platform: initial ? initial.platform : 'Facebook',
    category: initial ? initial.category : 'Followers',
    name: initial ? initial.name : '',
    description: initial && initial.description ? initial.description : '',
    price: initial ? String(initial.price) : '',
    per_qty: initial ? String(initial.per_qty) : '500',
    min_qty: initial ? String(initial.min_qty) : '100',
    max_qty: initial ? String(initial.max_qty) : '10000',
    est_time: initial ? initial.est_time || '' : 'After admin review',
    target_kind: initial ? initial.target_kind : 'link',
    popular: initial ? !!initial.popular : false,
    is_active: initial ? !!initial.is_active : true
  }));
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.name.trim() || !f.platform.trim() || !f.category.trim()) { push('Platform, category and name are required.', 'error'); return; }
    const price = Number(f.price);
    const per = parseInt(f.per_qty, 10);
    const mn = parseInt(f.min_qty, 10);
    const mx = parseInt(f.max_qty, 10);
    if (f.price === '' || Number.isNaN(price) || price < 0) { push('Enter a valid price.', 'error'); return; }
    if (!(per >= 1) || !(mn >= 1) || !(mx >= mn)) { push('Per quantity and minimum must be 1 or more, and maximum at least the minimum.', 'error'); return; }
    setBusy(true);
    try {
      await adm('adm_booster_service_save', {
        p_row: {
          id: f.id || null, platform: f.platform.trim(), category: f.category.trim(), name: f.name.trim(), description: f.description.trim() || null,
          price, per_qty: per, min_qty: mn, max_qty: mx, est_time: f.est_time.trim() || null, target_kind: f.target_kind, popular: f.popular, is_active: f.is_active
        }
      });
      push('Saved', 'success');
      onSaved();
    } catch (e) {
      push(e.message, 'error', 6000);
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} title={initial ? 'Edit service' : 'Add service'}>
      <label style={lbl}>Platform</label>
      <input className="xa-input" list="bst-plats" value={f.platform} onChange={(e) => set('platform', e.target.value)} />
      <datalist id="bst-plats">{PLATFORMS.map((p) => <option key={p} value={p} />)}</datalist>
      <label style={lbl}>Category</label>
      <input className="xa-input" list="bst-cats" value={f.category} onChange={(e) => set('category', e.target.value)} />
      <datalist id="bst-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
      <label style={lbl}>Name</label>
      <input className="xa-input" maxLength={160} value={f.name} onChange={(e) => set('name', e.target.value)} />
      <label style={lbl}>Description (shown to customers)</label>
      <textarea className="xa-input" rows={3} maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 110px' }}><label style={lbl}>Price (peso)</label><input className="xa-input" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div style={{ flex: '1 1 110px' }}><label style={lbl}>Per quantity</label><input className="xa-input" inputMode="numeric" value={f.per_qty} onChange={(e) => set('per_qty', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 110px' }}><label style={lbl}>Minimum</label><input className="xa-input" inputMode="numeric" value={f.min_qty} onChange={(e) => set('min_qty', e.target.value)} /></div>
        <div style={{ flex: '1 1 110px' }}><label style={lbl}>Maximum</label><input className="xa-input" inputMode="numeric" value={f.max_qty} onChange={(e) => set('max_qty', e.target.value)} /></div>
      </div>
      <label style={lbl}>Start time text</label>
      <input className="xa-input" maxLength={80} value={f.est_time} onChange={(e) => set('est_time', e.target.value)} />
      <label style={lbl}>What the customer enters</label>
      <select className="xa-input" value={f.target_kind} onChange={(e) => set('target_kind', e.target.value)}>
        <option value="link">A post or video link (must be https)</option>
        <option value="profile">A username or profile link</option>
      </select>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, marginTop: 12 }}>
        <input type="checkbox" checked={f.popular} onChange={(e) => set('popular', e.target.checked)} /> Show in the Popular row
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
        <input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active (visible to customers)
      </label>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="neu-btn" disabled={busy} onClick={onClose}>Close</button>
        <LoadingBtn variant="primary" loading={busy} onClick={save}>Save</LoadingBtn>
      </div>
    </Modal>
  );
}

export function Services() {
  const { push } = useXaToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [plat, setPlat] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(30);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setRows(await adm('adm_booster_services')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => [...new Set((rows || []).map((s) => s.category))], [rows]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows || []).filter((s) => (!plat || s.platform === plat) && (!t || s.name.toLowerCase().includes(t)));
  }, [rows, plat, q]);

  const toggle = async (s) => {
    const next = !s.is_active;
    setRows((a) => a.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    try {
      await adm('adm_booster_service_save', { p_row: rowOf(s, { is_active: next }) });
    } catch (e) {
      setRows((a) => a.map((x) => (x.id === s.id ? { ...x, is_active: s.is_active } : x)));
      push(e.message, 'error');
    }
  };
  const move = async (s, dir) => {
    setBusy(s.id);
    try { await adm('adm_booster_service_move', { p_id: s.id, p_dir: dir }); await load(); } catch (e) { push(e.message, 'error'); }
    setBusy('');
  };
  const remove = async () => {
    setBusy('del');
    try {
      await adm('adm_booster_service_delete', { p_id: del.id });
      push('Deleted', 'success');
      setDel(null);
      await load();
    } catch (e) {
      push(e.message, 'error', 6000);
    }
    setBusy('');
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="xa-input" style={{ flex: '1 1 160px', width: 'auto' }} placeholder="Search services" aria-label="Search services" value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }} />
        <select className="xa-input" style={{ width: 'auto', flex: '0 1 140px' }} value={plat} aria-label="Platform" onChange={(e) => { setPlat(e.target.value); setLimit(30); }}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="button" className="neu-btn neu-btn-primary" onClick={() => setForm({})}><Plus size={14} /> Add</button>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !rows && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {rows && shown.length === 0 && <EmptyState title="No services found" hint="Add one or change the filter." />}
      {shown.slice(0, limit).map((s) => (
        <div key={s.id} className="neu-card" style={{ padding: 12, marginBottom: 10, opacity: s.is_active ? 1 : 0.6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge>{s.platform}</Badge>
            <Badge>{s.category}</Badge>
            {s.popular && <Badge tone="warn">Popular</Badge>}
            {!s.is_active && <Badge tone="bad">Disabled</Badge>}
            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.65 }}>{s.orders} orders</span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 800, fontSize: 14, wordBreak: 'break-word' }}>{s.name}</div>
          <div style={{ fontSize: 12.5, opacity: 0.75 }}>
            {peso(s.price)} per {Number(s.per_qty).toLocaleString()} / min {Number(s.min_qty).toLocaleString()} / max {Number(s.max_qty).toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" className="neu-btn" data-xa-skip disabled={busy === s.id} aria-label="Move up" onClick={() => move(s, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="neu-btn" data-xa-skip disabled={busy === s.id} aria-label="Move down" onClick={() => move(s, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="neu-btn" data-xa-skip onClick={() => toggle(s)}>{s.is_active ? 'Disable' : 'Enable'}</button>
            <button type="button" className="neu-btn" data-xa-skip onClick={() => setForm(s)}>Edit</button>
            <button type="button" className="neu-btn neu-btn-danger" data-xa-skip onClick={() => setDel(s)}>Delete</button>
          </div>
        </div>
      ))}
      {shown.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button type="button" className="neu-btn" data-xa-skip onClick={() => setLimit(limit + 30)}>Load more ({shown.length - limit} left)</button>
        </div>
      )}
      {form && <ServiceForm initial={form.id ? form : null} cats={cats} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {del && (
        <Modal open onClose={() => { if (busy !== 'del') setDel(null); }} title="Delete service">
          <div style={{ fontSize: 13 }}>Delete <b>{del.name}</b>? This cannot be undone. A service that already has orders cannot be deleted, so disable it instead.</div>
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="neu-btn" disabled={busy === 'del'} onClick={() => setDel(null)}>Close</button>
            <LoadingBtn variant="danger" loading={busy === 'del'} onClick={remove}>Delete</LoadingBtn>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ---------------- page ---------------- */
export default function BoosterAdmin() {
  const [tab, setTab] = useState('orders');
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Zap size={20} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Social Booster</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" data-xa-skip className={'neu-btn' + (tab === 'orders' ? ' neu-btn-primary' : '')} onClick={() => setTab('orders')}>Orders</button>
        <button type="button" data-xa-skip className={'neu-btn' + (tab === 'services' ? ' neu-btn-primary' : '')} onClick={() => setTab('services')}>Services</button>
      </div>
      {tab === 'orders' ? <Orders /> : <Services />}
    </div>
  );
}
