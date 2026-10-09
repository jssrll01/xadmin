import React, { useEffect, useState } from 'react';
import { Store, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { fetchSellers } from '../lib/api.js';

export default function Sellers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellers().then(rows => { setItems(Array.isArray(rows) ? rows : []); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sellers</h1>
          <p>{items.length} stores</p>
        </div>
      </div>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No sellers" message="No stores yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {items.map(s => (
            <Card key={s.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  color: '#fff', fontWeight: 800, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Store size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{s.products} products</div>
                </div>
                {s.verified && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
