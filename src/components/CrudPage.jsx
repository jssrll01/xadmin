import ProductPicker from './ProductPicker.jsx';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Card from './Card.jsx';
import Modal from './Modal.jsx';
import VariantEditor from './VariantEditor.jsx';
import Btn from './Btn.jsx';
import AnimatedNumber from './AnimatedNumber.jsx';
import { useToast } from './Toast.jsx';
import useAutoRefresh from '../lib/useAutoRefresh.js';
import { logAudit } from '../lib/api.js';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

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
  const [search, setSearch] = useState('');
  const [dq, setDq] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [orig, setOrig] = useState(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { const t = setTimeout(() => { setDq(search.trim().toLowerCase()); setPage(1); }, 200); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [statusFilter, sortKey, sortDir]);

  const openNew = () => {
    const blank = { __isNew: true };
    formFields.forEach((f) => {
      if (f.type === 'variant-editor') blank[f.key] = { variant_config: {}, variant_prices: {}, variant_stock: {} };
      else if (f.type === 'product-picker') blank[f.key] = [];
      else if (f.type === 'array') blank[f.key] = '';
      else if (f.type === 'boolean') blank[f.key] = !!f.default;
      else blank[f.key] = f.default ?? '';
    });
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
    setEditing(copy);
    setOrig({ ...copy });
  };

  const closeModal = () => {
    if (editing && orig) {
      const dirty = formFields.some((f) => {
        const a = editing[f.key], b = orig[f.key];
        if (f.type === 'variant-editor') {
          return JSON.stringify(a) !== JSON.stringify(b);
        }
        if (f.type === 'product-picker' || f.type === 'array') {
          return JSON.stringify(a) !== JSON.stringify(b);
        }
        return String(a ?? '') !== String(b ?? '');
      });
      if (dirty && !confirm('Discard unsaved changes?')) return;
    }
    setEditing(null);
    setOrig(null);
  };

  const save = async () => {
    if (!editing) return;
    for (const f of formFields) {
      if (f.required && (editing[f.key] === undefined || editing[f.key] === '' || editing[f.key] === null)) {
        show?.(`${f.label} is required`, 'error');
        return;
      }
    }
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
        }
        else if (f.type === 'array') {
          v = typeof v === 'string'
            ? v.split('\n').map(s => s.trim()).filter(Boolean)
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
      setEditing(null);
      setOrig(null);
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const label = row.name || row.title || row.email || row.code || row.order_code || String(row[primaryKey]).slice(0, 8);
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      const res = await onDelete(row[primaryKey]);
      if (res?.error) throw res.error;
      await logAudit('delete', title.toLowerCase(), row[primaryKey], row, null);
      show?.('Deleted', 'success');
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    }
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

  const filtered = useMemo(() => {
    let out = items;
    if (dq) {
      out = out.filter((it) => searchKeys.some((k) => String(it[k] ?? '').toLowerCase().includes(dq)));
    }
    if (statusKey && statusFilter !== 'all') {
      out = out.filter((it) => String(it[statusKey] ?? '').toLowerCase() === statusFilter);
    }
    if (sortKey) {
      const sign = sortDir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
        return String(av).localeCompare(String(bv)) * sign;
      });
    }
    return out;
  }, [items, dq, searchKeys, statusFilter, statusKey, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle || `${items.length} items`}{filtered.length !== items.length ? ` · ${filtered.length} shown` : ''}</p>
        </div>
        <Btn variant="primary" onClick={openNew}>
          <Plus size={16} /> New
        </Btn>
      </div>

      {(searchKeys.length > 0 || statusKey) && (
        <Card style={{ marginBottom: 12, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {searchKeys.length > 0 && (
              <label style={{ position: 'relative', flex: '1 1 220px' }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input className="neu-input" style={{ paddingLeft: 34 }}
                  placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
            )}
            {statusKey && statusOptions && (
              <select className="neu-input" style={{ flex: '0 1 170px' }}
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        </Card>
      )}

      {loading && items.length === 0 ? (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((k) => (
            <div className="stat" key={k}><div><div className="stat-label">&nbsp;</div><div className="stat-value"><span className="xa-skel" /></div></div></div>
          ))}
        </div>
      ) : failed ? (
        <Card>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)' }}>
            Could not load data. <Btn onClick={() => { setLoading(true); load(); }}>Retry</Btn>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {items.length === 0 ? 'No data yet' : 'No matches'}
            </div>
            <div style={{ fontSize: 12 }}>
              {items.length === 0 ? 'Tap "New" to add the first entry.' : 'Try a different search or filter.'}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="table-wrap">
            <table className="neu-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} onClick={() => toggleSort(c.key)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title={`Sort by ${c.label}`}>
                      {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={row[primaryKey] ?? i}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.wrap ? 'cell-wrap' : undefined}>
                        {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {extraRowActions && extraRowActions(row, { update: quickUpdate })}
                        <button className="neu-btn" style={{ padding: 7 }}
                          onClick={() => openEdit(row)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
                          onClick={() => remove(row)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Btn disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Btn>
              <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                Page {curPage} of {totalPages} · <AnimatedNumber value={filtered.length} /> rows
              </span>
              <Btn disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)} aria-label="Next page"><ChevronRight size={16} /></Btn>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!editing}
        onClose={closeModal}
        title={editing?.__isNew ? `New ${title}` : `Edit ${title}`}
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formFields.map((f) => (
              <div key={f.key}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  {f.label}{f.required ? ' *' : ''}
                </div>
                {f.type === 'textarea' ? (
                  <textarea className="neu-input" rows={3}
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                ) : f.type === 'variant-editor' ? (
                  <VariantEditor
                    value={editing[f.key]}
                    onChange={(next) => setEditing({ ...editing, [f.key]: next })}
                  />
                ) : f.type === 'product-picker' ? (
                  <ProductPicker value={editing[f.key]} onChange={(next) => setEditing({ ...editing, [f.key]: next })} />
                ) : f.type === 'array' ? (
                  <textarea className="neu-input" rows={3}
                    placeholder={f.placeholder || 'One per line'}
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select className="neu-input"
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                    <option value="">— select —</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'boolean' ? (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', border: '1.5px solid var(--border-strong)',
                    borderRadius: 10, cursor: 'pointer',
                  }}>
                    <input type="checkbox"
                      checked={!!editing[f.key]}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                      style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14 }}>{f.label}</span>
                  </label>
                ) : (
                  <input className="neu-input"
                    type={f.type || 'text'}
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </Btn>
              <Btn onClick={closeModal} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
