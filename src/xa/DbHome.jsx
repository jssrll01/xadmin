import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Search } from 'lucide-react';
import { getTables } from './db.js';
import { SkRows, ErrorState, EmptyState, Badge } from './Kit.jsx';

export default function DbHome() {
  const nav = useNavigate();
  const [tables, setTables] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const load = () => { setErr(''); setTables(null); getTables(true).then(setTables).catch((e) => setErr(e.message)); };
  useEffect(() => { load(); }, []);
  const list = useMemo(() => (tables || []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [tables, q]);
  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Database size={22} /> Database</h2>
        <span className="xa-badge">{tables ? tables.length : '…'} tables</span>
        <div style={{ position: 'relative', marginLeft: 'auto', width: 'min(280px,100%)' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--text-dim)' }} />
          <input className="xa-input" style={{ paddingLeft: 32 }} placeholder="Find a table" aria-label="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="neu-card" style={{ padding: 8 }}>
        {err && <ErrorState message={err} onRetry={load} />}
        {!err && !tables && <SkRows rows={10} cols={4} />}
        {tables && list.length === 0 && <EmptyState title="No matching table" />}
        {tables && list.map((t) => (
          <button type="button" key={t.name} onClick={() => nav('/db/' + t.name)}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, textAlign: 'left' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <b style={{ fontSize: 14 }}>{t.name}</b>
            {t.kind !== 'r' && <Badge>view</Badge>}
            {t.soft_delete && <Badge tone="warn">soft delete</Badge>}
            <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 12 }}>{t.cols.length} columns · {t.fks.length} links</span>
          </button>
        ))}
      </div>
    </div>
  );
}
