import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ENV_OK } from '../supabase.js';
import { api, setPin } from './ylApi.js';
import { useYlTables } from './useYlTables.js';
import { S, ACCENT } from './ui.js';
import './anim.css';
import { CountUp } from './Fx.jsx';

const fmt = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString());

export default function YuelinHome() {
  const { tables, error, loading, reload } = useYlTables(true);
  const [stats, setStats] = useState({});
  const [serr, setSerr] = useState('');

  useEffect(() => {
    if (loading) return undefined;
    let dead = false;
    api.stats()
      .then((d) => { if (!dead) { setStats(d || {}); setSerr(''); } })
      .catch((e) => { if (!dead) setSerr(e.message || String(e)); });
    return () => { dead = true; };
  }, [tables, loading]);

  const list = tables.map((t) => ({ ...t, ...(stats[t.name] || {}) }));
  const totalRows = list.reduce((a, t) => a + (t.count || 0), 0);
  const totalRecent = list.reduce((a, t) => a + (t.recent || 0), 0);
  const max = Math.max(1, ...list.map((t) => t.count || 0));
  const ranked = [...list].sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <div className="yl-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={S.h1}>YUELIN Dashboard</h1>
          <p style={S.sub}>Live statistics from the YUELIN database.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" style={S.btn} onClick={reload}>Refresh</button>
          <button type="button" style={S.btn} onClick={() => setPin('')}>Lock</button>
        </div>
      </div>

      {!ENV_OK.yl && <div style={S.err}>YUELIN is not configured. Add VITE_YL_SUPABASE_URL and VITE_YL_SUPABASE_ANON_KEY in Render and redeploy.</div>}
      {error && <div style={S.err}>Could not load tables: {error}</div>}
      {serr && <div style={S.err}>Could not load statistics: {serr}</div>}

      <div className="yl-stats" style={{ ...S.grid, margin: '18px 0' }}>
        <div className="yl-card" style={S.card}><div style={S.sub}>Tables</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={tables.length} /></div></div>
        <div className="yl-card" style={S.card}><div style={S.sub}>Total rows</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={totalRows} /></div></div>
        <div className="yl-card" style={S.card}><div style={S.sub}>New in 7 days</div><div style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}><CountUp value={totalRecent} /></div></div>
      </div>

      <div className="yl-card" style={{ ...S.card, marginBottom: 18 }}>
        <div style={{ ...S.label, marginTop: 0 }}>Rows per table</div>
        {ranked.length === 0 && <div style={S.dim}>{loading ? 'Loading...' : 'No tables found.'}</div>}
        {ranked.map((t) => (
          <Link key={t.name} className="yl-row" to={'/yl/' + encodeURIComponent(t.name)} style={{ display: 'block', textDecoration: 'none', color: 'inherit', margin: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{t.label}</span>
              <b>{fmt(t.count)}{t.recent ? <span style={{ ...S.dim, fontWeight: 400 }}> (+{t.recent} this week)</span> : null}</b>
            </div>
            <div style={{ height: 8, borderRadius: 6, marginTop: 4, background: 'rgba(163,177,198,0.25)' }}>
              <div className="yl-bar" style={{ height: 8, borderRadius: 6, width: ((t.count || 0) / max * 100) + '%', background: ACCENT }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
