import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useRows } from './useRows.js';
import { breakdown, buildPoints, compare, fmtBy, hasField, makeBuckets, topBy } from './series.js';

export const RANGES = [[7, '7D'], [30, '30D'], [90, '90D'], [365, '1Y']];
const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

export function RangeSeg({ days, onChange }) {
  return (
    <div className="an-seg" role="group" aria-label="Date range">
      {RANGES.map(([d, l]) => <button key={d} type="button" className={days === d ? 'on' : ''} onClick={() => onChange(d)}>{l}</button>)}
    </div>
  );
}

function Delta({ v }) {
  if (v === null || v === undefined) return <span className="an-d flat">new</span>;
  if (Math.abs(v) < 0.05) return <span className="an-d flat"><Minus size={13} /> 0%</span>;
  const up = v > 0;
  return <span className={'an-d ' + (up ? 'up' : 'down')}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(v).toFixed(1)}%</span>;
}

const shortId = (k) => (String(k).length > 14 ? String(k).slice(0, 8) : String(k));

/** One analytics block for one table: KPI tiles, line chart, breakdown and top list. Real rows only. */
export default function Panel({ cfg, days, tick = 0 }) {
  const { loading, rows, error, truncated } = useRows(cfg.source || 'xm', cfg.table, tick);
  const [hidden, setHidden] = useState({});
  const series = useMemo(() => cfg.series.filter((s) => !s.needs || loading || hasField(rows, s.needs)).map((s, i) => ({ ...s, color: s.color || COLORS[i % COLORS.length] })), [cfg, rows, loading]);
  const buckets = useMemo(() => makeBuckets(days), [days]);
  const dateKey = cfg.date || 'created_at';
  const points = useMemo(() => (series.length && rows.length ? buildPoints(rows, series, dateKey, buckets) : []), [rows, series, dateKey, buckets]);
  const cmp = useMemo(() => (series.length && rows.length ? compare(rows, series, dateKey, days) : []), [rows, series, dateKey, days]);
  const extras = useMemo(() => (cfg.extras || []).map((e) => ({ ...e, value: rows.length ? e.fn(rows) : null })).filter((e) => e.value !== null && e.value !== undefined), [cfg, rows]);
  const bd = useMemo(() => (cfg.breakdown && hasField(rows, cfg.breakdown.field) ? breakdown(rows, cfg.breakdown.field) : []), [cfg, rows]);
  const top = useMemo(() => (cfg.top && hasField(rows, cfg.top.group) ? topBy(rows, cfg.top.group, cfg.top.value, 5) : []), [cfg, rows]);

  if (error) return <div className="an-card"><div className="an-h">{cfg.title}</div><div className="an-err" style={{ marginTop: 8 }}>Not available: {error}</div></div>;
  const mixed = series.length > 1 && series[0].fmt !== series[1].fmt;
  const shown = series.filter((s) => !hidden[s.id]);
  const total = bd.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="an-wrap">
      <div className="an-head"><div className="an-h">{cfg.title}</div>{cfg.note && <div className="an-sub">{cfg.note}</div>}</div>
      <div className="an-grid">
        {series.map((s, i) => { const c = cmp[i]; return (
          <div className="an-kpi" key={s.id}>
            <div className="l">{s.label}</div>
            <div className="v">{loading ? <span className="an-skel" /> : fmtBy(s.fmt, c ? c.value : 0)}</div>
            {!loading && c && <div><Delta v={c.delta} /> <span className="an-sub">vs previous {days === 365 ? 'year' : days + ' days'}</span></div>}
          </div>); })}
        {!loading && extras.map((e) => (
          <div className="an-kpi" key={e.label}><div className="l">{e.label}</div><div className="v">{fmtBy(e.fmt, e.value)}</div><div className="an-sub">{e.hint || 'All time'}</div></div>
        ))}
      </div>
      <div className="an-cols two">
        <div className="an-card">
          <div className="an-head" style={{ marginBottom: 6 }}>
            <div className="an-sub">{cfg.chartTitle || 'Trend'}</div>
            <div className="an-seg">{series.map((s) => <button key={s.id} type="button" className={hidden[s.id] ? '' : 'on'} style={hidden[s.id] ? {} : { background: s.color }} onClick={() => setHidden((h) => ({ ...h, [s.id]: !h[s.id] }))}>{s.label}</button>)}</div>
          </div>
          {loading ? <div style={{ height: 260 }} /> : !points.length ? <div className="an-note" style={{ padding: '60px 0', textAlign: 'center' }}>No data in this range yet.</div> : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} width={46} allowDecimals={false} />
                  {mixed && <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} width={46} />}
                  <Tooltip formatter={(v, n) => { const s = series.find((x) => x.label === n); return [fmtBy(s ? s.fmt : 'num', v), n]; }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {shown.map((s, i) => <Line key={s.id} yAxisId={mixed && i === 1 ? 'r' : 'l'} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={2.4} dot={days <= 30 && points.length <= 31 ? { r: 2.5 } : false} activeDot={{ r: 5 }} isAnimationActive />)}
                </LineChart>
              </ResponsiveContainer>
            </div>)}
        </div>
        {(bd.length > 0 || top.length > 0) && (
          <div className="an-card">
            {bd.length > 0 && <>
              <div className="an-h" style={{ fontSize: 13, marginBottom: 6 }}>{cfg.breakdown.label}</div>
              {bd.map((b) => <div key={b.name}><div className="an-row" style={{ borderBottom: 0, paddingBottom: 0 }}><span style={{ textTransform: 'capitalize' }}>{b.name.replace(/_/g, ' ')}</span><b>{b.value} <span className="an-sub">({Math.round((b.value / total) * 100)}%)</span></b></div><div className="an-bar"><i style={{ width: (b.value / total) * 100 + '%' }} /></div></div>)}
            </>}
            {top.length > 0 && <>
              <div className="an-h" style={{ fontSize: 13, margin: bd.length ? '16px 0 6px' : '0 0 6px' }}>{cfg.top.label}</div>
              {top.map((t) => <div className="an-row" key={t.key}><span title={String(t.key)}>{shortId(t.key)}</span><b>{fmtBy(cfg.top.fmt || 'num', t.value)}</b></div>)}
            </>}
          </div>)}
      </div>
      {truncated && <div className="an-note">Showing the first {rows.length.toLocaleString()} rows only, so older or newer activity may be missing from these numbers.</div>}
    </div>
  );
}
