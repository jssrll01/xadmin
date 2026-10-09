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
