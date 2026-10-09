import React, { useEffect, useState } from 'react';
import Card from './Card.jsx';

export default function DataPage({ title, subtitle, fetcher, columns }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetcher();
        if (alive) setItems(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <Card>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-dim)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No data</div>
            <div style={{ fontSize: 12 }}>This table is empty or has no readable rows.</div>
          </div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
