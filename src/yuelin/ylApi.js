import { ylSupabase } from '../supabase.js';

const KEY = 'xadmin_yl_pin';
export const getPin = () => { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
export function setPin(p) {
  try { if (p) sessionStorage.setItem(KEY, p); else sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event('yl-pin-changed'));
  window.dispatchEvent(new Event('yl-tables-changed'));
}

async function call(fn, args) {
  const { data, error } = await ylSupabase.rpc(fn, { p_pin: getPin(), ...args });
  if (error) {
    if (/Invalid PIN/i.test(error.message)) setPin('');
    throw error;
  }
  return data;
}

export const api = {
  check: async (pin) => {
    const { data, error } = await ylSupabase.rpc('yl_admin_check', { p_pin: pin });
    if (error) throw error;
    return data === true;
  },
  schema: () => call('yl_admin_schema', {}),
  stats: () => call('yl_admin_stats', {}),
  select: (tbl, limit, offset, order) => call('yl_admin_select', { p_tbl: tbl, p_limit: limit, p_offset: offset, p_order: order || null }),
  insert: (tbl, rows) => call('yl_admin_insert', { p_tbl: tbl, p_rows: rows }),
  update: (tbl, key, data) => call('yl_admin_update', { p_tbl: tbl, p_key: key, p_data: data }),
  remove: (tbl, key) => call('yl_admin_delete', { p_tbl: tbl, p_key: key }),
};
