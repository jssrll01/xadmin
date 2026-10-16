import React, { useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { supabase } from '../supabase.js';
import { logAudit } from '../lib/api.js';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN || '1010';
const CORE = ['limits', 'spin', 'boxes', 'exchange', 'mini'];
const TABS = [['settings', 'Settings'], ['players', 'Players'], ['txns', 'Transactions'], ['log', 'Alerts']];
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const when = (d) => new Date(d).toLocaleString();

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}
const audit = async (...a) => { try { await logAudit(...a); } catch {} };

export default function PlayTime() {
  const { show } = useToast();
  const [tab, setTab] = useState('settings');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);
  const [adj, setAdj] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState([]);

  const load = useCallback(async () => {
    try {
      let list = [];
      if (tab === 'settings') {
        const { data, error } = await supabase.from('playtime_config').select('*').order('key');
        if (error) throw error;
        list = data || [];
      } else if (tab === 'players') list = await rpc('admin_pt_players', { p_search: search });
      else if (tab === 'txns') list = await rpc('admin_pt_txns', { p_limit: 150, p_search: search });
      else list = await rpc('admin_pt_log', { p_limit: 150 });
      setRows(Array.isArray(list) ? list : []); setErr('');
    } catch (e) { setRows([]); setErr(String(e.message || e)); } finally { setLoading(false); }
  }, [tab, search]);
  useAutoRefresh(load, 8000);

  const switchTab = (k) => { setTab(k); setRows([]); setLoading(true); setSearch(''); setSel([]); };

  const saveSetting = async () => {
    let value;
    try { value = JSON.parse(edit.text); } catch { show?.('The value is not valid JSON', 'error'); return; }
    if (!edit.key.trim()) { show?.('Setting name is required', 'error'); return; }
    setBusy(true);
    try {
      await rpc('admin_pt_config_save', { p_key: edit.key.trim(), p_value: value });
      await audit('update', 'playtime_config', edit.key.trim(), null, value);
      show?.('Saved', 'success'); setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };

  const delSetting = async (r) => {
    if (!confirm(`Delete setting "${r.key}"?`)) return;
    try { await rpc('admin_pt_config_delete', { p_key: r.key }); await audit('delete', 'playtime_config', r.key, r.value, null); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const doAdjust = async () => {
    const d = parseInt(adj.delta, 10);
    if (!d) { show?.('Enter a non-zero amount (use a minus sign to deduct)', 'error'); return; }
    setBusy(true);
    try {
      const r = await rpc('admin_pt_adjust', { p_uid: adj.id, p_delta: d, p_note: adj.note || null });
      await audit('update', 'playtime_points', adj.id, null, { delta: d, note: adj.note });
      show?.(`New balance: ${r.balance}`, 'success'); setAdj(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };

  const delRow = async (fn, r, label) => {
    if (!confirm(`Delete this ${label}? This does not change any balance.`)) return;
    try { await rpc(fn, { p_id: r.id }); await audit('delete', 'playtime_' + label, r.id, r, null); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const delMany = async () => {
    if (!sel.length) return;
    if (!confirm(`Delete ${sel.length} transaction${sel.length === 1 ? '' : 's'}? This does not change any balance.`)) return;
    try {
      const n = await rpc('admin_pt_txn_delete_many', { p_ids: sel });
      await audit('delete', 'playtime_transaction', null, { ids: sel }, null);
      show?.(`Deleted ${n}`, 'success'); setSel([]); load();
    } catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const trashBtn = (onClick) => (
    <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }} onClick={onClick} title="Delete"><Trash2 size={14} /></button>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Play Time</h1><p>Settings, players, transactions and alerts</p></div>
        {tab === 'settings' && <Btn variant="primary" onClick={() => setEdit({ isNew: true, key: '', text: '{\n  \n}' })}><Plus size={16} /> New</Btn>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => <Btn key={k} variant={tab === k ? 'primary' : undefined} onClick={() => switchTab(k)}>{l}</Btn>)}
      </div>

      {tab === 'txns' && sel.length > 0 && (
        <div style={{ marginBottom: 12 }}><Btn onClick={delMany}>Delete selected ({sel.length})</Btn></div>
      )}

      {(tab === 'players' || tab === 'txns') && (
        <Card style={{ marginBottom: 12, padding: 10 }}>
          <input className="neu-input" placeholder={tab === 'players' ? 'Search email or username…' : 'Search email or game…'} value={search} onChange={e => setSearch(e.target.value)} />
        </Card>
      )}
      {err && <Card style={{ marginBottom: 12 }}><div style={{ padding: 12, color: 'var(--danger)', fontSize: 13 }}>{err}</div></Card>}

      {loading && rows.length === 0 ? (
        <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
      ) : rows.length === 0 ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>Nothing here yet.</div></Card>
      ) : tab === 'settings' ? (
        rows.map(r => (
          <Card key={r.key} style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <b>{r.key}</b>{CORE.includes(r.key) ? ' · core' : ''}
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, wordBreak: 'break-all' }}>{JSON.stringify(r.value).slice(0, 140)}…</div>
              </div>
              <div style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                <button className="neu-btn" style={{ padding: 7 }} onClick={() => setEdit({ key: r.key, text: JSON.stringify(r.value, null, 2) })} title="Edit"><Edit2 size={14} /></button>
                {!CORE.includes(r.key) && trashBtn(() => delSetting(r))}
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="table-wrap">
          <table className="neu-table">
            <thead>
              {tab === 'players' && <tr><th>Player</th><th>Loyalty Points</th><th>XWallet</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr>}
              {tab === 'txns' && <tr><th style={{ width: 1 }}><input type="checkbox" checked={rows.length > 0 && sel.length === rows.length} onChange={e => setSel(e.target.checked ? rows.map(x => x.id) : [])} /></th><th>When</th><th>Player</th><th>Game</th><th>Spent</th><th>Earned</th><th>XWallet</th><th>Balance</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr>}
              {tab === 'log' && <tr><th>When</th><th>Player</th><th>Event</th><th>Detail</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr>}
            </thead>
            <tbody>
              {tab === 'players' && rows.map(r => (
                <tr key={r.id}>
                  <td className="cell-wrap"><b>{`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}</b><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.email}</div></td>
                  <td>{Number(r.loyalty_points).toLocaleString()}</td><td>₱{Number(r.xwallet_balance).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}><button className="neu-btn" style={{ padding: 7 }} onClick={() => setAdj({ id: r.id, email: r.email, delta: '', note: '' })} title="Adjust points"><Edit2 size={14} /></button></td>
                </tr>
              ))}
              {tab === 'txns' && rows.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={sel.includes(r.id)} onChange={e => setSel(e.target.checked ? [...sel, r.id] : sel.filter(x => x !== r.id))} /></td><td>{when(r.created_at)}</td><td className="cell-wrap">{r.email || '—'}</td><td>{r.action || r.game}</td>
                  <td>{r.spent}</td><td>{r.earned}</td><td>{Number(r.wallet_credit) > 0 ? '₱' + Number(r.wallet_credit) : '—'}</td>
                  <td>{r.prev_balance} → {r.new_balance}</td>
                  <td style={{ textAlign: 'right' }}>{trashBtn(() => delRow('admin_pt_txn_delete', r, 'transaction'))}</td>
                </tr>
              ))}
              {tab === 'log' && rows.map(r => (
                <tr key={r.id}>
                  <td>{when(r.created_at)}</td><td className="cell-wrap">{r.email || '—'}</td><td>{r.event}</td>
                  <td className="cell-wrap" style={{ fontSize: 12 }}>{JSON.stringify(r.detail)}</td>
                  <td style={{ textAlign: 'right' }}>{trashBtn(() => delRow('admin_pt_log_delete', r, 'alert'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'New setting' : 'Edit setting'}>
        {edit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><div style={lab}>Name</div>
              <input className="neu-input" value={edit.key} disabled={!edit.isNew} onChange={e => setEdit({ ...edit, key: e.target.value })} /></div>
            <div><div style={lab}>Value (JSON object)</div>
              <textarea className="neu-input" rows={14} style={{ fontFamily: 'monospace', fontSize: 12 }} value={edit.text} onChange={e => setEdit({ ...edit, text: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={saveSetting} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!adj} onClose={() => setAdj(null)} title="Adjust Loyalty Points">
        {adj && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13 }}>{adj.email}</div>
            <div><div style={lab}>Amount (negative to deduct)</div>
              <input className="neu-input" type="number" value={adj.delta} onChange={e => setAdj({ ...adj, delta: e.target.value })} /></div>
            <div><div style={lab}>Note</div>
              <input className="neu-input" value={adj.note} onChange={e => setAdj({ ...adj, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={doAdjust} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Apply'}</Btn>
              <Btn onClick={() => setAdj(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
