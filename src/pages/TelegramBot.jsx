import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp } from '../tw/pages.jsx';

const FLAGS = [['product', 'New products'], ['flash', 'Flash sales'], ['price_drop', 'Price drops'], ['promo', 'Promo codes'], ['voucher', 'Store vouchers'], ['bundle', 'Bundles']];
const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, { code: getAdminPin(), ...(args || {}) });
  if (error) throw error;
  return data;
};
const lab = { fontSize: 12.5, fontWeight: 700, margin: '10px 0 4px', display: 'block' };

export default function TelegramBot() {
  const { show } = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [token, setToken] = useState('');
  const [chat, setChat] = useState('');
  const [site, setSite] = useState('');
  const [flags, setFlags] = useState({});
  const [busy, setBusy] = useState('');
  const [ann, setAnn] = useState({ text: '', photo: '', url: '' });

  const load = useCallback(async () => {
    try {
      const r = await rpc('admin_tg_get');
      setD(r); setErr('');
      setChat(r.chat_id || ''); setSite(r.site_url || ''); setFlags(r.flags || {});
    } catch (e) { setErr(e.message || String(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); show?.(okMsg, 'success'); await load(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy('');
  };
  const save = () => act('save', async () => { await rpc('admin_tg_save', { p_token: token, p_chat: chat, p_flags: flags, p_site: site }); setToken(''); }, 'Saved');
  const test = () => act('test', () => rpc('admin_tg_test'), 'Test message queued. Check your Telegram group.');
  const send = () => act('send', async () => {
    if (!ann.text.trim()) throw new Error('Write a message first');
    await rpc('admin_tg_announce', { p_text: ann.text, p_photo: ann.photo, p_url: ann.url });
    setAnn({ text: '', photo: '', url: '' });
  }, 'Announcement queued');

  const state = (l) => (l.note ? 'failed: ' + l.note : l.status_code === null || l.status_code === undefined ? 'sending...' : l.status_code === 200 ? 'sent' : 'failed (' + l.status_code + ') ' + (l.resp || ''));

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 4px' }}>Telegram Bot</h2>
      <div style={{ ...muted, marginBottom: 12 }}>Posts new products, flash sales, price drops, promo codes, vouchers and bundles to your Telegram group or channel.</div>
      {err && <div style={{ ...card, color: '#DC2626' }}>{err}</div>}

      <div style={card}>
        <b>Connection</b>
        <div style={{ ...muted, marginTop: 4 }}>{d ? (d.token_set ? 'Bot token saved (ends ' + d.token_hint + ').' : 'No bot token saved yet.') : 'Loading...'}</div>
        <label style={lab}>Bot token {d && d.token_set ? '(leave empty to keep the saved one)' : ''}</label>
        <input style={inp} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from BotFather" />
        <label style={lab}>Group or channel ID</label>
        <input style={inp} value={chat} onChange={(e) => setChat(e.target.value)} placeholder="-1001234567890 or @yourchannel" />
        <label style={lab}>Site address used in buttons</label>
        <input style={inp} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://xmarket-app.shop" />
      </div>

      <div style={card}>
        <b>What to post</b>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FLAGS.map(([k, l]) => (
            <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={flags[k] === true} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} /> {l}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="neu-btn neu-btn-success" disabled={busy !== ''} onClick={save} style={{ padding: '8px 18px', fontWeight: 700 }}>{busy === 'save' ? 'Saving...' : 'Save'}</button>
          <button className="neu-btn" disabled={busy !== ''} onClick={test} style={{ padding: '8px 18px', fontWeight: 700 }}>{busy === 'test' ? 'Sending...' : 'Send test message'}</button>
        </div>
      </div>

      <div style={card}>
        <b>Send an announcement</b>
        <label style={lab}>Message</label>
        <textarea style={{ ...inp, minHeight: 80 }} value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} placeholder="Payday sale starts tonight!" />
        <label style={lab}>Image link (optional)</label>
        <input style={inp} value={ann.photo} onChange={(e) => setAnn({ ...ann, photo: e.target.value })} placeholder="https://..." />
        <label style={lab}>Button link (optional)</label>
        <input style={inp} value={ann.url} onChange={(e) => setAnn({ ...ann, url: e.target.value })} placeholder="https://xmarket-app.shop/..." />
        <button className="neu-btn neu-btn-success" disabled={busy !== ''} onClick={send} style={{ padding: '8px 18px', fontWeight: 700, marginTop: 12 }}>{busy === 'send' ? 'Sending...' : 'Send to group'}</button>
      </div>

      <div style={card}>
        <b>Recent messages</b>
        {d && (d.log || []).length === 0 && <div style={{ ...muted, marginTop: 6 }}>Nothing sent yet.</div>}
        {d && (d.log || []).map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '6px 0', borderTop: i ? '1px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
            <span style={muted}>{new Date(l.created_at).toLocaleString()}</span>
            <b>{l.kind}</b>
            <span style={{ color: l.status_code === 200 ? '#059669' : l.status_code === null || l.status_code === undefined ? '#64748B' : '#DC2626' }}>{state(l)}</span>
          </div>
        ))}
        <button className="neu-btn" onClick={load} style={{ padding: '6px 14px', marginTop: 8 }}>Refresh</button>
      </div>
    </div>
  );
}
