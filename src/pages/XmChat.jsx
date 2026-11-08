import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Search, Send, Edit2, Trash2, RefreshCw, Eraser } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { xrpc } from '../lib/xrpc.js';

const inp = { width: '100%', border: 'none', outline: 'none', borderRadius: 12, padding: '10px 12px', fontSize: 13, background: 'var(--bg, #e0e5ec)', color: 'inherit', boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.7)' };
const lbl = { fontSize: 11, fontWeight: 800, opacity: 0.65, margin: '10px 0 4px', display: 'block' };
const fdt = (d) => new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

export default function XmChat() {
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [post, setPost] = useState(null);
  const [edit, setEdit] = useState(null);
  const [purge, setPurge] = useState(null);

  const load = useCallback(async (search) => {
    try {
      const l = await xrpc('admin_chat_list', { p_search: (search ?? '') || null, p_limit: 300 });
      setRows(Array.isArray(l) ? l : []);
    } catch (e) { show?.(e.message || 'Failed to load', 'error'); }
    setLoading(false);
  }, [show]);

  useEffect(() => { const t = setTimeout(() => load(q.trim()), 350); return () => clearTimeout(t); }, [q, load]);
  useEffect(() => { const t = setInterval(() => load(q.trim()), 8000); return () => clearInterval(t); }, [q, load]);

  const run = async (fn, args, okMsg) => {
    setBusy(true);
    try { const r = await xrpc(fn, args); show?.(typeof r?.deleted === 'number' ? okMsg + ' (' + r.deleted + ')' : okMsg, 'success'); await load(q.trim()); return true; }
    catch (e) { show?.(e.message || 'Failed', 'error'); return false; }
    finally { setBusy(false); }
  };

  const doPost = async () => {
    if (!post?.user?.trim() || !post?.body?.trim()) return show?.('User and message are required', 'error');
    if (await run('admin_chat_post', { p_user: post.user.trim(), p_body: post.body }, 'Message posted')) setPost(null);
  };
  const doEdit = async () => { if (await run('admin_chat_update', { p_id: edit.id, p_body: edit.body }, 'Message updated')) setEdit(null); };
  const del = (r) => { if (window.confirm('Delete this message?')) run('admin_chat_delete', { p_id: r.id }, 'Message deleted'); };
  const doPurge = async () => {
    const user = (purge?.user || '').trim();
    const before = purge?.before ? new Date(purge.before).toISOString() : null;
    if (!user && !before) return show?.('Enter a user or a date', 'error');
    if (!window.confirm('Permanently delete matching messages?')) return;
    if (await run('admin_chat_purge', { p_user: user || null, p_before: before }, 'Purged')) setPurge(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={22} /> Global Chat</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{rows.length} messages shown · auto-refreshes</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={() => load(q.trim())}><RefreshCw size={14} /></Btn>
          <Btn onClick={() => setPurge({ user: '', before: '' })}><Eraser size={14} /> Purge</Btn>
          <Btn variant="primary" onClick={() => setPost({ user: '', body: '' })}><Send size={14} /> Post as user</Btn>
        </div>
      </div>

      <Card style={{ padding: 12 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, opacity: 0.5 }} />
          <input style={{ ...inp, paddingLeft: 34 }} placeholder="Search message, username, email or user ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading && <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>Loading…</div>}
        {!loading && rows.length === 0 && <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No messages found</div>}
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 4px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {r.username || 'XMARKET user'}
                {r.is_vip && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 999, background: '#FBBF24', color: '#7C4A03' }}>VIP</span>}
                <span style={{ fontWeight: 600, opacity: 0.55, marginLeft: 8 }}>{r.email}</span>
              </div>
              <div style={{ fontSize: 14, margin: '3px 0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{r.body}</div>
              {r.kind === 'share' && r.share && <div style={{ fontSize: 12, opacity: 0.75 }}>🔗 {r.share.type}: {r.share.title || r.share.id} (by @{r.share.username})</div>}
              <div style={{ fontSize: 11, opacity: 0.5 }}>{fdt(r.created_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {r.kind !== 'share' && <Btn onClick={() => setEdit({ id: r.id, body: r.body })}><Edit2 size={13} /></Btn>}
              <Btn variant="danger" onClick={() => del(r)} disabled={busy}><Trash2 size={13} /></Btn>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={!!post} onClose={() => setPost(null)} title="Post as user">
        <label style={lbl}>User email or ID</label>
        <input style={inp} value={post?.user || ''} onChange={(e) => setPost({ ...post, user: e.target.value })} placeholder="admin@email.com" />
        <label style={lbl}>Message (max 500)</label>
        <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} maxLength={500} value={post?.body || ''} onChange={(e) => setPost({ ...post, body: e.target.value })} />
        <Btn variant="primary" style={{ width: '100%', marginTop: 14 }} onClick={doPost} disabled={busy}>{busy ? 'Posting…' : 'Post message'}</Btn>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit message">
        <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} maxLength={500} value={edit?.body || ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
        <Btn variant="primary" style={{ width: '100%', marginTop: 14 }} onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
      </Modal>

      <Modal open={!!purge} onClose={() => setPurge(null)} title="Purge messages">
        <div style={{ fontSize: 12, opacity: 0.7 }}>Fill one or both. A user deletes all of that user's messages. A date deletes everything older than it. Both together deletes that user's messages older than the date.</div>
        <label style={lbl}>User email or ID (optional)</label>
        <input style={inp} value={purge?.user || ''} onChange={(e) => setPurge({ ...purge, user: e.target.value })} />
        <label style={lbl}>Older than (optional)</label>
        <input style={inp} type="datetime-local" value={purge?.before || ''} onChange={(e) => setPurge({ ...purge, before: e.target.value })} />
        <Btn variant="danger" style={{ width: '100%', marginTop: 14 }} onClick={doPurge} disabled={busy}>{busy ? 'Deleting…' : 'Delete matching messages'}</Btn>
      </Modal>
    </div>
  );
}
