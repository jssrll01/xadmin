import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { dateTime } from '../lib/format.js';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };

export default function SocialMod() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('active');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const d = await call('admin_social_posts'); setRows(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setRows([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!window.confirm('Remove this post from Socials?')) return;
    setBusy(true);
    try { await call('admin_social_post_remove', { p_id: p.id }); await load(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const ban = async (p) => {
    const reason = window.prompt('Reason for the PERMANENT ban of @' + p.creator + ':', '');
    if (reason === null) return;
    if (!window.confirm('Permanently ban @' + p.creator + '? This cannot be undone and removes all their posts.')) return;
    setBusy(true);
    try { await call('admin_creator_ban', { p_user: p.creator_id, p_reason: reason }); await load(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const list = (rows || []).filter(p => filter === 'all' || p.status === filter);
  return (
    <div style={{ padding: 16 }}>
      <style>{'@keyframes xsk{0%,100%{opacity:.4}50%{opacity:1}}'}</style>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Socials Moderation</h2>
      <p style={{ color: '#8a93a3', fontSize: 13, margin: '0 0 12px' }}>Latest 100 creator posts. Banning a creator is permanent.</p>
      <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 10, marginBottom: 12 }}>
        <option value="active">Active</option><option value="removed">Removed</option><option value="all">All</option>
      </select>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      {!rows && [0, 1, 2].map(i => <div key={i} style={{ height: 110, borderRadius: 16, marginBottom: 10, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' }} />)}
      {rows && list.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#8a93a3' }}>No posts.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {list.map(p => (
          <div key={p.id} style={{ ...card, display: 'flex', gap: 12, opacity: p.status === 'active' ? 1 : 0.6 }}>
            <a href={p.image_url} target="_blank" rel="noreferrer"><img src={p.image_url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }} /></a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>@{p.creator}{p.status !== 'active' && <span style={{ marginLeft: 6, fontSize: 10, color: '#DC2626' }}>REMOVED</span>}</div>
              <div style={{ fontSize: 11, color: '#8a93a3' }}>{dateTime(p.created_at)}</div>
              <div style={{ fontSize: 13, margin: '4px 0 8px', maxHeight: 54, overflow: 'hidden', wordBreak: 'break-word' }}>{p.description}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {p.status === 'active' && <button className="neu-btn" disabled={busy} onClick={() => remove(p)} style={{ padding: '4px 10px', fontSize: 11 }}>remove post</button>}
                <button className="neu-btn" disabled={busy} onClick={() => ban(p)} style={{ padding: '4px 10px', fontSize: 11, color: '#DC2626' }}>ban creator</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
