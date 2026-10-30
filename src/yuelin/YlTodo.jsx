import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './ylApi.js';
import { S } from './ui.js';

const WAITING = ['pending', 'requested', 'submitted', 'processing', 'awaiting', 'new', 'review'];
const pretty = (n) => String(n).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function YlTodo({ tables }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    const targets = tables.filter((t) => (t.columns || []).some((c) => /(^|_)status$/i.test(c.name)));
    try {
      const out = await Promise.all(targets.map(async (t) => {
        const col = t.columns.find((c) => /(^|_)status$/i.test(c.name)).name;
        const order = t.columns.some((c) => c.name === 'created_at') ? 'created_at' : null;
        const d = await api.select(t.name, 300, 0, order);
        const rows = (d && d.rows) || [];
        const n = rows.filter((r) => WAITING.includes(String(r[col] || '').toLowerCase())).length;
        return { t, n, more: !!d && d.total > rows.length };
      }));
      setItems(out.filter((x) => x.n > 0).sort((a, b) => b.n - a.n));
    } catch (e) {
      setErr(e.message || String(e));
      setItems([]);
    }
  }, [tables]);

  useEffect(() => { load(); }, [load]);

  const total = items ? items.reduce((a, x) => a + x.n, 0) : 0;
  return (
    <div className="yd-card" style={{ margin: '14px 0' }}>
      <div className="yd-h">
        To do <small>{items === null ? 'checking...' : total ? total + ' waiting for you' : 'all caught up'}</small>
      </div>
      {err && <div style={S.err}>{err}</div>}
      {items && items.length === 0 && !err && <div style={S.dim}>Nothing is waiting for review right now.</div>}
      {items && items.map((x) => (
        <Link key={x.t.name} to={'/yl/' + encodeURIComponent(x.t.name)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 2px', borderTop: '1px solid rgba(163,177,198,0.25)', textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontWeight: 700 }}>{pretty(x.t.name)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#fdecd0', color: '#8a5a00', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>{x.n}{x.more ? '+' : ''} pending</span>
            <span style={{ color: '#b8860b', fontWeight: 700, fontSize: 13 }}>Review</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
