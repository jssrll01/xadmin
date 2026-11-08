import { getAdminPin } from '../lib/pin.js';
import { xmSupabase } from '../supabase.js';

// Always the XMARKET database; PIN is read at call time (never at build time).
export async function adm(fn, args = {}) {
  const { data, error } = await xmSupabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw new Error(error.message || 'Request failed');
  return data;
}

let tablesCache = null;
export async function getTables(force = false) {
  if (tablesCache && !force) return tablesCache;
  tablesCache = await adm('adm_tables');
  return tablesCache;
}

export const pkOf = (meta, row) => Object.fromEntries((meta.pk || []).map((k) => [k, row[k]]));
export const pkKey = (meta, row) => (meta.pk || []).map((k) => String(row[k])).join('|');

const NUM = /^(smallint|integer|bigint|numeric|real|double precision)$/;
const BOOL = /^boolean$/;
const JSONT = /^jsonb?$/;
const DATE = /^(timestamp|date)/;
export const typeKind = (t, hasEnum) => (hasEnum ? 'enum' : NUM.test(t) ? 'number' : BOOL.test(t) ? 'bool' : JSONT.test(t) ? 'json' : DATE.test(t) ? 'date' : t === 'ARRAY' || t.endsWith('[]') ? 'array' : 'text');

// string from the form -> value for the database
export function parseCell(kind, v, nullable) {
  if (v === '' || v === null || v === undefined) return nullable ? null : '';
  if (kind === 'number') { const n = Number(v); if (Number.isNaN(n)) throw new Error('Enter a valid number'); return n; }
  if (kind === 'bool') return v === true || v === 'true';
  if (kind === 'json') { try { return JSON.parse(v); } catch (e) { throw new Error('Invalid JSON'); } }
  if (kind === 'array') return String(v).split('\n').map((s) => s.trim()).filter(Boolean);
  return v;
}
export function showCell(kind, v) {
  if (v === null || v === undefined) return '';
  if (kind === 'json') return JSON.stringify(v, null, 2);
  if (kind === 'array') return Array.isArray(v) ? v.join('\n') : String(v);
  return String(v);
}
export const short = (v, n = 60) => { const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; };
