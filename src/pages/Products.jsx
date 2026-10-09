import React, { useEffect, useState } from 'react';
import { Search, Trash2, CheckCircle, Zap, Clock } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchProducts, updateProduct, deleteProduct } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

export default function Products() {
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    fetchProducts({ search }).then(({ items }) => { setItems(items); setLoading(false); });
  };
  useEffect(load, []); // eslint-disable-line

  const toggleInstant = async (p) => {
    const { error } = await updateProduct(p.id, { instant: !p.instant });
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, instant: !x.instant } : x));
    show('Updated', 'success');
  };

  const togglePreorder = async (p) => {
    const { error } = await updateProduct(p.id, { preorder: !p.preorder });
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, preorder: !x.preorder } : x));
    show('Updated', 'success');
  };

  const del = async (p) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    const { error } = await deleteProduct(p.id);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.filter(x => x.id !== p.id));
    show('Product deleted', 'success');
    setSelected(null);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>{items.length} products</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="neu-input" placeholder="Search products…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          <Btn variant="primary" onClick={load}><Search size={16} /> Search</Btn>
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No products" message="No products match your search." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Store</th>
              <th>Price</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={(p.images && p.images[0]) || ''} alt=""
                      style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', background: 'var(--surface-in)' }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.legacy_id || p.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td>{p.store || '—'}</td>
                <td><b>{peso(p.price)}</b></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.instant && <span className="neu-badge" style={{ background: '#D1FAE5', color: '#065F46' }}><Zap size={10} /> Instant</span>}
                    {p.preorder && <span className="neu-badge" style={{ background: '#FEF3C7', color: '#78350F' }}><Clock size={10} /> Pre-order</span>}
                    {!p.instant && !p.preorder && <span className="neu-badge" style={{ background: '#E0E4EC', color: '#374151' }}>Normal</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Product details" size="lg">
        {selected && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              <img src={(selected.images && selected.images[0]) || ''} alt=""
                style={{ width: 120, height: 120, borderRadius: 14, objectFit: 'cover', background: 'var(--surface-in)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{selected.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>{selected.store}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', marginTop: 8 }}>{peso(selected.price)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Discount</div><div style={{ fontWeight: 700 }}>{selected.discount || 0}%</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sold</div><div style={{ fontWeight: 700 }}>{selected.sold || 0}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Verified</div><div style={{ fontWeight: 700 }}>{selected.verified ? 'Yes' : 'No'}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Created</div><div style={{ fontWeight: 700 }}>{dateTime(selected.created_at)}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <Btn variant={selected.instant ? 'success' : 'default'} onClick={() => toggleInstant(selected)} style={{ flex: 1 }}>
                <Zap size={14} /> {selected.instant ? 'Unset instant' : 'Mark instant'}
              </Btn>
              <Btn variant={selected.preorder ? 'success' : 'default'} onClick={() => togglePreorder(selected)} style={{ flex: 1 }}>
                <Clock size={14} /> {selected.preorder ? 'Unset pre-order' : 'Mark pre-order'}
              </Btn>
            </div>
            <Btn variant="danger" onClick={() => del(selected)} style={{ width: '100%' }}>
              <Trash2 size={14} /> Delete product
            </Btn>
          </>
        )}
      </Modal>
    </>
  );
}
