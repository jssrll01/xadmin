export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pesoShort = (n) => {
  const x = Number(n || 0);
  if (x >= 1_000_000) return `₱${(x/1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `₱${(x/1_000).toFixed(1)}k`;
  return `₱${x.toFixed(0)}`;
};
export const dateTime = (d) => d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const dateOnly = (d) => d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—';
export const timeAgo = (d) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h/24); if (dy < 7) return `${dy}d ago`;
  return dateOnly(d);
};
export const initials = (a, b, c) => {
  if (a && b) return (a[0]+b[0]).toUpperCase();
  if (a) return a.slice(0,2).toUpperCase();
  if (c) return c.slice(0,2).toUpperCase();
  return '??';
};
