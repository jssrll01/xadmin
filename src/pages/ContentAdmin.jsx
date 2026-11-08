import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { getAdminPin } from '../lib/pin.js';
import { supabase } from '../supabase.js';
import { useToast } from '../components/Toast.jsx';
import Btn from '../components/Btn.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import Field from '../xa/ui/Field.jsx';
import DatePicker from '../xa/ui/DatePicker.jsx';
import ImageUpload from '../xa/ImageUpload.jsx';
import { ConfirmDialog, EmptyState, SkRows } from '../xa/Kit.jsx';

const CODE = getAdminPin();
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
}
const url = (v) => /^https?:\/\/\S+$/i.test(v || '');

// field: [key, label, type, required]
const CFG = {
  cinema_movies: {
    title: 'Cinema', subtitle: 'Movies shown in the Cinema page', flag: 'active',
    blank: { price: 10, sort: 0, active: true },
    name: (r) => r.title, sub: (r) => '₱' + r.price + ' · ' + (r.genre || 'No genre') + (r.active ? '' : ' · hidden'),
    fields: [['title', 'Title', 'text', true], ['youtube_url', 'YouTube link', 'url', true], ['poster_url', 'Poster image', 'image'], ['genre', 'Row name / genre', 'text'], ['description', 'Description', 'area'], ['price', 'Price (₱)', 'number', true], ['sort', 'Order (lower first)', 'number'], ['active', 'Visible to users', 'bool']],
  },
  articles: {
    title: 'Weekly Articles', subtitle: 'Articles shown in the app', flag: 'published',
    blank: { published: true },
    name: (r) => r.title, sub: (r) => (r.author || 'No author') + (r.published ? '' : ' · hidden'),
    fields: [['title', 'Title', 'text', true], ['summary', 'Short summary', 'area'], ['cover_url', 'Cover image', 'image'], ['author', 'Author', 'text'], ['body', 'Article text (blank line = new paragraph)', 'big', true], ['published', 'Published', 'bool']],
  },
  scholarships: {
    title: 'Scholarships', subtitle: 'Scholarship opportunities', flag: 'active',
    blank: { active: true },
    name: (r) => r.title, sub: (r) => (r.provider || 'No provider') + (r.deadline ? ' · deadline ' + r.deadline : '') + (r.active ? '' : ' · hidden'),
    fields: [['title', 'Title', 'text', true], ['provider', 'Provider', 'text'], ['description', 'Description', 'area'], ['requirements', 'Requirements', 'area'], ['deadline', 'Deadline', 'date'], ['apply_url', 'Apply link', 'url'], ['active', 'Visible to users', 'bool']],
  },
  freelance_jobs: {
    title: 'Freelance work', subtitle: 'Freelance work available at XMARKET', flag: 'active',
    blank: { active: true },
    name: (r) => r.title, sub: (r) => (r.pay || 'No pay listed') + (r.deadline ? ' · deadline ' + r.deadline : '') + (r.active ? '' : ' · hidden'),
    fields: [['title', 'Title', 'text', true], ['description', 'Description', 'area'], ['skills', 'Skills needed', 'area'], ['pay', 'Pay (e.g. ₱500 per task)', 'text'], ['deadline', 'Deadline', 'date'], ['apply_url', 'Apply link', 'url'], ['active', 'Visible to users', 'bool']],
  },
};

