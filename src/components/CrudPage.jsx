import React, { useEffect, useState, useCallback } from 'react';
import Card from './Card.jsx';
import Modal from './Modal.jsx';
import Btn from './Btn.jsx';
import { useToast } from './Toast.jsx';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function CrudPage({
  title, subtitle,
  fetcher, columns, formFields,
  onCreate, onUpdate, onDelete,
  searchKeys = [],
  primaryKey = 'id',
  extraRowActions,
}) {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setItems([]);
      show?.(String(e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  }, [fetcher, show]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const blank = { __isNew: true };
    formFields.forEach((f) => {
      if (f.type === 'array') blank[f.key] = '';
      else if (f.type === 'boolean') blank[f.key] = !!f.default;
      else blank[f.key] = f.default ?? '';
    });
    setEditing(blank);
  };

  const openEdit = (row) => {
    const copy = { ...row };
    formFields.forEach((f) => {
      if (f.type === 'array') {
        copy[f.key] = Array.isArray(row[f.key]) ? row[f.key].join('\n') : (row[f.key] || '');
      }
    });
    setEditing(copy);
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
      show?.(isNew ? 'Created' : 'Updated', 'success');
      setEditing(null);
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const label = row.name || row.title || row.email || row.code || String(row[primaryKey]).slice(0, 8);
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      const res = await onDelete(row[primaryKey]);
      if (res?.error) throw res.error;
      show?.('Deleted', 'success');
      load();
    } catch (e) {
      show?.(String(e.message || e), 'error');
    }
  };

  // Quick row update (used by extra actions like status change)
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

  const filtered = !search
    ? items
    : items.filter((it) =>
        searchKeys.some((k) =>
          String(it[k] ?? '').toLowerCase().includes(search.toLowerCase())
        )
      );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle || `${items.length} items`}</p>
        </div>
        <Btn variant="primary" onClick={openNew}>
          <Plus size={16} /> New
        </Btn>
      </div>

      {searchKeys.length > 0 && (
        <Card style={{ marginBottom: 12, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            <input
              className="neu-input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>
      )}

      {loading ? (
        <Card><div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>Loading…</div></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {items.length === 0 ? 'No data yet' : 'No matches'}
            </div>
            <div style={{ fontSize: 12 }}>
              {items.length === 0 ? 'Tap "New" to add the first entry.' : 'Try a different search.'}
            </div>
          </div>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="neu-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th style={{ textAlign: 'right', width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
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
                      <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }}
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
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
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
              <Btn onClick={() => setEditing(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
