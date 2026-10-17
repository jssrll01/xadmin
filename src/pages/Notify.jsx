import React, { useState, useEffect, useCallback } from 'react';
import { xrpc } from '../lib/xrpc.js';

const fmt = (d) => new Date(d).toLocaleString();
const BLANK = { id: null, target: 'all', title: '', body: '' };
const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', marginBottom: 10, fontSize: 15 };
const btn = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 };
const card = { padding: 12, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' };

export default function Notify() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const l = await xrpc('admin_notif_list'); setRows(Array.isArray(l) ? l : []); setSel(new Set()); setErr(''); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); xrpc('admin_notif_users').then((u) => setUsers(u || [])).catch(() => {}); }, [load]);

  const run = async (fn, a, msg) => {
    try { const r = await xrpc(fn, a); if (msg) say(typeof msg === 'function' ? msg(r) : msg); load(); return r; }
    catch (e) { setErr(e.message || String(e)); }
  };
  const allSel = rows.length > 0 && sel.size === rows.length;
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    if (form.id) await run('admin_notif_update', { p_id: form.id, p_title: form.title, p_body: form.body }, 'Updated');
    else await run('admin_notif_create', { p_user: form.target === 'all' ? null : form.target, p_title: form.title, p_body: form.body }, (n) => 'Sent to ' + n + (n === 1 ? ' account' : ' accounts'));
    setOpen(false);
  };
  const delMany = (ids) => window.confirm('Delete ' + ids.length + ' notification(s)?') && run('admin_notif_delete_many', { p_ids: ids }, 'Deleted');
  const clearAll = () => window.confirm('Clear ALL notifications for ALL accounts? This cannot be undone.') && run('admin_notif_clear_all', {}, (n) => 'Cleared ' + n);
  const row = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12, maxWidth: 900 }}>
      <h2 style={{ margin: 0 }}>Notify</h2>
      <div style={card}>
        <div style={row}>
          <button style={btn} onClick={() => { setForm(BLANK); setErr(''); setOpen(true); }}>+ New</button>
          <button style={btn} disabled={!sel.size} onClick={() => delMany([...sel])}>Delete ({sel.size})</button>
          <button style={btn} disabled={!sel.size} onClick={() => run('admin_notif_set_read', { p_ids: [...sel], p_read: true })}>Mark read</button>
          <button style={btn} disabled={!sel.size} onClick={() => run('admin_notif_set_read', { p_ids: [...sel], p_read: false })}>Mark unread</button>
          <button style={btn} disabled={!rows.length} onClick={clearAll}>Clear all</button>
          <button style={btn} onClick={load}>{loading ? '…' : 'Refresh'}</button>
        </div>
        <label style={{ ...row, marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} />
          Select all ({rows.length})
        </label>
      </div>
      {err && !open && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
      {!loading && !rows.length && <div style={{ ...card, textAlign: 'center' }}>No notifications.</div>}
      {rows.map((r) => (
        <div key={r.id} style={{ ...card, display: 'flex', gap: 10 }}>
          <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} style={{ marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...row, justifyContent: 'space-between' }}><b>{r.title}</b><span style={{ fontSize: 12 }}>{r.read ? 'Read' : 'Unread'}</span></div>
            <div style={{ margin: '4px 0', wordBreak: 'break-word' }}>{r.body}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>To: {r.email || r.user_id} · {fmt(r.created_at)}</div>
            <div style={{ ...row, marginTop: 8 }}>
              <button style={btn} onClick={() => { setForm({ id: r.id, target: r.user_id, title: r.title || '', body: r.body || '' }); setErr(''); setOpen(true); }}>Edit</button>
              <button style={btn} onClick={() => run('admin_notif_set_read', { p_ids: [r.id], p_read: !r.read })}>{r.read ? 'Mark unread' : 'Mark read'}</button>
              <button style={btn} onClick={() => delMany([r.id])}>Delete</button>
            </div>
          </div>
        </div>
      ))}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(440px, 92vw)', padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit notification' : 'New notification'}</h3>
            {!form.id && (
              <select style={inp} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="all">All accounts</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.email || u.username || u.id}</option>)}
              </select>
            )}
            <input style={inp} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea style={inp} rows={4} placeholder="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{err}</div>}
            <div style={row}><button style={btn} onClick={save}>{form.id ? 'Save' : 'Send'}</button><button style={btn} onClick={() => setOpen(false)}>Cancel</button></div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 16px', borderRadius: 99, fontSize: 14, zIndex: 2000 }}>{toast}</div>}
    </div>
  );
}
