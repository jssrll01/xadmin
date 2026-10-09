export const peso = (n) => `₱${(Number(n) || 0).toFixed(2)}`;
export const pesoShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${(v / 1_000).toFixed(1)}K`;
  return `₱${v.toFixed(2)}`;
};
export const date = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';
export const dateTime = (iso) => iso ? new Date(iso).toLocaleString() : '—';
export const timeAgo = (iso) => {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};
export const initials = (first, last, email) => {
  const f = (first || '').charAt(0);
  const l = (last || '').charAt(0);
  if (f || l) return (f + l).toUpperCase();
  return (email || 'U').charAt(0).toUpperCase();
};