function ContentAdmin({ tbl }) {
  const cfg = CFG[tbl];
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await rpc('admin_content_list', { p_tbl: tbl })); }
    catch (e) { show?.(String(e.message || e), 'error'); setRows([]); }
  }, [tbl, show]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const set = (k, v) => { setEdit((e) => ({ ...e, [k]: v })); setErrs((x) => ({ ...x, [k]: '' })); };

  const save = async () => {
    const e = {}; const data = {};
    for (const [k, l, t, req] of cfg.fields) {
      const v = edit[k];
      if (t === 'bool') { data[k] = !!v; continue; }
      if (t === 'number') {
        if (v === '' || v == null) { if (req) e[k] = 'Required'; data[k] = 0; continue; }
        if (!(Number(v) >= 0)) { e[k] = 'Enter a number, 0 or more'; continue; }
        data[k] = Number(v); continue;
      }
      const s = String(v ?? '').trim();
      if (!s) { if (req) e[k] = 'Required'; data[k] = null; continue; }
      if ((t === 'url' || (k === 'apply_url')) && !url(s)) { e[k] = 'Must start with https://'; continue; }
      data[k] = s;
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await rpc('admin_content_save', { p_tbl: tbl, p_id: edit.id || null, p_data: data });
      show?.('Saved', 'success'); setEdit(null); load();
    } catch (x) { show?.(String(x.message || x), 'error'); }
    finally { setBusy(false); }
  };

  const flip = async (r) => {
    const k = cfg.flag; const prev = rows;
    setRows((l) => l.map((x) => (x.id === r.id ? { ...x, [k]: !x[k] } : x)));
    try { await rpc('admin_content_save', { p_tbl: tbl, p_id: r.id, p_data: { [k]: !r[k] } }); }
    catch (x) { setRows(prev); show?.(String(x.message || x), 'error'); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await rpc('admin_content_delete', { p_tbl: tbl, p_id: del.id }); show?.('Deleted', 'success'); load(); }
    catch (x) { show?.(String(x.message || x), 'error'); }
    finally { setBusy(false); setDel(null); }
  };

  const input = ([k, l, t, req]) => {
    const bad = errs[k] ? ' bad' : '';
    const v = edit[k] ?? '';
    let body;
    if (t === 'bool') return (
      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 10 }}>
        <input type="checkbox" checked={!!edit[k]} onChange={(e) => set(k, e.target.checked)} style={{ width: 18, height: 18 }} /><span style={{ fontSize: 14 }}>{l}</span>
      </label>);
    if (t === 'area') body = <textarea className={'neu-input' + bad} rows={3} value={v} onChange={(e) => set(k, e.target.value)} />;
    else if (t === 'big') body = <textarea className={'neu-input' + bad} rows={14} value={v} onChange={(e) => set(k, e.target.value)} />;
    else if (t === 'number') body = <input className={'neu-input' + bad} type="number" inputMode="decimal" value={v} onChange={(e) => set(k, e.target.value)} />;
    else if (t === 'date') body = <DatePicker value={v} onChange={(d) => set(k, d)} invalid={!!errs[k]} placeholder="No deadline" label={l} />;
    else if (t === 'image') body = (<>
      {v && <img src={v} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />}
      <div style={{ marginBottom: 8 }}><ImageUpload preset="xmarket_banners" label="Drop an image or tap to choose" onUrl={(u) => set(k, u)} /></div>
      <input className="neu-input" placeholder="or paste https://…" value={v} onChange={(e) => set(k, e.target.value)} />
    </>);
    else body = <input className={'neu-input' + bad} inputMode={t === 'url' ? 'url' : undefined} autoCapitalize={t === 'url' ? 'none' : undefined} value={v} onChange={(e) => set(k, e.target.value)} />;
    return <Field key={k} label={l + (req ? ' *' : '')} error={errs[k]}>{body}</Field>;
  };

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}
        actions={<Btn variant="primary" onClick={() => { setErrs({}); setEdit({ ...cfg.blank }); }}><Plus size={16} /> New</Btn>} />
      {rows === null && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={4} cols={2} /></div>}
      {rows && !rows.length && <div className="table-wrap"><EmptyState title="Nothing yet" hint="Tap New to add one." /></div>}
      {rows && rows.map((r) => (
        <div key={r.id} className="neu-card" style={{ marginBottom: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          {(r.poster_url || r.cover_url) && <img src={r.poster_url || r.cover_url} alt="" loading="lazy" style={{ width: 48, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{cfg.name(r)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{cfg.sub(r)}</div>
          </div>
          <button type="button" className="ui-ic" style={{ width: 36, height: 34 }} onClick={() => flip(r)} aria-label={r[cfg.flag] ? 'Hide' : 'Show'}>{r[cfg.flag] ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button type="button" className="ui-ic" style={{ width: 36, height: 34 }} onClick={() => { setErrs({}); setEdit({ ...r }); }} aria-label="Edit"><Edit2 size={14} /></button>
          <button type="button" className="ui-ic danger" style={{ width: 36, height: 34 }} onClick={() => setDel(r)} aria-label="Delete"><Trash2 size={14} /></button>
        </div>
      ))}
      <Drawer open={!!edit} onClose={() => !busy && setEdit(null)} title={edit && edit.id ? 'Edit' : 'New'}
        footer={<><Btn variant="primary" loading={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Btn><Btn onClick={() => setEdit(null)} disabled={busy}>Cancel</Btn></>}>
        {edit && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{cfg.fields.map(input)}</div>}
      </Drawer>
      <ConfirmDialog open={!!del} title="Delete this item?" message={del ? '"' + cfg.name(del) + '" will be deleted permanently.' : ''} confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </>
  );
}

export const CinemaAdmin = () => <ContentAdmin tbl="cinema_movies" />;
export const ArticlesAdmin = () => <ContentAdmin tbl="articles" />;
export const ScholarshipsAdmin = () => <ContentAdmin tbl="scholarships" />;
export const FreelanceAdmin = () => <ContentAdmin tbl="freelance_jobs" />;
