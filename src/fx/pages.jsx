import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { peso, dateTime } from '../lib/format.js';
import { card, muted, inp, call, useLoad, Shell, Stat, Grid, Tbl } from '../tw/pages.jsx';

const arr = (d) => (Array.isArray(d) ? d : []);
const sm = { padding: '6px 12px', fontSize: 12 };
const lab = { display: 'block', marginBottom: 8, fontSize: 12 };
const nm = (r) => (r.username ? '@' + r.username : '—');
const useOv = (fn) => useLoad(async () => [await call(fn)]);
const first = (rows) => (rows || [])[0] || {};

function CfgForm({ name, title, cfg, fields, onSaved, warn }) {
  const { show } = useToast();
  const [v, setV] = useState(null);
  useEffect(() => {
    if (cfg) setV(Object.fromEntries(fields.map((f) => [f.k, f.t === 'steps' ? arr(cfg[f.k]).join(', ') : cfg[f.k]])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);
  if (!v) return null;
  const save = async () => {
    try {
      const out = {};
      fields.forEach((f) => {
        if (f.t === 'bool') out[f.k] = !!v[f.k];
        else if (f.t === 'steps') out[f.k] = String(v[f.k]).split(',').map((x) => Number(x.trim())).filter((x) => x > 0);
        else { const n = Number(v[f.k]); if (!Number.isFinite(n)) throw new Error(f.l + ' must be a number'); out[f.k] = n; }
      });
      if (!window.confirm(warn && out.enabled ? warn : 'Save ' + title + '?')) return;
      await call('admin_fx_cfg_set', { p_key: name, p_value: out });
      show?.('Saved', 'success'); if (onSaved) onSaved();
    } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <div style={card}>
      <b style={{ fontSize: 14 }}>{title}</b>
      <div style={{ marginTop: 10 }}>
        {fields.map((f) => (
          <label key={f.k} style={lab}>
            <b>{f.l}</b>{f.h && <span style={{ color: '#8a93a3' }}> · {f.h}</span>}
            {f.t === 'bool'
              ? <div style={{ marginTop: 4 }}><input type="checkbox" checked={!!v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.checked })} /> {v[f.k] ? 'On' : 'Off'}</div>
              : <input style={{ ...inp, width: '100%', marginTop: 4 }} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />}
          </label>
        ))}
      </div>
      <button className="neu-btn neu-btn-success" style={{ padding: '8px 16px', fontWeight: 700 }} onClick={save}>Save</button>
    </div>
  );
}
const ErrList = ({ rows }) => (arr(rows).length ? (
  <div style={{ ...card, fontSize: 12 }}>
    <b style={{ color: '#DC2626' }}>Recent errors</b>
    {arr(rows).map((e, i) => <div key={e.id || i} style={{ marginTop: 6, wordBreak: 'break-word' }}>{dateTime(e.at)} · {e.kind || ''} {e.ref || ''}: {e.msg}</div>)}
  </div>
) : null);


/* Referral leaders */
export function FxReferral() {
  const { show } = useToast();
  const ov = useOv('admin_fx_ref_overview');
  const o = first(ov.rows);
  const closeWeek = async () => {
    if (!window.confirm('Award badges for any finished week that has none yet, and pay out any creator who reached the target?')) return;
    try { const r = await call('admin_fx_ref_close'); show?.('Done: ' + r.badges + ' badge(s), ' + r.payouts + ' payout(s)', 'success'); ov.reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Referral Leaders" sub="Weekly top active referrer gets a Referral Leader badge. Reaching the target pays creator earnings." onRefresh={ov.reload} loading={ov.loading} err={ov.err}>
      <Grid><Stat label="Week starts (UTC)" value={o.week_start || '—'} /><Stat label="Badges to exchange" value={o.cfg ? o.cfg.target : '—'} /><Stat label="Payout" value={o.cfg ? peso(o.cfg.payout) : '—'} /></Grid>
      <div style={{ ...card, fontSize: 13 }}>Runs automatically every Monday 00:10 UTC. An active referral is a referred user with a paid order during the week. <button className="neu-btn" style={{ ...sm, marginLeft: 8 }} onClick={closeWeek}>Run close now</button></div>
      <CfgForm name="referral" title="Referral Leader settings" cfg={o.cfg} onSaved={ov.reload} fields={[{ k: 'target', l: 'Badges to exchange', h: 'whole number' }, { k: 'payout', l: 'Payout (PHP)', h: 'credited once per exchange' }]} />
      <h3 style={{ fontSize: 14 }}>This week</h3>
      <Tbl cols={[['Creator', (r) => nm(r)], ['Active referrals', (r) => <b>{r.active_count}</b>]]} rows={arr(o.standings)} empty="No active referrals yet this week." />
      <h3 style={{ fontSize: 14 }}>Badges</h3>
      <Tbl cols={[['Week', (r) => r.week_start], ['Creator', (r) => nm(r)], ['Active', (r) => r.active_count], ['Exchanged', (r) => (r.redeemed_at ? dateTime(r.redeemed_at) : 'not yet')]]} rows={arr(o.badges)} empty="No badges yet." />
      <h3 style={{ fontSize: 14 }}>Payouts</h3>
      <Tbl cols={[['Creator', (r) => nm(r)], ['Amount', (r) => peso(r.amount)], ['Badges', (r) => r.badges], ['Date', (r) => dateTime(r.created_at)]]} rows={arr(o.payouts)} empty="No payouts yet." />
      <ErrList rows={o.errors} />
    </Shell>
  );
}

/* Points expiry */
export function FxPoints() {
  const { show } = useToast();
  const ov = useOv('admin_fx_pe_overview');
  const o = first(ov.rows);
  const run = async () => {
    if (!window.confirm('Run the points job now? It expires points for every user whose cycle is already due (if enabled).')) return;
    try { const r = await call('admin_fx_pe_run'); show?.(r.enabled === false ? 'Points expiry is switched off.' : 'Done: ' + r.expired_users + ' expired, ' + r.reminders + ' reminded, ' + r.failures + ' failed', 'success'); ov.reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Points expiry" sub="Each cycle, a percent of the points held at the start of the cycle expires. Earning points in the last window cuts the percent." onRefresh={ov.reload} loading={ov.loading} err={ov.err}>
      <div style={{ ...card, fontSize: 13 }}>The job runs hourly at :05 and does nothing while switched off. The first run after switching on gives every holder a fresh cycle, so nothing expires until a full cycle has passed. <button className="neu-btn" style={{ ...sm, marginLeft: 8 }} onClick={run}>Run now</button></div>
      <CfgForm name="points_expiry" title="Points expiry settings" cfg={o.cfg} onSaved={ov.reload}
        warn="Switch ON points expiry? Real loyalty points will start expiring once each cycle ends."
        fields={[{ k: 'enabled', l: 'Enabled', t: 'bool' }, { k: 'days', l: 'Cycle length (days)', h: '7 to 365' }, { k: 'pct', l: 'Expiry percent', h: 'default 30' }, { k: 'reduced_pct', l: 'Reduced percent', h: 'applied if the user earns enough, default 20' }, { k: 'min_earn', l: 'Points to earn to reduce', h: 'default 5' }, { k: 'window_hours', l: 'Window before expiry (hours)', h: 'default 24' }]} />
      <h3 style={{ fontSize: 14 }}>Active cycles (next 200 to expire)</h3>
      <Tbl cols={[['User', (r) => nm(r)], ['Balance now', (r) => r.loyalty_points], ['Points at risk basis', (r) => r.baseline], ['Expires', (r) => dateTime(r.expires_at)], ['Reminded', (r) => (r.reminded ? 'yes' : 'no')]]} rows={arr(o.cycles).map((r) => ({ ...r, id: r.user_id }))} empty="No cycles yet." />
      <h3 style={{ fontSize: 14 }}>Expiry log</h3>
      <Tbl cols={[['When', (r) => dateTime(r.at)], ['User', (r) => nm(r)], ['Expired', (r) => <b>{r.expired}</b>], ['Percent', (r) => r.pct + '%'], ['Earned in window', (r) => r.earned]]} rows={arr(o.log)} empty="Nothing has expired." />
      <ErrList rows={o.errors} />
    </Shell>
  );
}

/* Feature voting */
export function FxVotes() {
  const { show } = useToast();
  const { rows, err, loading, reload } = useLoad(async () => arr(await call('admin_fx_req_list')));
  const act = async (fn, r, q) => {
    if (!window.confirm(q)) return;
    try { await call(fn, { p_id: r.id }); show?.('Done', 'success'); reload(); } catch (e) { show?.(e.message || String(e), 'error'); }
  };
  return (
    <Shell title="Feature voting" sub="Options posted by creators (one per creator per week). Each stays open for 7 days." onRefresh={reload} loading={loading} err={err}>
      <Tbl cols={[['Option', (r) => r.title], ['By', (r) => (r.creator ? '@' + r.creator : '—')], ['Votes', (r) => <b>{r.votes}</b>], ['Posted', (r) => dateTime(r.created_at)], ['State', (r) => (r.is_open ? 'open until ' + dateTime(r.closes_at) : 'closed')],
        ['', (r) => <span>{r.is_open && <button className="neu-btn" style={sm} onClick={() => act('admin_fx_req_close', r, 'Close voting now and show the result?')}>Close now</button>}{' '}<button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => act('admin_fx_req_delete', r, 'Delete this option and its votes?')}>Delete</button></span>]]} rows={rows || []} empty="No options yet." />
    </Shell>
  );
}

/* Upsells */
function ProductPick({ label, list, value, onPick }) {
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const hits = t.length < 2 ? [] : list.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 6);
  const cur = list.find((p) => p.id === value);
  return (
    <div style={{ marginBottom: 10 }}>
      <b style={{ fontSize: 12 }}>{label}</b>: <span style={{ fontSize: 13 }}>{cur ? cur.name : <i style={{ color: '#8a93a3' }}>none chosen</i>}</span>
      <input style={{ ...inp, width: '100%', marginTop: 4 }} placeholder="Search product name" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((p) => <div key={p.id} onClick={() => { onPick(p.id); setQ(''); }} style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,.06)' }}>{p.name}</div>)}
    </div>
  );
}
export function FxUpsells() {
  const { show } = useToast();
  const { rows, err, loading, reload } = useLoad(async () => arr(await call('admin_fx_upsell_list')));
  const prods = useLoad(async () => arr(await call('admin_sv_read', { p_table: 'products', p_limit: 5000, p_order: 'created_at' })));
  const plist = useMemo(() => (prods.rows || []).map((p) => ({ id: String(p.id), name: String(p.name || p.id) })), [prods.rows]);
  const [ed, setEd] = useState(null);
  const save = async () => {
    try { await call('admin_fx_upsell_save', { p_row: { id: ed.id || null, trigger_product: ed.trigger_product, upsell_product: ed.upsell_product, offer_price: Number(ed.offer_price), active: ed.active } }); show?.('Saved', 'success'); setEd(null); reload(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
  };
  const del = async (r) => { if (!window.confirm('Delete this rule?')) return; try { await call('admin_fx_upsell_delete', { p_id: r.id }); reload(); } catch (e) { show?.(e.message || String(e), 'error'); } };
  return (
    <Shell title="Cart upsells" sub="When the cart holds the trigger product, the cart suggests the other product." onRefresh={() => { reload(); prods.reload(); }} loading={loading || prods.loading} err={err || prods.err}>
      <div style={{ ...card, fontSize: 13 }}>The price you enter is only the text shown ("Add this for ₱X"). It does not change what the customer pays, so keep it equal to the product's real price. Tapping the suggestion opens the product page.</div>
      <button className="neu-btn" style={{ ...sm, fontWeight: 700, marginBottom: 10 }} onClick={() => setEd({ trigger_product: '', upsell_product: '', offer_price: '', active: true })}>+ New rule</button>
      <Tbl cols={[['When cart has', (r) => r.trigger_name || r.trigger_product], ['Suggest', (r) => r.upsell_name || r.upsell_product], ['Shown price', (r) => peso(r.offer_price)], ['On', (r) => (r.active ? 'yes' : 'no')],
        ['', (r) => <span><button className="neu-btn" style={sm} onClick={() => setEd({ ...r })}>Edit</button>{' '}<button className="neu-btn" style={{ ...sm, color: '#DC2626' }} onClick={() => del(r)}>Delete</button></span>]]} rows={rows || []} empty="No rules yet." />
      <Modal open={!!ed} onClose={() => setEd(null)} title={ed && ed.id ? 'Edit rule' : 'New rule'} wide>
        {ed && <>
          <ProductPick label="When the cart has" list={plist} value={ed.trigger_product} onPick={(id) => setEd({ ...ed, trigger_product: id })} />
          <ProductPick label="Suggest" list={plist} value={ed.upsell_product} onPick={(id) => setEd({ ...ed, upsell_product: id })} />
          <label style={lab}><b>Shown price (PHP)</b><input style={{ ...inp, width: 140, display: 'block' }} value={ed.offer_price} onChange={(e) => setEd({ ...ed, offer_price: e.target.value })} /></label>
          <label style={lab}><input type="checkbox" checked={ed.active} onChange={(e) => setEd({ ...ed, active: e.target.checked })} /> Active</label>
          <div style={{ display: 'flex', gap: 8 }}><button className="neu-btn neu-btn-success" style={{ padding: '8px 16px', fontWeight: 700 }} onClick={save}>Save</button><button className="neu-btn" style={{ padding: '8px 16px' }} onClick={() => setEd(null)}>Cancel</button></div>
        </>}
      </Modal>
    </Shell>
  );
}

/* GoTyme top-up bonus */
export function FxTopup() {
  const ov = useOv('admin_fx_bonus_list');
  const o = first(ov.rows);
  return (
    <Shell title="Top-up bonus" sub="Bonus for GoTyme top-ups, credited when the top-up is approved." onRefresh={ov.reload} loading={ov.loading} err={ov.err}>
      <Grid><Stat label="Bonus paid in total" value={peso(o.total || 0)} /><Stat label="Bonuses given" value={arr(o.rows).length} sub="latest 100 shown" /></Grid>
      <CfgForm name="topup_bonus" title="Top-up bonus settings" cfg={o.cfg} onSaved={ov.reload} fields={[{ k: 'enabled', l: 'Enabled', t: 'bool' }, { k: 'pct', l: 'Bonus percent', h: 'default 30' }, { k: 'cap', l: 'Cap per top-up (PHP)', h: 'default 10' }, { k: 'min', l: 'Minimum top-up (PHP)', h: 'default 500' }]} />
      <Tbl cols={[['When', (r) => dateTime(r.created_at)], ['User', (r) => nm(r)], ['Bonus', (r) => <b>{peso(r.amount)}</b>], ['Top-up', (r) => String(r.topup_id).slice(0, 8)]]} rows={arr(o.rows).map((r) => ({ ...r, id: r.topup_id }))} empty="No bonuses yet." />
      <ErrList rows={o.errors} />
    </Shell>
  );
}

/* Live viewers and milestones */
export function FxLive() {
  const ov = useOv('admin_fx_live_overview');
  const o = first(ov.rows);
  return (
    <Shell title="Live viewers and savings milestones" sub="Controls for the product-page viewer counter and the checkout savings milestones." onRefresh={ov.reload} loading={ov.loading} err={ov.err}>
      <CfgForm name="live_viewers" title="Live viewer counter" cfg={o.live} onSaved={ov.reload} fields={[{ k: 'enabled', l: 'Show "X people viewing this"', t: 'bool' }]} />
      <CfgForm name="milestones" title="Savings milestones" cfg={o.milestones} onSaved={ov.reload} fields={[{ k: 'steps', l: 'Milestone amounts (PHP)', t: 'steps', h: 'comma separated, e.g. 500, 1000, 2500' }]} />
      <h3 style={{ fontSize: 14 }}>Being viewed right now</h3>
      <Tbl cols={[['Product', (r) => r.name || r.product_id], ['Viewers', (r) => <b>{r.viewers}</b>]]} rows={arr(o.top).map((r) => ({ ...r, id: r.product_id }))} empty="Nobody is viewing a product." />
    </Shell>
  );
}
