export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pesoShort = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `₱${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₱${(num / 1_000).toFixed(1)}k`;
  return `₱${num.toFixed(0)}`;
};
export const dateTime = (d) => d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const dateOnly = (d) => d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—';
export const initials = (first, last, fallback) => {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (fallback) return fallback.slice(0, 2).toUpperCase();
  return '??';
};

/* ============================================================
   TIME HELPERS
   ============================================================ */
export const timeAgo = (d) => {
  if (!d) return '—';
  const t = new Date(d).getTime();
  const now = Date.now();
  const s = Math.floor((now - t) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `${dy}d ago`;
  const w = Math.floor(dy / 7);
  if (w < 5) return `${w}w ago`;
  return dateOnly(d);
};

export const fromNow = timeAgo;
export const formatDate = dateOnly;
