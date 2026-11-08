import { getAdminPin } from '../lib/pin.js';
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import TagEditor from '../components/TagEditor.jsx';

const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, display: 'flex', gap: 12, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };
const thumb = (v) => (v.platform === 'tiktok' ? v.thumb_url : 'https://i.ytimg.com/vi/' + v.youtube_id + '/hqdefault.jpg');
const link = (v) => (v.platform === 'tiktok' ? 'https://www.tiktok.com/video/' + v.youtube_id : 'https://www.youtube.com/watch?v=' + v.youtube_id);

export default function VideoMod() {
  const [status, setStatus] = useState('active');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cm, setCm] = useState(null);
  const [tags, setTags] = useState(null);

  const load = useCallback(async () => {
    try { const d = await call('admin_videos_list', { p_status: status, p_limit: 100 }); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, [status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const setSt = async (v, st) => {
    if (!window.confirm(st === 'removed' ? 'Remove this video from Socials?' : 'Restore this video?')) return;
    setBusy(true);
    try {
      const r = await call('admin_video_set_status', { p_video: v.id, p_status: st });
      if (r && !r.ok) setErr(r.error); else await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const openCm = async (v) => {
    try { setCm({ video: v, rows: (await call('admin_video_comments', { p_video: v.id })) || [] }); } catch (e) { setErr(e.message); }
  };
  const delCm = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const r = await call('admin_video_comment_delete', { p_comment: c.id });
      if (r && !r.ok) return setErr(r.error);
      setCm((s) => ({ ...s, rows: s.rows.filter((x) => x.id !== c.id) })); load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Socials Videos</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['active', 'Live'], ['removed', 'Removed']].map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setStatus(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: status === id ? 1 : .6 }}>{l}</button>
        ))}
      </div>
      {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {rows === null && <div>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ opacity: .6, padding: 20 }}>No videos here.</div>}
      {rows && rows.map((v) => (
        <div key={v.id} style={card}>
          <div style={{ width: 62, height: 110, borderRadius: 10, background: '#0F172A', flexShrink: 0, overflow: 'hidden' }}>
            {thumb(v) && <img src={thumb(v)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>@{v.username} <span style={{ fontSize: 11, opacity: .6 }}>{v.platform}{v.is_short ? ' · short' : ''}</span></div>
            <div style={{ fontSize: 12, opacity: .7, margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || '(no title)'}</div>
            <div style={{ fontSize: 12 }}>{v.likes} likes · {v.comments} comments</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <a className="neu-btn" href={link(v)} target="_blank" rel="noopener noreferrer" style={{ ...sm, textDecoration: 'none' }}>Open</a>
              <button className="neu-btn" style={sm} onClick={() => openCm(v)}>Comments</button>
              <button className="neu-btn" style={sm} onClick={() => setTags(v)}>Products ({(v.products || []).length})</button>
              {status === 'active'
                ? <button className="neu-btn" disabled={busy} style={{ ...sm, color: '#DC2626' }} onClick={() => setSt(v, 'removed')}>Remove</button>
                : <button className="neu-btn" disabled={busy} style={sm} onClick={() => setSt(v, 'active')}>Restore</button>}
            </div>
          </div>
        </div>
      ))}
      {tags && <TagEditor title={'Products on video by @' + tags.username} fn="admin_video_set_products" id={tags.id} initial={tags.products || []} onClose={() => setTags(null)} onSaved={() => { setTags(null); load(); }} />}
      {cm && (
        <div onClick={() => setCm(null)} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, display: 'block', width: '100%', maxWidth: 480, maxHeight: '75vh', overflowY: 'auto', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: 8 }}><span>Comments on @{cm.video.username}</span><button onClick={() => setCm(null)}>✕</button></div>
            {cm.rows.length === 0 && <div style={{ opacity: .6 }}>No comments.</div>}
            {cm.rows.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}><b>@{c.username}</b><div style={{ fontSize: 14 }}>{c.body}</div></div>
                <button onClick={() => delCm(c)} style={{ color: '#DC2626', fontWeight: 800, fontSize: 12 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
