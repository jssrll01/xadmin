import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../lib/api.js';
import { peso, dateOnly } from '../lib/format.js';

export default function Products() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | {} | existing product
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { items, error } = await fetchProducts();
    if (error) show(error.message, 'error');
    setItems(Array.isArray(items) ? items : []);
    setLoading(false);
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      name: editing.name,
      price: Number(editing.price),
      stock: Number(editing.stock || 0),
      category: editing.category || 'General',
      description: editing.description || '',
    };
    const { error } = editing.id
      ? await updateProduct(editing.id, payload)
      : await createProduct(payload);
    setSaving(false);
    if (error) return show(error.message, 'error');
    show(editing.id ? 'Product updated' : 'Product created', 'success');
    setEditing(null);
    load();
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await deleteProduct(p.id);
    if (error) return show(error.message, 'error');
    show('Product deleted', 'success');
    load();
  };

  const filtered = items.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>{items.length} items in catalog</p>
        </div>
        <Btn variant="primary" onClick={() => setEditing({ name: '', price: 0, stock: 0, category: 'General' })}>
          <Plus size={16} /> New Product
        </Btn>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <input className="neu-input" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      </Card>

      {loading ? <Card>Loading…</Card> : filtered.length === 0 ? (
        <EmptyState title="No products" message="Add your first product to get started." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td><b>{p.name}</b></td>
                <td>{p.category || '—'}</td>
                <td><b>{peso(p.price)}</b></td>
                <td>{p.stock ?? 0}</td>
                <td>{dateOnly(p.created_at)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Btn variant="ghost" onClick={() => setEditing(p)} style={{ padding: 8 }}><Edit2 size={15} /></Btn>
                  <Btn variant="ghost" onClick={() => remove(p)} style={{ padding: 8, color: 'var(--danger)' }}><Trash2 size={15} /></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Product' : 'New Product'}>
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="neu-input" placeholder="Name" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input className="neu-input" placeholder="Category" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
            <input className="neu-input" type="number" placeholder="Price" value={editing.price || 0} onChange={e => setEditing({ ...editing, price: e.target.value })} />
            <input className="neu-input" type="number" placeholder="Stock" value={editing.stock || 0} onChange={e => setEditing({ ...editing, stock: e.target.value })} />
            <textarea className="neu-input" placeholder="Description" rows={3} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={() => setEditing(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
