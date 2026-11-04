import { useEffect, useState } from 'react';
import { adminDb, adminRows } from '../lib/api.js';
import { api as ylApi } from '../yuelin/ylApi.js';

// One shared cache so a dashboard with many panels reads each table once (60 s).
const cache = new Map();
const TTL = 60000;
const LIMIT_XM = 5000;

async function fetchXm(table) {
  let r = await adminDb('select', table, { order_col: 'created_at', lim: LIMIT_XM });
  if (r.error) r = await adminDb('select', table, { order_col: null, lim: LIMIT_XM });
  if (r.error) throw r.error;
  const rows = adminRows(r);
  return { rows, truncated: rows.length >= LIMIT_XM };
}
async function fetchYl(table) {
  const rows = []; let total = 0;
  for (let off = 0; off < 3000; off += 1000) {
    let r;
    try { r = await ylApi.select(table, 1000, off, 'created_at'); } catch (e) { r = await ylApi.select(table, 1000, off, null); }
    total = r.total || 0;
    rows.push(...(r.rows || []));
    if (!r.rows || r.rows.length < 1000) break;
  }
  return { rows, truncated: total > rows.length };
}

export function loadRows(source, table, force) {
  const key = source + ':' + table;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.p;
  const p = (source === 'yl' ? fetchYl(table) : fetchXm(table)).catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), p });
  return p;
}

export function useRows(source, table, tick = 0) {
  const [st, setSt] = useState({ loading: true, rows: [], error: '', truncated: false });
  useEffect(() => {
    let live = true;
    setSt((s) => ({ ...s, loading: true, error: '' }));
    loadRows(source, table, tick > 0)
      .then((r) => { if (live) setSt({ loading: false, rows: r.rows, error: '', truncated: r.truncated }); })
      .catch((e) => { if (live) setSt({ loading: false, rows: [], error: (e && e.message) || String(e), truncated: false }); });
    return () => { live = false; };
  }, [source, table, tick]);
  return st;
}
