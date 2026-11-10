import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useAutoClear from '../xa/useAutoClear.js';
import { Plus, Search, Edit3, Trash2, ExternalLink } from 'lucide-react';
import { xrpc } from '../lib/xrpc.js';
import { useToast } from '../components/Toast.jsx';
import Btn from '../components/Btn.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import { ConfirmDialog, EmptyState, SkRows } from '../xa/Kit.jsx';

const BLANK = { id: null, name: '', url: '' };

export default function Supplier() {
  const { show } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [q, setQ] = useState('');
  useAutoClear(q, setQ);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    try { setRows((await xrpc('admin_sup_list')) || []); setLoadErr(''); }
    catch (e) { setLoadErr(e.message || String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => (r.name || '').toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  const save = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!/^https?:\/\//i.test(form.url.trim())) e.url = 'Link must start with http:// or https://';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await xrpc('admin_sup_save', { p_id: form.id, p_name: form.name.trim(), p_url: form.url.trim() });
      show(form.id ? 'Updated' : 'Added', 'success');
      setOpen(false); load();
    } catch (x) { show(x.message || String(x), 'error'); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await xrpc('admin_sup_delete', { p_id: del.id }); show('Deleted', 'success'); load(); }
    catch (x) { show(x.message || String(x), 'error'); }
    finally { setBusy(false); setDel(null); }
  };

  return (
    <>
      <PageHeader title="Supplier" subtitle={list.length + ' of ' + rows.length}
        actions={<Btn variant="primary" onClick={() => { setForm(BLANK); setErrs({}); setOpen(true); }}><Plus size={15} /> Add</Btn>} />

      <div className="ui-tools">
        <label className="ui-search">
          <Search size={15} />
          <input className="neu-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product names…" aria-label="Search products" />
        </label>
      </div>

      {loading && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={5} cols={2} /></div>}
      {!loading && loadErr && <div className="table-wrap"><EmptyState title="Could not load" hint={loadErr} /><div style={{ textAlign: 'center', paddingBottom: 14 }}><Btn onClick={load}>Retry</Btn></div></div>}
      {!loading && !loadErr && !list.length && <div className="table-wrap"><EmptyState title={rows.length ? 'No matches' : 'No products yet'} hint={rows.length ? 'Try a different search.' : 'Tap Add to create one.'} /></div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {list.map((r) => (
          <div key={r.id} className="neu-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href={r.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontWeight: 700, wordBreak: 'break-word', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {r.name} <ExternalLink size={13} />
            </a>
            <button type="button" className="ui-ic" style={{ width: 38, height: 36 }} onClick={() => { setForm(r); setErrs({}); setOpen(true); }} aria-label={'Edit ' + r.name}><Edit3 size={14} /></button>
            <button type="button" className="ui-ic danger" style={{ width: 38, height: 36 }} onClick={() => setDel(r)} aria-label={'Delete ' + r.name}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <Drawer open={open} onClose={() => !busy && setOpen(false)} title={form.id ? 'Edit product' : 'Add product'}
        footer={<><Btn variant="primary" loading={busy} onClick={save}>{busy ? 'Saving…' : form.id ? 'Save' : 'Add'}</Btn><Btn onClick={() => setOpen(false)} disabled={busy}>Cancel</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="ui-lbl">Product name *</div>
            <input className={'neu-input' + (errs.name ? ' bad' : '')} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />
            {errs.name && <div className="ui-err" role="alert">{errs.name}</div>}</div>
          <div><div className="ui-lbl">Link *</div>
            <input className={'neu-input' + (errs.url ? ' bad' : '')} inputMode="url" placeholder="https://…" value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); setErrs({ ...errs, url: '' }); }} />
            {errs.url && <div className="ui-err" role="alert">{errs.url}</div>}</div>
        </div>
      </Drawer>

      <ConfirmDialog open={!!del} title="Delete this product?" message={del ? '"' + del.name + '" will be removed.' : ''} confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </>
  );
}
