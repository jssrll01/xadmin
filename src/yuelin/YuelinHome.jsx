import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ENV_OK } from '../supabase.js';
import { ylDb as db } from './ylDb.js';
import { useYlTables } from './useYlTables.js';
import { addManualTable, removeManualTable, getManualTables } from './schema.js';
import { S, ACCENT } from './ui.js';
import './anim.css';
import { CountUp } from './Fx.jsx';

const fmt = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString());

export default function YuelinHome() {
  const { tables, error, loading, reload } = useYlTables(true);
  const [stats, setStats] = useState({});
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (loading) return undefined;
    let dead = false;
    (async () => {
      const out = {};
      await Promise.all(tables.map(async (t) => {
        const r = await db.from(t.name).select('*', { count: 'exact', head: true });
        let recent = null;
        if (!r.error && t.columns && t.columns.some((c) => c.name === 'created_at')) {
          const since = new Date(Date.now() - 7 * 864e5).toISOString();
          const r2 = await db.from(t.name).select('*', { count: 'exact', head: true }).gte('created_at', since);
          recent = r2.error ? null : r2.count;
        }
        out[t.name] = { count: r.error ? null : r.count, error: r.error ? r.error.message : null, recent };
      }));
      if (!dead) setStats(out);
    })();
    return () => { dead = true; };
  }, [tables, loading]);

  const list = tables.map((t) => ({ ...t, ...(stats[t.name] || {}) }));
  const totalRows = list.reduce((a, t) => a + (t.count || 0), 0);
  const totalRecent = list.reduce((a, t) => a + (t.recent || 0), 0);
  const max = Math.max(1, ...list.map((t) => t.count || 0));
  const ranked = [...list].sort((a, b) => (b.count || 0) - (a.count || 0));
  const manual = getManualTables().ls;

  const add = () => {
    if (!addManualTable(name)) { setMsg('Use the exact table name (letters, numbers, underscore).'); return; }
    setMsg(''); setName('');
  };

  return (
    <div className="yl-page">
      <h1 style={S.h1}>YUELIN Dashboard</h1>
      <p style={S.sub}>Live statistics from the YUELIN database.</p>

      {!ENV_OK.yl && <div style={S.err}>YUELIN is not configured. Add VITE_YL_SUPABASE_URL and VITE_YL_SUPABASE_ANON_KEY in Render and redeploy.</div>}
      {error && <div style={S.warn}>Could not auto-detect tables: {error} You can add table names manually below.</div>}

      <div className="yl-stats" style={{ ...S.grid, margin: '18px 0' }}>
        <div className="yl-card" style={S.card}><div style={S.sub}>Tables</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={tables.length} /></div></div>
        <div className="yl-card" style={S.card}><div style={S.sub}>Total rows</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={totalRows} /></div></div>
        <div className="yl-card" style={S.card}><div style={S.sub}>New in 7 days</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={totalRecent} /></div></div>
      </div>

      <div className="yl-card" style={{ ...S.card, marginBottom: 18 }}>
        <div style={{ ...S.label, marginTop: 0 }}>Rows per table</div>
        {ranked.length === 0 && <div style={S.dim}>{loading ? 'Loading...' : 'No tables yet.'}</div>}
        {ranked.map((t) => (
          <Link key={t.name} className="yl-row" to={'/yl/' + encodeURIComponent(t.name)} style={{ display: 'block', textDecoration: 'none', color: 'inherit', margin: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{t.label}</span>
              <b>{t.error ? 'no access' : fmt(t.count)}{t.recent ? <span style={{ ...S.dim, fontWeight: 400 }}> (+{t.recent} this week)</span> : null}</b>
            </div>
            <div style={{ height: 8, borderRadius: 6, marginTop: 4, background: 'rgba(163,177,198,0.25)' }}>
              <div className="yl-bar" style={{ height: 8, borderRadius: 6, width: ((t.count || 0) / max * 100) + '%', background: ACCENT }} />
            </div>
          </Link>
        ))}
      </div>

      <div className="yl-card" style={S.card}>
        <div style={{ ...S.label, marginTop: 0 }}>Add a table by name</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...S.input, flex: 1, minWidth: 180 }} placeholder="e.g. products" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <button type="button" style={S.btnAccent} onClick={add}>Add</button>
          <button type="button" style={S.btn} onClick={reload}>Refresh tables</button>
        </div>
        {msg && <div style={S.err}>{msg}</div>}
        {manual.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            Added manually: {manual.map((n) => (
              <span key={n} style={{ marginRight: 10 }}>{n} <a href="#rm" style={{ color: '#d64545' }} onClick={(e) => { e.preventDefault(); removeManualTable(n); }}>x</a></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
