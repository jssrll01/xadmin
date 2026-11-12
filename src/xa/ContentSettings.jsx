import React, { useCallback, useEffect, useState } from 'react';
import { adm } from './db.js';
import { xmSupabase } from '../supabase.js';
import { ConfirmDialog, SkRows, ErrorState, EmptyState } from './Kit.jsx';

const TABS = [
  ['payment_methods', 'Payments'], ['delivery_methods', 'Delivery'], ['xcard_denominations', 'Xcards'],
  ['return_reasons', 'Return reasons'], ['report_categories', 'Report categories'], ['support_channels', 'Support'],
  ['carriers', 'Carriers'], ['faqs', 'FAQs'], ['help_categories', 'Help topics'], ['help_articles', 'Help articles'],
  ['legal_documents', 'Legal'], ['site', 'Site'],
];
const SKIP = ['id', 'created_at', 'updated_at'];
const SITE_KEYS = ['use_db_config', 'support_email', 'site_url', 'logo_url', 'share_card_url', 'creator_post_rules'];
const box = { padding: 12, marginBottom: 12, border: '1px solid var(--xa-line, #2a2f3a)', borderRadius: 10 };
const inp = { width: '100%', padding: 8, boxSizing: 'border-box' };
const pk = (t) => (t === 'xcard_denominations' ? 'value' : 'id');

function Field({ k, v, onChange }) {
  if (typeof v === 'boolean') return <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} />;
  if (typeof v === 'number') return <input style={inp} type="number" value={v} onChange={(e) => onChange(Number(e.target.value))} />;
  if (Array.isArray(v)) return <textarea style={inp} rows={2} value={v.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />;
  const s = v == null ? '' : String(v);
  if (s.length > 80 || k === 'body' || k === 'answer' || k === 'instructions') return <textarea style={inp} rows={5} value={s} onChange={(e) => onChange(e.target.value)} />;
  return <input style={inp} value={s} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} />;
}

function Table({ table, note }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState(null);
  const [del, setDel] = useState(null);
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(''); setRows(null);
    try { setRows(await adm('adm_cfg_list', { p_table: table })); } catch (e) { setErr(e.message); }
  }, [table]);
  useEffect(() => { load(); setDraft(null); }, [load]);

  const save = async (row) => {
    setBusy(true);
    try { await adm('adm_cfg_save', { p_table: table, p_row: row }); setDraft(null); note('Saved. Apps pick it up within 5 minutes.'); await load(); }
    catch (e) { note('Error: ' + e.message); }
    setBusy(false); setPay(false);
  };
  const submit = () => (table === 'payment_methods' ? setPay(true) : save(draft));
  const move = async (i, d) => {
    const a = rows[i]; const b = rows[i + d]; if (!b) return;
    try {
      await adm('adm_cfg_save', { p_table: table, p_row: { [pk(table)]: a[pk(table)], sort_order: b.sort_order } });
      await adm('adm_cfg_save', { p_table: table, p_row: { [pk(table)]: b[pk(table)], sort_order: a.sort_order } });
      await load();
    } catch (e) { note('Error: ' + e.message); }
  };
  const blank = () => { const t = rows && rows[0] ? rows[0] : {}; const o = {}; Object.keys(t).forEach((k) => { if (!SKIP.includes(k)) o[k] = typeof t[k] === 'boolean' ? (k === 'active') : Array.isArray(t[k]) ? [] : typeof t[k] === 'number' ? 0 : null; }); o.sort_order = (rows || []).length + 1; return o; };
  const label = (r) => r.name || r.label || r.title || r.question || r.slug || r.value;

  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <SkRows rows={5} cols={3} />;
  return (
    <div>
      <button type="button" onClick={() => setDraft(blank())}>+ Add</button>
      {!rows.length && <EmptyState title="No rows" />}
      {rows.map((r, i) => (
        <div key={r[pk(table)]} style={{ ...box, opacity: r.active === false ? 0.5 : 1 }}>
          <b>{String(label(r))}</b>
          <span style={{ float: 'right' }}>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>
            {'active' in r && <button type="button" onClick={() => save({ [pk(table)]: r[pk(table)], active: !r.active })}>{r.active ? 'Hide' : 'Show'}</button>}
            <button type="button" onClick={() => setDraft({ ...r })}>Edit</button>
            <button type="button" onClick={() => setDel(r)}>Delete</button>
          </span>
        </div>
      ))}
      {draft && (
        <div style={box}>
          {Object.keys(draft).filter((k) => !SKIP.includes(k) || (k === 'id' && false)).map((k) => (
            <label key={k} style={{ display: 'block', marginBottom: 8 }}><small>{k}</small><Field k={k} v={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} /></label>
          ))}
          <button type="button" disabled={busy} onClick={submit}>Save</button>{' '}
          <button type="button" onClick={() => setDraft(null)}>Cancel</button>
          {table === 'legal_documents' && <p><small>Increase version when the text changes. Past versions: open Database, legal_document_history.</small></p>}
        </div>
      )}
      <ConfirmDialog open={pay} title="Edit payment method" message="Account numbers and QR links decide where customers send money. Type CONFIRM to save." confirmText="Save" danger typeToConfirm="CONFIRM" busy={busy} onConfirm={() => save(draft)} onCancel={() => setPay(false)} />
      <ConfirmDialog open={!!del} title="Delete row" message={del ? 'Delete "' + label(del) + '"?' : ''} confirmText="Delete" danger busy={busy}
        onConfirm={async () => { setBusy(true); try { await adm('adm_cfg_delete', { p_table: table, p_id: String(del[pk(table)]) }); note('Deleted.'); await load(); } catch (e) { note('Error: ' + e.message); } setBusy(false); setDel(null); }}
        onCancel={() => setDel(null)} />
    </div>
  );
}

