import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { ENV_OK } from '../supabase.js';
import { api, setPin } from './ylApi.js';
import { useYlTables } from './useYlTables.js';
import { S } from './ui.js';
import './anim.css';
import './dash.css';
import { CountUp } from './Fx.jsx';
import YlTodo from './YlTodo.jsx';

const GOLD = '#b8860b';
const PALETTE = ['#b8860b', '#2563eb', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#94a3b8'];
const fmt = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString());
const pretty = (n) => String(n).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function ago(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function smooth(pts) {
  return pts.map((p, i) => {
    if (!i) return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    const q = pts[i - 1];
    const mx = ((q[0] + p[0]) / 2).toFixed(1);
    return 'C' + mx + ' ' + q[1].toFixed(1) + ' ' + mx + ' ' + p[1].toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  }).join(' ');
}

function Spark({ data, color = GOLD, w = 120, h = 34 }) {
  const id = useRef('g' + Math.random().toString(36).slice(2, 8)).current;
  const arr = data && data.length > 1 ? data : [0, 0];
  const max = Math.max(1, ...arr);
  const step = w / (arr.length - 1);
  const pts = arr.map((v, i) => [i * step, h - 4 - (v / max) * (h - 10)]);
  const line = smooth(pts);
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="yd-area" d={line + ' L' + w + ' ' + h + ' L0 ' + h + ' Z'} fill={'url(#' + id + ')'} />
      <path className="yd-line" pathLength="1" d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AreaChart({ data, start }) {
  const W = 640;
  const H = 230;
  const pad = { l: 34, r: 12, t: 14, b: 26 };
  const [hi, setHi] = useState(null);
  const id = useRef('a' + Math.random().toString(36).slice(2, 8)).current;
  const n = data.length;
  const max = Math.max(4, ...data);
  const nice = Math.ceil(max / 4) * 4;
  const x = (i) => pad.l + (i / Math.max(1, n - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / nice) * (H - pad.t - pad.b);
  const pts = data.map((v, i) => [x(i), y(v)]);
  const line = smooth(pts);
  const day = (i) => { const d = new Date(start + 'T00:00:00'); d.setDate(d.getDate() + i); return d; };
  const lab = (i) => day(i).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = Math.round(((cx / r.width) * W - pad.l) / ((W - pad.l - pad.r) / Math.max(1, n - 1)));
    setHi(Math.max(0, Math.min(n - 1, i)));
  };
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={move} onTouchMove={move} onMouseLeave={() => setHi(null)}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={GOLD} stopOpacity="0.4" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={pad.l} x2={W - pad.r} y1={y((nice / 4) * k)} y2={y((nice / 4) * k)} stroke="rgba(163,177,198,0.35)" strokeDasharray="3 5" />
            <text x={pad.l - 6} y={y((nice / 4) * k) + 4} fontSize="10" textAnchor="end" fill="#8a93a3">{Math.round((nice / 4) * k)}</text>
          </g>
        ))}
        {data.map((_, i) => (i % Math.ceil(n / 6) === 0 ? <text key={i} x={x(i)} y={H - 7} fontSize="10" textAnchor="middle" fill="#8a93a3">{lab(i)}</text> : null))}
        <path className="yd-area" d={line + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z'} fill={'url(#' + id + ')'} />
        <path className="yd-line" pathLength="1" d={line} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        {hi !== null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={H - pad.b} stroke={GOLD} strokeOpacity="0.5" />
            <circle cx={x(hi)} cy={y(data[hi])} r="5.5" fill="#fff" stroke={GOLD} strokeWidth="3" />
          </g>
        )}
      </svg>
      {hi !== null && (
        <div className="yd-tip" style={{ left: (x(hi) / W * 100) + '%', top: (y(data[hi]) / H * 100) + '%' }}>
          {lab(hi)} - <b>{data[hi]}</b> new
        </div>
      )}
    </div>
  );
}

