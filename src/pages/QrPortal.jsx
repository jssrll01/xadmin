import { useAdminContext } from "../context/AdminContext";
import React, { useState, useCallback, useMemo } from 'react';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { getDb, supabase } from '../supabase.js';
import { logAudit } from '../lib/api.js';
import { uploadToCloudinary } from '../lib/cloud.js';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, RefreshCw, ExternalLink } from 'lucide-react';

const CODE = import.meta.env.VITE_XADMIN_PIN;
const PRESET = 'xmarket_qrportal';
const MAX_MB = 5;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GROUPS = ['xmarket', 'apps', 'profile', 'social', 'contact'];
const STATUSES = ['Active', 'Beta', 'Archive'];
const KINDS = ['certificate', 'achievement', 'photo'];
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const unsafe = (u) => /^\s*(javascript|data|vbscript):/i.test(u || '');
const href = (u) => {
  if (!u) return '';
  if (u.startsWith('#') || /^(https?:|mailto:)/i.test(u)) return u;
  if (u.includes('@') && !u.includes('/')) return 'mailto:' + u;
  return 'https://' + u;
};

const TABS = {
  qrp_links: {
    title: 'Links', name: (r) => r.label, sub: (r) => r.grp + ' · ' + r.url,
    blank: { label: '', grp: 'xmarket', tag: '', cta: '', url: '', emoji: '', logo: '', slug: '', color: '', domain: '', feature: false, own: false },
    fields: [['label', 'Label'], ['grp', 'Group', 'select', GROUPS], ['tag', 'Tag'], ['cta', 'Button text (optional)'], ['url', 'URL, email or handle'], ['emoji', 'Emoji icon (optional)'], ['logo', 'Logo file name in /logos (optional)'], ['slug', 'SimpleIcons slug (optional)'], ['color', 'Brand color hex (optional)'], ['domain', 'Favicon domain (optional)'], ['feature', 'Featured card', 'bool'], ['own', 'Uses own logo from /logos', 'bool']],
    required: ['label', 'url'], urlKeys: ['url'], newId: (r) => slug(r.label),
  },
  qrp_projects: {
    title: 'Projects', name: (r) => r.name, sub: (r) => r.status + ' · ' + r.version,
    blank: { name: '', category: '', type: 'Website / Web App', status: 'Active', version: '', started: '', deployed: '', last_update: '' },
    fields: [['name', 'Name'], ['category', 'Category'], ['type', 'Type'], ['status', 'Status', 'select', STATUSES], ['version', 'Version'], ['started', 'Started'], ['deployed', 'Deployed'], ['last_update', 'Last updated']],
    required: ['name'], urlKeys: [], newId: (r) => slug(r.name),
  },
  qrp_media: {
    title: 'Certificates & Achievements', name: (r) => r.caption || r.id, sub: (r) => r.kind, image: 'src',
    blank: { kind: 'certificate', src: '', caption: '' },
    fields: [['kind', 'Kind', 'select', KINDS], ['caption', 'Caption'], ['src', 'Image URL', 'image']],
    required: ['src'], urlKeys: ['src'], newId: (r) => r.kind.slice(0, 4) + '-' + Date.now().toString(36),
  },
  qrp_service_categories: {
    title: 'Service categories', name: (r) => r.title, sub: (r) => r.id,
    blank: { title: '', notice: '' },
    fields: [['title', 'Title'], ['notice', 'Notice shown under the table (optional)', 'area']],
    required: ['title'], urlKeys: [], newId: (r) => slug(r.title),
  },
  qrp_service_packages: {
    title: 'Service packages', name: (r) => r.name, sub: (r) => r.category_id + ' · ' + r.price,
    blank: { category_id: '', name: '', included: '', price: '', crossed_price: '' },
    fields: [['category_id', 'Category', 'cat'], ['name', 'Name'], ['included', "What's included", 'area'], ['price', 'Price (e.g. ₱299)'], ['crossed_price', 'Crossed-out price (optional, e.g. ₱400)']],
    required: ['category_id', 'name', 'price'], urlKeys: [], newId: (r) => r.category_id + '-' + Date.now().toString(36),
  },
  qrp_content: {
    title: 'Page content', name: (r) => r.id, sub: () => 'JSON content block',
    blank: { id: '', __json: '{}' },
    fields: [['id', 'Key (e.g. hero)'], ['__json', 'Content (JSON)', 'json']],
    required: ['id'], urlKeys: [], newId: (r) => slug(r.id).replace(/-/g, '_'),
  },
};
const KEYS = Object.keys(TABS);

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { code: CODE, ...args });
  if (error) throw error;
  return data;
}
const audit = async (...a) => { try { await logAudit(...a); } catch {} };