function Site({ note }) {
  const [vals, setVals] = useState(null);
  const [flag, setFlag] = useState(false);
  const load = useCallback(async () => {
    const { data } = await xmSupabase.from('platform_settings').select('key,value').in('key', SITE_KEYS);
    setVals(Object.fromEntries((data || []).map((r) => [r.key, r.value])));
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (k, v) => { try { await adm('adm_content_setting_save', { p_key: k, p_value: v }); note('Saved ' + k); await load(); } catch (e) { note('Error: ' + e.message); } };
  if (!vals) return <SkRows rows={4} cols={2} />;
  return (
    <div>
      <div style={box}>
        <b>use_db_config</b>: {vals.use_db_config === 'true' ? 'ON' : 'OFF'}{' '}
        <button type="button" onClick={() => setFlag(true)}>Turn {vals.use_db_config === 'true' ? 'off' : 'on'}</button>
      </div>
      {SITE_KEYS.filter((k) => k !== 'use_db_config').map((k) => (
        <div key={k} style={box}>
          <small>{k}</small>
          <textarea style={inp} rows={k === 'creator_post_rules' ? 6 : 2} value={vals[k] || ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
          <button type="button" onClick={() => save(k, vals[k] || '')}>Save</button>
        </div>
      ))}
      <ConfirmDialog open={flag} title="Switch use_db_config" message="Off makes every app use its built-in text again." confirmText="Switch" danger
        onConfirm={async () => { await save('use_db_config', vals.use_db_config === 'true' ? 'false' : 'true'); setFlag(false); }} onCancel={() => setFlag(false)} />
    </div>
  );
}

export default function ContentSettings() {
  const [tab, setTab] = useState('payment_methods');
  const [msg, setMsg] = useState('');
  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2>Content</h2>
      <p><small>Apps cache this for 5 minutes, so changes show up within 5 minutes.</small></p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} style={{ fontWeight: tab === k ? 700 : 400 }}>{l}</button>)}
      </div>
      {msg && <p role="status">{msg}</p>}
      {tab === 'site' ? <Site note={setMsg} /> : <Table key={tab} table={tab} note={setMsg} />}
    </div>
  );
}
