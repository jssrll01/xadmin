import React, { useRef } from 'react';

export function Spark({ data, color = '#6366F1', h = 34 }) {
  const id = useRef('s' + Math.random().toString(36).slice(2, 8)).current;
  const d = data && data.length > 1 ? data : [0, 0];
  const W = 120;
  const max = Math.max(1, ...d);
  const pts = d.map((v, i) => [(i / (d.length - 1)) * W, h - 3 - (v / max) * (h - 8)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg viewBox={'0 0 ' + W + ' ' + h} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line + ' L' + W + ' ' + h + ' L0 ' + h + ' Z'} fill={'url(#' + id + ')'} />
      <path className="xm-line" pathLength="1" d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Donut({ parts, total, label }) {
  let off = 0;
  const sum = parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 190, display: 'block', margin: '0 auto 10px' }} role="img" aria-label={label}>
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(150,160,180,.18)" strokeWidth="26" />
      {parts.map((p, i) => {
        const pct = (p.v / sum) * 100;
        const gap = Math.max(0, pct - 0.6);
        const el = (
          <circle key={p.k} className="xm-seg" cx="100" cy="100" r="70" fill="none" stroke={p.color} strokeWidth="26" pathLength="100"
            strokeDasharray={gap + ' ' + (100 - gap)} strokeDashoffset={-off} transform="rotate(-90 100 100)" style={{ animationDelay: (i * 120) + 'ms' }} />
        );
        off += pct;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">{total}</text>
      <text x="100" y="118" textAnchor="middle" fontSize="11" fill="#8a93a3">{label}</text>
    </svg>
  );
}
