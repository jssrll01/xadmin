import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Send, Shuffle } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { ErrorState, SkRows } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { card, muted } from '../tw/pages.jsx';

const META = {
  delivery_estimate: { title: 'Delivery time estimate', desc: 'Shown on the product page. Pre-order products use the pre-order range.',
    fields: [{ k: 'min', l: 'Normal: min days', t: 'num' }, { k: 'max', l: 'Normal: max days', t: 'num' }, { k: 'pre_min', l: 'Pre-order: min days', t: 'num' }, { k: 'pre_max', l: 'Pre-order: max days', t: 'num' }] },
  fomo: { title: 'FOMO notifications', desc: 'Default wording for the "trending" notification. Use {name} for the product name. Send it from the panel below.',
    fields: [{ k: 'title', l: 'Title', t: 'text' }, { k: 'body', l: 'Message', t: 'area' }] },
  profile_progress: { title: 'Profile progress', desc: 'Shows "Your profile is X% complete" with a progress bar on the Profile page. One field per line: column, label, weight.',
    fields: [{ k: 'fields', l: 'Fields', t: 'lines' }] },
  price_per_day: { title: 'Price per day (VIP page)', desc: 'Shows "Only ₱X/day" on the VIP page, worked out from the VIP price and its number of days.', fields: [] },
  vip_trial: { title: 'Free VIP after first order', desc: 'When a user\'s first order is marked Completed, they get free VIP once. Not given to users who already have active VIP.',
    fields: [{ k: 'minutes', l: 'Free VIP length (minutes)', t: 'num' }] },
  flash_rotation: { title: 'Flash deals: 24-hour rotation', desc: 'When the timer ends, every current flash deal is switched off and a new random set is switched on. Turning this on starts the first rotation within minutes.',
    fields: [{ k: 'count', l: 'Products per set', t: 'num' }, { k: 'hours', l: 'Hours per set', t: 'num' }] },
};
const ORDER = ['delivery_estimate', 'fomo', 'profile_progress', 'price_per_day', 'vip_trial', 'flash_rotation'];
const toDraft = (key, cfg) => {
  const o = {};
  (META[key].fields || []).forEach((f) => {
    const v = cfg ? cfg[f.k] : '';
    o[f.k] = f.t === 'lines' ? (Array.isArray(v) ? v.map((x) => [x.k, x.l, x.w].join(', ')).join('\n') : '') : (v === undefined || v === null ? '' : String(v));
  });
  return o;
};
const fromDraft = (key, d) => {
  const out = {};
  (META[key].fields || []).forEach((f) => {
    if (f.t === 'num') { const n = Number(d[f.k]); if (!Number.isFinite(n) || n < 0) throw new Error(f.l + ' must be a number'); out[f.k] = n; }
    else if (f.t === 'lines') {
      out[f.k] = String(d[f.k] || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const p = l.split(',').map((x) => x.trim()); const w = Number(p[2]);
        if (!p[0] || !p[1] || !Number.isFinite(w) || w < 0) throw new Error('Bad line: ' + l);
        return { k: p[0], l: p[1], w };
      });
    } else out[f.k] = String(d[f.k] || '').trim();
  });
  return out;
};
const when = (t) => (t ? new Date(t).toLocaleString() : '—');
const inp = { width: '100%', boxSizing: 'border-box' };

