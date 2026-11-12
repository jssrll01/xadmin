import { adm } from './db.js';

// Reads a whole table through adm_rows, page by page (the server may cap the page size).
export async function fetchAllRows(table, { order, dir = 'desc', max = 5000, step = 500, onProgress, signal } = {}) {
  const out = [];
  let offset = 0;
  let total = null;
  while (out.length < max) {
    if (signal && signal.aborted) break;
    const args = { p_table: table, p_limit: Math.min(step, max - out.length), p_offset: offset, p_show_deleted: true };
    if (order) { args.p_order = order; args.p_dir = dir; }
    const r = await adm('adm_rows', args);
    const rows = (r && r.rows) || [];
    if (r && r.total != null) total = Number(r.total);
    if (!rows.length) break;
    out.push(...rows);
    offset += rows.length;
    if (onProgress) onProgress(out.length, total);
    if (total != null && offset >= total) break;
  }
  return { rows: out, total, truncated: total != null && out.length < total, aborted: !!(signal && signal.aborted) };
}
