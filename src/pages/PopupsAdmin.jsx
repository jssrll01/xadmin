import { getAdminPin } from '../lib/pin.js';
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import ImageUrlsField from '../components/ImageUrlsField.jsx';
import { useToast } from '../components/Toast.jsx';
import { supabase } from '../supabase.js';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', margin: '12px 0 5px', textTransform: 'uppercase', letterSpacing: 0.4 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(120,130,150,.35)', background: 'var(--surface)', color: 'inherit', fontSize: 14 };
const PAGES = ['/digital-hub', '/price-drops', '/digital-products', '/demand-polls', '/sponsorships', '/points-shop', '/xcards', '/rewards', '/vip', '/socials', '/xwallet', '/xwallet/topup'];
const BLANK = { title: '', images: '', link: '', sort_order: 0, frequency: 'open', active: true, starts_at: '', ends_at: '' };
const p2 = (n) => String(n).padStart(2, '0');
const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const FREQ = { open: 'Every app open', daily: 'Once a day', once: 'Only once' };

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
}
const status = (r) => {
  const n = Date.now();
  if (!r.active) return 'Off';
  if (r.starts_at && new Date(r.starts_at) > n) return 'Scheduled';
  if (r.ends_at && new Date(r.ends_at) <= n) return 'Expired';
  return 'Live';
};

export default function PopupsAdmin() {
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await rpc('admin_popup_list', {})); } catch (e) { show?.(String(e.message || e), 'error'); setRows([]); }
  }, [show]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const payload = (r) => ({
    id: r.id, title: r.title, image_url: r.image_url, link: r.link || '', sort_order: r.sort_order,
    frequency: r.frequency, active: r.active, starts_at: r.starts_at || '', ends_at: r.ends_at || '',
  });
  const openEdit = (r) => setEdit(r ? { ...r, images: r.image_url, link: r.link || '', starts_at: toLocal(r.starts_at), ends_at: toLocal(r.ends_at) } : { ...BLANK });
  const save = async () => {
    const img = lines(edit.images)[0];
    if (!edit.title.trim()) return show?.('Give the popup a title (only you see it)', 'error');
    if (!img) return show?.('Upload a popup image', 'error');
    const link = (edit.link || '').trim();
    if (link && !/^(\/[^/\s]\S*|https:\/\/\S+)$/i.test(link)) return show?.('Link must start with / (in-app page) or https://', 'error');
    setBusy(true);
    try {
      await rpc('admin_popup_save', { p: {
        id: edit.id, title: edit.title, image_url: img, link, sort_order: Number(edit.sort_order) || 0,
        frequency: edit.frequency, active: !!edit.active,
        starts_at: edit.starts_at ? new Date(edit.starts_at).toISOString() : '',
        ends_at: edit.ends_at ? new Date(edit.ends_at).toISOString() : '',
      } });
      show?.('Saved', 'success'); setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };
  const toggle = async (r) => {
    try { await rpc('admin_popup_save', { p: { ...payload(r), active: !r.active } }); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };
  const del = async (r) => {
    if (!window.confirm('Delete "' + r.title + '"? This cannot be undone.')) return;
    try { await rpc('admin_popup_delete', { p_id: r.id }); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };
  const upd = (k, v) => setEdit((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Launch Popups</h1>
        <Btn variant="primary" onClick={() => openEdit(null)}><Plus size={16} /> New popup</Btn>
      </div>
      {rows === null ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card>
        : !rows.length ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>No popups yet. Tap New popup.</div></Card>
        : rows.map((r) => (
          <Card key={r.id} style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={r.image_url} alt="" style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 10, background: '#EEF1F6' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3, wordBreak: 'break-all' }}>{r.link || 'No link'}</div>
                <div style={{ fontSize: 12, marginTop: 5 }}><b>{status(r)}</b> · order {r.sort_order} · {FREQ[r.frequency]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{r.views} views · {r.clicks} clicks{r.views ? ' (' + Math.round((r.clicks / r.views) * 100) + '%)' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn onClick={() => toggle(r)}>{r.active ? 'Turn off' : 'Turn on'}</Btn>
              <Btn onClick={() => openEdit(r)}><Edit2 size={15} /></Btn>
              <Btn variant="danger" onClick={() => del(r)}><Trash2 size={15} /></Btn>
            </div>
          </Card>
        ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && edit.id ? 'Edit popup' : 'New popup'}>
        {edit && (<div>
          <div style={lab}>Title (only you see this)</div>
          <input style={inp} value={edit.title} onChange={(e) => upd('title', e.target.value)} />
          <div style={lab}>Popup image (portrait works best, PNG or WebP)</div>
          <ImageUrlsField value={edit.images} onChange={(v) => upd('images', lines(v).slice(-1).join('\n'))} />
          <div style={lab}>Opens when tapped (optional)</div>
          <input style={inp} list="xm-pages" value={edit.link} onChange={(e) => upd('link', e.target.value)} placeholder="/price-drops or https://…" />
          <datalist id="xm-pages">{PAGES.map((p) => <option key={p} value={p} />)}</datalist>
          <div style={lab}>Order (lower shows first)</div>
          <input style={inp} type="number" value={edit.sort_order} onChange={(e) => upd('sort_order', e.target.value)} />
          <div style={lab}>How often</div>
          <select style={inp} value={edit.frequency} onChange={(e) => upd('frequency', e.target.value)}>
            {Object.entries(FREQ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div style={lab}>Start (optional)</div>
          <input style={inp} type="datetime-local" value={edit.starts_at} onChange={(e) => upd('starts_at', e.target.value)} />
          <div style={lab}>End (optional)</div>
          <input style={inp} type="datetime-local" value={edit.ends_at} onChange={(e) => upd('ends_at', e.target.value)} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0 4px', fontSize: 14 }}><input type="checkbox" checked={!!edit.active} onChange={(e) => upd('active', e.target.checked)} />Active</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>)}
      </Modal>
    </div>
  );
}
