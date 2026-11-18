import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { peso, dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { card, muted, inp } from '../tw/pages.jsx';

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, { code: getAdminPin(), ...(args || {}) });
  if (error) throw error;
  return data;
};
const TABS = [['open', 'Processing'], ['done', 'Done'], ['all', 'All'], ['items', 'Items and prices']];
const colorOf = (s) => (s === 'completed' ? '#059669' : s === 'cancelled' ? '#DC2626' : '#3B82F6');

function ItemRow({ it, busy, onSave }) {
  const [name, setName] = useState(it.name);
  const [price, setPrice] = useState(String(it.price));
  const [active, setActive] = useState(!!it.active);
  const dirty = name !== it.name || Number(price) !== Number(it.price) || active !== !!it.active;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
      <input style={{ ...inp, flex: '2 1 150px', minWidth: 0 }} value={name} onChange={(e) => setName(e.target.value)} />
      <input style={{ ...inp, width: 96 }} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> On</label>
      <button className="neu-btn neu-btn-success" disabled={busy || !dirty} onClick={() => onSave({ id: it.id, game: it.game, name, price: Number(price), active, sort: it.sort })} style={{ padding: '6px 14px', fontWeight: 700 }}>Save</button>
    </div>
  );
}

export default function GameCredits() {
  const { show } = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('open');
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');
  const [nw, setNw] = useState({ game: '', name: '', price: '' });

  const load = useCallback(async () => {
    try { const r = await rpc('admin_gc_list'); setD(r); setErr(''); setNw((x) => ({ ...x, game: x.game || (r.games && r.games[0] ? r.games[0].code : '') })); }
    catch (e) { setErr(e.message || String(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); show?.(okMsg, 'success'); await load(); }
    catch (e) { show?.(e.message || String(e), 'error'); }
    setBusy('');
  };
  const setStatus = (o, status) => {
    const q = status === 'completed' ? 'Mark ' + o.code + ' as COMPLETED (credits delivered)?' : 'Cancel ' + o.code + ' and REFUND ' + peso(o.total) + ' to the user?';
    if (!window.confirm(q)) return;
    act(o.id, () => rpc('admin_gc_set', { p_id: o.id, p_status: status, p_note: notes[o.id] || '' }), status === 'completed' ? 'Completed' : 'Cancelled and refunded');
  };
  const saveItem = (v) => act('item', () => rpc('admin_gc_item_save', { p_id: v.id || null, p_game: v.game, p_name: v.name, p_price: v.price, p_active: v.active, p_sort: v.sort === undefined ? null : v.sort }), 'Saved');

  const orders = (d && d.orders) || [];
  const shown = orders.filter((o) => (tab === 'open' ? o.status === 'processing' : tab === 'done' ? o.status !== 'processing' : true));
  const openCount = orders.filter((o) => o.status === 'processing').length;
  const gname = (c) => { const g = ((d && d.games) || []).find((x) => x.code === c); return g ? g.name : c; };

  return (
    <div style={{ padding: 16, maxWidth: 820 }}>
      <h2 style={{ margin: '0 0 4px' }}>Game Credits</h2>
      <div style={{ ...muted, marginBottom: 12 }}>Orders are paid from Xwallet. Top up the player's account yourself, then mark the order Completed. Cancel refunds the user automatically.</div>
      {err && <div style={{ ...card, color: '#DC2626' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map(([k, l]) => (
          <button key={k} className={'neu-btn' + (tab === k ? ' neu-btn-success' : '')} onClick={() => setTab(k)} style={{ padding: '7px 14px', fontWeight: 700 }}>{l}{k === 'open' ? ' (' + openCount + ')' : ''}</button>
        ))}
        <button className="neu-btn" onClick={load} style={{ padding: '7px 14px' }}>Refresh</button>
      </div>

      {tab !== 'items' && shown.length === 0 && d && <div style={{ ...card, opacity: .7 }}>{tab === 'open' ? 'No orders waiting.' : 'No orders.'}</div>}
      {tab !== 'items' && shown.map((o) => (
        <div key={o.id} style={card}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b style={{ fontSize: 18 }}>{peso(o.total)}</b>
            <b>{o.code}</b>
            <span style={{ color: colorOf(o.status), fontWeight: 800, textTransform: 'capitalize' }}>{o.status}</span>
            <span style={{ ...muted, marginLeft: 'auto' }}>{dateTime(o.created_at)}</span>
          </div>
          <div style={{ marginTop: 4 }}>{o.item_name}{o.qty > 1 ? ' x' + o.qty : ''} <span style={muted}>({gname(o.game)})</span></div>
          <div style={{ marginTop: 4, fontWeight: 700 }}>User ID: {o.player_id}{o.zone_id ? ' · Zone ID: ' + o.zone_id : ''}</div>
          <div style={muted}>{o.email || String(o.user_id).slice(0, 8)}</div>
          {o.status === 'processing' ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <input style={{ ...inp, flex: 1, minWidth: 140 }} placeholder="Note to the user (optional)" value={notes[o.id] || ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
              <button className="neu-btn neu-btn-success" disabled={busy === o.id} onClick={() => setStatus(o, 'completed')} style={{ padding: '8px 16px', fontWeight: 700 }}>Complete</button>
              <button className="neu-btn" disabled={busy === o.id} onClick={() => setStatus(o, 'cancelled')} style={{ padding: '8px 16px', fontWeight: 700 }}>Cancel and refund</button>
            </div>
          ) : (o.admin_note ? <div style={{ ...muted, marginTop: 6 }}>Note: {o.admin_note}</div> : null)}
        </div>
      ))}

      {tab === 'items' && d && (
        <>
          {(d.games || []).map((g) => (
            <div key={g.code} style={card}>
              <b>{g.name}</b>
              {(d.items || []).filter((i) => i.game === g.code).map((it) => (
                <ItemRow key={it.id + '|' + it.name + '|' + it.price + '|' + it.active} it={it} busy={busy === 'item'} onSave={saveItem} />
              ))}
            </div>
          ))}
          <div style={card}>
            <b>Add an item</b>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <select style={{ ...inp, width: 170 }} value={nw.game} onChange={(e) => setNw({ ...nw, game: e.target.value })}>
                {(d.games || []).map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
              </select>
              <input style={{ ...inp, flex: '2 1 150px', minWidth: 0 }} placeholder="Item name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
              <input style={{ ...inp, width: 96 }} type="number" step="0.01" placeholder="Price" value={nw.price} onChange={(e) => setNw({ ...nw, price: e.target.value })} />
              <button className="neu-btn neu-btn-success" disabled={busy === 'item'} onClick={async () => { await saveItem({ game: nw.game, name: nw.name, price: Number(nw.price), active: true }); setNw({ ...nw, name: '', price: '' }); }} style={{ padding: '6px 14px', fontWeight: 700 }}>Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
