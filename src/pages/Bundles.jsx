import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchBundles, upsertBundle, deleteBundle } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const EMPTY = { title: '', description: '', image_url: '', product_ids: [], bundle_price: 0, original_price: 0, active: true };

export default function Bundles() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = () => {
    setLoading(true);
    fetchBundles().then(rows => { setItems(rows); setLoading(false); });
  };
  useEffect(load, []);

  const save = async () => {
    if (!edit.title) return show('Enter a title', 'error');
    const payload = {
      ...edit,
      bundle_price: Number(edit.bundle_price),
      original_price: Number(edit.original_price) || null,
    };
    const { error } = await upsertBundle(payload);
    if (error) return show(error.message, 'error');
    show('Saved', 'success');
    setEdit(null);
    load();
  };

  const del = async (b) => {
    if (!confirm(`Delete bundle "${b.title}"?`)) return;
    const { error } = await deleteBundle(b.id);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.filter(x => x.id !== b.id));
    show('Deleted', 'success');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bundles</h1>
          <p>{items.length} bundles</p>
        </div>
        <Btn variant="primary" onClick={() => setEdit({ ...EMPTY })}><Plus size={16} /> New bundle</Btn>
      </div>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No bundles" message="Create your first bundle deal." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map(b => (
            <Card key={b.id}>
              {b.image_url && (
                <img src={b.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
              )}
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>{b.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary)' }}>{peso(b.bundle_price)}</span>
                {b.original_price > b.bundle_price && (
                  <span style={{ fontSize: 12, textDecoration: 'line-through', color: 'var(--text-dim)' }}>{peso(b.original_price)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" onClick={() => setEdit(b)} style={{ flex: 1 }}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => del(b)}><Trash2 size={12} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit bundle' : 'New bundle'}>
        {edit && (
          <>
            <input className="neu-input" placeholder="Title" value={edit.title}
              onChange={e => setEdit({ ...edit, title: e.target.value })} style={{ marginBottom: 10 }} />
            <textarea className="neu-input" placeholder="Description" value={edit.description || ''}
              onChange={e => setEdit({ ...edit, description: e.target.value })}
              style={{ marginBottom: 10, minHeight: 80 }} />
            <input className="neu-input" placeholder="Image URL" value={edit.image_url || ''}
              onChange={e => setEdit({ ...edit, image_url: e.target.value })} style={{ marginBottom: 10 }} />
            <input className="neu-input" type="number" placeholder="Bundle price ₱" value={edit.bundle_price}
              onChange={e => setEdit({ ...edit, bundle_price: e.target.value })} style={{ marginBottom: 10 }} />
            <input className="neu-input" type="number" placeholder="Original price ₱" value={edit.original_price || ''}
              onChange={e => setEdit({ ...edit, original_price: e.target.value })} style={{ marginBottom: 10 }} />
            <textarea className="neu-input" placeholder='Product IDs (JSON array, e.g. ["abc","def"])'
              value={JSON.stringify(edit.product_ids || [])}
              onChange={e => {
                try { setEdit({ ...edit, product_ids: JSON.parse(e.target.value) }); } catch {}
              }}
              style={{ marginBottom: 14, minHeight: 60, fontFamily: 'monospace', fontSize: 12 }} />
            <Btn variant="primary" onClick={save} style={{ width: '100%' }}>
              <Save size={16} /> Save bundle
            </Btn>
          </>
        )}
      </Modal>
    </>
  );
}