function Donut({ parts, total }) {
  let off = 0;
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 220, display: 'block', margin: '0 auto' }}>
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(163,177,198,0.25)" strokeWidth="26" />
      {parts.map((p, i) => {
        const pct = total ? (p.v / total) * 100 : 0;
        const el = (
          <circle key={p.k} className="yd-seg" cx="100" cy="100" r="70" fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="26"
            pathLength="100" strokeDasharray={Math.max(0, pct - 0.6) + ' ' + (100 - Math.max(0, pct - 0.6))} strokeDashoffset={-off}
            transform="rotate(-90 100 100)" style={{ animationDelay: (i * 120) + 'ms' }} />
        );
        off += pct;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" fontSize="26" fontWeight="800" fill="#2b2f3a">{fmt(total)}</text>
      <text x="100" y="118" textAnchor="middle" fontSize="11" fill="#8a93a3">total rows</text>
    </svg>
  );
}

export default function YuelinHome() {
  const { tables, error, loading, reload } = useYlTables(true);
  const [stats, setStats] = useState({});
  const [dash, setDash] = useState(null);
  const [serr, setSerr] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (loading) return undefined;
    let dead = false;
    api.stats().then((d) => { if (!dead) { setStats(d || {}); setSerr(''); } }).catch((e) => { if (!dead) setSerr(e.message || String(e)); });
    api.dash(30).then((d) => { if (!dead) setDash(d); }).catch(() => { if (!dead) setDash(false); });
    return () => { dead = true; };
  }, [tables, loading]);

  const list = tables.map((t) => ({ ...t, ...(stats[t.name] || {}) }));
  const totalRows = list.reduce((a, t) => a + (t.count || 0), 0);
  const totalRecent = list.reduce((a, t) => a + (t.recent || 0), 0);
  const daily = dash && dash.daily ? dash.daily : null;
  const today = daily ? daily[daily.length - 1] : 0;
  const ranked = [...list].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top = ranked.slice(0, 6);
  const otherSum = ranked.slice(6).reduce((a, t) => a + (t.count || 0), 0);
  const parts = top.filter((t) => t.count > 0).map((t) => ({ k: t.name, label: t.label, v: t.count }));
  if (otherSum > 0) parts.push({ k: '_o', label: 'Other', v: otherSum });
  const growth = [...list].filter((t) => t.recent > 0).sort((a, b) => b.recent - a.recent).slice(0, 6);
  const gmax = Math.max(1, ...growth.map((t) => t.recent));

  return (
    <div className="yl-page yd" style={{ animation: 'none' }}>
      <div className="yd-hero">
        <div className="yd-orb" style={{ width: 240, height: 240, background: '#f3b73a', top: -70, right: -40 }} />
        <div className="yd-orb" style={{ width: 200, height: 200, background: '#4f6bff', bottom: -90, left: '30%', animationDelay: '-4s' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h1 className="yd-title">YUELIN Command Center</h1>
            <div className="yd-live" style={{ marginTop: 8 }}>
              <span className="yd-dot" /> Live - {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="yd-btn" onClick={reload}>Refresh</button>
          </div>
        </div>
        <div className="yd-kpis">
          {[
            ['Tables', tables.length, daily],
            ['Total rows', totalRows, daily],
            ['New this week', totalRecent, daily ? daily.slice(-7) : null],
            ['New today', today, daily ? daily.slice(-14) : null],
          ].map(([label, val, spark], i) => (
            <div key={label} className="yd-kpi" style={{ animationDelay: (150 + i * 90) + 'ms' }}>
              <small>{label}</small>
              <b><CountUp value={val} /></b>
              {spark ? <Spark data={spark} color="#f3d37a" h={30} /> : <div style={{ height: 30 }} />}
            </div>
          ))}
        </div>
      </div>

      <YlTodo tables={tables} />

      {!ENV_OK.yl && <div style={S.err}>YUELIN is not configured. Add VITE_YL_SUPABASE_URL and VITE_YL_SUPABASE_ANON_KEY in Render and redeploy.</div>}
      {error && <div style={S.err}>Could not load tables: {error}</div>}
      {serr && <div style={S.err}>Could not load statistics: {serr}</div>}
      {dash === false && <div style={S.warn}>Charts need the yl_admin_dash SQL function. Run the dashboard SQL step, then refresh.</div>}

      <div className="yd-grid2">
        <div className="yd-card">
          <div className="yd-h">Activity <small>new rows per day - last {daily ? daily.length : 30} days</small></div>
          {daily ? <AreaChart data={daily} start={dash.start} /> : <div className="yl-skel" style={{ height: 200 }} />}
        </div>
        <div className="yd-card">
          <div className="yd-h">Data distribution <small>rows per table</small></div>
          {parts.length ? <Donut parts={parts} total={totalRows} /> : <div className="yl-skel" style={{ height: 180 }} />}
          <div style={{ marginTop: 12 }}>
            {parts.map((p, i) => (
              <div key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, margin: '4px 0' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
                <span style={{ flex: 1 }}>{p.label}</span><b>{fmt(p.v)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="yd-grid2">
        <div className="yd-card">
          <div className="yd-h">Latest activity <small>across all tabs</small></div>
          <div className="yd-feed">
            {dash && dash.recent && dash.recent.length > 0 ? dash.recent.map((r, i) => (
              <Link key={i} style={{ '--i': i }} to={'/yl/' + encodeURIComponent(r.t)}>
                <span className="yd-tag">{pretty(r.t)}</span>
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label || 'New row'}</span>
                <span style={{ ...S.dim, fontSize: 12 }}>{ago(r.at)}</span>
              </Link>
            )) : <div style={S.dim}>{dash ? 'No recent activity.' : 'Loading...'}</div>}
          </div>
        </div>
        <div className="yd-card">
          <div className="yd-h">Growth this week <small>new rows</small></div>
          {growth.length === 0 && <div style={S.dim}>Nothing new this week.</div>}
          {growth.map((t) => (
            <Link key={t.name} to={'/yl/' + encodeURIComponent(t.name)} style={{ display: 'block', textDecoration: 'none', color: 'inherit', margin: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{t.label}</span><b>+{t.recent}</b></div>
              <div style={{ height: 8, borderRadius: 6, marginTop: 4, background: 'rgba(163,177,198,0.25)' }}>
                <div className="yl-bar" style={{ height: 8, borderRadius: 6, width: (t.recent / gmax * 100) + '%', background: '#fff', border: '1px solid rgba(163,177,198,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="yd-h" style={{ margin: '4px 2px 12px' }}>Jump to a tab <small>{tables.length} tables</small></div>
        <div className="yd-tiles">
          {ranked.map((t, i) => (
            <Link key={t.name} className="yd-tile" style={{ '--i': i }} to={'/yl/' + encodeURIComponent(t.name)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}><Database size={14} color={GOLD} />{t.label}</span>
                {t.recent ? <span className="yd-chip">+{t.recent}</span> : null}
              </div>
              <div className="n" style={{ margin: '6px 0 4px' }}>{fmt(t.count)}</div>
              <Spark data={dash && dash.series && dash.series[t.name] ? dash.series[t.name].slice(-14) : null} h={28} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
