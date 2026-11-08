import { getAdminPin } from '../lib/pin.js';
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const CODE = getAdminPin();
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', margin: '12px 0 5px', textTransform: 'uppercase', letterSpacing: 0.4 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(120,130,150,.35)', background: 'var(--surface)', color: 'inherit', fontSize: 14 };
const BLANK = { title: '', description: '', cost: 100, wallet_amount: 1, stock: '' };
const EXAMPLE = [{ title: 'P10 Xwallet credit', description: 'Added to your Xwallet', cost: 100, wallet_amount: 10, stock: null }];

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
}

export default function PointsShopAdmin() {
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState(null);
  const [bulkErr, setBulkErr] = useState('');

  const load = useCallback(async () => {
    try { setRows(await rpc('admin_points_list', {}) || []); }
    catch (e) { show?.(String(e.message || e), 'error'); setRows([]); }
  }, [show]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const clean = (r) => ({
    ...(r.id ? { id: r.id } : {}),
    title: String(r.title || '').trim(),
    description: String(r.description || '').trim(),
    cost: Number(r.cost),
    wallet_amount: Number(r.wallet_amount),
    stock: r.stock === '' || r.stock === null || r.stock === undefined ? null : Number(r.stock),
  });
  const save = async () => {
    setBusy(true);
    try { await rpc('admin_points_save', { p: clean(edit) }); show?.('Saved', 'success'); setEdit(null); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };
  const del = async (r) => {
    if (!window.confirm('Delete "' + r.title + '"? This cannot be undone.')) return;
    try { await rpc('admin_points_delete', { p_id: String(r.id) }); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };
  const runBulk = async () => {
    setBulkErr('');
    let data;
    try { data = JSON.parse(bulk); } catch (e) { setBulkErr('Invalid JSON: ' + e.message); return; }
    if (data && !Array.isArray(data) && Array.isArray(data.items)) data = data.items;
    if (!Array.isArray(data)) data = [data];
    if (!data.length || data.length > 100) { setBulkErr('Add between 1 and 100 items.'); return; }
    setBusy(true);
    let ok = 0; const failed = []; const msgs = [];
    for (let i = 0; i < data.length; i++) {
      const it = { ...(data[i] || {}) }; delete it.id;
      try { await rpc('admin_points_save', { p: clean(it) }); ok++; }
      catch (e) { failed.push(data[i]); msgs.push('#' + (i + 1) + ': ' + String(e.message || e)); }
    }
    setBusy(false); load();
    if (!failed.length) { show?.(ok + ' added', 'success'); setBulk(null); return; }
    setBulk(JSON.stringify(failed, null, 2));
    setBulkErr(ok + ' added. ' + failed.length + ' failed and are kept below. ' + msgs.join(' | '));
  };
  const upd = (k, v) => setEdit((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Points Shop</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => { setBulkErr(''); setBulk(JSON.stringify(EXAMPLE, null, 2)); }}>Bulk add (JSON)</Btn>
          <Btn variant="primary" onClick={() => setEdit({ ...BLANK })}><Plus size={16} /> New</Btn>
        </div>
      </div>

      {rows === null ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
        : !rows.length ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>No rewards yet. Tap New.</div></Card>
        : rows.map((r) => (
          <Card key={r.id} style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.title}</div>
                {r.description && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>{r.description}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>
                  {Number(r.cost).toLocaleString()} pts · gives ₱{r.wallet_amount} · {r.stock === null || r.stock === undefined ? 'unlimited stock' : 'stock ' + r.stock}
                </div>
              </div>
              <Btn onClick={() => setEdit({ ...r, stock: r.stock ?? '' })}><Edit2 size={15} /></Btn>
              <Btn variant="danger" onClick={() => del(r)}><Trash2 size={15} /></Btn>
            </div>
          </Card>
        ))}

      <Modal open={bulk !== null} onClose={() => setBulk(null)} title="Bulk add: Points Shop">
        {bulk !== null && (<div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>Paste a JSON array, one object per reward (up to 100). Use stock null for unlimited.</div>
          <textarea style={{ ...inp, minHeight: 240, marginTop: 10, fontFamily: 'monospace', fontSize: 12.5 }} value={bulk} onChange={(e) => setBulk(e.target.value)} spellCheck={false} />
          {bulkErr && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger)', lineHeight: 1.5 }}>{bulkErr}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn onClick={() => setBulk(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={runBulk} disabled={busy}>{busy ? 'Adding…' : 'Add all'}</Btn>
          </div>
        </div>)}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && edit.id ? 'Edit reward' : 'New reward'}>
        {edit && (<div>
          <div style={lab}>Title</div>
          <input style={inp} value={edit.title ?? ''} onChange={(e) => upd('title', e.target.value)} />
          <div style={lab}>Description</div>
          <textarea style={{ ...inp, minHeight: 80 }} value={edit.description ?? ''} onChange={(e) => upd('description', e.target.value)} />
          <div style={lab}>Cost (points)</div>
          <input style={inp} type="number" step="any" value={edit.cost ?? ''} onChange={(e) => upd('cost', e.target.value)} />
          <div style={lab}>Xwallet credit (₱)</div>
          <input style={inp} type="number" step="any" value={edit.wallet_amount ?? ''} onChange={(e) => upd('wallet_amount', e.target.value)} />
          <div style={lab}>Stock (leave empty for unlimited)</div>
          <input style={inp} type="number" step="1" value={edit.stock ?? ''} onChange={(e) => upd('stock', e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>)}
      </Modal>
    </div>
  );
}
