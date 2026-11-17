import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { xrpc } from '../lib/xrpc.js';
import { dateTime } from '../lib/format.js';
import PageHeader from '../xa/ui/PageHeader.jsx';

const dim = { fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8a93a3', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid rgba(0,0,0,.06)', verticalAlign: 'top' };
const arr = (d) => (Array.isArray(d) ? d : []);

export default function PushCenter() {
  const { show } = useToast();
  const [f, setF] = useState({ title: '', body: '', url: '/', audience: 'all', user: '', inapp: true });
  const [aud, setAud] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState(null);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const loadHist = useCallback(async () => {
    try { setHist(await xrpc('adm_push_history')); setErr(''); } catch (e) { setErr(e.message || String(e)); }
  }, []);
  useEffect(() => { loadHist(); }, [loadHist]);

  useEffect(() => {
    let dead = false;
    const t = setTimeout(async () => {
      if (f.audience === 'user' && f.user.trim().length < 2) { setAud(null); return; }
      try {
        const r = await xrpc('adm_push_audience', { p_audience: f.audience, p_user: f.audience === 'user' ? f.user : null });
        if (!dead) setAud(r);
      } catch (e) { if (!dead) setAud({ error: e.message || String(e) }); }
    }, 350);
    return () => { dead = true; clearTimeout(t); };
  }, [f.audience, f.user]);

  const send = async () => {
    const title = f.title.trim();
    const body = f.body.trim();
    if (title.length < 2 || body.length < 2) return show('Add a title and a message.', 'error');
    if (f.audience === 'user' && !(aud && aud.found)) return show('Find the user first.', 'error');
    if (f.audience === 'all') {
      const typed = window.prompt('This pushes to ALL users' + (aud && aud.devices != null ? ' (' + aud.devices + ' devices)' : '') + '. Type SEND to confirm.');
      if ((typed || '').trim().toUpperCase() !== 'SEND') return undefined;
    } else if (!window.confirm('Send this push to @' + aud.username + '?')) {
      return undefined;
    }
    setBusy(true);
    try {
      await xrpc('adm_push_send', { p_title: title, p_body: body, p_url: f.url.trim() || '/', p_audience: f.audience, p_user: f.audience === 'user' ? f.user : null, p_inapp: f.inapp });
      show('Push queued', 'success');
      setF((x) => ({ ...x, title: '', body: '' }));
      loadHist();
    } catch (e) { show(e.message || String(e), 'error'); }
    setBusy(false);
    return undefined;
  };

  const rows = arr(hist && hist.campaigns);
  const alerts = arr(hist && hist.alerts);
  return (
    <>
      <PageHeader title="Push Center" subtitle="Send a custom push notification to XMARKET users" />
      <Card style={{ marginBottom: 14 }}>
        <div style={{ marginBottom: 12 }}>
          <div className="ui-lbl">Send to</div>
          <select className="neu-input" value={f.audience} onChange={(e) => set('audience', e.target.value)}>
            <option value="all">All users</option>
            <option value="user">One user</option>
          </select>
        </div>
        {f.audience === 'user' && (
          <div style={{ marginBottom: 12 }}>
            <div className="ui-lbl">Username or email</div>
            <input className="neu-input" value={f.user} onChange={(e) => set('user', e.target.value)} placeholder="username or email" />
            {aud && aud.error && <div className="ui-err" role="alert">{aud.error}</div>}
            {aud && aud.found === false && <div className="ui-err" role="alert">No user found.</div>}
            {aud && aud.found && <div style={{ ...dim, marginTop: 4 }}>@{aud.username}, {aud.devices} push device(s)</div>}
          </div>
        )}
        {f.audience === 'all' && aud && !aud.error && <div style={{ ...dim, marginBottom: 12 }}>{aud.devices} device(s) across {aud.users} user(s) can receive a push. {aud.accounts} accounts exist.</div>}
        <div style={{ marginBottom: 12 }}>
          <div className="ui-lbl">Title ({f.title.length}/65)</div>
          <input className="neu-input" maxLength={65} value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="ui-lbl">Message ({f.body.length}/240)</div>
          <textarea className="neu-input" rows={3} maxLength={240} value={f.body} onChange={(e) => set('body', e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="ui-lbl">Opens (path or https link)</div>
          <input className="neu-input" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="/" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 34, marginBottom: 12 }}>
          <input type="checkbox" style={{ width: 18, height: 18 }} checked={f.inapp} onChange={(e) => set('inapp', e.target.checked)} />
          <span style={{ fontSize: 14 }}>Also show in the app notification list</span>
        </label>
        {(f.title || f.body) && (
          <div style={{ padding: 12, borderRadius: 14, border: '1px solid rgba(0,0,0,.08)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#8a93a3', marginBottom: 4 }}>Preview</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{f.title || 'Title'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{f.body || 'Message'}</div>
          </div>
        )}
        <Btn variant="primary" loading={busy} disabled={busy} onClick={send}>Send push</Btn>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Sent pushes</div>
        {err && <div className="ui-err" role="alert">{err}</div>}
        {!hist && !err && <div style={dim}>Loading…</div>}
        {hist && !rows.length && <div style={dim}>Nothing sent yet.</div>}
        {rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['When', 'Title', 'To', 'Result'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{dateTime(c.created_at)}</td>
                    <td style={td}><b>{c.title}</b><div style={dim}>{c.body}</div></td>
                    <td style={td}>{c.audience === 'user' ? '@' + (c.username || 'user') : 'All users'}</td>
                    <td style={td}>{c.sent == null ? (c.status || 'queued') : c.sent + ' sent' + (c.failed ? ', ' + c.failed + ' failed' : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Recent admin alerts</div>
        {hist && !alerts.length && <div style={dim}>No admin alerts yet.</div>}
        {alerts.map((a, i) => (
          <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px solid rgba(0,0,0,.06)' : 'none', fontSize: 13 }}>
            <b>{a.title}</b> <span style={dim}>{a.body} ({a.recipients} device owner(s), {dateTime(a.created_at)})</span>
          </div>
        ))}
      </Card>
    </>
  );
}
