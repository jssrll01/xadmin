import React, { useEffect, useState, useCallback } from 'react';
import Card from './Card.jsx';
import Modal from './Modal.jsx';
import Btn from './Btn.jsx';
import { useToast } from './Toast.jsx';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

/**
 * Full CRUD page.
 * props:
 *   title, subtitle
 *   fetcher     → () => { items, error }
 *   columns     → [{ key, label, render? }]
 *   formFields  → [{ key, label, type, required?, options? }]
 *   onCreate(payload) → { data, error }
 *   onUpdate(id, patch) → { error }
 *   onDelete(id) → { error }
 *   searchKeys  → ['name','email']   (optional)
 */
export default function CrudPage({
  title, subtitle, fetcher, columns, formFields,
  onCreate, onUpdate, onDelete, searchKeys = [],
}) {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | {} | row
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
    const blank = {};
    formFields.forEach((f) => { blank[f.key] = f.default ?? ''; });
    setEditing(blank);
  };

  const save = async () => {
    if (!editing) return;
    // validate required
    for (const f of formFields) {
      if (f.required && !editing[f.key]) {
        show?.(`${f.label} is required`, 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const payload = {};
      formFields.forEach((f) => {
        let v = editing[f.key];
        if (f.type === 'number') v = v === '' || v == null ? 0 : Number(v);
        if (f.type === 'boolean') v = !!v;
        payload[f.key] = v;
      });
      const res = isNew
        ? await onCreate(payload)
        : await onUpdate(editing.id, payload);
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
    const label = row.name || row.title || row.email || row.code || row.id?.slice(0, 8);
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      const res = await onDelete(row.id);
      if (res?.error) throw res.error;
      show?.('Deleted', 'success');
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
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={16} style={{ color: 'var(--text-dim)' }} />
            <input
              className="neu-input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </Card>
      )}

      <Card style={{ padding: 8 }}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-dim)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {items.length === 0 ? 'No data yet' : 'No matches'}
            </div>
            <div style={{ fontSize: 12 }}>
              {items.length === 0 ? 'Tap "New" to add the first entry.' : 'Try a different search.'}
            </div>
          </div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th style={{ textAlign: 'right', width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="neu-btn" style={{ padding: 8, marginRight: 6 }}
                      onClick={() => setEditing({ ...row })}>
                      <Edit2 size={14} />
                    </button>
                    <button className="neu-btn" style={{ padding: 8, color: 'var(--danger)' }}
                      onClick={() => remove(row)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${title}` : `New ${title}`}
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formFields.map((f) => (
              <div key={f.key}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {f.label}{f.required ? ' *' : ''}
                </div>
                {f.type === 'textarea' ? (
                  <textarea
                    className="neu-input"
                    rows={3}
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  />
                ) : f.type === 'select' ? (
                  <select
                    className="neu-input"
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  >
                    <option value="">— select —</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox"
                      checked={!!editing[f.key]}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} />
                    <span style={{ fontSize: 13 }}>{f.label}</span>
                  </label>
                ) : (
                  <input
                    className="neu-input"
                    type={f.type || 'text'}
                    value={editing[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  />
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
