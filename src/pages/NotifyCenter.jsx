import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp } from '../tw/pages.jsx';

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, { code: getAdminPin(), ...(args || {}) });
  if (error) throw error;
  return data;
};
const SEGS = [
  ['all', 'All users'], ['new7', 'New users (last 7 days)'], ['new30', 'New users (last 30 days)'],
  ['buyers', 'Buyers (1 or more orders)'], ['repeat', 'Repeat buyers (2 or more orders)'], ['nobuy', 'Never ordered'],
  ['lapsed30', 'Lapsed buyers (no order in 30 days)'], ['wallet', 'Xwallet balance above zero'],
  ['push_on', 'Push notifications turned on'], ['tier', 'Loyalty tier...'], ['city', 'City...'], ['user', 'One user...'],
];
const CH = [['push', 'Push'], ['email', 'Email'], ['both', 'Push + Email']];
const TABS = [['send', 'Compose'], ['sched', 'Scheduled'], ['email', 'Email setup'], ['log', 'History']];
const segLabel = (s, v) => ((SEGS.find((x) => x[0] === s) || [])[1] || s) + (v ? ': ' + v : '');
const pill = (on) => ({ padding: '7px 14px', fontWeight: 700, ...(on ? {} : {}) });
const lbl = { fontSize: 12, fontWeight: 700, margin: '10px 0 4px', display: 'block' };

