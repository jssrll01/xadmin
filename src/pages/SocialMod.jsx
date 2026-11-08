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
const sm = { padding: '4px 10px', fontSize: 11 };
const sk = { height: 100, borderRadius: 16, marginBottom: 10, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' };

export default function SocialMod() {
  const [tab, setTab] = useState('posts');
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState({ a: [], b: [] });

  const load = useCallback(async () => {
    try {
      const d = tab === 'posts' ? await call('admin_social_posts', { p_q: q || null, p_status: status || null }) : await call('admin_social_creators');
      setRows(Array.isArray(d) ? d : []); setErr('');
    } catch (e) { setRows([]); setErr(e.message); }
  }, [tab, q, status]);
  useEffect(() => { setRows(null); setOpen(null); const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const act = async (fn, args, ask, after) => {
    if (ask && !window.confirm(ask)) return;
    setBusy(true);
    try { await call(fn, args); await load(); if (after) await after(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const toggle = async (id, kind) => {
    if (open && open.id === id && open.kind === kind) { setOpen(null); return; }
    setOpen({ id, kind });
    try {
      if (kind === 'post') {
        const [a, b] = await Promise.all([call('admin_social_comments', { p_post: id }), call('admin_social_likes', { p_post: id })]);
        setDetail({ a: a || [], b: b || [] });
      } else setDetail({ a: [], b: (await call('admin_social_followers', { p_creator: id })) || [] });
    } catch (e) { setErr(e.message); }
  };
  const reopen = (id, kind) => async () => { setOpen(null); await toggle(id, kind); };

  const edit = (p) => {
    const d = window.prompt('Edit description (1 to 3000 characters):', p.description);
    if (d === null) return;
    act('admin_social_post_edit', { p_id: p.id, p_description: d });
  };
  const ban = (id, name) => {
    const reason = window.prompt('Reason for the PERMANENT ban of @' + name + ':', '');
    if (reason === null) return;
    act('admin_creator_ban', { p_user: id, p_reason: reason }, 'Permanently ban @' + name + '? This cannot be undone and removes all their posts.');
  };

  return (
    <div style={{ padding: 16 }}>
      <style>{'@keyframes xsk{0%,100%{opacity:.4}50%{opacity:1}}'}</style>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Socials Management</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['posts', 'Posts'], ['creators', 'Creators']].map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: tab === id ? 1 : .6, outline: tab === id ? '2px solid #2563EB' : 'none' }}>{l}</button>
        ))}
        {tab === 'posts' && <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search creator or text" style={{ padding: 8, borderRadius: 10, minWidth: 190 }} />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 10 }}>
            <option value="active">Active</option><option value="removed">Removed</option><option value="">All</option>
          </select>
        </>}
      </div>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      {!rows && [0, 1, 2].map(i => <div key={i} style={sk} />)}
      {rows && rows.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#8a93a3' }}>No records.</div>}

      {tab === 'posts' && rows && rows.map(p => (
        <div key={p.id} style={{ ...card, marginBottom: 12, opacity: p.status === 'active' ? 1 : 0.7 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href={p.image_url} target="_blank" rel="noreferrer"><img src={p.image_url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }} /></a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>@{p.creator}{p.status !== 'active' && <span style={{ marginLeft: 6, fontSize: 10, color: '#DC2626' }}>REMOVED</span>}{p.pinned_at && <span style={{ marginLeft: 6, fontSize: 10, color: '#2563EB' }}>PINNED</span>}</div>
              <div style={{ fontSize: 11, color: '#8a93a3' }}>{dateTime(p.created_at)} · {p.likes} likes · {p.comments} comments</div>
              <div style={{ fontSize: 13, margin: '4px 0 8px', maxHeight: 54, overflow: 'hidden', wordBreak: 'break-word' }}>{p.description}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="neu-btn" style={sm} disabled={busy} onClick={() => toggle(p.id, 'post')}>comments & likes</button>
                <button className="neu-btn" style={sm} disabled={busy} onClick={() => edit(p)}>edit</button>
                {(p.status === 'active' || p.pinned_at) && <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_social_post_pin', { p_id: p.id, p_pin: !p.pinned_at })}>{p.pinned_at ? 'unpin' : 'pin'}</button>}
                {p.status === 'active'
                  ? <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_social_post_remove', { p_id: p.id }, 'Remove this post from Socials?')}>remove</button>
                  : <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_social_post_restore', { p_id: p.id })}>restore</button>}
                <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_social_post_delete', { p_id: p.id }, 'Delete forever? This also deletes its likes and comments and cannot be undone.')}>delete forever</button>
                <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => ban(p.creator_id, p.creator)}>ban creator</button>
              </div>
            </div>
          </div>
          {open && open.id === p.id && open.kind === 'post' && (
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 10 }}>
              <b style={{ fontSize: 12 }}>Comments ({detail.a.length})</b>
              {detail.a.length === 0 && <div style={{ fontSize: 12, color: '#8a93a3' }}>None.</div>}
              {detail.a.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', marginLeft: c.parent_id ? 18 : 0, fontSize: 13 }}>
                  <span style={{ flex: 1, wordBreak: 'break-word' }}><b>@{c.username}</b> {c.body}<br /><small style={{ color: '#8a93a3' }}>{dateTime(c.created_at)}</small></span>
                  <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_social_comment_delete', { p_id: c.id }, 'Delete this comment?', reopen(p.id, 'post'))}>delete</button>
                </div>
              ))}
              <b style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Likes ({detail.b.length})</b>
              {detail.b.map(l => (
                <div key={l.user_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ flex: 1 }}>@{l.username} <small style={{ color: '#8a93a3' }}>{dateTime(l.created_at)}</small></span>
                  <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_social_like_remove', { p_post: p.id, p_user: l.user_id }, 'Remove this like?', reopen(p.id, 'post'))}>remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {tab === 'creators' && rows && rows.map(c => (
        <div key={c.user_id} style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#2563EB', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String(c.username || 'U').slice(0, 2).toUpperCase()}</span>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>@{c.username} <small style={{ color: c.status === 'banned' ? '#DC2626' : '#8a93a3' }}>{c.status}</small></div>
              <div style={{ fontSize: 12, color: '#8a93a3' }}>{c.posts} posts · {c.likes} likes · {c.followers} followers</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <button className="neu-btn" style={sm} disabled={busy} onClick={() => toggle(c.user_id, 'creator')}>followers</button>
            {c.avatar_url && <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_user_avatar_clear', { p_user: c.user_id }, 'Remove this profile photo? They will show initials.')}>remove photo</button>}
            {c.status !== 'banned' && <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => ban(c.user_id, c.username)}>ban creator</button>}
          </div>
          {open && open.id === c.user_id && open.kind === 'creator' && (
            <div style={{ marginTop: 10, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 8 }}>
              {detail.b.length === 0 && <div style={{ fontSize: 12, color: '#8a93a3' }}>No followers.</div>}
              {detail.b.map(f => (
                <div key={f.user_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ flex: 1 }}>@{f.username} <small style={{ color: '#8a93a3' }}>{dateTime(f.created_at)}</small></span>
                  <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_social_follow_remove', { p_creator: c.user_id, p_user: f.user_id }, 'Remove this follower?', reopen(c.user_id, 'creator'))}>remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
