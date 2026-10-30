import { useAdminContext } from "../context/AdminContext";
import React, { useState, useEffect, useCallback } from 'react';
import { getDb, supabase } from '../supabase.js';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const PAD = 16;
const TABS = [['tiers', 'Tiers'], ['draws', 'Draws'], ['bets', 'Bets']];
const when = (d) => (d ? new Date(d).toLocaleString() : '');
const th = { textAlign: 'left', fontSize: 11, padding: '6px 8px', color: 'var(--text-dim)', textTransform: 'uppercase' };
const td = { padding: '6px 8px', fontSize: 13, whiteSpace: 'nowrap' };
const card = { padding: 8, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' };
const btn = { padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const active = { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', marginBottom: 10, fontSize: 15 };
const BLANK = { isNew: true, key: '', label: '', max_n: '', win_count: '', payout: '', sort: '' };

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}
const delMsg = (r) => 'Deleted ' + r.deleted + (r.skipped ? ' · kept ' + r.skipped + ' protected' : '');

export default function AirdropMod() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const [tab, setTab] = useState('tiers');
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [toast, setToast] = useState('');
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    try {
      const fn = tab === 'tiers' ? 'admin_airdrop_tiers' : tab === 'draws' ? 'admin_airdrop_draws' : 'admin_airdrop_bets';
      const list = await rpc(fn, tab === 'tiers' ? {} : { p_limit: 150 });
      const arr = Array.isArray(list) ? list : [];
      setRows(arr);
      setSel((s) => new Set([...s].filter((id) => arr.some((r) => r.id === id))));
      setErr('');
    } catch (e) { setRows([]); setErr(String(e.message || e)); } finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const switchTab = (k) => { setTab(k); setRows([]); setSel(new Set()); setLoading(true); };
  const run = async (fn, args, msg) => {
    try { const r = await rpc(fn, args); say(typeof msg === 'function' ? msg(r) : msg); load(); return r; }
    catch (e) { say(String(e.message || e)); }
  };
  const toggle = (t) => run('admin_airdrop_toggle', { p_key: t.key, p_enabled: !t.enabled }, t.label + (t.enabled ? ' turned off' : ' turned on'));
  const pick = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = rows.length > 0 && sel.size === rows.length;
  const delMany = (kind, ids) => {
    if (!ids.length || !window.confirm('Delete ' + ids.length + ' ' + kind + '?')) return;
    run('admin_airdrop_' + kind + '_delete', { p_ids: ids }, delMsg);
  };
  const delAll = () => window.confirm('Delete ALL draws? Open draws with bets are kept so those bets still get paid. Bets are not deleted.')
    && run('admin_airdrop_draws_delete_all', {}, delMsg);
  const delTier = (t) => window.confirm('Delete tier "' + t.label + '"?') && run('admin_airdrop_tier_delete', { p_key: t.key }, 'Tier deleted');
  const openEdit = (t) => {
    setFormErr('');
    setForm(t ? { isNew: false, key: t.key, label: t.label, max_n: t.max_n, win_count: t.win_count, payout: t.payout, sort: t.sort ?? '' } : BLANK);
  };
  const saveTier = async () => {
    const f = form;
    const max_n = Number(f.max_n), win = Number(f.win_count), pay = Number(f.payout), sort = f.sort === '' ? 0 : Number(f.sort);
    if (!String(f.key).trim() || !String(f.label).trim()) return setFormErr('Key and label are required');
    if (!(max_n >= 2) || !(win >= 1) || win >= max_n) return setFormErr('Range must be 2 or more, and winners fewer than the range');
    if (!(pay > 0)) return setFormErr('Payout multiplier must be above 0');
    try {
      await rpc('admin_airdrop_tier_save', { p_key: String(f.key).trim(), p_label: String(f.label).trim(), p_max_n: max_n, p_win_count: win, p_payout: pay, p_sort: sort });
      setForm(null); say(f.isNew ? 'Tier added' : 'Tier updated'); load();
    } catch (e) { setFormErr(String(e.message || e)); }
  };
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const headCheck = <th style={th}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} /></th>;
  const rowCheck = (r) => <td style={td}><input type="checkbox" checked={sel.has(r.id)} onChange={() => pick(r.id)} /></td>;

  return (
    <div style={{ padding: PAD }}>
      <h2 style={{ margin: '0 0 12px' }}>🎮 Airdrop 88</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => <button key={k} style={{ ...btn, ...(tab === k ? active : {}) }} onClick={() => switchTab(k)}>{l}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tab === 'tiers' && <button style={btn} onClick={() => openEdit(null)}>+ New tier</button>}
        {tab === 'draws' && <>
          <button style={btn} disabled={!sel.size} onClick={() => delMany('draws', [...sel])}>Delete selected ({sel.size})</button>
          <button style={{ ...btn, color: 'var(--danger)' }} disabled={!rows.length} onClick={delAll}>Delete all</button>
        </>}
        {tab === 'bets' && <button style={btn} disabled={!sel.size} onClick={() => delMany('bets', [...sel])}>Delete selected ({sel.size})</button>}
      </div>
      {err && <div style={{ ...card, padding: 12, color: '#EF4444', marginBottom: 12 }}>{err}</div>}
      {loading ? <div style={{ ...card, padding: 12 }}>Loading…</div> : (
        <div style={{ ...card, overflowX: 'auto' }}>
          {rows.length === 0 ? <div style={{ padding: 12 }}>No data yet.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {tab === 'tiers' && ['Game', 'Range', 'Winners', 'Pays', 'Bets', 'In', 'Out', 'Margin', 'Status', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}
                {tab === 'draws' && <>{headCheck}{['Draw time', 'Game', 'Status', 'Winning', 'Bets', 'In', 'Out', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</>}
                {tab === 'bets' && <>{headCheck}{['Time', 'Game', 'Player', 'Pick', 'Bet', 'Result', 'Payout', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</>}
              </tr></thead>
              <tbody>
                {rows.map((r) => tab === 'tiers' ? (
                  <tr key={r.key}>
                    <td style={td}>{r.label}</td><td style={td}>1-{r.max_n}</td><td style={td}>{r.win_count}</td>
                    <td style={td}>{r.payout}x</td><td style={td}>{r.bets}</td><td style={td}>{r.total_in}</td>
                    <td style={td}>{r.total_out}</td><td style={td}>{r.total_in - r.total_out}</td>
                    <td style={td}><button style={{ ...btn, color: r.enabled ? '#16A34A' : '#EF4444' }} onClick={() => toggle(r)}>{r.enabled ? 'ON' : 'OFF'}</button></td>
                    <td style={td}>
                      <button style={btn} onClick={() => openEdit(r)}>Edit</button>{' '}
                      <button style={{ ...btn, color: 'var(--danger)' }} onClick={() => delTier(r)}>Delete</button>
                    </td>
                  </tr>
                ) : tab === 'draws' ? (
                  <tr key={r.id}>
                    {rowCheck(r)}
                    <td style={td}>{when(r.draw_at)}</td><td style={td}>{r.tier}</td><td style={td}>{r.status}</td>
                    <td style={td}>{(r.winning || []).join(', ')}</td><td style={td}>{r.bets}</td>
                    <td style={td}>{r.total_in}</td><td style={td}>{r.total_out}</td>
                    <td style={td}><button style={{ ...btn, color: 'var(--danger)' }} onClick={() => delMany('draws', [r.id])}>Delete</button></td>
                  </tr>
                ) : (
                  <tr key={r.id}>
                    {rowCheck(r)}
                    <td style={td}>{when(r.created_at)}</td><td style={td}>{r.tier}</td><td style={td}>{r.email}</td>
                    <td style={td}>{r.pick}</td><td style={td}>{r.amount}</td>
                    <td style={td}>{r.win == null ? 'pending' : r.win ? 'WIN' : 'lose'}</td><td style={td}>{r.payout ?? ''}</td>
                    <td style={td}><button style={{ ...btn, color: 'var(--danger)' }} onClick={() => delMany('bets', [r.id])}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {form && (
        <div onClick={() => setForm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, padding: 18, width: 'min(420px, 92vw)' }}>
            <h3 style={{ marginTop: 0 }}>{form.isNew ? 'New tier' : 'Edit tier'}</h3>
            <input style={inp} placeholder="Key (e.g. x10)" value={form.key} disabled={!form.isNew} onChange={setF('key')} />
            <input style={inp} placeholder="Label" value={form.label} onChange={setF('label')} />
            <input style={inp} placeholder="Range max (picks 1 to N)" inputMode="numeric" value={form.max_n} onChange={setF('max_n')} />
            <input style={inp} placeholder="Winning numbers per draw" inputMode="numeric" value={form.win_count} onChange={setF('win_count')} />
            <input style={inp} placeholder="Payout multiplier (e.g. 8)" inputMode="decimal" value={form.payout} onChange={setF('payout')} />
            <input style={inp} placeholder="Sort order" inputMode="numeric" value={form.sort} onChange={setF('sort')} />
            {formErr && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{formErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btn, ...active }} onClick={saveTier}>Save</button>
              <button style={btn} onClick={() => setForm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 16px', borderRadius: 99, fontSize: 14, zIndex: 2000 }}>{toast}</div>}
    </div>
  );
}