export default function FeatureControls() {
  const { show } = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [trend, setTrend] = useState([]);
  const [pick, setPick] = useState('');
  const [aud, setAud] = useState('viewers');
  const [days, setDays] = useState('7');
  const [ft, setFt] = useState('');
  const [fb, setFb] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await adm('admin_features');
      setD(r); setErr('');
      const dr = {}; (r.flags || []).forEach((f) => { if (META[f.key]) dr[f.key] = toDraft(f.key, f.config); });
      setDrafts(dr);
    } catch (e) { setErr(e.message); }
    try { setTrend((await adm('admin_fomo_trending', { p_days: Number(days) || 7 })) || []); } catch (e) { setTrend([]); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const flag = (k) => ((d && d.flags) || []).find((f) => f.key === k) || { enabled: false, config: {} };
  const run = async (id, fn, ok) => {
    setBusy(id);
    try { const r = await fn(); show?.(typeof ok === 'function' ? ok(r) : ok, 'success'); await load(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy('');
  };
  const toggle = (k) => run('t' + k, () => adm('admin_feature_set', { p_key: k, p_enabled: !flag(k).enabled }), META[k].title + (flag(k).enabled ? ' turned off' : ' turned on'));
  const save = (k) => run('s' + k, async () => adm('admin_feature_set', { p_key: k, p_enabled: flag(k).enabled, p_config: fromDraft(k, drafts[k] || {}) }), 'Saved');
  const setF = (k, f, v) => setDrafts((p) => ({ ...p, [k]: { ...(p[k] || {}), [f]: v } }));

  const send = () => {
    if (!pick) return;
    const who = aud === 'all' ? 'EVERY user' : 'users who viewed it in the last ' + (Number(days) || 7) + ' days';
    if (!window.confirm('Send the trending notification to ' + who + '?')) return;
    run('fomo', () => adm('admin_fomo_send', { p_product: pick, p_audience: aud, p_days: Number(days) || 7, p_title: ft || null, p_body: fb || null }), (r) => (r && r.sent) + ' notification(s) sent');
  };
  const rotate = () => {
    if (!window.confirm('Switch off all current flash deals and pick a new random set now?')) return;
    run('rot', () => adm('admin_flash_rotate_now'), (r) => (r && r.rotated) + ' products are now on flash sale');
  };

  return (
    <>
      <PageHeader title="Feature controls" subtitle="Turn shopper features on or off and change their settings. Changes show on the next page load."
        actions={<Btn onClick={load}><RefreshCw size={14} /> Reload</Btn>} />
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !d && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={6} cols={3} /></div>}
      {d && ORDER.map((k) => {
        const m = META[k]; const f = flag(k); const dr = drafts[k] || {};
        return (
          <div key={k} style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 14, flex: 1, minWidth: 160 }}>{m.title}</b>
              <span className={'neu-badge ' + (f.enabled ? 'badge-approved' : 'badge-rejected')}>{f.enabled ? 'On' : 'Off'}</span>
              <Btn onClick={() => toggle(k)} loading={busy === 't' + k} disabled={!!busy}>{f.enabled ? 'Turn off' : 'Turn on'}</Btn>
            </div>
            <div style={{ ...muted, fontSize: 12.5, marginTop: 6 }}>{m.desc}</div>
            {m.fields.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginTop: 12 }}>
                {m.fields.map((x) => (
                  <div key={x.k} style={x.t === 'area' || x.t === 'lines' ? { gridColumn: '1 / -1' } : null}>
                    <div className="ui-lbl">{x.l}</div>
                    {x.t === 'area' || x.t === 'lines'
                      ? <textarea className="neu-input" rows={x.t === 'lines' ? 9 : 3} style={{ ...inp, fontFamily: 'inherit' }} value={dr[x.k] || ''} onChange={(e) => setF(k, x.k, e.target.value)} />
                      : <input className="neu-input" style={inp} inputMode={x.t === 'num' ? 'numeric' : undefined} value={dr[x.k] || ''} onChange={(e) => setF(k, x.k, e.target.value)} />}
                  </div>
                ))}
              </div>
            )}
            {m.fields.length > 0 && <div style={{ marginTop: 12 }}><Btn variant="primary" onClick={() => save(k)} loading={busy === 's' + k} disabled={!!busy}>Save settings</Btn></div>}
            {k === 'flash_rotation' && (
              <div style={{ marginTop: 12, fontSize: 12.5 }}>
                <div style={muted}>Live flash products: <b>{d.flash_live}</b> · Current set ends: <b>{when(d.flash && d.flash.cycle_ends)}</b></div>
                <div style={{ marginTop: 8 }}><Btn onClick={rotate} loading={busy === 'rot'} disabled={!!busy}><Shuffle size={14} /> Rotate now</Btn></div>
              </div>
            )}
            {k === 'vip_trial' && (
              <div style={{ marginTop: 12, fontSize: 12.5 }}>
                <div style={muted}>Free VIP given so far: <b>{(d.trials || []).length}</b>{(d.trials || []).length >= 50 ? '+ (latest 50 shown)' : ''}</div>
                {(d.trials || []).slice(0, 10).map((t) => <div key={t.user_id} style={{ ...muted, marginTop: 4 }}>{t.email || t.user_id} · {when(t.granted_at)} · ends {when(t.expires_at)}</div>)}
              </div>
            )}
          </div>
        );
      })}
      {d && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Send a "trending" notification</b>
          <div style={{ ...muted, fontSize: 12.5, marginTop: 6 }}>Pick a product, then send. It appears on users' Notifications page. "Viewers" means people who opened the product page; each person gets it at most once a day.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginTop: 12 }}>
            <div><div className="ui-lbl">Audience</div>
              <select className="neu-input" style={inp} value={aud} onChange={(e) => setAud(e.target.value)}><option value="viewers">People who viewed it</option><option value="all">Everyone</option></select></div>
            <div><div className="ui-lbl">Viewed in the last (days)</div><input className="neu-input" style={inp} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><div className="ui-lbl">Title (optional)</div><input className="neu-input" style={inp} placeholder={(flag('fomo').config || {}).title} value={ft} onChange={(e) => setFt(e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><div className="ui-lbl">Message (optional, {'{name}'} = product)</div><textarea className="neu-input" rows={2} style={{ ...inp, fontFamily: 'inherit' }} placeholder={(flag('fomo').config || {}).body} value={fb} onChange={(e) => setFb(e.target.value)} /></div>
          </div>
          <div className="ui-lbl" style={{ marginTop: 14 }}>Most viewed products</div>
          {!trend.length && <div style={{ ...muted, fontSize: 12.5 }}>No product views yet. Views are counted once the Xmarket update is live.</div>}
          {trend.map((t) => (
            <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(148,163,184,.25)', cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" name="fomo-pick" checked={pick === t.id} onChange={() => setPick(t.id)} />
              <span style={{ flex: 1 }}>{t.name}</span><span style={muted}>{t.viewers} viewer{Number(t.viewers) === 1 ? '' : 's'}</span>
            </label>
          ))}
          <div style={{ marginTop: 12 }}><Btn variant="primary" onClick={send} loading={busy === 'fomo'} disabled={!!busy || !pick}><Send size={14} /> Send notification</Btn></div>
        </div>
      )}
    </>
  );
}
