import React, { useCallback, useEffect, useState } from 'react';
import { call, card, inp, Btn } from './shared.jsx';
import { dateTime } from '../../lib/format.js';

const DEL = { global_messages: ['admin_chat_delete', 'p_id'], post_comments: ['admin_social_comment_delete', 'p_id'], video_comments: ['admin_video_comment_delete', 'p_comment'] };
const COLOR = { flag: '#D97706', delete: '#DC2626', mute: '#7C3AED', unmute: '#059669', setting: '#2563EB' };
const SRC = { global_messages: 'Global Chat', post_comments: 'Post comment', video_comments: 'Video comment' };

export default function LogTab() {
  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { const d = await call('mod_log_list', { p_kind: kind || null, p_limit: 300 }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, [kind]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const remove = async (r) => {
    const d = DEL[r.source];
    if (!d || !r.ref_id || !window.confirm('Delete this content from XMARKET?')) return;
    try { await call(d[0], { [d[1]]: r.ref_id }); await load(); } catch (e) { setErr(e.message); }
  };
  const mute = async (r) => {
    if (!window.confirm('Mute @' + (r.username || 'user') + ' for 1 hour?')) return;
    try { await call('mod_mute', { p_user: r.user_id, p_minutes: 60, p_reason: 'Flagged: ' + (r.reason || '') }); await load(); } catch (e) { setErr(e.message); }
  };
  const exportCsv = () => {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['time', 'kind', 'user', 'source', 'content', 'reason', 'actor'];
    const body = (rows || []).map((r) => [r.created_at, r.kind, r.username, r.source, r.content, r.reason, r.actor].map(q).join(','));
    const blob = new Blob([[head.map(q).join(','), ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'takedown-log.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={inp}>
          <option value="">All events</option><option value="flag">Flagged</option><option value="delete">Deleted</option>
          <option value="mute">Mutes</option><option value="unmute">Unmutes</option><option value="setting">Settings</option>
        </select>
        <Btn onClick={load}>Refresh</Btn>
        <Btn onClick={exportCsv} disabled={!rows || !rows.length}>Export CSV</Btn>
      </div>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      {!rows && <div style={card}>Loading...</div>}
      {rows && rows.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#8a93a3' }}>No events yet.</div>}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, color: '#fff', background: COLOR[r.kind] || '#64748B' }}>{r.kind}</span>
            <b>{r.username ? '@' + r.username : r.actor}</b>
            <span style={{ fontSize: 12, color: '#8a93a3' }}>{SRC[r.source] || r.source} · {dateTime(r.created_at)}</span>
          </div>
          {r.content && <p style={{ margin: '8px 0 4px', wordBreak: 'break-word' }}>{r.content}</p>}
          {r.reason && <div style={{ fontSize: 12, color: '#8a93a3' }}>{r.reason}</div>}
          {r.kind === 'flag' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {DEL[r.source] && <Btn onClick={() => remove(r)} style={{ padding: '4px 10px', fontSize: 11 }}>Delete content</Btn>}
              {r.user_id && <Btn onClick={() => mute(r)} style={{ padding: '4px 10px', fontSize: 11 }}>Mute 1h</Btn>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
