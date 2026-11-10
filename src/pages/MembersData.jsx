import { getAdminPin } from '../lib/pin.js';
import React, { useCallback, useEffect, useState } from 'react';
import useAutoClear from '../xa/useAutoClear.js';
import { supabase } from '../supabase.js';
import { dateTime } from '../lib/format.js';

const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const sm = { padding: '4px 10px', fontSize: 11 };
const inp = { padding: 8, borderRadius: 10, minWidth: 150 };
const sk = { height: 80, borderRadius: 16, marginBottom: 10, background: 'rgba(148,163,184,.3)', animation: 'xsk 1.2s ease-in-out infinite' };
const FIELDS = [['full_name', 'Full name'], ['phone', 'Phone'], ['address', 'Street / house no.'], ['barangay', 'Barangay'], ['city', 'City'], ['province', 'Province'], ['postal_code', 'Postal code'], ['landmark', 'Landmark'], ['label', 'Label (home/work)']];

export default function MembersData() {
  const [tab, setTab] = useState('follows');
  const [q, setQ] = useState('');
  useAutoClear(q, setQ);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ a: '', b: '' });
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const fn = { follows: 'admin_follows_list', addresses: 'admin_addresses_list', photos: 'admin_avatars_list' }[tab];
      const d = await call(fn, { p_q: q || null });
      setRows(Array.isArray(d) ? d : []); setErr('');
    } catch (e) { setRows([]); setErr(e.message); }
  }, [tab, q]);
  useEffect(() => { setRows(null); setEdit(null); const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const act = async (fn, args, ask) => {
    if (ask && !window.confirm(ask)) return false;
    setBusy(true);
    try { await call(fn, args); await load(); setErr(''); setBusy(false); return true; }
    catch (e) { setErr(e.message); setBusy(false); return false; }
  };

  const saveAddr = async () => {
    const { id, user, ...data } = edit;
    const ok = await act('admin_address_save', { p_id: id || null, p_user: user || null, p_data: data });
    if (ok) setEdit(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <style>{'@keyframes xsk{0%,100%{opacity:.4}50%{opacity:1}}'}</style>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Members Data</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['follows', 'Follows'], ['addresses', 'Saved addresses'], ['photos', 'Profile photos']].map(([id, l]) => (
          <button key={id} className="neu-btn" onClick={() => setTab(id)} style={{ padding: '8px 14px', fontWeight: 700, opacity: tab === id ? 1 : .6, outline: tab === id ? '2px solid #2563EB' : 'none' }}>{l}</button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search username" style={inp} />
        {tab === 'addresses' && <button className="neu-btn" style={{ padding: '8px 14px' }} onClick={() => setEdit({ user: '', label: 'home' })}>+ Add address</button>}
      </div>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}

      {tab === 'follows' && (
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={f.a} onChange={e => setF({ ...f, a: e.target.value })} placeholder="Follower @username" style={inp} />
          <span>follows</span>
          <input value={f.b} onChange={e => setF({ ...f, b: e.target.value })} placeholder="Creator @username" style={inp} />
          <button className="neu-btn" style={{ padding: '8px 14px' }} disabled={busy || !f.a || !f.b} onClick={async () => { if (await act('admin_follow_add', { p_user: f.a, p_creator: f.b })) setF({ a: '', b: '' }); }}>Add follow</button>
        </div>
      )}

      {edit && (
        <div style={card}>
          <b>{edit.id ? 'Edit address' : 'New address'}</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {!edit.id && <input value={edit.user || ''} onChange={e => setEdit({ ...edit, user: e.target.value })} placeholder="Owner @username" style={inp} />}
            {FIELDS.map(([k, l]) => <input key={k} value={edit[k] || ''} onChange={e => setEdit({ ...edit, [k]: e.target.value })} placeholder={l} style={inp} />)}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="neu-btn" style={sm} disabled={busy} onClick={saveAddr}>Save</button>
            <button className="neu-btn" style={sm} onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}

      {!rows && [0, 1, 2].map(i => <div key={i} style={sk} />)}
      {rows && rows.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#8a93a3' }}>No records.</div>}

      {tab === 'follows' && rows && rows.map(r => (
        <div key={r.user_id + r.creator_id} style={{ ...card, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ flex: 1 }}><b>@{r.follower}</b> → <b>@{r.creator}</b><br /><small style={{ color: '#8a93a3' }}>{dateTime(r.created_at)}</small></span>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_follow_delete', { p_user: r.user_id, p_creator: r.creator_id }, 'Remove this follow?')}>remove</button>
        </div>
      ))}

      {tab === 'addresses' && rows && rows.map(a => (
        <div key={a.id} style={card}>
          <div style={{ fontWeight: 800 }}>{a.full_name} · {a.phone} {a.is_default && <small style={{ color: '#2563EB' }}>DEFAULT</small>}{a.label && <small style={{ color: '#8a93a3' }}> {a.label}</small>}</div>
          <div style={{ fontSize: 12, color: '#8a93a3' }}>@{a.username}</div>
          <div style={{ fontSize: 13, margin: '4px 0 8px' }}>{[a.address, a.barangay, a.city, a.province, a.postal_code].filter(Boolean).join(', ')}{a.landmark ? ' (' + a.landmark + ')' : ''}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="neu-btn" style={sm} onClick={() => setEdit({ ...a })}>edit</button>
            {!a.is_default && <button className="neu-btn" style={sm} disabled={busy} onClick={() => act('admin_address_default', { p_id: a.id })}>set default</button>}
            <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_address_delete', { p_id: a.id }, 'Delete this address?')}>delete</button>
          </div>
        </div>
      ))}

      {tab === 'photos' && rows && rows.map(p => (
        <div key={p.user_id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={p.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ flex: 1, fontWeight: 800 }}>@{p.username}</span>
          <button className="neu-btn" style={sm} disabled={busy} onClick={() => { const u = window.prompt('New photo URL:', p.avatar_url); if (u) act('admin_avatar_set', { p_user: p.user_id, p_url: u }); }}>change URL</button>
          <button className="neu-btn" style={{ ...sm, color: '#DC2626' }} disabled={busy} onClick={() => act('admin_avatar_set', { p_user: p.user_id, p_url: '' }, 'Remove this photo?')}>remove</button>
        </div>
      ))}
    </div>
  );
}
