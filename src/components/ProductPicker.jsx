import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../lib/api.js';

export default function ProductPicker({ value, onChange }) {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const ids = Array.isArray(value) ? value : [];
  useEffect(() => {
    fetchProducts().then((r) => setAll(r.items || []));
  }, []);
  const nameOf = (id) => (all.find((p) => p.id === id) || {}).name || id;
  const toggle = (id) =>
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const shown = all
    .filter((p) => !q || (p.name || '').toLowerCase().includes(q.toLowerCase()))
    .slice(0, 40);
  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        {ids.length === 0 ? 'No items selected' : ids.map((id) => (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
            <span>{nameOf(id)}</span>
            <button type="button" onClick={() => toggle(id)}>Remove</button>
          </div>
        ))}
      </div>
      <input className="neu-input" placeholder="Search products to add…"
        value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
        {shown.map((p) => (
          <label key={p.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13 }}>
            <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} />
            <span>{p.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
