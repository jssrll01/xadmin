export const fmtBytes = (n) => {
  const v = Number(n) || 0;
  if (v < 1024) return v + ' B';
  const u = ['KB', 'MB', 'GB', 'TB'];
  let x = v / 1024;
  let i = 0;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i += 1; }
  return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + ' ' + u[i];
};
export const ago = (iso) => {
  if (!iso) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};
export const ageHours = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 3600000 : 0);
export const fmtMs = (ms) => {
  const v = Number(ms) || 0;
  return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' s' : Math.round(v) + ' ms';
};
export const fmtUptime = (sec) => {
  const s = Number(sec) || 0;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? d + 'd ' + h + 'h' : h > 0 ? h + 'h ' + m + 'm' : m + 'm';
};
export const when = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function cronText(expr) {
  const p = String(expr || '').trim().split(/\s+/);
  if (p.length !== 5) return String(expr || '');
  const [m, h, dom, mon, dow] = p;
  const pad = (x) => String(x).padStart(2, '0');
  if (dom === '*' && mon === '*' && dow === '*') {
    if (m === '*' && h === '*') return 'Every minute';
    let r = /^\*\/(\d+)$/.exec(m);
    if (r && h === '*') return 'Every ' + r[1] + ' minutes';
    if (/^\d+$/.test(m) && h === '*') return 'Every hour at :' + pad(m);
    r = /^\*\/(\d+)$/.exec(h);
    if (/^\d+$/.test(m) && r) return 'Every ' + r[1] + ' hours at :' + pad(m);
    if (/^\d+$/.test(m) && /^\d+$/.test(h)) return 'Daily at ' + pad(h) + ':' + pad(m) + ' UTC';
  }
  return String(expr);
}