export default function NotifyCenter() {
  const { show } = useToast();
  const [tab, setTab] = useState('send');
  const [f, setF] = useState({ channel: 'push', seg: 'all', val: '', title: '', body: '', subject: '', ebody: '', when: 'now', at: '', repeat: 'none' });
  const [opts, setOpts] = useState({ tiers: [], cities: [] });
  const [cnt, setCnt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({ scheduled: [], log: [] });
  const [cfg, setCfg] = useState(null);
  const [cf, setCf] = useState({ url: '', secret: '', from: '', name: 'XMARKET' });
  const [testTo, setTestTo] = useState('');
  const [results, setResults] = useState([]);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const loadList = useCallback(async () => { try { setData(await rpc('admin_nx_list')); setErr(''); } catch (e) { setErr(e.message || String(e)); } }, []);
  const loadCfg = useCallback(async () => {
    try { const c = await rpc('admin_nx_email_cfg'); setCfg(c); setCf((x) => ({ ...x, url: x.url || c.url || '', from: x.from || c.from_email || '', name: c.from_name || x.name })); } catch (e) { setErr(e.message || String(e)); }
  }, []);
  const loadResults = useCallback(async () => { try { setResults(await rpc('admin_nx_email_results')); } catch (e) { /* ignore */ } }, []);
  useEffect(() => {
    loadList(); loadCfg(); loadResults();
    rpc('admin_nx_segments').then((o) => setOpts(o || { tiers: [], cities: [] })).catch(() => {});
  }, [loadList, loadCfg, loadResults]);

  useEffect(() => {
    if ((f.seg === 'tier' || f.seg === 'city' || f.seg === 'user') && !f.val.trim()) { setCnt(null); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const r = await rpc('admin_nx_count', { p_seg: f.seg, p_val: f.val || null }); if (alive) setCnt(r); }
      catch (e) { if (alive) setCnt({ error: e.message || String(e) }); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [f.seg, f.val]);

  const wantsPush = f.channel === 'push' || f.channel === 'both';
  const wantsEmail = f.channel === 'email' || f.channel === 'both';

  const go = async () => {
    if (!cnt || cnt.error || !cnt.users) return show?.('Pick a segment that has users first.', 'error');
    const args = { p_channel: f.channel, p_seg: f.seg, p_val: f.val || null, p_title: f.title, p_body: f.body, p_subject: f.subject, p_ebody: f.ebody };
    if (f.when === 'later') {
      const d = new Date(f.at);
      if (!f.at || isNaN(d.getTime())) return show?.('Choose a date and time.', 'error');
      setBusy(true);
      try {
        await rpc('admin_nx_schedule', { ...args, p_at: d.toISOString(), p_repeat: f.repeat });
        show?.('Scheduled', 'success');
        setF((x) => ({ ...x, title: '', body: '', subject: '', ebody: '', at: '', when: 'now', repeat: 'none' }));
        await loadList(); setTab('sched');
      } catch (e) { show?.(e.message || String(e), 'error'); }
      setBusy(false);
      return;
    }
    const what = f.channel === 'push' ? 'push' : f.channel === 'email' ? 'email' : 'push and email';
    if (!window.confirm('Send this ' + what + ' now to ' + cnt.users + ' user(s) (' + segLabel(f.seg, f.val) + ')?')) return;
    setBusy(true);
    try {
      const r = await rpc('admin_nx_send', args);
      show?.('Sent: ' + r.push + ' push, ' + r.email + ' email', 'success');
      setF((x) => ({ ...x, title: '', body: '', subject: '', ebody: '' }));
      loadList(); if (r.email) setTimeout(loadResults, 4000);
    } catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };

  const cancel = async (r) => {
    if (!window.confirm('Cancel this scheduled message?')) return;
    try { await rpc('admin_nx_cancel', { p_id: r.id }); show?.('Cancelled', 'success'); loadList(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const saveCfg = async () => {
    setBusy(true);
    try { await rpc('admin_nx_gmail_save', { p_url: cf.url, p_secret: cf.secret || null, p_from: cf.from, p_name: cf.name }); setCf((x) => ({ ...x, secret: '' })); show?.('Email settings saved', 'success'); await loadCfg(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };
  const sendTest = async () => {
    setBusy(true);
    try { await rpc('admin_nx_email_test', { p_to: testTo }); show?.('Test queued. Check the results below in a few seconds.', 'success'); setTimeout(loadResults, 4000); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy(false);
  };

  const countLine = !cnt ? null : cnt.error ? <span style={{ color: '#DC2626' }}>{cnt.error}</span>
    : <span><b>{cnt.users}</b> user(s) match · <b>{cnt.push}</b> can get a push · <b>{cnt.email}</b> have an email</span>;

  return (
    <div style={{ padding: 16, maxWidth: 820 }}>
      <h2 style={{ margin: '0 0 4px' }}>Notification Center</h2>
      <div style={{ ...muted, marginBottom: 12 }}>Send push and email to a segment of users, now or on a schedule.</div>
      {err && <div style={{ ...card, color: '#DC2626' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map(([k, l]) => (
          <button key={k} className={'neu-btn' + (tab === k ? ' neu-btn-success' : '')} onClick={() => { setTab(k); if (k === 'email') loadResults(); }} style={pill(tab === k)}>
            {l}{k === 'sched' ? ' (' + data.scheduled.filter((r) => r.status === 'scheduled').length + ')' : ''}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div style={card}>
          <label style={lbl}>Send as</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CH.map(([k, l]) => <button key={k} className={'neu-btn' + (f.channel === k ? ' neu-btn-success' : '')} onClick={() => set('channel', k)} style={pill(f.channel === k)}>{l}</button>)}
          </div>

          <label style={lbl}>Who gets it</label>
          <select className="neu-input" style={{ ...inp, width: '100%' }} value={f.seg} onChange={(e) => setF((x) => ({ ...x, seg: e.target.value, val: '' }))}>
            {SEGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {f.seg === 'tier' && (
            <select className="neu-input" style={{ ...inp, width: '100%', marginTop: 8 }} value={f.val} onChange={(e) => set('val', e.target.value)}>
              <option value="">Choose a tier</option>{opts.tiers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {f.seg === 'city' && (
            <select className="neu-input" style={{ ...inp, width: '100%', marginTop: 8 }} value={f.val} onChange={(e) => set('val', e.target.value)}>
              <option value="">Choose a city</option>{opts.cities.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {f.seg === 'user' && <input className="neu-input" style={{ ...inp, width: '100%', marginTop: 8 }} placeholder="Username or email" value={f.val} onChange={(e) => set('val', e.target.value)} />}
          <div style={{ ...muted, marginTop: 8, minHeight: 18 }}>{countLine}</div>

          {wantsPush && (<>
            <label style={lbl}>Push title <span style={muted}>({f.title.length}/65)</span></label>
            <input className="neu-input" style={{ ...inp, width: '100%' }} maxLength={65} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Weekend flash sale" />
            <label style={lbl}>Push message <span style={muted}>({f.body.length}/240)</span></label>
            <textarea className="neu-input" style={{ ...inp, width: '100%', minHeight: 80 }} maxLength={240} value={f.body} onChange={(e) => set('body', e.target.value)} placeholder="Short message shown on the phone" />
            <div style={muted}>A push also appears in the user's notification inbox. Tapping it opens the app home.</div>
          </>)}
          {wantsEmail && (<>
            <label style={lbl}>Email subject{f.channel === 'both' ? ' (blank = push title)' : ''}</label>
            <input className="neu-input" style={{ ...inp, width: '100%' }} maxLength={150} value={f.subject} onChange={(e) => set('subject', e.target.value)} />
            <label style={lbl}>Email message{f.channel === 'both' ? ' (blank = push message)' : ''} <span style={muted}>({f.ebody.length}/5000)</span></label>
            <textarea className="neu-input" style={{ ...inp, width: '100%', minHeight: 140 }} maxLength={5000} value={f.ebody} onChange={(e) => set('ebody', e.target.value)} placeholder={'Hi {name},\n\nWrite your message here. Links starting with https:// become clickable.'} />
            <div style={muted}>Use {'{name}'} to insert the customer's first name.</div>
          </>)}

          <label style={lbl}>When</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={'neu-btn' + (f.when === 'now' ? ' neu-btn-success' : '')} onClick={() => set('when', 'now')} style={pill(f.when === 'now')}>Send now</button>
            <button className={'neu-btn' + (f.when === 'later' ? ' neu-btn-success' : '')} onClick={() => set('when', 'later')} style={pill(f.when === 'later')}>Schedule</button>
          </div>
          {f.when === 'later' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <input type="datetime-local" className="neu-input" style={{ ...inp, flex: '1 1 200px' }} value={f.at} onChange={(e) => set('at', e.target.value)} />
              <select className="neu-input" style={{ ...inp, flex: '1 1 140px' }} value={f.repeat} onChange={(e) => set('repeat', e.target.value)}>
                <option value="none">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option>
              </select>
            </div>
          )}
          {f.when === 'later' && <div style={{ ...muted, marginTop: 6 }}>Time is in this device's time zone. The scheduler checks every minute.</div>}

          <button className="neu-btn neu-btn-success" disabled={busy} onClick={go} style={{ marginTop: 16, padding: '10px 22px', fontWeight: 800 }}>
            {busy ? 'Working...' : f.when === 'later' ? 'Schedule it' : 'Send now'}
          </button>
        </div>
      )}

      {tab === 'sched' && (
        <>
          <button className="neu-btn" onClick={loadList} style={{ padding: '7px 14px', marginBottom: 10 }}>Refresh</button>
          {data.scheduled.length === 0 && <div style={{ ...card, opacity: 0.7 }}>Nothing scheduled.</div>}
          {data.scheduled.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <b>{r.title || r.email_subject}</b>
                <span style={{ fontWeight: 800, color: r.status === 'scheduled' ? '#3B82F6' : r.status === 'sent' ? '#059669' : '#DC2626', textTransform: 'capitalize' }}>{r.status}</span>
                <span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(r.send_at)}</span>
              </div>
              <div style={muted}>{r.channel} · {segLabel(r.segment, r.seg_val)} · {r.repeat_mode === 'none' ? 'once' : r.repeat_mode} · ran {r.runs}x</div>
              {r.error && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 4 }}>{r.error}</div>}
              {r.status === 'scheduled' && <button className="neu-btn" onClick={() => cancel(r)} style={{ marginTop: 8, padding: '6px 14px', fontWeight: 700 }}>Cancel</button>}
            </div>
          ))}
        </>
      )}

      {tab === 'email' && (
        <>
          <div style={card}>
            <b>Email provider (your Gmail)</b>
            <div style={{ ...muted, margin: '6px 0 8px' }}>
              {cfg && cfg.configured ? 'Connected. Sending from ' + cfg.from_email + '.' : 'Not set up yet. Create the Google Apps Script, then paste its Web app URL and your secret here.'}
            </div>
            <label style={lbl}>Web app URL</label>
            <input className="neu-input" style={{ ...inp, width: '100%' }} value={cf.url} onChange={(e) => setCf({ ...cf, url: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" />
            <label style={lbl}>Secret {cfg && cfg.key_hint ? '(leave blank to keep the saved one)' : ''}</label>
            <input type="password" autoComplete="off" className="neu-input" style={{ ...inp, width: '100%' }} value={cf.secret} onChange={(e) => setCf({ ...cf, secret: e.target.value })} placeholder="The same secret you put in the script" />
            <label style={lbl}>Your Gmail address (for reference)</label>
            <input className="neu-input" style={{ ...inp, width: '100%' }} value={cf.from} onChange={(e) => setCf({ ...cf, from: e.target.value })} placeholder="you@gmail.com" />
            <label style={lbl}>Sender name</label>
            <input className="neu-input" style={{ ...inp, width: '100%' }} value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
            <button className="neu-btn neu-btn-success" disabled={busy} onClick={saveCfg} style={{ marginTop: 12, padding: '9px 20px', fontWeight: 800 }}>Save</button>
          </div>
          <div style={card}>
            <b>Send a test email</b>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <input className="neu-input" style={{ ...inp, flex: '1 1 220px' }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com" />
              <button className="neu-btn neu-btn-success" disabled={busy || !cfg || !cfg.configured} onClick={sendTest} style={{ padding: '8px 18px', fontWeight: 700 }}>Send test</button>
            </div>
          </div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>Recent delivery results</b><button type="button" className="neu-btn" style={{ padding: '5px 12px', fontSize: 12, color: '#DC2626' }} onClick={async () => { if (window.prompt('Delete ALL email delivery results? Type DELETE to confirm.') !== 'DELETE') return; try { await rpc('admin_nx_clear', { p_what: 'email' }); show?.('Cleared', 'success'); loadResults(); } catch (e) { show?.(e.message || String(e), 'error'); } }}>Clear all</button><button className="neu-btn" onClick={loadResults} style={{ marginLeft: 'auto', padding: '5px 12px' }}>Refresh</button></div>
            {results.length === 0 && <div style={{ ...muted, marginTop: 6 }}>No emails sent yet.</div>}
            {results.map((r, i) => (
              <div key={i} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', fontSize: 13 }}>
                <b style={{ color: r.status_code >= 200 && r.status_code < 300 ? '#059669' : r.status_code ? '#DC2626' : '#64748B' }}>{r.status_code ? 'HTTP ' + r.status_code : 'Pending'}</b> · {r.kind} · {r.n} email(s) · <span style={muted}>{dateTime(r.created_at)}</span>
                {r.detail && <div style={{ color: r.status_code >= 300 ? '#DC2626' : '#64748B', wordBreak: 'break-word' }}>{r.detail}</div>}
              </div>
            ))}
            <div style={{ ...muted, marginTop: 8 }}>Results are kept for a few hours. A free Gmail account can send about 100 emails per day.</div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <>
          <button className="neu-btn" onClick={loadList} style={{ padding: '7px 14px', marginBottom: 10 }}>Refresh</button>
          {data.log.length > 0 && <button type="button" className="neu-btn" style={{ padding: '7px 14px', marginBottom: 10, marginLeft: 8, color: '#DC2626' }} onClick={async () => { if (window.prompt('Delete ALL send history? Type DELETE to confirm.') !== 'DELETE') return; try { await rpc('admin_nx_clear', { p_what: 'log' }); show?.('Cleared', 'success'); loadList(); } catch (e) { show?.(e.message || String(e), 'error'); } }}>Clear all</button>}
          {data.log.length === 0 && <div style={{ ...card, opacity: 0.7 }}>Nothing sent yet.</div>}
          {data.log.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <b>{r.title}</b><span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(r.created_at)}</span>
              </div>
              <div style={muted}>{r.source === 'schedule' ? 'Scheduled' : 'Manual'} · {r.channel} · {segLabel(r.segment, r.seg_val)} · {r.push_n} push, {r.email_n} email</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
