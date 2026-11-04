// Pure helpers for the analytics panels. No React, no network: easy to test.
const DAY = 86400000;
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = (d) => { const x = startOfDay(d); x.setDate(1); return x; };
const p2 = (n) => String(n).padStart(2, '0');

/** Range in days -> bucket definitions covering [from, to). Daily up to 90 days, monthly beyond. */
export function makeBuckets(days, now = new Date()) {
  const monthly = days > 90;
  const out = [];
  if (monthly) {
    const n = Math.round(days / 30);
    const cur = startOfMonth(now);
    for (let i = n - 1; i >= 0; i--) {
      const s = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
      out.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) });
    }
  } else {
    const today = startOfDay(now);
    for (let i = days - 1; i >= 0; i--) {
      const s = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
      out.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) });
    }
  }
  return out;
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const ts = (v) => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : null; };

/** Measure of one series over a list of rows: count, sum of a field, or average of a field. */
export function measure(rows, s) {
  let c = 0, sum = 0;
  for (const r of rows) {
    if (s.filter && !s.filter(r)) continue;
    c += 1;
    if (s.field) sum += num(r[s.field]);
  }
  if (s.mode === 'sum') return sum;
  if (s.mode === 'avg') return c ? sum / c : 0;
  return c;
}

/** Points for a line chart: one object per bucket with a value for every series. */
export function buildPoints(rows, series, dateKey, buckets) {
  const lists = buckets.map(() => []);
  const first = buckets[0].start, last = buckets[buckets.length - 1].end;
  for (const r of rows) {
    const t = ts(r[dateKey]);
    if (t === null || t < first || t >= last) continue;
    // binary search would be overkill: bucket count is at most 90
    for (let i = 0; i < buckets.length; i++) if (t >= buckets[i].start && t < buckets[i].end) { lists[i].push(r); break; }
  }
  return buckets.map((b, i) => {
    const p = { label: b.label };
    series.forEach((s) => { p[s.id] = Math.round(measure(lists[i], s) * 100) / 100; });
    return p;
  });
}

/** Totals for the current range and the equal-length range before it. */
export function compare(rows, series, dateKey, days, now = new Date()) {
  const buckets = makeBuckets(days, now);
  const from = buckets[0].start, to = buckets[buckets.length - 1].end;
  const prevFrom = from - (to - from);
  const inR = (a, b) => rows.filter((r) => { const t = ts(r[dateKey]); return t !== null && t >= a && t < b; });
  const cur = inR(from, to), prev = inR(prevFrom, from);
  return series.map((s) => {
    const c = measure(cur, s), p = measure(prev, s);
    return { id: s.id, value: c, prev: p, delta: p === 0 ? (c === 0 ? 0 : null) : ((c - p) / Math.abs(p)) * 100 };
  });
}

/** Counts per distinct value of a field, largest first. */
export function breakdown(rows, field, limit = 8) {
  const m = new Map();
  for (const r of rows) { const k = r[field] === null || r[field] === undefined || r[field] === '' ? 'n/a' : String(r[field]); m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

/** Largest groups by summed field (or by count when no field). */
export function topBy(rows, groupField, valueField, limit = 5) {
  const m = new Map();
  for (const r of rows) {
    const k = r[groupField]; if (k === null || k === undefined || k === '') continue;
    m.set(k, (m.get(k) || 0) + (valueField ? num(r[valueField]) : 1));
  }
  return [...m.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

export const hasField = (rows, f) => rows.some((r) => r[f] !== undefined && r[f] !== null);
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 1 });
export const fmtPeso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtBy = (kind, n) => (kind === 'peso' ? fmtPeso(n) : kind === 'rating' ? Number(n || 0).toFixed(2) : kind === 'pct' ? Number(n || 0).toFixed(1) + '%' : fmtNum(n));
export { DAY };
