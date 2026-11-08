import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ProductPicker from './ProductPicker.jsx';
import ImageUrlsField from './ImageUrlsField.jsx';
import VariantEditor from './VariantEditor.jsx';
import Btn from './Btn.jsx';
import { useToast } from './Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { logAudit } from '../lib/api.js';
import PageHeader from '../xa/ui/PageHeader.jsx';
import DataTable from '../xa/ui/DataTable.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
import Switch from '../xa/ui/Switch.jsx';
import { ConfirmDialog } from '../xa/Kit.jsx';

export default function CrudPage({
  title, subtitle,
  fetcher, columns, formFields,
  onCreate, onUpdate, onDelete,
  searchKeys = [],
  primaryKey = 'id',
  extraRowActions,
  statusKey,
  statusOptions,
}) {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [orig, setOrig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [discard, setDiscard] = useState(false);
  const [del, setDel] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetcher();
      setItems(Array.isArray(res?.items) ? res.items : []);
      setFailed(false);
    } catch {
      setItems([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useAutoRefresh(load, 1000);

  const openNew = () => {
    const blank = { __isNew: true };
    formFields.forEach((f) => {
      if (f.type === 'variant-editor') blank[f.key] = { variant_config: {}, variant_prices: {}, variant_stock: {} };
      else if (f.type === 'product-picker') blank[f.key] = [];
      else if (f.type === 'array') blank[f.key] = '';
      else if (f.type === 'boolean') blank[f.key] = !!f.default;
      else blank[f.key] = f.default ?? '';
    });
    setErrors({});
    setEditing(blank);
    setOrig({ ...blank });
  };

  const openEdit = (row) => {
    const copy = { ...row };
    formFields.forEach((f) => {
      if (f.type === 'variant-editor') {
        copy[f.key] = {
          variant_config: row.variant_config || {},
          variant_prices: row.variant_prices || {},
          variant_stock: row.variant_stock || {},
        };
      } else if (f.type === 'product-picker') {
        copy[f.key] = Array.isArray(row[f.key]) ? row[f.key] : [];
      } else if (f.type === 'array') {
        copy[f.key] = Array.isArray(row[f.key]) ? row[f.key].join('\n') : (row[f.key] || '');
      }
    });
    setErrors({});
    setEditing(copy);
    setOrig({ ...copy });
  };

  const isDirty = () => {
    if (!editing || !orig) return false;
    return formFields.some((f) => {
      const a = editing[f.key], b = orig[f.key];
      if (f.type === 'variant-editor' || f.type === 'product-picker' || f.type === 'array') return JSON.stringify(a) !== JSON.stringify(b);
      return String(a ?? '') !== String(b ?? '');
    });
  };
  const closeNow = () => { setEditing(null); setOrig(null); setDiscard(false); setErrors({}); };
  const closeDrawer = () => { if (isDirty()) setDiscard(true); else closeNow(); };

  const setField = (k, v) => {
    setEditing((e) => ({ ...e, [k]: v }));
    setErrors((er) => { if (!er[k]) return er; const n = { ...er }; delete n[k]; return n; });
  };

  const save = async () => {
    if (!editing) return;
    const errs = {};
    for (const f of formFields) {
      const v = editing[f.key];
      if (f.required && (v === undefined || v === '' || v === null)) errs[f.key] = f.label + ' is required';
      else if (f.type === 'number' && v !== '' && v != null && Number.isNaN(Number(v))) errs[f.key] = 'Enter a number';
    }
    if (Object.keys(errs).length) { setErrors(errs); show?.('Fix the highlighted fields', 'error'); return; }
    setSaving(true);
    try {
      const isNew = !editing[primaryKey] || editing.__isNew;
      const payload = {};
      formFields.forEach((f) => {
        let v = editing[f.key];
        if (f.type === 'number') v = (v === '' || v == null) ? (f.default ?? 0) : Number(v);
        else if (f.type === 'boolean') v = !!v;
        else if (f.type === 'variant-editor') {
          const obj = editing[f.key];
          if (obj && typeof obj === 'object') {
            payload.variant_config = obj.variant_config || {};
            payload.variant_prices = obj.variant_prices || {};
            payload.variant_stock = obj.variant_stock || {};
          }
          return;
        } else if (f.type === 'array') {
          v = typeof v === 'string'
            ? v.split('\n').map((s) => s.trim()).filter(Boolean)
            : Array.isArray(v) ? v : [];
        }
        if ((v === '' || v == null) && !f.required) return;
        payload[f.key] = v;
      });
      const res = isNew
        ? await onCreate(payload)
        : await onUpdate(editing[primaryKey], payload);
      if (res?.error) throw res.error;
      await logAudit(
        isNew ? 'create' : 'update',
        title.toLowerCase(),
        isNew ? res?.data?.[primaryKey] : editing[primaryKey],
        isNew ? null : orig,
        payload
      );
      show?.(isNew ? 'Created' : 'Updated', 'success');
      closeNow();
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const labelOf = (row) => row.name || row.title || row.email || row.code || row.order_code || String(row[primaryKey]).slice(0, 8);

  const doDelete = async () => {
    setBusy(true);
    try {
      const res = await onDelete(del[primaryKey]);
      if (res?.error) throw res.error;
      await logAudit('delete', title.toLowerCase(), del[primaryKey], del, null);
      show?.('Deleted', 'success');
      setDel(null);
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    }
    setBusy(false);
  };

  const doBulkDelete = async () => {
    setBusy(true);
    let ok = 0, bad = 0;
    for (const row of bulk) {
      try {
        const res = await onDelete(row[primaryKey]);
        if (res?.error) throw res.error;
        await logAudit('delete', title.toLowerCase(), row[primaryKey], row, null);
        ok += 1;
      } catch (e) { bad += 1; }
    }
    show?.(ok + ' deleted' + (bad ? ', ' + bad + ' failed' : ''), bad ? 'error' : 'success');
    setBulk(null);
    setBusy(false);
    load();
  };

  const quickUpdate = async (id, patch) => {
    try {
      const res = await onUpdate(id, patch);
      if (res?.error) throw res.error;
      show?.('Updated', 'success');
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    }
  };

  const rows = useMemo(() => (
    statusKey && statusFilter !== 'all'
      ? items.filter((it) => String(it[statusKey] ?? '').toLowerCase() === statusFilter)
      : items
  ), [items, statusKey, statusFilter]);

  const field = (f) => {
    const v = editing[f.key];
    const bad = errors[f.key] ? ' bad' : '';
    if (f.type === 'textarea') return <textarea className={'neu-input' + bad} rows={3} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} />;
    if (f.type === 'variant-editor') return <VariantEditor value={v} onChange={(next) => setField(f.key, next)} />;
    if (f.type === 'product-picker') return <ProductPicker value={v} onChange={(next) => setField(f.key, next)} />;
    if (f.type === 'array' && f.upload) return <ImageUrlsField value={v ?? ''} placeholder={f.placeholder} onChange={(next) => setField(f.key, next)} />;
    if (f.type === 'array') return <textarea className={'neu-input' + bad} rows={3} placeholder={f.placeholder || 'One per line'} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)} />;
    if (f.type === 'select') {
      return (
        <select className={'neu-input' + bad} value={v ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
          <option value="">Select</option>
          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'boolean') {
      return <div className="ui-swrow"><span>{f.label}</span><Switch checked={!!v} label={f.label} onChange={(n) => setField(f.key, n)} /></div>;
    }
    return <input className={'neu-input' + bad} type={f.type || 'text'} value={v ?? ''} aria-invalid={!!errors[f.key]} onChange={(e) => setField(f.key, e.target.value)} />;
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={(subtitle || items.length + ' items') + (rows.length !== items.length ? ' · ' + rows.length + ' shown' : '')}
        actions={<Btn variant="primary" onClick={openNew}><Plus size={16} /> New</Btn>}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={primaryKey}
        loading={loading}
        error={failed}
        onRetry={() => { setLoading(true); load(); }}
        searchKeys={searchKeys}
        exportName={title.toLowerCase().replace(/\s+/g, '-')}
        selectable
        bulkActions={[{ label: 'Delete', danger: true, onClick: (r) => setBulk(r) }]}
        emptyHint='Tap "New" to add the first entry.'
        toolbar={statusKey && statusOptions ? (
          <select className="neu-input" style={{ flex: '0 1 170px' }} value={statusFilter} aria-label="Filter by status" onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : null}
        rowActions={(row) => (
          <>
            {extraRowActions && extraRowActions(row, { update: quickUpdate })}
            <button type="button" className="ui-ic" onClick={() => openEdit(row)} data-tip="Edit" aria-label="Edit"><Edit2 size={14} /></button>
            <button type="button" className="ui-ic danger" onClick={() => setDel(row)} data-tip="Delete" aria-label="Delete"><Trash2 size={14} /></button>
          </>
        )}
      />

      <Drawer
        open={!!editing}
        onClose={closeDrawer}
        closeOnEsc={!discard}
        title={editing?.__isNew ? 'New ' + title : 'Edit ' + title}
        footer={editing ? (
          <>
            <Btn variant="primary" onClick={save} loading={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            <Btn onClick={closeDrawer} disabled={saving}>Cancel</Btn>
          </>
        ) : null}
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formFields.map((f) => (
              <div key={f.key}>
                {f.type !== 'boolean' && <div className="ui-lbl">{f.label}{f.required ? ' *' : ''}</div>}
                {field(f)}
                {errors[f.key] && <div className="ui-err" role="alert">{errors[f.key]}</div>}
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={discard} title="Discard changes?" message="You have unsaved changes. They will be lost." confirmText="Discard" danger onConfirm={closeNow} onCancel={() => setDiscard(false)} />
      <ConfirmDialog open={!!del} title={'Delete "' + (del ? labelOf(del) : '') + '"?'} message="This cannot be undone." confirmText="Delete" danger busy={busy} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <ConfirmDialog open={!!bulk} title={'Delete ' + (bulk ? bulk.length : 0) + ' records?'} message="Every selected record is deleted and logged in the audit log. This cannot be undone." confirmText="Delete all" danger typeToConfirm="DELETE" busy={busy} onConfirm={doBulkDelete} onCancel={() => setBulk(null)} />
    </>
  );
}
