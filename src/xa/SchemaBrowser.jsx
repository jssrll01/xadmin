import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adm, getTables } from './db.js';
import { SkRows, ErrorState, EmptyState, Badge, useXaToast } from './Kit.jsx';

const TYPES = ['text', 'integer', 'bigint', 'numeric', 'boolean', 'timestamptz', 'date', 'jsonb', 'uuid'];
const sec = { fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '16px 0 6px' };

export default function SchemaBrowser() {
  const { table } = useParams();
  const nav = useNavigate();
  const { push } = useXaToast();
  const [tables, setTables] = useState(null);
  const [q, setQ] = useState('');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [col, setCol] = useState({ name: '', type: 'text', notNull: false, def: '' });

  useEffect(() => { getTables().then(setTables).catch((e) => setErr(e.message)); }, []);
  useEffect(() => {
    setD(null); setErr('');
    if (table) adm('adm_schema', { p_table: table }).then(setD).catch((e) => setErr(e.message));
  }, [table]);
  const list = useMemo(() => (tables || []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [tables, q]);

  const makeSql = () => {
    const n = col.name.trim();
    if (!/^[a-z_][a-z0-9_]*$/.test(n)) { push('Column name: lowercase letters, digits and underscores only.', 'error'); return; }
    if (col.def.includes(';')) { push('Default cannot contain ";".', 'error'); return; }
    if (col.notNull && !col.def.trim()) { push('A NOT NULL column needs a default so existing rows stay valid.', 'error'); return; }
    const s = 'alter table public."' + table + '" add column "' + n + '" ' + col.type + (col.def.trim() ? ' default ' + col.def.trim() : '') + (col.notNull ? ' not null' : '') + ';';
    nav('/sql', { state: { sql: s } });
  };

  if (!table) {
    return (
      <div style={{ padding: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 12px' }}>Schema browser</h2>
        <input className="xa-input" style={{ marginBottom: 10 }} placeholder="Find a table" aria-label="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="neu-card" style={{ padding: 8 }}>
          {err && <ErrorState message={err} />}
          {!err && !tables && <SkRows rows={8} cols={3} />}
          {tables && list.length === 0 && <EmptyState title="No matching table" />}
          {tables && list.map((t) => (
            <button type="button" key={t.name} onClick={() => nav('/schema/' + t.name)} style={{ display: 'flex', width: '100%', gap: 10, padding: '11px 12px', textAlign: 'left', alignItems: 'center' }}>
              <b style={{ fontSize: 14 }}>{t.name}</b><span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 12 }}>{t.cols.length} columns</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button type="button" className="neu-btn" onClick={() => nav('/schema')} aria-label="Back to tables">←</button>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{table}</h2>
        {d && <><Badge tone={d.rls ? 'ok' : 'warn'}>RLS {d.rls ? 'on' : 'off'}</Badge><Badge>~{Number(d.rows_est).toLocaleString()} rows</Badge><Badge>{d.size}</Badge></>}
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={() => nav('/db/' + table)}>Open data</button>
      </div>
      {err && <div className="neu-card"><ErrorState message={err} /></div>}
      {!err && !d && <div className="neu-card"><SkRows rows={8} cols={4} /></div>}
      {d && (<>
        <div style={sec}>Columns</div>
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--surface-2)', textAlign: 'left', color: 'var(--text-dim)' }}>{['Name', 'Type', 'Null', 'Default'].map((h) => <th key={h} style={{ padding: '8px 12px' }}>{h}</th>)}</tr></thead>
            <tbody>{d.columns.map((c) => <tr key={c.name} style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: '8px 12px', fontWeight: 700 }}>{c.name}</td><td style={{ padding: '8px 12px' }}>{c.type}</td><td style={{ padding: '8px 12px' }}>{c.nullable ? 'yes' : 'no'}</td><td style={{ padding: '8px 12px', color: 'var(--text-dim)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.default || ''}</td></tr>)}</tbody>
          </table>
        </div>
        {[['Constraints', d.constraints, (x) => x.name + ': ' + x.def], ['Indexes', d.indexes, (x) => x.def], ['Triggers', d.triggers, (x) => x]].map(([t, arr, f]) => (
          <div key={t}><div style={sec}>{t} ({arr.length})</div>
            <div className="neu-card" style={{ padding: 10, fontSize: 12, fontFamily: 'ui-monospace,monospace', wordBreak: 'break-all' }}>{arr.length === 0 ? <span style={{ color: 'var(--text-dim)' }}>None</span> : arr.map((x, i) => <div key={i} style={{ padding: '4px 0' }}>{f(x)}</div>)}</div></div>
        ))}
        <div style={sec}>Row-level security policies ({d.policies.length})</div>
        <div className="neu-card" style={{ padding: 10, fontSize: 12.5 }}>
          {d.policies.length === 0 && <span style={{ color: 'var(--text-dim)' }}>{d.rls ? 'RLS is on with no policies: only the service role and admin functions can read this table.' : 'No policies.'}</span>}
          {d.policies.map((p, i) => <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}><b>{p.name}</b> <Badge>{p.cmd}</Badge><div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11.5, color: 'var(--text-dim)', wordBreak: 'break-all', marginTop: 3 }}>using {p.using || 'true'}{p.check ? ' · check ' + p.check : ''}</div></div>)}
        </div>
        <div style={sec}>Add a column</div>
        <div className="neu-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="xa-input" style={{ flex: '1 1 150px', width: 'auto' }} placeholder="column_name" aria-label="Column name" value={col.name} onChange={(e) => setCol({ ...col, name: e.target.value })} />
            <select className="xa-input" style={{ flex: '0 1 140px', width: 'auto' }} aria-label="Type" value={col.type} onChange={(e) => setCol({ ...col, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <input className="xa-input" style={{ flex: '1 1 150px', width: 'auto' }} placeholder="default (e.g. 0 or 'x')" aria-label="Default" value={col.def} onChange={(e) => setCol({ ...col, def: e.target.value })} />
          </div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', margin: '10px 0' }}><input type="checkbox" checked={col.notNull} onChange={(e) => setCol({ ...col, notNull: e.target.checked })} /> Not null</label>
          <button type="button" className="neu-btn neu-btn-primary" onClick={makeSql}>Generate migration</button>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>This opens the SQL editor with the statement ready. Nothing changes until you review it, switch on "Allow changes", and type WRITE to confirm.</div>
        </div>
      </>)}
    </div>
  );
}
