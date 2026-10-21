import { supabase } from '../supabase.js';

const DB_CODE = import.meta.env.VITE_XADMIN_PIN;
async function db(action, tbl, extra = {}) {
  const { data, error } = await supabase.rpc('admin_db', { code: DB_CODE, action, tbl, ...extra });
  return { data, error };
}
const rows = (r) => (Array.isArray(r.data) ? r.data : []);

/**
 * Generate the next receipt number: XM-YYYYMMDD-0001
 * Uses the settings table counter (xquote_last_receipt_no).
 */
export async function nextReceiptNo() {
  const sel = await db('select', 'settings', { match_col: 'key', match_val: 'xquote_last_receipt_no', lim: 1 });
  const s = rows(sel)[0] || null;
  const current = Number(s?.value || 0) + 1;
  const date = new Date();
  const ymd = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');

  if (s) {
    await db('update', 'settings', { payload: { value: String(current) }, match_col: 'key', match_val: 'xquote_last_receipt_no' });
  } else {
    await db('insert', 'settings', { payload: { key: 'xquote_last_receipt_no', value: String(current) } });
  }
  return `XM-${ymd}-${String(current).padStart(4, '0')}`;
}

export async function saveReceipt(row) {
  const { data, error } = await db('insert', 'xquote_receipts', { payload: { ...row, updated_at: new Date().toISOString() } });
  return { data, error };
}

export async function listReceipts() {
  const r = await db('select', 'xquote_receipts', { order_col: 'created_at', lim: 5000 });
  return { data: rows(r), error: r.error };
}

export async function getReceipt(id) {
  const r = await db('select', 'xquote_receipts', { match_col: 'id', match_val: String(id), lim: 1 });
  return { data: rows(r)[0] || null, error: r.error };
}

export async function deleteReceipt(id) {
  const { error } = await db('delete', 'xquote_receipts', { match_col: 'id', match_val: String(id) });
  return { error };
}

/**
 * Compute totals from a draft.
 * items: [{ name, quantity, price }]
 * discountType: 'percent' | 'fixed'
 */
export function computeTotals({ items, taxRate, discountType, discountValue, currency }) {
  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const taxAmount = subtotal * (Number(taxRate) || 0) / 100;

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal + taxAmount) * (Number(discountValue) || 0) / 100;
  } else {
    discountAmount = Number(discountValue) || 0;
  }

  const total = Math.max(0, subtotal + taxAmount - discountAmount);
  return { subtotal, taxAmount, discountAmount, total };
}
