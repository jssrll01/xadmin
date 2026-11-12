import { fetchAllRows } from '../xa/rowsAll.js';

export const SOURCES = [['audit_log', 'Admin actions (audit_log)'], ['admin_audit_logs', 'Admin audit logs (admin_audit_logs)']];

// Both audit tables are mapped to one shape
export function normalize(source, r) {
  if (source === 'admin_audit_logs') {
    return { id: r.id, created_at: r.created_at, actor: r.changed_by || r.admin_id || '', action: String(r.action_type || '').toLowerCase(),
      table_name: r.target_table || '', record_id: r.record_id || '', before_data: r.old_values || null, after_data: r.new_values || null, ip: '', user_agent: '' };
  }
  return { id: r.id, created_at: r.created_at, actor: r.actor || 'admin', action: String(r.action || '').toLowerCase(),
    table_name: r.table_name || '', record_id: r.record_id || '', before_data: r.before_data || null, after_data: r.after_data || null, ip: r.ip || '', user_agent: r.user_agent || '' };
}

export async function loadAudit(source, { max = 5000, onProgress } = {}) {
  const r = await fetchAllRows(source, { order: 'created_at', dir: 'desc', max, onProgress });
  return { rows: r.rows.map((x) => normalize(source, x)), total: r.total, truncated: r.truncated };
}

// Dates are picked as Manila calendar days
export const dayStart = (d) => (d ? new Date(d + 'T00:00:00.000+08:00').getTime() : null);
export const dayEnd = (d) => (d ? new Date(d + 'T23:59:59.999+08:00').getTime() : null);
export const EMPTY_FILTER = { q: '', action: 'all', actor: 'all', table: 'all', record: '', from: '', to: '' };

export function filterAudit(rows, f) {
  const t = (f.q || '').trim().toLowerCase();
  const rec = (f.record || '').trim().toLowerCase();
  const from = dayStart(f.from);
  const to = dayEnd(f.to);
  return rows.filter((r) => {
    if (f.action !== 'all' && r.action !== f.action) return false;
    if (f.actor !== 'all' && r.actor !== f.actor) return false;
    if (f.table !== 'all' && r.table_name !== f.table) return false;
    if (rec && !String(r.record_id).toLowerCase().includes(rec)) return false;
    const ts = new Date(r.created_at).getTime();
    if (from != null && ts < from) return false;
    if (to != null && ts > to) return false;
    if (t) {
      if (r._h === undefined) r._h = [r.actor, r.action, r.table_name, r.record_id, JSON.stringify(r.before_data || ''), JSON.stringify(r.after_data || '')].join(' ').toLowerCase();
      if (!r._h.includes(t)) return false;
    }
    return true;
  });
}

export const distinct = (rows, key) => Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
export const manila = (v) => (v ? new Date(v).toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }) : '');