export default function QrPortal() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const { show } = useToast();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('overview');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await Promise.all(KEYS.map((k) => rpc('admin_qrp_list', { tbl: k })));
      const d = {};
      KEYS.forEach((k, i) => { d[k] = Array.isArray(res[i]) ? res[i] : []; });
      setData(d); setErr('');
    } catch (e) { setErr(String(e.message || e)); } finally { setLoading(false); }
  }, []);
  useAutoRefresh(load, 15000);

  const cfg = TABS[tab];
  const rows = (cfg && data[tab]) || [];
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const cats = data.qrp_service_categories || [];
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

  const openNew = (t) => {
    const c = TABS[t]; setTab(t); setQ('');
    setEdit({ ...c.blank, __isNew: true, published: true, sort_order: (data[t] || []).length });
  };
  const openEdit = (r) => setEdit({ ...r, __json: cfg === TABS.qrp_content ? JSON.stringify(r.value, null, 2) : undefined });

  const save = async () => {
    if (busy) return;
    const miss = cfg.required.filter((k) => !String(edit[k] ?? '').trim());
    if (miss.length) return show?.('Required: ' + miss.join(', '), 'error');
    if (cfg.urlKeys.some((k) => unsafe(edit[k]))) return show?.('That link type is not allowed', 'error');
    const payload = { ...edit };
    delete payload.__isNew;
    if (tab === 'qrp_content') {
      try { payload.value = JSON.parse(edit.__json); } catch { return show?.('Content is not valid JSON', 'error'); }
    }
    delete payload.__json;
    payload.sort_order = Number(payload.sort_order) || 0;
    if (edit.__isNew) {
      payload.id = cfg.newId(payload);
      if (!payload.id) return show?.('Could not make an ID. Fill the name field.', 'error');
      if (rows.some((r) => r.id === payload.id)) return show?.('An item with this ID already exists', 'error');
    }
    setBusy(true);
    try {
      const r = await rpc('admin_qrp_save', { tbl: tab, payload });
      await audit(edit.__isNew ? 'create' : 'update', tab, r && r.id, edit.__isNew ? null : rows.find((x) => x.id === edit.id), payload);
      show?.(edit.__isNew ? 'Created' : 'Saved', 'success'); setEdit(null); load();
    } catch (e) { show?.(String(e.message || e), 'error'); } finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (tab === 'qrp_service_categories') {
      const n = (data.qrp_service_packages || []).filter((p) => p.category_id === r.id).length;
      if (n) return show?.('This category still has ' + n + ' packages. Move or delete them first.', 'error');
    }
    if (!confirm('Delete "' + cfg.name(r) + '"? The public site will stop showing it.')) return;
    try { await rpc('admin_qrp_delete', { tbl: tab, pid: r.id }); await audit('delete', tab, r.id, r, null); show?.('Deleted', 'success'); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const patch = async (r, p) => {
    try { await rpc('admin_qrp_save', { tbl: tab, payload: { ...r, ...p } }); await audit('update', tab, r.id, r, { ...r, ...p }); load(); }
    catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const move = async (i, dir) => {
    const a = shown[i], b = shown[i + dir];
    if (!a || !b) return;
    const ao = Number(a.sort_order) || 0, bo = Number(b.sort_order) || 0;
    try {
      await rpc('admin_qrp_save', { tbl: tab, payload: { ...a, sort_order: ao === bo ? bo + dir : bo } });
      await rpc('admin_qrp_save', { tbl: tab, payload: { ...b, sort_order: ao } });
      load();
    } catch (e) { show?.(String(e.message || e), 'error'); }
  };

  const upload = async (key, f) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return show?.('Only JPG, PNG or WebP images', 'error');
    if (f.size > MAX_MB * 1024 * 1024) return show?.('Image must be under ' + MAX_MB + ' MB', 'error');
    setUp(true);
    try { set(key, await uploadToCloudinary(f, PRESET)); show?.('Uploaded', 'success'); }
    catch (e) { show?.('Upload failed: ' + e.message, 'error'); } finally { setUp(false); }
  };

  const field = ([k, l, t, opts]) => {
    if (t === 'bool') return (
      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 10 }}>
        <input type="checkbox" checked={!!edit[k]} onChange={(e) => set(k, e.target.checked)} style={{ width: 18, height: 18 }} /><span style={{ fontSize: 14 }}>{l}</span>
      </label>);
    const body = t === 'select' ? (
      <select className="neu-input" value={edit[k] || ''} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>
    ) : t === 'cat' ? (
      <select className="neu-input" value={edit[k] || ''} onChange={(e) => set(k, e.target.value)}><option value="">Choose…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
    ) : t === 'area' || t === 'json' ? (
      <textarea className="neu-input" rows={t === 'json' ? 14 : 3} style={t === 'json' ? { fontFamily: 'monospace', fontSize: 12 } : undefined} value={edit[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
    ) : t === 'image' ? (
      <>
        {edit[k] && <img src={edit[k]} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />}
        <label className="neu-btn" style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', display: 'inline-block', marginBottom: 8 }}>
          {up ? 'Uploading…' : '📁 Choose image'}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={up} onChange={(e) => { upload(k, e.target.files && e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
        </label>
        <input className="neu-input" placeholder="or paste https://res.cloudinary.com/…" value={edit[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
      </>
    ) : (
      <input className="neu-input" value={edit[k] ?? ''} onChange={(e) => set(k, e.target.value)} disabled={k === 'id' && !edit.__isNew} />
    );
    return <div key={k}><div style={lab}>{l}</div>{body}</div>;
  };

  const recent = KEYS.flatMap((k) => (data[k] || []).map((r) => ({ ...r, __t: k })))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 6);

  return (
    <>
      <div className="page-head">
        <div><h1>QR Portal</h1><p>Edits here change the QR Portal public site data</p></div>
        <Btn onClick={load}><RefreshCw size={16} /></Btn>
      </div>
      {err && <Card style={{ marginBottom: 12 }}><div style={{ padding: 12, color: 'var(--danger)', fontSize: 13 }}>{err}</div></Card>}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
        {[['overview', 'Overview'], ...KEYS.map((k) => [k, TABS[k].title])].map(([k, l]) => (
          <button key={k} className="neu-btn" onClick={() => { setTab(k); setQ(''); }} style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: 13, fontWeight: tab === k ? 800 : 500, color: tab === k ? 'var(--accent, #00ffa3)' : undefined }}>{l}</button>
        ))}
      </div>

      {loading ? <Card><div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div></Card> : tab === 'overview' ? (
        <>
          {KEYS.map((k) => {
            const r = data[k] || [], pub = r.filter((x) => x.published).length;
            return (
              <Card key={k} style={{ marginBottom: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div><b>{TABS[k].title}</b><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{r.length} total · {pub} published · {r.length - pub} hidden</div></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="neu-btn" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => setTab(k)}>Manage</button>
                    <button className="neu-btn" style={{ padding: 7 }} onClick={() => openNew(k)} title="New"><Plus size={14} /></button>
                  </div>
                </div>
              </Card>);
          })}
          <h3 style={{ margin: '16px 0 8px' }}>Recently updated</h3>
          {recent.length === 0 ? <Card><div style={{ padding: 16, color: 'var(--text-dim)' }}>No records yet.</div></Card> : recent.map((r) => (
            <Card key={r.__t + r.id} style={{ marginBottom: 8, padding: 12 }}>
              <b>{TABS[r.__t].name(r)}</b>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{TABS[r.__t].title} · {String(r.updated_at).slice(0, 16).replace('T', ' ')}</div>
            </Card>))}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="neu-input" placeholder={'Search ' + cfg.title.toLowerCase() + '…'} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
            <Btn variant="primary" onClick={() => openNew(tab)}><Plus size={16} /> New</Btn>
          </div>
          {shown.length === 0 ? <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>{rows.length ? 'No matches.' : 'Nothing here yet. Tap New.'}</div></Card> : shown.map((r, i) => (
            <Card key={r.id} style={{ marginBottom: 10, padding: 12 }}>
              {cfg.image && r[cfg.image] && <img src={r[cfg.image]} alt="" loading="lazy" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 8, opacity: r.published ? 1 : 0.4 }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <b>{cfg.name(r)}</b>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, wordBreak: 'break-all' }}>{cfg.sub(r)} · {r.published ? 'Published' : 'Hidden'}</div>
                </div>
                <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                  {tab === 'qrp_links' && <a className="neu-btn" style={{ padding: 7 }} href={href(r.url)} target="_blank" rel="noopener noreferrer" title="Preview"><ExternalLink size={14} /></a>}
                  <button className="neu-btn" style={{ padding: 7 }} disabled={i === 0 || !!q} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button className="neu-btn" style={{ padding: 7 }} disabled={i === shown.length - 1 || !!q} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                  <button className="neu-btn" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => patch(r, { published: !r.published })}>{r.published ? 'Hide' : 'Show'}</button>
                  <button className="neu-btn" style={{ padding: 7 }} onClick={() => openEdit(r)}><Edit2 size={14} /></button>
                  <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)' }} onClick={() => remove(r)}><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>))}
        </>
      )}

      <Modal open={!!edit} onClose={() => !busy && setEdit(null)} title={edit ? (edit.__isNew ? 'New ' : 'Edit ') + (cfg ? cfg.title.toLowerCase() : '') : ''}>
        {edit && cfg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cfg.fields.map(field)}
            <div><div style={lab}>Order (lower shows first)</div><input className="neu-input" type="number" value={edit.sort_order ?? 0} onChange={(e) => set('sort_order', e.target.value)} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 10 }}>
              <input type="checkbox" checked={!!edit.published} onChange={(e) => set('published', e.target.checked)} style={{ width: 18, height: 18 }} /><span style={{ fontSize: 14 }}>Published (visible on the public site)</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={save} disabled={busy || up} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={() => setEdit(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
